/**
 * PHASE 2 ENHANCEMENTS
 * Enhanced risk scoring with multi-source correlation and critical combo detection
 */

import { calculateRiskScore } from './scoring.js';

/**
 * Government/Official sources for credibility bonus
 */
const GOV_SOURCES = [
  'CISA KEV',
  'CISA News',
  'Alerts',
  'NCSC UK',
  'US-CERT',
  'CERT',
  'NSA',
  'FBI',
  'DHS',
];

/**
 * Calculate Phase 2 enhanced risk score with multi-source and correlation bonuses
 *
 * @param {Object} item - Threat intelligence item with Phase 1 correlation data
 * @returns {Object} - { score, severity, evidence, badges }
 */
export function calculateEnhancedRiskScore(item) {
  // Start with base Phase 1 score
  const baseResult = calculateRiskScore(item);
  let score = baseResult.score;
  const evidence = [...baseResult.evidence];
  const badges = [];

  // === PHASE 2 BONUSES ===

  // Multi-source bonus (+10 if reported by 3+ sources)
  if (item.sourceCount && item.sourceCount >= 3) {
    score += 10;
    evidence.push(`Reported by ${item.sourceCount} sources (high confidence)`);
    badges.push('MULTI-SOURCE');
  }

  // Government sources bonus (+15 if 2+ gov sources)
  if (item.sources && Array.isArray(item.sources)) {
    const govSourcesCount = item.sources.filter(s => GOV_SOURCES.includes(s)).length;
    if (govSourcesCount >= 2) {
      score += 15;
      evidence.push(`Confirmed by ${govSourcesCount} government sources`);
      badges.push('GOV-CONFIRMED');
    }
  }

  // Critical combo detection: KEV + Zero-day + Exploited in the wild
  const hasKEV = item.tags && item.tags.includes('KEV');
  const hasZeroDay = item.tags && item.tags.includes('ZERO-DAY');
  const hasExploited =
    item.tags &&
    (item.tags.includes('EXPLOITED') ||
      item.tags.includes('ACTIVE-EXPLOITATION') ||
      item.tags.includes('IN-THE-WILD'));

  if (hasKEV && hasZeroDay && hasExploited) {
    score += 20;
    evidence.push('CRITICAL COMBO: KEV + Zero-day + Active exploitation');
    badges.push('CRITICAL-COMBO');
  }

  // Critical ransomware combo: Ransomware + POC + Critical severity
  const hasRansomware = item.tags && item.tags.includes('RANSOMWARE');
  const hasPOC = item.tags && item.tags.includes('POC');
  const isCritical = score >= 90;

  if (hasRansomware && hasPOC && isCritical) {
    score += 15;
    evidence.push('CRITICAL COMBO: Ransomware + POC available + Critical severity');
    badges.push('RANSOMWARE-CRITICAL');
  }

  // Trending bonus (+5 if has high correlation)
  if (item.relatedCount && item.relatedCount >= 3) {
    score += 5;
    evidence.push(`Trending: ${item.relatedCount} related threats`);
    badges.push('TRENDING');
  }

  // APT/Targeted attack badge
  const hasAPT = item.tags && item.tags.some(tag => /^APT\d+$/i.test(tag));
  if (hasAPT) {
    badges.push('APT-TARGETED');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine severity with Phase 2 thresholds
  let severity;
  if (score >= 95) {
    severity = 'CRITICAL';
  } else if (score >= 85) {
    severity = 'HIGH';
  } else if (score >= 70) {
    severity = 'MEDIUM';
  } else if (score >= 40) {
    severity = 'LOW';
  } else {
    severity = 'INFO';
  }

  return {
    score: Math.round(score),
    severity,
    evidence,
    badges,
  };
}

/**
 * Sort threats by Phase 2 bubble-up algorithm
 * Priority: score -> sourceCount -> recency
 *
 * @param {Array} items - Array of threat items
 * @returns {Array} - Sorted array
 */
export function bubbleUpSort(items) {
  return items.sort((a, b) => {
    if (b.riskScore !== a.riskScore) {
      return b.riskScore - a.riskScore;
    }
    const aSourceCount = a.sourceCount || 1;
    const bSourceCount = b.sourceCount || 1;
    if (bSourceCount !== aSourceCount) {
      return bSourceCount - aSourceCount;
    }
    return new Date(b.pubDate) - new Date(a.pubDate);
  });
}

/**
 * Get top N threats using bubble-up algorithm
 *
 * @param {Array} items - Array of threat items
 * @param {number} limit - Number of top threats to return
 * @returns {Array} - Top N threats
 */
export function getTopThreats(items, limit = 10) {
  const sorted = bubbleUpSort([...items]);
  return sorted.slice(0, limit);
}

/**
 * Filter threats by minimum severity
 *
 * @param {Array} items - Array of threat items
 * @param {string} minSeverity - Minimum severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * @returns {Array} - Filtered threats
 */
export function filterByMinSeverity(items, minSeverity) {
  const severityOrder = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const minIndex = severityOrder.indexOf(minSeverity.toUpperCase());
  if (minIndex === -1) return items;
  return items.filter(item => {
    const itemIndex = severityOrder.indexOf(item.severity);
    return itemIndex >= minIndex;
  });
}
