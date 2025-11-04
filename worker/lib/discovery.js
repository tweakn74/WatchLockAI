/**
 * Discovery scraper for finding new threat intelligence sources
 */

import { addCandidateSource, isBlocked } from './sources.js';

// Seed list of known security blog directories and CERT portals
const DISCOVERY_SEEDS = [
  'https://www.cisa.gov',
  'https://www.ncsc.gov.uk',
  'https://www.cert.org',
  'https://www.us-cert.gov',
  'https://www.cert.europa.eu',
];

// Well-known feed paths to try
const FEED_PATHS = [
  '/feed',
  '/rss',
  '/atom.xml',
  '/rss.xml',
  '/feed.xml',
  '/blog/feed',
  '/blog/rss',
];

/**
 * Discover new threat intelligence sources
 */
export async function discoverNewSources(env) {
  const candidates = [];
  const maxPages = 20;
  let pagesVisited = 0;

  try {
    // Check robots.txt compliance
    const userAgent = 'APT-Tracker-MITRE-AIQ-Intel/1.0 (Threat Intelligence Aggregator)';

    for (const seedUrl of DISCOVERY_SEEDS) {
      if (pagesVisited >= maxPages) break;

      try {
        // Try well-known feed paths
        for (const feedPath of FEED_PATHS) {
          if (pagesVisited >= maxPages) break;

          const feedUrl = new URL(feedPath, seedUrl).toString();
          const domain = new URL(feedUrl).hostname;

          // Check if blocked
          if (await isBlocked(domain, env)) {
            continue;
          }

          // Try to fetch the feed
          const isValid = await validateFeed(feedUrl, userAgent);

          if (isValid) {
            candidates.push({
              url: feedUrl,
              title: domain,
              discoveredAt: new Date().toISOString(),
            });

            // Add to KV candidates
            await addCandidateSource(feedUrl, domain, env);
          }

          pagesVisited++;

          // Rate limiting
          await sleep(500);
        }

        // Also try to find RSS/Atom links in HTML
        const htmlFeeds = await findFeedsInHtml(seedUrl, userAgent, env);
        candidates.push(...htmlFeeds);
        pagesVisited++;
      } catch (error) {
        console.error(`Discovery failed for ${seedUrl}:`, error);
      }
    }

    // Add some curated security vendor feeds
    const curatedFeeds = await addCuratedFeeds(env);
    candidates.push(...curatedFeeds);
  } catch (error) {
    console.error('Discovery error:', error);
  }

  return candidates;
}

/**
 * Validate if a URL is a valid feed
 */
async function validateFeed(url, userAgent) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') || '';

    return (
      contentType.includes('xml') ||
      contentType.includes('rss') ||
      contentType.includes('atom') ||
      contentType.includes('json')
    );
  } catch {
    return false;
  }
}

/**
 * Find RSS/Atom links in HTML page
 */
async function findFeedsInHtml(url, userAgent, env) {
  const feeds = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return feeds;

    const html = await response.text();

    // Look for <link rel="alternate" type="application/rss+xml" href="...">
    const rssRegex =
      /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/rss\+xml["'][^>]+href=["']([^"']+)["']/gi;
    const atomRegex =
      /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/atom\+xml["'][^>]+href=["']([^"']+)["']/gi;

    let match;

    while ((match = rssRegex.exec(html)) !== null) {
      const feedUrl = new URL(match[1], url).toString();
      const domain = new URL(feedUrl).hostname;

      if (!(await isBlocked(domain, env))) {
        feeds.push({
          url: feedUrl,
          title: domain,
          discoveredAt: new Date().toISOString(),
        });

        await addCandidateSource(feedUrl, domain, env);
      }
    }

    while ((match = atomRegex.exec(html)) !== null) {
      const feedUrl = new URL(match[1], url).toString();
      const domain = new URL(feedUrl).hostname;

      if (!(await isBlocked(domain, env))) {
        feeds.push({
          url: feedUrl,
          title: domain,
          discoveredAt: new Date().toISOString(),
        });

        await addCandidateSource(feedUrl, domain, env);
      }
    }
  } catch (error) {
    console.error(`Failed to find feeds in ${url}:`, error);
  }

  return feeds;
}

/**
 * Add curated high-quality security feeds
 */
async function addCuratedFeeds(env) {
  const curated = [
    { url: 'https://www.darkreading.com/rss.xml', title: 'Dark Reading' },
    { url: 'https://threatpost.com/feed/', title: 'Threatpost' },
    { url: 'https://www.securityweek.com/feed/', title: 'SecurityWeek' },
    { url: 'https://www.schneier.com/blog/atom.xml', title: 'Schneier on Security' },
    { url: 'https://krebsonsecurity.com/feed/', title: 'Krebs on Security' },
    { url: 'https://www.troyhunt.com/rss/', title: 'Troy Hunt' },
    { url: 'https://www.sans.org/rss-feeds/', title: 'SANS Internet Storm Center' },
  ];

  const candidates = [];

  for (const feed of curated) {
    const domain = new URL(feed.url).hostname;

    if (!(await isBlocked(domain, env))) {
      candidates.push({
        url: feed.url,
        title: feed.title,
        discoveredAt: new Date().toISOString(),
      });

      await addCandidateSource(feed.url, feed.title, env);
    }
  }

  return candidates;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
