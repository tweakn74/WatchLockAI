/**
 * Dark Web Intelligence Correlation Module
 * Correlates threats with ransomware victims and paste site findings
 */

/**
 * Load dark web intelligence data from KV or return static data
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Promise<Object>} Dark web intelligence data
 */
export async function loadDarkWebIntel(env) {
  try {
    if (env && env.THREAT_INTEL_KV) {
      const cached = await env.THREAT_INTEL_KV.get('dark-web-intel', 'json');
      if (cached && cached.ransomwareVictims && cached.pasteFindings) {
        return cached;
      }
    }
  } catch (error) {
    console.error('Failed to load dark web intel from KV:', error);
  }

  // Return empty data if KV not available
  return { ransomwareVictims: [], pasteFindings: [] };
}

/**
 * Extract IOCs from threat data
 * @param {Object} threat - Threat object
 * @returns {Object} Extracted IOCs
 */
function extractIOCs(threat) {
  const text = `${threat.title} ${threat.description || ''} ${(threat.tags || []).join(' ')}`;

  const iocs = {
    ips: [],
    domains: [],
    emails: [],
    hashes: [],
    cves: [],
  };

  // Extract IPs (IPv4)
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ips = text.match(ipRegex) || [];
  iocs.ips = [...new Set(ips)];

  // Extract domains
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  const domains = text.match(domainRegex) || [];
  iocs.domains = [...new Set(domains.map(d => d.toLowerCase()))];

  // Extract emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  iocs.emails = [...new Set(emails.map(e => e.toLowerCase()))];

  // Extract hashes (MD5, SHA1, SHA256)
  const hashRegex = /\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b/gi;
  const hashes = text.match(hashRegex) || [];
  iocs.hashes = [...new Set(hashes.map(h => h.toLowerCase()))];

  // Extract CVEs
  const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
  const cves = text.match(cveRegex) || [];
  iocs.cves = [...new Set(cves.map(c => c.toUpperCase()))];

  return iocs;
}

/**
 * Extract organization names from threat data
 * @param {Object} threat - Threat object
 * @returns {Array<string>} Organization names
 */
function extractOrganizations(threat) {
  const text = `${threat.title} ${threat.description || ''}`;
  const orgs = [];

  // Simple keyword matching for organization names
  // This is a simplified approach - in production, use NER or entity extraction
  const orgKeywords = [
    'Corp',
    'Corporation',
    'Inc',
    'LLC',
    'Ltd',
    'Company',
    'Group',
    'International',
    'Global',
    'Systems',
    'Technologies',
    'Solutions',
  ];

  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (orgKeywords.some(keyword => word.includes(keyword))) {
      // Get 1-2 words before the keyword
      const orgName = words.slice(Math.max(0, i - 2), i + 1).join(' ');
      orgs.push(orgName);
    }
  }

  return [...new Set(orgs)];
}

/**
 * Correlate threat with ransomware victims
 * @param {Object} threat - Threat object
 * @param {Array} victims - Ransomware victims
 * @returns {Array} Matching victims
 */
