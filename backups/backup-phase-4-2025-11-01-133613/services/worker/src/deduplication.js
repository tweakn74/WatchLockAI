/**
 * Advanced deduplication logic for threat intelligence items
 * Identifies and merges duplicate threats reported by multiple sources
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy title matching
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity ratio (0 = completely different, 1 = identical)
 */
function similarityRatio(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Extract CVE IDs from tags array
 *
 * @param {Array<string>} tags - Tags array
 * @returns {Array<string>} - CVE IDs
 */
export function extractCVEs(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter(tag => /^CVE-\d{4}-\d{4,}$/i.test(tag));
}

/**
 * Extract IOCs (Indicators of Compromise) from text
 *
 * @param {string} text - Text to extract IOCs from
 * @returns {Object} - { ips, domains, hashes }
 */
function extractIOCs(text) {
  if (!text) return { ips: [], domains: [], hashes: [] };

  const ips = [];
  const domains = [];
  const hashes = [];

  // IP addresses (IPv4)
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ipMatches = text.match(ipRegex);
  if (ipMatches) {
    ips.push(
      ...ipMatches.filter(ip => {
        const parts = ip.split('.');
        return parts.every(part => parseInt(part) <= 255);
      })
    );
  }

  // Domains (basic pattern)
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  const domainMatches = text.match(domainRegex);
  if (domainMatches) {
    domains.push(...domainMatches.map(d => d.toLowerCase()));
  }

  // Hashes (MD5, SHA1, SHA256)
  const md5Regex = /\b[a-f0-9]{32}\b/gi;
  const sha1Regex = /\b[a-f0-9]{40}\b/gi;
  const sha256Regex = /\b[a-f0-9]{64}\b/gi;

  const md5Matches = text.match(md5Regex);
  const sha1Matches = text.match(sha1Regex);
  const sha256Matches = text.match(sha256Regex);

  if (md5Matches) hashes.push(...md5Matches.map(h => h.toLowerCase()));
  if (sha1Matches) hashes.push(...sha1Matches.map(h => h.toLowerCase()));
  if (sha256Matches) hashes.push(...sha256Matches.map(h => h.toLowerCase()));

  return { ips, domains, hashes };
}

/**
 * Normalize URL for comparison
 *
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrlForComparison(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Remove trailing slashes, query params, fragments
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Check if two items are duplicates based on multiple criteria
 *
 * @param {Object} item1 - First item
 * @param {Object} item2 - Second item
 * @returns {Object} - { isDuplicate: boolean, matchType: string, confidence: number }
 */
export function areDuplicates(item1, item2) {
  // 1. Exact URL match (highest confidence)
  if (item1.link && item2.link) {
    const url1 = normalizeUrlForComparison(item1.link);
    const url2 = normalizeUrlForComparison(item2.link);
    if (url1 === url2 && url1 !== '') {
      return { isDuplicate: true, matchType: 'url', confidence: 1.0 };
    }
  }

  // 2. CVE match (very high confidence)
  const cves1 = extractCVEs(item1.tags);
  const cves2 = extractCVEs(item2.tags);
  if (cves1.length > 0 && cves2.length > 0) {
    const commonCVEs = cves1.filter(cve => cves2.includes(cve));
    if (commonCVEs.length > 0) {
      // Also check title similarity to avoid false positives
      const titleSim = similarityRatio(item1.title, item2.title);
      if (titleSim >= 0.6) {
        return { isDuplicate: true, matchType: 'cve', confidence: 0.95 };
      }
    }
  }

  // 3. Title similarity (high confidence if very similar)
  const titleSim = similarityRatio(item1.title, item2.title);
  if (titleSim >= 0.85) {
    return { isDuplicate: true, matchType: 'title', confidence: titleSim };
  }

  // 4. IOC match (medium-high confidence)
  const iocs1 = extractIOCs(item1.title + ' ' + (item1.description || ''));
  const iocs2 = extractIOCs(item2.title + ' ' + (item2.description || ''));

  // Check for common IOCs
  const commonIPs = iocs1.ips.filter(ip => iocs2.ips.includes(ip));
  const commonDomains = iocs1.domains.filter(d => iocs2.domains.includes(d));
  const commonHashes = iocs1.hashes.filter(h => iocs2.hashes.includes(h));

  const totalIOCs1 = iocs1.ips.length + iocs1.domains.length + iocs1.hashes.length;
  const totalIOCs2 = iocs2.ips.length + iocs2.domains.length + iocs2.hashes.length;
  const commonIOCs = commonIPs.length + commonDomains.length + commonHashes.length;

  if (commonIOCs > 0 && totalIOCs1 > 0 && totalIOCs2 > 0) {
    const iocOverlap = commonIOCs / Math.min(totalIOCs1, totalIOCs2);
    if (iocOverlap >= 0.5 && titleSim >= 0.5) {
      return { isDuplicate: true, matchType: 'ioc', confidence: 0.75 };
    }
  }

  return { isDuplicate: false, matchType: 'none', confidence: 0 };
}

/**
 * Merge two duplicate items into a unified threat object
 *
 * @param {Object} item1 - First item
 * @param {Object} item2 - Second item
 * @returns {Object} - Merged item
 */
export function mergeItems(item1, item2) {
  // Determine which item is more recent
  const date1 = new Date(item1.pubDate);
  const date2 = new Date(item2.pubDate);
  const primary = date1 >= date2 ? item1 : item2;

  // Merge sources
  const sources = [];
  if (item1.source) sources.push(item1.source);
  if (item2.source && item2.source !== item1.source) sources.push(item2.source);

  // Merge tags (unique)
  const allTags = [...(item1.tags || []), ...(item2.tags || [])];
  const uniqueTags = [...new Set(allTags)];

  // Use primary item's data, but add merged fields
  return {
    ...primary,
    sources, // Array of all sources that reported this threat
    sourceCount: sources.length,
    tags: uniqueTags,
    // Keep both links if different
    alternateLinks: [item1.link, item2.link].filter((link, index, arr) => {
      return link && arr.indexOf(link) === index && link !== primary.link;
    }),
  };
}

/**
 * Deduplicate array of items using advanced matching
 *
 * @param {Array} items - Array of threat intelligence items
 * @returns {Array} - Deduplicated items with merged data
 */
export function deduplicateAdvanced(items) {
  if (!items || items.length === 0) return [];

  const groups = []; // Array of arrays, each inner array is a group of duplicates

  // Group duplicates
  items.forEach(item => {
    let foundGroup = false;

    for (const group of groups) {
      // Check if item matches any item in this group
      const match = group.find(groupItem => {
        const result = areDuplicates(item, groupItem);
        return result.isDuplicate;
      });

      if (match) {
        group.push(item);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([item]);
    }
  });

  // Merge each group into a single item
  const deduplicated = groups.map(group => {
    if (group.length === 1) {
      // No duplicates, return as-is but add sources array
      return {
        ...group[0],
        sources: [group[0].source],
        sourceCount: 1,
      };
    }

    // Merge all items in group
    let merged = group[0];
    for (let i = 1; i < group.length; i++) {
      merged = mergeItems(merged, group[i]);
    }

    return merged;
  });

  return deduplicated;
}
