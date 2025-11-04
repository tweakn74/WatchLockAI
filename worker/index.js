/**
 * APT Tracker - MITRE ATT&CK Intelligence Aggregator
 * Cloudflare Worker for threat intelligence aggregation and trends analysis
 */

import { fetchAllFeeds, normalizeItems, deduplicateItems } from './lib/feeds.js';
import { updateTrendsBucket, getTrendsBuckets } from './lib/trends.js';
import { discoverNewSources } from './lib/discovery.js';
import { getSources, addApprovedSource, blockDomain } from './lib/sources.js';
import { logStructured, createHealthCheck } from './lib/utils.js';
import { addRiskScores, filterBySeverity, sortByRiskScore } from './lib/scoring.js';
import { deduplicateAdvanced } from './lib/deduplication.js';
import { addCorrelationData, getCorrelationStats } from './lib/correlation.js';

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    try {
      // Route requests
      if (path === '/api/threats') {
        return await handleThreats(request, env, ctx);
      } else if (path === '/api/trends') {
        return await handleTrends(request, env, ctx);
      } else if (path === '/api/sources') {
        return await handleSources(request, env, ctx);
      } else if (path === '/api/sources/approve') {
        return await handleApproveSource(request, env, ctx);
      } else if (path === '/api/sources/block') {
        return await handleBlockSource(request, env, ctx);
      } else if (path === '/api/discovery/refresh') {
        return await handleDiscovery(request, env, ctx);
      } else if (path === '/api/healthz') {
        return await handleHealth(request, env, ctx);
      } else {
        return jsonResponse({ error: 'Not found' }, 404, env);
      }
    } catch (error) {
      console.error('Request failed:', {
        path,
        error: error.message,
        stack: error.stack,
      });
      logStructured('error', 'Request failed', {
        path,
        error: error.message,
        stack: error.stack,
      });
      return jsonResponse(
        {
          error: 'Internal server error',
          message: error.message,
          path,
        },
        500,
        env
      );
    }
  },
};

/**
 * Handle /api/threats endpoint
 */
async function handleThreats(request, env, _ctx) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '60'), 100);
  const after = url.searchParams.get('after');
  const tag = url.searchParams.get('tag');
  const q = url.searchParams.get('q');
  const severity = url.searchParams.get('severity'); // NEW: severity filter

  const startTime = Date.now();

  try {
    // Get approved sources
    const sources = await getSources(env);
    const approvedUrls = sources.approved.map(s => (typeof s === 'string' ? s : s.url));
    const feedUrls = [...env.DEFAULT_FEEDS.split(',').map(f => f.trim()), ...approvedUrls];

    logStructured('info', 'Fetching threats', {
      feedCount: feedUrls.length,
      filters: { limit, after, tag, q, severity },
    });

    // Fetch all feeds
    const rawItems = await fetchAllFeeds(feedUrls, env);

    // Normalize and tag
    let items = normalizeItems(rawItems);

    // Basic deduplication (exact URL/title matches)
    items = deduplicateItems(items);

    // Advanced deduplication (CVE, title similarity, IOC matching)
    items = deduplicateAdvanced(items);

    // Add correlation data (related threats)
    items = addCorrelationData(items);

    // Add risk scores and severity
    items = addRiskScores(items);

    // Sort by risk score (highest first)
    items = sortByRiskScore(items);

    // Apply filters
    if (after) {
      const afterDate = new Date(after);
      items = items.filter(item => new Date(item.pubDate) > afterDate);
    }

    if (tag) {
      items = items.filter(item => item.tags.includes(tag.toUpperCase()));
    }

    if (q) {
      const query = q.toLowerCase();
      items = items.filter(
        item =>
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Filter by severity
    if (severity) {
      items = filterBySeverity(items, severity.toUpperCase());
    }

    // Get correlation stats before limiting
    const correlationStats = getCorrelationStats(items);

    // Limit results
    items = items.slice(0, limit);

    // Update trends (async, don't wait)
    ctx.waitUntil(updateTrendsBucket(items, env));

    const duration = Date.now() - startTime;
    logStructured('info', 'Threats fetched', {
      itemCount: items.length,
      duration,
      correlationStats,
    });

    return jsonResponse(
      {
        updated: new Date().toISOString(),
        count: items.length,
        items,
        correlationStats, // Include correlation statistics in response
      },
      200,
      env
    );
  } catch (error) {
    logStructured('error', 'Failed to fetch threats', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/trends endpoint
 */
async function handleTrends(request, env, _ctx) {
  try {
    const buckets = await getTrendsBuckets(env, 24); // Last 24 hours

    return jsonResponse(
      {
        buckets,
        period: '24h',
      },
      200,
      env
    );
  } catch (error) {
    logStructured('error', 'Failed to fetch trends', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/sources endpoint
 */
async function handleSources(request, env, _ctx) {
  try {
    const sources = await getSources(env);

    // Get recently approved (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyApproved = sources.approved.filter(s => {
      if (typeof s === 'string') return false;
      return s.approvedAt && new Date(s.approvedAt) > sevenDaysAgo;
    });

    return jsonResponse(
      {
        approved: sources.approved,
        candidates: sources.candidates,
        recentlyApproved,
      },
      200,
      env
    );
  } catch (error) {
    logStructured('error', 'Failed to fetch sources', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/sources/approve endpoint
 */
async function handleApproveSource(request, env, _ctx) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, env);
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || !url.startsWith('http')) {
      return jsonResponse({ error: 'Invalid URL' }, 400, env);
    }

    await addApprovedSource(url, env);

    logStructured('info', 'Source approved', { url });

    return jsonResponse({ success: true, url }, 200, env);
  } catch (error) {
    logStructured('error', 'Failed to approve source', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/sources/block endpoint
 */
async function handleBlockSource(request, env, _ctx) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, env);
  }

  try {
    const body = await request.json();
    const { url, domain } = body;

    const targetDomain = domain || (url ? new URL(url).hostname : null);

    if (!targetDomain) {
      return jsonResponse({ error: 'Invalid domain or URL' }, 400, env);
    }

    await blockDomain(targetDomain, env);

    logStructured('info', 'Domain blocked', { domain: targetDomain });

    return jsonResponse({ success: true, domain: targetDomain }, 200, env);
  } catch (error) {
    logStructured('error', 'Failed to block domain', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/discovery/refresh endpoint
 */
async function handleDiscovery(request, env, _ctx) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, env);
  }

  try {
    const candidates = await discoverNewSources(env);

    logStructured('info', 'Discovery completed', {
      candidatesFound: candidates.length,
    });

    return jsonResponse(
      {
        success: true,
        candidatesFound: candidates.length,
        candidates,
      },
      200,
      env
    );
  } catch (error) {
    logStructured('error', 'Discovery failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Handle /api/healthz endpoint
 */
async function handleHealth(request, env, _ctx) {
  try {
    const health = await createHealthCheck(env);
    const status = health.status === 'healthy' ? 200 : 503;

    return jsonResponse(health, status, env);
  } catch (error) {
    return jsonResponse(
      {
        status: 'unhealthy',
        error: error.message,
      },
      503,
      env
    );
  }
}

/**
 * Handle CORS preflight
 */
function handleCORS(request, env) {
  const headers = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  return new Response(null, { status: 204, headers });
}

/**
 * Create JSON response with security headers
 */
function jsonResponse(data, status, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Cache-Control': 'public, max-age=300', // 5 minutes
  };

  return new Response(JSON.stringify(data), { status, headers });
}
