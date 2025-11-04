/**
 * Detection Correlation Module
 * Links threats to recommended detection rules based on MITRE ATT&CK techniques
 */

/**
 * Load detection catalog from KV or static data
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Promise<Array>} Array of detection rules
 */
export async function loadDetections(env) {
  try {
    // Try to load from KV first
    if (env.THREAT_INTEL_KV) {
      const cached = await env.THREAT_INTEL_KV.get('detections', { type: 'json' });
      if (cached && cached.detections) {
        return cached.detections;
      }
    }

    // Fallback to static data (would be loaded from detections.json in production)
    // In production, this would be populated during build/deployment
    return [];
  } catch (error) {
    console.error('Error loading detections:', error);
    return [];
  }
}

/**
 * Extract MITRE ATT&CK technique IDs from threat data
 * @param {Object} threat - Threat object
 * @returns {Array<string>} Array of technique IDs (e.g., ['T1566', 'T1059.001'])
 */
function extractTechniques(threat) {
  const techniques = new Set();

  // Check title and description for technique IDs
  const text = `${threat.title || ''} ${threat.description || ''}`.toUpperCase();
  const techniquePattern = /T\d{4}(?:\.\d{3})?/g;
  const matches = text.match(techniquePattern);

  if (matches) {
    matches.forEach(t => techniques.add(t));
  }

  // Check tags for technique IDs
  if (threat.tags && Array.isArray(threat.tags)) {
    threat.tags.forEach(tag => {
      const tagUpper = tag.toUpperCase();
      const tagMatches = tagUpper.match(techniquePattern);
      if (tagMatches) {
        tagMatches.forEach(t => techniques.add(t));
      }
    });
  }

  // Check MITRE field if present
  if (threat.mitre && Array.isArray(threat.mitre)) {
    threat.mitre.forEach(t => techniques.add(t.toUpperCase()));
  }

  return Array.from(techniques);
}

/**
 * Find recommended detections for a threat based on MITRE techniques
 * @param {Object} threat - Threat object
 * @param {Array} detections - Array of detection rules
 * @returns {Array} Array of recommended detections with match info
 */
export function findRecommendedDetections(threat, detections) {
  const threatTechniques = extractTechniques(threat);

  if (threatTechniques.length === 0 || detections.length === 0) {
    return [];
  }

  const recommendations = [];

  detections.forEach(detection => {
    const matchedTechniques = [];
    let matchScore = 0;

    // Check if detection covers any of the threat's techniques
    detection.techniques.forEach(detTech => {
      if (threatTechniques.includes(detTech.id)) {
        matchedTechniques.push(detTech);

        // Score based on severity
        if (detection.severity === 'CRITICAL') matchScore += 10;
        else if (detection.severity === 'HIGH') matchScore += 7;
        else if (detection.severity === 'MEDIUM') matchScore += 5;
        else matchScore += 3;

        // Bonus for stable detections
        if (detection.status === 'stable') matchScore += 5;
        else if (detection.status === 'preview') matchScore += 3;
      }
    });

    if (matchedTechniques.length > 0) {
      recommendations.push({
        detectionId: detection.id,
        detectionName: detection.name,
        severity: detection.severity,
        status: detection.status,
        platform: detection.platform,
        matchedTechniques: matchedTechniques.map(t => t.id),
        matchScore,
        coverage: Math.round((matchedTechniques.length / threatTechniques.length) * 100),
      });
    }
  });

  // Sort by match score (highest first), then by severity
  recommendations.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Return top 5 recommendations
  return recommendations.slice(0, 5);
}

/**
 * Add detection recommendations to all threats
 * @param {Array} threats - Array of threat objects
 * @param {Array} detections - Array of detection rules
 * @returns {Array} Threats with recommendedDetections field added
 */
export function addDetectionRecommendations(threats, detections) {
  if (!Array.isArray(threats) || !Array.isArray(detections) || detections.length === 0) {
    return threats;
  }

  return threats.map(threat => {
    const recommendations = findRecommendedDetections(threat, detections);

    return {
      ...threat,
      recommendedDetections: recommendations,
      detectionCoverage: recommendations.length > 0 ? recommendations[0].coverage : 0,
    };
  });
}

/**
 * Get detection coverage statistics
 * @param {Array} threats - Array of threats with detection recommendations
 * @returns {Object} Coverage statistics
 */
export function getDetectionCoverageStats(threats) {
  if (!Array.isArray(threats) || threats.length === 0) {
    return {
      totalThreats: 0,
      threatsWithDetections: 0,
      coveragePercentage: 0,
      avgCoverage: 0,
      criticalWithDetections: 0,
      highWithDetections: 0,
    };
  }

  const threatsWithDetections = threats.filter(
    t => t.recommendedDetections && t.recommendedDetections.length > 0
  );

  const criticalThreats = threats.filter(t => t.severity === 'CRITICAL');
  const highThreats = threats.filter(t => t.severity === 'HIGH');

  const criticalWithDetections = criticalThreats.filter(
    t => t.recommendedDetections && t.recommendedDetections.length > 0
  );

  const highWithDetections = highThreats.filter(
    t => t.recommendedDetections && t.recommendedDetections.length > 0
  );

  const totalCoverage = threatsWithDetections.reduce(
    (sum, t) => sum + (t.detectionCoverage || 0),
    0
  );

  const avgCoverage =
    threatsWithDetections.length > 0 ? totalCoverage / threatsWithDetections.length : 0;

  return {
    totalThreats: threats.length,
    threatsWithDetections: threatsWithDetections.length,
    coveragePercentage: Math.round((threatsWithDetections.length / threats.length) * 100),
    avgCoverage: Math.round(avgCoverage),
    criticalWithDetections: criticalWithDetections.length,
    highWithDetections: highWithDetections.length,
  };
}

/**
 * Get most recommended detections across all threats
 * @param {Array} threats - Array of threats with detection recommendations
 * @returns {Array} Top recommended detections with usage count
 */
export function getTopRecommendedDetections(threats) {
  const detectionCounts = {};

  threats.forEach(threat => {
    if (threat.recommendedDetections && Array.isArray(threat.recommendedDetections)) {
      threat.recommendedDetections.forEach(rec => {
        if (!detectionCounts[rec.detectionId]) {
          detectionCounts[rec.detectionId] = {
            ...rec,
            recommendedCount: 0,
          };
        }
        detectionCounts[rec.detectionId].recommendedCount++;
      });
    }
  });

  return Object.values(detectionCounts)
    .sort((a, b) => b.recommendedCount - a.recommendedCount)
    .slice(0, 10);
}

