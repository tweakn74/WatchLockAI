/**
 * Feed fetching, parsing, and normalization
 */

import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

/**
 * Fetch all feeds with rate limiting and retries
 */
export async function fetchAllFeeds(feedUrls, env) {
  const items = [];
  const maxConcurrent = 5;
  const timeout = 10000; // 10 seconds

  // Process feeds in batches
  for (let i = 0; i < feedUrls.length; i += maxConcurrent) {
    const batch = feedUrls.slice(i, i + maxConcurrent);
    const promises = batch.map(url => fetchFeed(url, env, timeout));
    const results = await Promise.allSettled(promises);

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        console.error(`Feed failed: ${batch[idx]}`, result.reason);
      }
    });

    // Small delay between batches
    if (i + maxConcurrent < feedUrls.length) {
      await sleep(100);
    }
  }

  return items;
}

/**
 * Fetch a single feed with timeout and retry
 */
async function fetchFeed(url, env, timeout, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'APT-Tracker-MITRE-AIQ-Intel/1.0 (Threat Intelligence Aggregator)',
          Accept: 'application/rss+xml, application/atom+xml, application/json, text/xml, */*',
        },
        cf: {
          cacheTtl: 300, // 5 minutes
          cacheEverything: true,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (contentType.includes('json')) {
        return parseJsonFeed(text, url);
      } else {
        return parseXmlFeed(text, url);
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 5000);
      await sleep(delay);
    }
  }
}

/**
 * Parse XML feed (RSS or Atom)
 */
function parseXmlFeed(xml, sourceUrl) {
  const items = [];

  try {
    const parsed = xmlParser.parse(xml);

    // RSS 2.0
    if (parsed.rss && parsed.rss.channel) {
      const channel = parsed.rss.channel;
      const feedItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

      feedItems.forEach(item => {
        items.push({
          title: item.title || 'Untitled',
          link: item.link || item.guid || sourceUrl,
          pubDate: item.pubDate || item['dc:date'] || new Date().toISOString(),
          description: item.description || '',
          source: channel.title || new URL(sourceUrl).hostname,
          sourceUrl,
        });
      });
    }

    // Atom
    else if (parsed.feed) {
      const feed = parsed.feed;
      const feedItems = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean);

      feedItems.forEach(entry => {
        const link = entry.link ? (Array.isArray(entry.link) ? entry.link[0] : entry.link) : {};

        items.push({
          title: entry.title || 'Untitled',
          link: link['@_href'] || link.href || sourceUrl,
          pubDate: entry.updated || entry.published || new Date().toISOString(),
          description: entry.summary || entry.content || '',
          source: feed.title || new URL(sourceUrl).hostname,
          sourceUrl,
        });
      });
    }
  } catch (error) {
    console.error('XML parse error:', error);
  }

  return items;
}

/**
 * Parse JSON feed (CISA KEV or custom format)
 */
function parseJsonFeed(json, sourceUrl) {
  const items = [];

  try {
    const data = JSON.parse(json);

    // CISA KEV format
    if (data.vulnerabilities && Array.isArray(data.vulnerabilities)) {
      data.vulnerabilities.forEach(vuln => {
        items.push({
          title: `${vuln.cveID}: ${vuln.vulnerabilityName}`,
          link: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
          pubDate: vuln.dateAdded || new Date().toISOString(),
          description: vuln.shortDescription || '',
          source: 'CISA KEV',
          sourceUrl,
          tags: [vuln.cveID, 'KEV', 'HIGH-PRIORITY'],
        });
      });
    }

    // Generic JSON feed
    else if (data.items && Array.isArray(data.items)) {
      data.items.forEach(item => {
        items.push({
          title: item.title || 'Untitled',
          link: item.link || item.url || sourceUrl,
          pubDate: item.pubDate || item.date || new Date().toISOString(),
          description: item.description || item.summary || '',
          source: data.title || new URL(sourceUrl).hostname,
          sourceUrl,
        });
      });
    }
  } catch (error) {
    console.error('JSON parse error:', error);
  }

  return items;
}

/**
 * Normalize items to standard format
 */
export function normalizeItems(items) {
  return items.map(item => {
    // Normalize date to ISO-8601 UTC
    let pubDate;
    try {
      pubDate = new Date(item.pubDate).toISOString();
    } catch {
      pubDate = new Date().toISOString();
    }

    // Extract and sanitize
    const title = sanitizeHtml(item.title || 'Untitled');
    const description = sanitizeHtml(item.description || '');
    const link = normalizeUrl(item.link);

    // Extract tags
    const tags = item.tags || extractTags(title + ' ' + description);

    return {
      title,
      link,
      pubDate,
      description,
      source: item.source,
      tags,
    };
  });
}

/**
 * Extract tags from text (CVE, MITRE ATT&CK, keywords)
 */
export function extractTags(text) {
  const tags = new Set();

  // CVE pattern
  const cveMatches = text.match(/CVE-\d{4}-\d{4,}/gi);
  if (cveMatches) {
    cveMatches.forEach(cve => tags.add(cve.toUpperCase()));
  }

  // MITRE ATT&CK technique IDs (T####.### or T####)
  const attackMatches = text.match(/T\d{4}(\.\d{3})?/gi);
  if (attackMatches) {
    attackMatches.forEach(tid => tags.add(tid.toUpperCase()));
  }

  // CWE pattern
  const cweMatches = text.match(/CWE-\d+/gi);
  if (cweMatches) {
    cweMatches.forEach(cwe => tags.add(cwe.toUpperCase()));
  }

  // Keywords
  if (/ransom/i.test(text)) tags.add('RANSOMWARE');
  if (/zero[- ]?day|0[- ]?day/i.test(text)) tags.add('ZERO-DAY');
  if (/apt\d+|apt-\d+|advanced persistent threat/i.test(text)) tags.add('APT');
  if (/malware/i.test(text)) tags.add('MALWARE');
  if (/phishing/i.test(text)) tags.add('PHISHING');
  if (/exploit/i.test(text)) tags.add('EXPLOIT');

  return Array.from(tags);
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html) {
  if (!html) return '';

  // Convert to string if not already
  const str = typeof html === 'string' ? html : String(html);

  // Strip all HTML tags except safe ones
  let text = str.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  return text.trim();
}

/**
 * Normalize URL (remove tracking params, get canonical)
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Deduplicate items by link (or title hash)
 */
export function deduplicateItems(items) {
  const seen = new Map();

  items.forEach(item => {
    const key = item.link || hashString(item.title);

    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      // Keep the most recent
      const existing = seen.get(key);
      if (new Date(item.pubDate) > new Date(existing.pubDate)) {
        seen.set(key, item);
      }
    }
  });

  return Array.from(seen.values());
}

/**
 * Simple string hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
