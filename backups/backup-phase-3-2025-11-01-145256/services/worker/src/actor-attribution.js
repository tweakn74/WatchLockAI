/**
 * Threat Actor Attribution Module
 * Attributes threats to known threat actors based on TTPs, malware, infrastructure, and targets
 */

/**
 * Load threat actor data from KV or return static data
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Promise<Object>} Threat actor data
 */
export async function loadThreatActors(env) {
  try {
    if (env && env.THREAT_INTEL_KV) {
      const cached = await env.THREAT_INTEL_KV.get('threat-actors', 'json');
      if (cached && cached.threatActors) {
        return cached;
      }
    }
  } catch (error) {
    console.error('Failed to load threat actors from KV:', error);
  }

  // Return empty data if KV not available
  return { threatActors: [] };
}

/**
 * Extract TTPs from threat data
 * @param {Object} threat - Threat object
 * @returns {Array<string>} Array of MITRE technique IDs
 */
function extractTTPs(threat) {
  const ttps = [];

  // Extract from techniques array if present
  if (threat.techniques && Array.isArray(threat.techniques)) {
    ttps.push(...threat.techniques.map(t => t.id || t));
  }

  // Extract from tags
  if (threat.tags && Array.isArray(threat.tags)) {
    const ttpRegex = /T\d{4}(\.\d{3})?/g;
    threat.tags.forEach(tag => {
      const matches = tag.match(ttpRegex);
      if (matches) {
        ttps.push(...matches);
      }
    });
  }

  // Extract from title and description
  const text = `${threat.title} ${threat.description || ''}`;
  const ttpRegex = /T\d{4}(\.\d{3})?/g;
  const matches = text.match(ttpRegex);
  if (matches) {
    ttps.push(...matches);
  }

  return [...new Set(ttps)];
}

/**
 * Extract malware families from threat data
 * @param {Object} threat - Threat object
 * @returns {Array<string>} Array of malware family names
 */
function extractMalware(threat) {
  const malware = [];
  const text =
    `${threat.title} ${threat.description || ''} ${(threat.tags || []).join(' ')}`.toLowerCase();

  // Common malware keywords
  const malwareKeywords = [
    'wannacry',
    'notpetya',
    'blackenergy',
    'carbanak',
    'sofacy',
    'x-agent',
    'komplex',
    'zebrocy',
    'cozyduke',
    'miniduke',
    'seaduke',
    'sunburst',
    'hoplight',
    'electricfish',
    'badcall',
    'hardrain',
    'applejeus',
    'winnti',
    'highnoon',
    'poisonplug',
    'shadowpad',
    'crosswalk',
    'griffon',
    'powersource',
    'boostwrite',
    'pillowmint',
    'snake',
    'uroburos',
    'carbon',
    'gazer',
    'mosquito',
    'crutch',
    'fanny',
    'equationdrug',
    'grayfish',
    'doublefantasy',
    'triplefantasy',
    'darkside',
    'industroyer',
    'vpnfilter',
    'olympic destroyer',
  ];

  malwareKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      malware.push(keyword);
    }
  });

  return [...new Set(malware)];
}

/**
 * Extract infrastructure IOCs from threat data
 * @param {Object} threat - Threat object
 * @returns {Object} Infrastructure IOCs
 */
function extractInfrastructure(threat) {
  const text = `${threat.title} ${threat.description || ''}`;
  const infrastructure = {
    ips: [],
    domains: [],
  };

  // Extract IPs (IPv4)
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ips = text.match(ipRegex) || [];
  infrastructure.ips = [...new Set(ips)];

  // Extract domains
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  const domains = text.match(domainRegex) || [];
  infrastructure.domains = [...new Set(domains.map(d => d.toLowerCase()))];

  return infrastructure;
}

/**
 * Extract target information from threat data
 * @param {Object} threat - Threat object
 * @returns {Object} Target information
 */
function extractTargets(threat) {
  const text = `${threat.title} ${threat.description || ''}`.toLowerCase();
  const targets = {
    industries: [],
    countries: [],
  };

  // Industry keywords
  const industries = [
    'government',
    'military',
    'defense',
    'financial',
    'banking',
    'healthcare',
    'energy',
    'technology',
    'retail',
    'hospitality',
    'manufacturing',
    'telecommunications',
    'education',
    'media',
    'entertainment',
  ];

  industries.forEach(industry => {
    if (text.includes(industry)) {
      targets.industries.push(industry);
    }
  });

  // Country keywords
  const countries = [
    'united states',
    'russia',
    'china',
    'north korea',
    'iran',
    'ukraine',
    'germany',
    'france',
    'united kingdom',
    'japan',
    'south korea',
  ];

  countries.forEach(country => {
    if (text.includes(country)) {
      targets.countries.push(country);
    }
  });

  return targets;
}

/**
 * Calculate attribution confidence score
 * @param {Object} threat - Threat object
 * @param {Object} actor - Threat actor object
 * @returns {number} Confidence score (0-100)
 */
