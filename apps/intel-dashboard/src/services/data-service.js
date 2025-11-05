/**
 * Centralized Threat Intelligence Data Service
 *
 * Provides unified access to APT profiles, detections, and threat intelligence data
 * with caching, search, filtering, and correlation capabilities.
 *
 * @version 2.0.0
 * @author WatchLockAI
 */

class ThreatIntelDataService {
  constructor() {
    this.cache = {
      aptProfiles: null,
      detections: null,
      lastUpdated: {
        aptProfiles: null,
        detections: null,
      },
    };

    // Cache TTL: 5 minutes
    this.cacheTTL = 5 * 60 * 1000;

    // Data paths
    this.dataPaths = {
      aptProfiles: '/data/unified-apt-profiles.json',
      detections: '/data/detections.json',
    };
  }

  /**
   * Check if cached data is still valid
   * @param {string} dataType - Type of data ('aptProfiles' or 'detections')
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(dataType) {
    const lastUpdated = this.cache.lastUpdated[dataType];
    if (!lastUpdated) return false;

    const now = Date.now();
    return now - lastUpdated < this.cacheTTL;
  }

  /**
   * Load APT profiles from unified database
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Array>} Array of APT profiles
   */
  async loadAPTProfiles(forceRefresh = false) {
    try {
      // Return cached data if valid
      if (!forceRefresh && this.cache.aptProfiles && this.isCacheValid('aptProfiles')) {
        console.log('[DataService] Returning cached APT profiles');
        return this.cache.aptProfiles;
      }

      console.log('[DataService] Loading APT profiles from server...');
      const response = await fetch(this.dataPaths.aptProfiles);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure (support both old 'groups' and new 'profiles' schema)
      const profiles = data.profiles || data.groups;
      if (!profiles || !Array.isArray(profiles)) {
        throw new Error('Invalid APT profiles data structure');
      }

      // Update cache
      this.cache.aptProfiles = profiles;
      this.cache.lastUpdated.aptProfiles = Date.now();

      console.log(`[DataService] Loaded ${profiles.length} APT profiles (v${data.version})`);
      return this.cache.aptProfiles;
    } catch (error) {
      console.error('[DataService] Failed to load APT profiles:', error);

      // Return cached data if available, even if expired
      if (this.cache.aptProfiles) {
        console.warn('[DataService] Returning stale cached data due to error');
        return this.cache.aptProfiles;
      }

      throw error;
    }
  }

