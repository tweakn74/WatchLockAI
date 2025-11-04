/**
 * Cross-source correlation logic for threat intelligence
 * Identifies related threats and builds correlation matrix
 */

import { extractCVEs } from './deduplication.js';

/**
 * Generate a unique correlation ID based on primary identifiers
 *
 * @param {Object} item - Threat intelligence item
 * @returns {string} - Correlation ID
 */
export function generateCorrelationId(item) {
  // Priority: CVE > URL > Title hash
  const cves = extractCVEs(item.tags);
  if (cves.length > 0) {
    return `cve:${cves.sort().join(',')}`;
  }

  if (item.link) {
    try {
      const url = new URL(item.link);
      return `url:${url.hostname}${url.pathname}`;
    } catch {
      // Fall through to title hash
    }
  }

  // Hash the title for correlation ID
  return `title:${hashString(item.title)}`;
}

/**
 * Simple string hash function
 *
 * @param {string} str - String to hash
 * @returns {string} - Hash string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Find related threats based on shared attributes
 *
 * @param {Object} item - Target item
 * @param {Array} allItems - All items to search
 * @returns {Array} - Array of related item IDs
 */
export function findRelatedThreats(item, allItems) {
  const related = [];
  const itemCVEs = extractCVEs(item.tags);
  const itemTags = new Set(item.tags || []);

  allItems.forEach(other => {
    // Skip self
    if (other === item) return;

    // Skip if already in same source group
    if (item.sources && other.sources) {
      const commonSources = item.sources.filter(s => other.sources.includes(s));
      if (commonSources.length === item.sources.length) return;
    }

    let relationScore = 0;
    const reasons = [];

    // 1. Shared CVEs (strongest relation)
    const otherCVEs = extractCVEs(other.tags);
    const commonCVEs = itemCVEs.filter(cve => otherCVEs.includes(cve));
    if (commonCVEs.length > 0) {
      relationScore += 50 * commonCVEs.length;
      reasons.push(`Shared CVE: ${commonCVEs.join(', ')}`);
    }

    // 2. Shared tags (medium relation)
    const otherTags = new Set(other.tags || []);
    const commonTags = [...itemTags].filter(tag => otherTags.has(tag) && !tag.startsWith('CVE-'));
    if (commonTags.length >= 3) {
      relationScore += 20;
      reasons.push(`Shared tags: ${commonTags.slice(0, 3).join(', ')}`);
    }

    // 3. Same threat actor (APT)
    const itemAPTs = [...itemTags].filter(tag => /^APT\d+$/i.test(tag));
    const otherAPTs = [...otherTags].filter(tag => /^APT\d+$/i.test(tag));
    const commonAPTs = itemAPTs.filter(apt => otherAPTs.includes(apt));
    if (commonAPTs.length > 0) {
      relationScore += 30;
      reasons.push(`Same threat actor: ${commonAPTs.join(', ')}`);
    }

    // 4. Temporal proximity (published within 24 hours)
    const timeDiff = Math.abs(new Date(item.pubDate) - new Date(other.pubDate));
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    if (hoursDiff <= 24 && relationScore > 0) {
      relationScore += 10;
      reasons.push('Published within 24 hours');
    }

    // Add to related if score is high enough
    if (relationScore >= 30) {
      related.push({
        link: other.link,
        title: other.title,
        source: other.source || other.sources?.[0],
        relationScore,
        reasons,
      });
    }
  });

  // Sort by relation score and return top 5
  return related.sort((a, b) => b.relationScore - a.relationScore).slice(0, 5);
}

/**
 * Build correlation matrix for all items
 *
 * @param {Array} items - Array of threat intelligence items
 * @returns {Object} - Correlation matrix { itemId: [relatedIds] }
 */
export function buildCorrelationMatrix(items) {
  const matrix = {};

  items.forEach((item, index) => {
    const itemId = item.link || `item-${index}`;
    const related = findRelatedThreats(item, items);
    matrix[itemId] = related;
  });

  return matrix;
}

/**
 * Add correlation data to items
 *
 * @param {Array} items - Array of threat intelligence items
 * @returns {Array} - Items with correlation data added
 */
export function addCorrelationData(items) {
  // Generate correlation IDs
  const itemsWithIds = items.map(item => ({
    ...item,
    correlationId: generateCorrelationId(item),
  }));

  // Find related threats for each item
  const itemsWithRelated = itemsWithIds.map(item => {
    const related = findRelatedThreats(item, itemsWithIds);
    return {
      ...item,
      relatedThreats: related,
      relatedCount: related.length,
    };
  });

  return itemsWithRelated;
}

/**
 * Get correlation statistics
 *
 * @param {Array} items - Array of items with correlation data
 * @returns {Object} - Statistics
 */
export function getCorrelationStats(items) {
  const totalItems = items.length;
  const itemsWithRelated = items.filter(item => item.relatedCount > 0).length;
  const avgRelatedCount =
    items.reduce((sum, item) => sum + (item.relatedCount || 0), 0) / totalItems;

  // Count items by source count
  const multiSourceItems = items.filter(item => item.sourceCount > 1).length;

  // Find most correlated item
  const mostCorrelated = items.reduce(
    (max, item) => (item.relatedCount > max.relatedCount ? item : max),
    { relatedCount: 0 }
  );

  return {
    totalItems,
    itemsWithRelated,
    itemsWithRelatedPercent: ((itemsWithRelated / totalItems) * 100).toFixed(1),
    avgRelatedCount: avgRelatedCount.toFixed(2),
    multiSourceItems,
    multiSourcePercent: ((multiSourceItems / totalItems) * 100).toFixed(1),
    mostCorrelated: {
      title: mostCorrelated.title,
      relatedCount: mostCorrelated.relatedCount,
    },
  };
}