function calculateAttributionConfidence(threat, actor) {
  let score = 0;

  // Extract threat characteristics
  const threatTTPs = extractTTPs(threat);
  const threatMalware = extractMalware(threat);
  const threatInfra = extractInfrastructure(threat);
  const threatTargets = extractTargets(threat);

  // TTP matching: 30 points per match
  const actorTTPs = (actor.ttps || []).map(t => t.id);
  const ttpMatches = threatTTPs.filter(ttp => actorTTPs.includes(ttp));
  score += ttpMatches.length * 30;

  // Malware matching: 40 points per match
  const actorMalware = (actor.malwareFamilies || []).map(m => m.toLowerCase());
  const malwareMatches = threatMalware.filter(malware =>
    actorMalware.some(am => am.includes(malware) || malware.includes(am))
  );
  score += malwareMatches.length * 40;

  // Infrastructure matching: 25 points per match
  const actorIPs = actor.infrastructure?.ips || [];
  const actorDomains = (actor.infrastructure?.domains || []).map(d => d.toLowerCase());
  const ipMatches = threatInfra.ips.filter(ip => actorIPs.includes(ip));
  const domainMatches = threatInfra.domains.filter(domain =>
    actorDomains.some(ad => ad.includes(domain) || domain.includes(ad))
  );
  score += (ipMatches.length + domainMatches.length) * 25;

  // Target matching: 15 points per match
  const actorIndustries = (actor.targets?.industries || []).map(i => i.toLowerCase());
  const actorCountries = (actor.targets?.countries || []).map(c => c.toLowerCase());
  const industryMatches = threatTargets.industries.filter(industry =>
    actorIndustries.some(ai => ai.includes(industry) || industry.includes(ai))
  );
  const countryMatches = threatTargets.countries.filter(country =>
    actorCountries.some(ac => ac.includes(country) || country.includes(ac))
  );
  score += (industryMatches.length + countryMatches.length) * 15;

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Get confidence level from score
 * @param {number} score - Confidence score
 * @returns {string} Confidence level
 */
function getConfidenceLevel(score) {
  if (score >= 91) return 'very-high';
  if (score >= 71) return 'high';
  if (score >= 41) return 'medium';
  return 'low';
}

/**
 * Attribute threat to actors
 * @param {Object} threat - Threat object
 * @param {Array<Object>} actors - Array of threat actor objects
 * @returns {Array<Object>} Array of attributed actors with confidence scores
 */
function attributeThreatToActor(threat, actors) {
  const attributions = [];

  actors.forEach(actor => {
    const confidence = calculateAttributionConfidence(threat, actor);

    // Only include if confidence meets minimum threshold (40 points)
    if (confidence >= 40) {
      attributions.push({
        id: actor.id,
        name: actor.name,
        aliases: actor.aliases || [],
        type: actor.type,
        country: actor.country,
        confidence,
        confidenceLevel: getConfidenceLevel(confidence),
        sophistication: actor.sophistication,
        motivation: actor.motivation || [],
      });
    }
  });

  // Sort by confidence (highest first)
  attributions.sort((a, b) => b.confidence - a.confidence);

  // Return top 3 attributions
  return attributions.slice(0, 3);
}

/**
 * Add actor attribution to all threats
 * @param {Array<Object>} threats - Array of threat objects
 * @param {Object} actorData - Threat actor data
 * @returns {Array<Object>} Threats with actor attribution
 */
export function addActorAttribution(threats, actorData) {
  if (!actorData || !actorData.threatActors || actorData.threatActors.length === 0) {
    return threats.map(t => ({ ...t, hasActorAttribution: false }));
  }

  return threats.map(threat => {
    const attributions = attributeThreatToActor(threat, actorData.threatActors);

    if (attributions.length > 0) {
      return {
        ...threat,
        hasActorAttribution: true,
        actorAttribution: attributions,
      };
    }

    return {
      ...threat,
      hasActorAttribution: false,
    };
  });
}

/**
 * Get threat actor statistics
 * @param {Object} actorData - Threat actor data
 * @returns {Object} Statistics
 */
export function getActorStats(actorData) {
  if (!actorData || !actorData.threatActors) {
    return {
      totalActors: 0,
      activeActors: 0,
      nationStateCount: 0,
      cybercrimeCount: 0,
      totalCampaigns: 0,
    };
  }

  const actors = actorData.threatActors;

  return {
    totalActors: actors.length,
    activeActors: actors.filter(a => a.status === 'active').length,
    nationStateCount: actors.filter(a => a.type === 'nation-state').length,
    cybercrimeCount: actors.filter(a => a.type === 'cybercrime').length,
    totalCampaigns: actors.reduce((sum, a) => sum + (a.campaigns?.length || 0), 0),
  };
}

/**
 * Get top threat actors by campaign count
 * @param {Object} actorData - Threat actor data
 * @param {number} limit - Maximum number of actors to return
 * @returns {Array<Object>} Top actors
 */
export function getTopActors(actorData, limit = 10) {
  if (!actorData || !actorData.threatActors) {
    return [];
  }

  return actorData.threatActors
    .map(actor => ({
      name: actor.name,
      type: actor.type,
      country: actor.country,
      campaignCount: actor.campaigns?.length || 0,
      sophistication: actor.sophistication,
    }))
    .sort((a, b) => b.campaignCount - a.campaignCount)
    .slice(0, limit);
}

/**
 * Get actor timeline
 * @param {Object} actor - Threat actor object
 * @returns {Array<Object>} Timeline of campaigns
 */
export function getActorTimeline(actor) {
  if (!actor || !actor.campaigns) {
    return [];
  }

  return actor.campaigns
    .map(campaign => ({
      name: campaign.name,
      date: campaign.date,
      description: campaign.description,
      targets: campaign.targets || [],
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
