/**
 * WatchLockAI Threat Intelligence API
 * Cloudflare Worker for aggregating, deduplicating, correlating, and scoring threats
 */

import { fetchAllFeeds, normalizeItems, deduplicateItems } from './feeds.js';
import { deduplicateAdvanced } from './deduplication.js';
import { addCorrelationData, getCorrelationStats } from './correlation.js';
import { addRiskScores } from './scoring.js';
import { calculateEnhancedRiskScore, bubbleUpSort, getTopThreats } from './scoring-phase2.js';
import { createHealthCheck, logStructured } from './utils.js';
import { loadAPTProfiles, addAPTCorrelation } from './apt-correlation.js';
import { loadDetections, addDetectionRecommendations } from './detection-correlation.js';
import { loadDarkWebIntel, addDarkWebCorrelation } from './dark-web-correlation.js';
import { loadThreatActors, addActorAttribution } from './actor-attribution.js';

const VERSION = '2.0.0';
const CACHE_TTL = 900; // 15 minutes

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response;

      if (url.pathname === '/api/threats') {
        response = await handleThreats(request, env, ctx);
      } else if (url.pathname === '/api/top') {
        response = await handleTopThreats(request, env, ctx);
      } else if (url.pathname === '/health') {
        response = handleHealth(env);
      } else if (url.pathname === '/version') {
        response = handleVersion();
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      logStructured('error', 'Request failed', { error: error.message, path: url.pathname });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },

  /**
   * Scheduled cron handler - runs every 15 minutes
   */
  async scheduled(event, env, _ctx) {
    try {
      logStructured('info', 'Cron triggered', {
        time: new Date(event.scheduledTime).toISOString(),
      });

      // Fetch and process threats
      const threats = await fetchAndProcessThreats(env);

      // Store in KV
      await env.WATCHLOCK_KV.put('unified-threats', JSON.stringify(threats), {
        expirationTtl: CACHE_TTL * 2, // 30 minutes
      });

      // Store top threats separately for faster access
      const topThreats = getTopThreats(threats.items, 20);
      await env.WATCHLOCK_KV.put('top-threats', JSON.stringify(topThreats), {
        expirationTtl: CACHE_TTL * 2,
      });

      logStructured('info', 'Cron completed', {
        totalThreats: threats.items.length,
        topThreats: topThreats.length,
      });
    } catch (error) {
      logStructured('error', 'Cron failed', { error: error.message });
    }
  },
};

/**
 * Fetch and process all threats with Phase 1 & 2 enhancements
 */
async function fetchAndProcessThreats(env) {
  const startTime = Date.now();

  // Get feed URLs
  const feedUrls = env.DEFAULT_FEEDS.split(',').map(f => f.trim());

  // Fetch all feeds
  const rawItems = await fetchAllFeeds(feedUrls, env);

  // Normalize
  let items = normalizeItems(rawItems);

  // Phase 1: Deduplication
  items = deduplicateItems(items); // Basic
  items = deduplicateAdvanced(items); // Advanced

  // Phase 1: Correlation
  items = addCorrelationData(items);

  // Phase 4: APT Attribution
  const aptProfiles = await loadAPTProfiles(env);
  if (aptProfiles.length > 0) {
    items = addAPTCorrelation(items, aptProfiles);
  }

  // Phase 5: Detection Engineering Recommendations
  const detections = await loadDetections(env);
  if (detections.length > 0) {
    items = addDetectionRecommendations(items, detections);
  }

  // Phase 7: Dark Web Intelligence Correlation
  const darkWebData = await loadDarkWebIntel(env);
  if (
    darkWebData &&
    (darkWebData.ransomwareVictims?.length > 0 || darkWebData.pasteFindings?.length > 0)
  ) {
    items = addDarkWebCorrelation(items, darkWebData);
  }

  // Phase 3: Threat Actor Attribution
  const actorData = await loadThreatActors(env);
  if (actorData && actorData.threatActors?.length > 0) {
    items = addActorAttribution(items, actorData);
  }

  // Phase 1: Base risk scores
  items = addRiskScores(items);

  // Phase 2: Enhanced risk scores with bonuses and badges
  items = items.map(item => {
    const enhanced = calculateEnhancedRiskScore(item);
    return {
      ...item,
      riskScore: enhanced.score,
      severity: enhanced.severity,
      riskEvidence: enhanced.evidence,
      badges: enhanced.badges,
    };
  });

  // Phase 2: Bubble-up sort
  items = bubbleUpSort(items);

  // Get correlation stats
  const correlationStats = getCorrelationStats(items);

  const duration = Date.now() - startTime;

  return {
    updated: new Date().toISOString(),
    version: VERSION,
    count: items.length,
    items,
    correlationStats,
    processingTime: duration,
  };
}

/**
 * Handle /api/threats endpoint
 */
async function handleThreats(request, env, ctx) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);

  // Try to get from KV cache first
  const cached = await env.WATCHLOCK_KV.get('unified-threats');
  let data;

  if (cached) {
    data = JSON.parse(cached);
    logStructured('info', 'Served from cache', { count: data.items.length });
  } else {
    // Fetch fresh data
    data = await fetchAndProcessThreats(env);

    // Store in KV for next request
    ctx.waitUntil(
      env.WATCHLOCK_KV.put('unified-threats', JSON.stringify(data), {
        expirationTtl: CACHE_TTL,
      })
    );

    logStructured('info', 'Fetched fresh data', { count: data.items.length });
  }

  // Apply limit
  const limitedData = {
    ...data,
    items: data.items.slice(0, limit),
    count: Math.min(data.count, limit),
  };

  return new Response(JSON.stringify(limitedData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      ETag: `"${Date.now()}"`,
    },
  });
}

/**
 * Handle /api/top endpoint
 */
async function handleTopThreats(request, env, ctx) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

  // Try to get from KV cache first
  const cached = await env.WATCHLOCK_KV.get('top-threats');
  let topThreats;

  if (cached) {
    topThreats = JSON.parse(cached);
    logStructured('info', 'Top threats served from cache', { count: topThreats.length });
  } else {
    // Fetch all threats and get top
    const allData = await fetchAndProcessThreats(env);
    topThreats = getTopThreats(allData.items, 20);

    // Store in KV
    ctx.waitUntil(
      env.WATCHLOCK_KV.put('top-threats', JSON.stringify(topThreats), {
        expirationTtl: CACHE_TTL,
      })
    );

    logStructured('info', 'Top threats fetched fresh', { count: topThreats.length });
  }

  const response = {
    updated: new Date().toISOString(),
    version: VERSION,
    count: Math.min(topThreats.length, limit),
    items: topThreats.slice(0, limit),
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      ETag: `"${Date.now()}"`,
    },
  });
}

/**
 * Handle /health endpoint
 */
function handleHealth(env) {
  const health = createHealthCheck(env);
  return new Response(JSON.stringify(health, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle /version endpoint
 */
function handleVersion() {
  return new Response(
    JSON.stringify(
      {
        version: VERSION,
        name: 'WatchLockAI Threat Intelligence API',
        phase: 'Phase 2 - Bubble-Up Logic & Critical Alerts',
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
