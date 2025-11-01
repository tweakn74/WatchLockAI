/**
 * Geopolitical Risk Assessment Module
 * Calculates and manages country-level cyber risk profiles
 */

/**
 * Load geopolitical risk data from KV or static file
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Object>} Geopolitical risk data
 */
export async function loadGeopoliticalRisks(env) {
  try {
    // Try to load from KV first
    if (env && env.THREAT_INTEL_KV) {
      const cached = await env.THREAT_INTEL_KV.get('geopolitical-risks', 'json');
      if (cached) {
        return cached;
      }
    }

    // Fallback to empty data structure
    return {
      version: '1.0.0',
      updated: new Date().toISOString(),
      countries: [],
    };
  } catch (error) {
    console.error('Error loading geopolitical risks:', error);
    return {
      version: '1.0.0',
      updated: new Date().toISOString(),
      countries: [],
    };
  }
}

/**
 * Calculate country risk score based on multiple factors
 * @param {string} country - Country name
 * @param {Array} threatData - Threat intelligence data
 * @returns {number} Risk score (0-100)
 */
export function calculateCountryRisk(country, _actorData, _threatData) {
  let score = 0;

  // Factor 1: Threat Actor Presence (40 points max)
  if (_actorData && _actorData.threatActors) {
    const actorsFromCountry = _actorData.threatActors.filter(actor => actor.country === country);
    const actorCount = actorsFromCountry.length;
    const advancedActors = actorsFromCountry.filter(
      actor => actor.sophistication === 'advanced'
    ).length;

    // Score based on actor count and sophistication
    score += Math.min(actorCount * 5 + advancedActors * 5, 40);
  }

  // Factor 2: Cyber Conflict History (30 points max)
  if (_threatData && Array.isArray(_threatData)) {
    const threatsRelatedToCountry = _threatData.filter(threat => {
      const text = `${threat.title} ${threat.description}`.toLowerCase();
      return text.includes(country.toLowerCase());
    });
    const conflictScore = Math.min(threatsRelatedToCountry.length * 2, 30);
    score += conflictScore;
  }

  // Factor 3: Critical Infrastructure Exposure (20 points max)
  // This would be based on external data sources in production
  // For now, use a baseline score
  score += 10;

  // Factor 4: Regulatory Environment (10 points max)
  // This would be based on regulatory maturity assessments
  // For now, use a baseline score
  score += 5;

  return Math.min(score, 100);
}

/**
 * Convert risk score to risk level
 * @param {number} score - Risk score (0-100)
 * @returns {string} Risk level (critical/high/medium/low)
 */
export function getRiskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Add geopolitical context to threats
 * @param {Array} threats - Threat intelligence items
 * @param {Object} riskData - Geopolitical risk data
 * @returns {Array} Threats with geopolitical context
 */
export function addGeopoliticalContext(threats, riskData) {
  if (!threats || !Array.isArray(threats)) {
    return threats;
  }

  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return threats;
  }

  return threats.map(threat => {
    const geopoliticalContext = [];

    // Extract countries mentioned in threat
    const threatText = `${threat.title} ${threat.description}`.toLowerCase();

    // Check each country in risk data
    riskData.countries.forEach(countryRisk => {
      const countryName = countryRisk.name.toLowerCase();
      if (threatText.includes(countryName)) {
        geopoliticalContext.push({
          country: countryRisk.name,
          riskScore: countryRisk.riskScore,
          riskLevel: countryRisk.riskLevel,
          region: countryRisk.region,
        });
      }
    });

    // Add actor country context if actor attribution exists
    if (threat.actorAttribution && Array.isArray(threat.actorAttribution)) {
      threat.actorAttribution.forEach(actor => {
        if (actor.country) {
          const countryRisk = riskData.countries.find(c => c.name === actor.country);
          if (countryRisk) {
            // Check if not already added
            const exists = geopoliticalContext.some(gc => gc.country === countryRisk.name);
            if (!exists) {
              geopoliticalContext.push({
                country: countryRisk.name,
                riskScore: countryRisk.riskScore,
                riskLevel: countryRisk.riskLevel,
                region: countryRisk.region,
                source: 'actor-attribution',
              });
            }
          }
        }
      });
    }

    // Add geopolitical context if any found
    if (geopoliticalContext.length > 0) {
      return {
        ...threat,
        geopoliticalContext: geopoliticalContext.slice(0, 3), // Limit to top 3
      };
    }

    return threat;
  });
}

/**
 * Calculate global risk statistics
 * @param {Object} riskData - Geopolitical risk data
 * @returns {Object} Global statistics
 */
export function getGlobalRiskStats(riskData) {
  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return {
      totalCountries: 0,
      criticalRisk: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      averageRiskScore: 0,
    };
  }

  const countries = riskData.countries;
  const totalCountries = countries.length;

  const criticalRisk = countries.filter(c => c.riskLevel === 'critical').length;
  const highRisk = countries.filter(c => c.riskLevel === 'high').length;
  const mediumRisk = countries.filter(c => c.riskLevel === 'medium').length;
  const lowRisk = countries.filter(c => c.riskLevel === 'low').length;

  const totalScore = countries.reduce((sum, c) => sum + c.riskScore, 0);
  const averageRiskScore = Math.round(totalScore / totalCountries);

  return {
    totalCountries,
    criticalRisk,
    highRisk,
    mediumRisk,
    lowRisk,
    averageRiskScore,
  };
}

/**
 * Get top risk countries
 * @param {Object} riskData - Geopolitical risk data
 * @param {number} limit - Number of countries to return
 * @returns {Array} Top risk countries
 */
export function getTopRiskCountries(riskData, limit = 10) {
  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return [];
  }

  return riskData.countries.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
}

/**
 * Get risk trends analysis
 * @param {Object} riskData - Geopolitical risk data
 * @returns {Object} Risk trends
 */
export function getRiskTrends(riskData) {
  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return {
      increasing: 0,
      stable: 0,
      decreasing: 0,
    };
  }

  const countries = riskData.countries;

  const increasing = countries.filter(c => c.trends && c.trends.direction === 'increasing').length;
  const stable = countries.filter(c => c.trends && c.trends.direction === 'stable').length;
  const decreasing = countries.filter(c => c.trends && c.trends.direction === 'decreasing').length;

  return {
    increasing,
    stable,
    decreasing,
  };
}

/**
 * Get countries by region
 * @param {Object} riskData - Geopolitical risk data
 * @param {string} region - Region name
 * @returns {Array} Countries in the region
 */
export function getCountriesByRegion(riskData, region) {
  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return [];
  }

  return riskData.countries.filter(c => c.region === region);
}

/**
 * Get risk distribution by region
 * @param {Object} riskData - Geopolitical risk data
 * @returns {Object} Risk distribution by region
 */
export function getRiskByRegion(riskData) {
  if (!riskData || !riskData.countries || riskData.countries.length === 0) {
    return {};
  }

  const regions = {};

  riskData.countries.forEach(country => {
    if (!regions[country.region]) {
      regions[country.region] = {
        count: 0,
        totalScore: 0,
        averageScore: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    regions[country.region].count++;
    regions[country.region].totalScore += country.riskScore;
    regions[country.region][country.riskLevel]++;
  });

  // Calculate averages
  Object.keys(regions).forEach(region => {
    regions[region].averageScore = Math.round(regions[region].totalScore / regions[region].count);
  });

  return regions;
}