function correlateRansomwareVictims(threat, victims) {
  const matches = [];
  const threatText = `${threat.title} ${threat.description || ''}`.toLowerCase();
  const threatOrgs = extractOrganizations(threat);

  for (const victim of victims) {
    let confidence = 0;
    const indicators = [];

    // Check for victim name mention
    if (threatText.includes(victim.victimName.toLowerCase())) {
      confidence += 50;
      indicators.push(`Victim name: ${victim.victimName}`);
    }

    // Check for ransomware group mention
    if (threatText.includes(victim.ransomwareGroup.toLowerCase())) {
      confidence += 30;
      indicators.push(`Ransomware group: ${victim.ransomwareGroup}`);
    }

    // Check for industry match
    if (victim.industry && threatText.includes(victim.industry.toLowerCase())) {
      confidence += 10;
      indicators.push(`Industry: ${victim.industry}`);
    }

    // Check for organization name similarity
    for (const org of threatOrgs) {
      if (victim.victimName.toLowerCase().includes(org.toLowerCase())) {
        confidence += 20;
        indicators.push(`Organization match: ${org}`);
      }
    }

    // Only include matches with confidence >= 20
    if (confidence >= 20) {
      matches.push({
        victimId: victim.id,
        victimName: victim.victimName,
        ransomwareGroup: victim.ransomwareGroup,
        industry: victim.industry,
        severity: victim.severity,
        status: victim.status,
        discoveredDate: victim.discoveredDate,
        confidence,
        indicators,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Correlate threat with paste site findings
 * @param {Object} threat - Threat object
 * @param {Array} pastes - Paste site findings
 * @returns {Array} Matching pastes
 */
function correlatePasteFindings(threat, pastes) {
  const matches = [];
  const threatIOCs = extractIOCs(threat);

  for (const paste of pastes) {
    let matchScore = 0;
    const matchedIOCs = {
      ips: [],
      domains: [],
      emails: [],
      hashes: [],
      cves: [],
    };

    // Check for IOC matches
    if (paste.iocs) {
      // IP matches
      if (paste.iocs.ips && threatIOCs.ips.length > 0) {
        const ipMatches = paste.iocs.ips.filter(ip => threatIOCs.ips.includes(ip));
        if (ipMatches.length > 0) {
          matchScore += ipMatches.length * 15;
          matchedIOCs.ips = ipMatches;
        }
      }

      // Domain matches
      if (paste.iocs.domains && threatIOCs.domains.length > 0) {
        const domainMatches = paste.iocs.domains.filter(domain =>
          threatIOCs.domains.includes(domain)
        );
        if (domainMatches.length > 0) {
          matchScore += domainMatches.length * 20;
          matchedIOCs.domains = domainMatches;
        }
      }

      // Email matches
      if (paste.iocs.emails && threatIOCs.emails.length > 0) {
        const emailMatches = paste.iocs.emails.filter(email => threatIOCs.emails.includes(email));
        if (emailMatches.length > 0) {
          matchScore += emailMatches.length * 10;
          matchedIOCs.emails = emailMatches;
        }
      }

      // Hash matches
      if (paste.iocs.hashes && threatIOCs.hashes.length > 0) {
        const hashMatches = paste.iocs.hashes.filter(hash => threatIOCs.hashes.includes(hash));
        if (hashMatches.length > 0) {
          matchScore += hashMatches.length * 25;
          matchedIOCs.hashes = hashMatches;
        }
      }

      // CVE matches
      if (paste.iocs.cves && threatIOCs.cves.length > 0) {
        const cveMatches = paste.iocs.cves.filter(cve => threatIOCs.cves.includes(cve));
        if (cveMatches.length > 0) {
          matchScore += cveMatches.length * 30;
          matchedIOCs.cves = cveMatches;
        }
      }
    }

    // Only include matches with score > 0
    if (matchScore > 0) {
      matches.push({
        pasteId: paste.id,
        title: paste.title,
        pasteSite: paste.pasteSite,
        category: paste.category,
        severity: paste.severity,
        discoveredDate: paste.discoveredDate,
        matchScore,
        matchedIOCs,
      });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

/**
 * Add dark web correlation to all threats
 * @param {Array} threats - Array of threat objects
 * @param {Object} darkWebData - Dark web intelligence data
 * @returns {Array} Threats with dark web correlation
 */
export function addDarkWebCorrelation(threats, darkWebData) {
  if (
    !Array.isArray(threats) ||
    !darkWebData ||
    (!darkWebData.ransomwareVictims && !darkWebData.pasteFindings)
  ) {
    return threats;
  }

  const victims = darkWebData.ransomwareVictims || [];
  const pastes = darkWebData.pasteFindings || [];

  return threats.map(threat => {
    const ransomwareMatches = correlateRansomwareVictims(threat, victims);
    const pasteMatches = correlatePasteFindings(threat, pastes);

    const hasDarkWebIntel = ransomwareMatches.length > 0 || pasteMatches.length > 0;

    return {
      ...threat,
      darkWebIntel: hasDarkWebIntel
        ? {
            ransomwareVictims: ransomwareMatches,
            pasteFindings: pasteMatches,
          }
        : undefined,
      hasDarkWebIntel,
    };
  });
}

/**
 * Get dark web intelligence statistics
 * @param {Object} darkWebData - Dark web intelligence data
 * @returns {Object} Statistics
 */
export function getDarkWebStats(darkWebData) {
  if (!darkWebData) {
    return {
      totalVictims: 0,
      totalPastes: 0,
      criticalVictims: 0,
      criticalPastes: 0,
      activeIncidents: 0,
    };
  }

  const victims = darkWebData.ransomwareVictims || [];
  const pastes = darkWebData.pasteFindings || [];

  return {
    totalVictims: victims.length,
    totalPastes: pastes.length,
    criticalVictims: victims.filter(v => v.severity === 'CRITICAL').length,
    criticalPastes: pastes.filter(p => p.severity === 'CRITICAL').length,
    activeIncidents: victims.filter(v => v.status === 'active' || v.status === 'negotiating')
      .length,
    leakedIncidents: victims.filter(v => v.status === 'leaked').length,
  };
}

/**
 * Get top ransomware groups by victim count
 * @param {Object} darkWebData - Dark web intelligence data
 * @returns {Array} Top ransomware groups
 */
export function getTopRansomwareGroups(darkWebData) {
  if (!darkWebData || !darkWebData.ransomwareVictims) {
    return [];
  }

  const groupCounts = {};
  for (const victim of darkWebData.ransomwareVictims) {
    const group = victim.ransomwareGroup;
    groupCounts[group] = (groupCounts[group] || 0) + 1;
  }

  return Object.entries(groupCounts)
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
