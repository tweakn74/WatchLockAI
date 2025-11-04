/**
 * Risk Scoring Engine
 * Evidence-based risk scoring for threat intelligence prioritization
 */

/**
 * Source credibility tiers and multipliers
 */
const SOURCE_TIERS = {
  // Tier 1: Government/Official (highest credibility)
  'CISA KEV': 1.2,
  'CISA News': 1.2,
  Alerts: 1.2,
  'NCSC UK': 1.2,

  // Tier 2: Vendor/Research (high credibility)
  'Microsoft Security Blog': 1.1,
  'Threat Intelligence': 1.1, // Google
  'Cisco Talos Blog': 1.1,
  Mandiant: 1.1,

  // Tier 3: Reputable News (standard credibility)
  BleepingComputer: 1.0,
  'The Record from Recorded Future News': 1.0,
  'Krebs on Security': 1.0,

  // Default for unknown sources
  default: 0.9,
};

/**
 * Calculate evidence-based risk score for a threat intelligence item
 *
 * Score components:
 * - Base Score (40 points): KEV, CVE, Zero-day, MITRE ATT&CK
 * - Exploitability (30 points): POC, Exploit kit, Active exploitation
 * - Temporal (20 points): Age of threat
 * - Threat Type (10 points): Ransomware, APT, Malware, etc.
 *
 * @param {Object} item - Threat intelligence item
 * @returns {Object} - { score, severity, evidence }
 */
export function calculateRiskScore(item) {
  let score = 0;
  const evidence = [];

  // === BASE SCORE (40 points max) ===

  // KEV (Known Exploited Vulnerability) - highest priority
  if (item.tags && item.tags.includes('KEV')) {
    score += 40;
    evidence.push('Listed in CISA KEV (actively exploited)');
  }
  // Zero-day (no patch available)
  else if (item.tags && item.tags.includes('ZERO-DAY')) {
    score += 30;
    evidence.push('Zero-day vulnerability (no patch available)');
  }
  // Has CVE identifier
  else if (item.tags && item.tags.some(tag => tag.startsWith('CVE-'))) {
    score += 20;
    evidence.push('Has CVE identifier');
  }

  // Has MITRE ATT&CK technique mapping
  if (item.tags && item.tags.some(tag => /^T\d{4}/.test(tag))) {
    score += 10;
    evidence.push('Mapped to MITRE ATT&CK technique');
  }

  // === EXPLOITABILITY SCORE (30 points max) ===

  const text = `${item.title} ${item.description || ''}`.toLowerCase();

  // Active exploitation in the wild
  if (/exploit.*wild|actively exploited|under attack/i.test(text)) {
    score += 30;
    evidence.push('Active exploitation reported');
  }
  // Exploit kit integration
  else if (detectExploitKit(text)) {
    score += 20;
    evidence.push('Integrated into exploit kit');
  }
  // POC (Proof of Concept) available
  else if (/proof[- ]of[- ]concept|poc|exploit.*code|exploit.*available/i.test(text)) {
    score += 15;
    evidence.push('Proof of concept available');
  }

  // === TEMPORAL SCORE (20 points max) ===

  const age = getAgeInHours(item.pubDate);

  if (age <= 24) {
    score += 20;
    evidence.push('Published in last 24 hours');
  } else if (age <= 168) {
    // 7 days
    score += 15;
    evidence.push('Published in last 7 days');
  } else if (age <= 720) {
    // 30 days
    score += 10;
    evidence.push('Published in last 30 days');
  } else {
    score += 5;
    evidence.push('Older threat intelligence');
  }

  // === THREAT TYPE BONUS (10 points max) ===

  if (item.tags && item.tags.includes('RANSOMWARE')) {
    score += 10;
    evidence.push('Ransomware threat');
  } else if (item.tags && item.tags.includes('APT')) {
    score += 8;
    evidence.push('Advanced Persistent Threat');
  } else if (item.tags && item.tags.includes('MALWARE')) {
    score += 6;
    evidence.push('Malware threat');
  } else if (item.tags && item.tags.includes('EXPLOIT')) {
    score += 6;
    evidence.push('Exploit available');
  } else if (item.tags && item.tags.includes('PHISHING')) {
    score += 4;
    evidence.push('Phishing campaign');
  }

  // === SOURCE CREDIBILITY MULTIPLIER ===

  const sourceMultiplier = SOURCE_TIERS[item.source] || SOURCE_TIERS.default;
  score = Math.round(score * sourceMultiplier);

  if (sourceMultiplier > 1.0) {
    evidence.push(`High-credibility source (${item.source})`);
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine severity
  const severity = getSeverity(score);

  return {
    score,
    severity,
    evidence,
  };
}

/**
 * Determine severity level based on risk score
 *
 * @param {number} score - Risk score (0-100)
 * @returns {string} - Severity level
 */
export function getSeverity(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get severity color for UI display
 *
 * @param {string} severity - Severity level
 * @returns {string} - CSS color
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case 'CRITICAL':
      return '#d32f2f'; // Red 700
    case 'HIGH':
      return '#f57c00'; // Orange 700
    case 'MEDIUM':
      return '#fbc02d'; // Yellow 700
    case 'LOW':
      return '#388e3c'; // Green 700
    default:
      return '#757575'; // Grey 600
  }
}

/**
 * Detect exploit kit mentions in text
 *
 * @param {string} text - Text to search
 * @returns {boolean} - True if exploit kit detected
 */
function detectExploitKit(text) {
  const exploitKits = [
    'angler',
    'neutrino',
    'rig',
    'magnitude',
    'fallout',
    'spelevo',
    'sundown',
    'terror',
    'underminer',
    'greenflash',
    'kaixin',
  ];

  return exploitKits.some(kit => text.includes(kit));
}

/**
 * Get age of item in hours
 *
 * @param {string} pubDate - ISO-8601 date string
 * @returns {number} - Age in hours
 */
function getAgeInHours(pubDate) {
  try {
    const published = new Date(pubDate);
    const now = new Date();
    const diffMs = now - published;
    return diffMs / (1000 * 60 * 60);
  } catch {
    return 999999; // Very old if date parsing fails
  }
}

/**
 * Add risk scores to array of items
 *
 * @param {Array} items - Array of threat intelligence items
 * @returns {Array} - Items with risk scores added
 */
export function addRiskScores(items) {
  return items.map(item => {
    const { score, severity, evidence } = calculateRiskScore(item);
    return {
      ...item,
      riskScore: score,
      severity,
      riskEvidence: evidence,
    };
  });
}

/**
 * Filter items by severity level
 *
 * @param {Array} items - Array of items with risk scores
 * @param {string} severityFilter - Severity level to filter by (or 'ALL')
 * @returns {Array} - Filtered items
 */
export function filterBySeverity(items, severityFilter) {
  if (!severityFilter || severityFilter === 'ALL') {
    return items;
  }

  return items.filter(item => item.severity === severityFilter);
}

/**
 * Sort items by risk score (descending)
 *
 * @param {Array} items - Array of items with risk scores
 * @returns {Array} - Sorted items
 */
export function sortByRiskScore(items) {
  return items.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
}