  /**
   * Load detection rules
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Array>} Array of detection rules
   */
  async loadDetections(forceRefresh = false) {
    try {
      // Return cached data if valid
      if (!forceRefresh && this.cache.detections && this.isCacheValid('detections')) {
        console.log('[DataService] Returning cached detections');
        return this.cache.detections;
      }

      console.log('[DataService] Loading detections from server...');
      const response = await fetch(this.dataPaths.detections);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid detections data structure');
      }

      // Update cache
      this.cache.detections = data;
      this.cache.lastUpdated.detections = Date.now();

      console.log(`[DataService] Loaded ${data.length} detection rules`);
      return this.cache.detections;
    } catch (error) {
      console.error('[DataService] Failed to load detections:', error);

      // Return cached data if available, even if expired
      if (this.cache.detections) {
        console.warn('[DataService] Returning stale cached data due to error');
        return this.cache.detections;
      }

      throw error;
    }
  }

  /**
   * Get a single APT profile by ID
   * @param {string} aptId - APT group ID (e.g., 'apt28', 'fin7')
   * @returns {Promise<Object|null>} APT profile or null if not found
   */
  async getAPTProfile(aptId) {
    const profiles = await this.loadAPTProfiles();
    return profiles.find(apt => apt.id === aptId.toLowerCase()) || null;
  }

  /**
   * Search APT profiles by query string
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching APT profiles
   */
  async searchAPTProfiles(query, options = {}) {
    const profiles = await this.loadAPTProfiles();

    if (!query || query.trim() === '') {
      return profiles;
    }

    const searchTerm = query.toLowerCase().trim();
    const {
      searchFields = ['name', 'aliases', 'description', 'country', 'targetedSectors'],
      caseSensitive = false,
    } = options;

    return profiles.filter(apt => {
      // Search in specified fields
      for (const field of searchFields) {
        const value = apt[field];

        if (!value) continue;

        // Handle arrays (aliases, targetedSectors, etc.)
        if (Array.isArray(value)) {
          const match = value.some(item => {
            const itemStr = caseSensitive ? String(item) : String(item).toLowerCase();
            return itemStr.includes(caseSensitive ? query : searchTerm);
          });
          if (match) return true;
        }

        // Handle strings
        if (typeof value === 'string') {
          const valueStr = caseSensitive ? value : value.toLowerCase();
          if (valueStr.includes(caseSensitive ? query : searchTerm)) {
            return true;
          }
        }
      }

      return false;
    });
  }

  /**
   * Filter APT profiles by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Filtered APT profiles
   */
  async filterAPTProfiles(filters = {}) {
    const profiles = await this.loadAPTProfiles();

    return profiles.filter(apt => {
      // Filter by country
      if (filters.country && apt.country !== filters.country) {
        return false;
      }

      // Filter by sophistication
      if (filters.sophistication && apt.sophistication !== filters.sophistication) {
        return false;
      }

      // Filter by activity status
      if (filters.activityStatus && apt.activityStatus !== filters.activityStatus) {
        return false;
      }

      // Filter by risk level
      if (filters.riskLevel && apt.riskLevel !== filters.riskLevel) {
        return false;
      }

      // Filter by targeted sector
      if (filters.targetedSector) {
        if (!apt.targetedSectors || !apt.targetedSectors.includes(filters.targetedSector)) {
          return false;
        }
      }

      // Filter by motivation
      if (filters.motivation) {
        if (!apt.motivation || !apt.motivation.includes(filters.motivation)) {
          return false;
        }
      }

      // Filter by minimum risk score
      if (filters.minRiskScore && apt.riskScore < filters.minRiskScore) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get APT statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getAPTStatistics() {
    const profiles = await this.loadAPTProfiles();

    const stats = {
      total: profiles.length,
      byCountry: {},
      bySophistication: {},
      byActivityStatus: {},
      byRiskLevel: {},
      byMotivation: {},
      averageRiskScore: 0,
    };

    let totalRiskScore = 0;

    profiles.forEach(apt => {
      // Count by country
      stats.byCountry[apt.country] = (stats.byCountry[apt.country] || 0) + 1;

      // Count by sophistication
      stats.bySophistication[apt.sophistication] =
        (stats.bySophistication[apt.sophistication] || 0) + 1;

      // Count by activity status
      stats.byActivityStatus[apt.activityStatus] =
        (stats.byActivityStatus[apt.activityStatus] || 0) + 1;

      // Count by risk level
      stats.byRiskLevel[apt.riskLevel] = (stats.byRiskLevel[apt.riskLevel] || 0) + 1;

      // Count by motivation
      if (apt.motivation) {
        apt.motivation.forEach(m => {
          stats.byMotivation[m] = (stats.byMotivation[m] || 0) + 1;
        });
      }

      // Sum risk scores
      totalRiskScore += apt.riskScore || 0;
    });

    stats.averageRiskScore = profiles.length > 0 ? Math.round(totalRiskScore / profiles.length) : 0;

    return stats;
  }

  /**
   * Correlate a detection with APT groups
   * @param {Object} detection - Detection object
   * @param {Object} options - Correlation options
   * @returns {Promise<Array>} Array of correlated APT groups with confidence scores
   */
  async correlateDetectionWithAPT(detection, options = {}) {
    const profiles = await this.loadAPTProfiles();
    const { minConfidence = 20, maxResults = 10 } = options;

    const correlations = [];

    for (const apt of profiles) {
      let confidence = 0;
      const matches = {
        malware: [],
        techniques: [],
        tools: [],
        sectors: [],
        countries: [],
      };

      // Extract detection text for matching
      const detectionText =
        `${detection.title || ''} ${detection.description || ''} ${detection.tags?.join(' ') || ''}`.toLowerCase();

      // Match malware (30 points per match)
      if (apt.malware && Array.isArray(apt.malware)) {
        apt.malware.forEach(malware => {
          const malwareName = malware.name || malware;
          if (detectionText.includes(malwareName.toLowerCase())) {
            confidence += 30;
            matches.malware.push(malwareName);
          }
        });
      }

      // Match MITRE techniques (20 points per match)
      if (apt.techniques && Array.isArray(apt.techniques)) {
        apt.techniques.forEach(technique => {
          const techId = technique.id || technique;
          const techName = technique.name || '';
          if (
            detectionText.includes(techId.toLowerCase()) ||
            detectionText.includes(techName.toLowerCase())
          ) {
            confidence += 20;
            matches.techniques.push(techId);
          }
        });
      }

      // Match tools (20 points per match)
      if (apt.tools && Array.isArray(apt.tools)) {
        apt.tools.forEach(tool => {
          if (detectionText.includes(tool.toLowerCase())) {
            confidence += 20;
            matches.tools.push(tool);
          }
        });
      }

      // Match targeted sectors (20 points per match)
      if (apt.targetedSectors && Array.isArray(apt.targetedSectors)) {
        apt.targetedSectors.forEach(sector => {
          if (detectionText.includes(sector.toLowerCase())) {
            confidence += 20;
            matches.sectors.push(sector);
          }
        });
      }

      // Match targeted countries (5 points per match)
      if (apt.targetedCountries && Array.isArray(apt.targetedCountries)) {
        apt.targetedCountries.forEach(country => {
          if (detectionText.includes(country.toLowerCase())) {
            confidence += 5;
            matches.countries.push(country);
          }
        });
      }

      // Match APT name mention (40 points)
      if (detectionText.includes(apt.name.toLowerCase())) {
        confidence += 40;
      }

      // Match aliases (40 points)
      if (apt.aliases && Array.isArray(apt.aliases)) {
        apt.aliases.forEach(alias => {
          if (detectionText.includes(alias.toLowerCase())) {
            confidence += 40;
          }
        });
      }

      // Cap confidence at 100
      confidence = Math.min(confidence, 100);

      // Add to correlations if meets minimum confidence
      if (confidence >= minConfidence) {
        correlations.push({
          apt: {
            id: apt.id,
            name: apt.name,
            country: apt.country,
            riskScore: apt.riskScore,
            riskLevel: apt.riskLevel,
          },
          confidence,
          matches,
        });
      }
    }

    // Sort by confidence (descending) and limit results
    correlations.sort((a, b) => b.confidence - a.confidence);
    return correlations.slice(0, maxResults);
  }

  /**
   * Get top APT groups by risk score
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top APT groups
   */
  async getTopAPTGroups(limit = 10) {
    const profiles = await this.loadAPTProfiles();
    return profiles.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, limit);
  }

  /**
   * Get recently active APT groups
   * @param {number} daysThreshold - Days since last activity
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Recently active APT groups
   */
  async getRecentlyActiveAPT(daysThreshold = 90, limit = 10) {
    const profiles = await this.loadAPTProfiles();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return profiles
      .filter(apt => {
        if (!apt.lastActivity) return false;
        const lastActivity = new Date(apt.lastActivity);
        return lastActivity >= thresholdDate;
      })
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, limit);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    console.log('[DataService] Clearing all cached data');
    this.cache.aptProfiles = null;
    this.cache.detections = null;
    this.cache.lastUpdated.aptProfiles = null;
    this.cache.lastUpdated.detections = null;
  }
}

// Export singleton instance
const dataService = new ThreatIntelDataService();
export default dataService;
