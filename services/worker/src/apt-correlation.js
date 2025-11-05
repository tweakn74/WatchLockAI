/**
 * APT Correlation Module
 * Links live threats to known APT groups based on techniques, malware, and indicators
 */

// APT profiles data (loaded from KV or static import)
let aptProfiles = [];

/**
 * Load APT profiles from data source
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Promise<Array>} - Array of APT profiles
 */
export async function loadAPTProfiles(env) {
  try {
    // Try to load from KV first
    if (env.WATCHLOCK_KV) {
      const cached = await env.WATCHLOCK_KV.get('apt-profiles');
      if (cached) {
        const data = JSON.parse(cached);
        aptProfiles = data.groups || [];
        return aptProfiles;
      }
    }

    // Fallback: Load from static data (would need to be bundled with worker)
    // For now, return empty array - profiles should be loaded into KV
    console.warn('APT profiles not found in KV storage');
    return [];
  } catch (error) {
    console.error('Failed to load APT profiles:', error);
    return [];
  }
}

/**
 * Correlate a threat with APT groups
 * @param {Object} threat - Threat intelligence item
 * @param {Array} profiles - APT profiles to match against
 * @returns {Array} - Array of matching APT groups with confidence scores
 */
export function correlateAPTGroups(threat, profiles = aptProfiles) {
  const matches = [];

  for (const apt of profiles) {
    let confidence = 0;
    const indicators = [];

    // Check for malware matches
    const threatMalware = extractMalwareNames(threat);
    const aptMalwareNames = apt.malware.map(m => m.name.toLowerCase());

    for (const malware of threatMalware) {
      if (aptMalwareNames.includes(malware.toLowerCase())) {
        confidence += 30;
        indicators.push(`Malware: ${malware}`);
      }
    }

    // Check for technique matches (if threat has MITRE ATT&CK tags)
    const threatTechniques = extractMITRETechniques(threat);
    const aptTechniqueIds = apt.techniques.map(t => t.id);

    const matchingTechniques = threatTechniques.filter(t => aptTechniqueIds.includes(t));

    if (matchingTechniques.length > 0) {
      confidence += matchingTechniques.length * 20; // Increased from 10 to meet threshold
      indicators.push(`${matchingTechniques.length} MITRE technique(s)`);
    }

    // Check for tool matches
    const threatTools = extractToolNames(threat);
    const aptTools = apt.tools.map(t => t.toLowerCase());

    for (const tool of threatTools) {
      if (aptTools.includes(tool.toLowerCase())) {
        confidence += 20; // Increased from 15 to meet threshold
        indicators.push(`Tool: ${tool}`);
      }
    }

    // Check for sector targeting
    const threatSectors = extractTargetedSectors(threat);
    const matchingSectors = threatSectors.filter(s =>
      apt.targetedSectors.some(
        sector =>
          sector.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(sector.toLowerCase())
      )
    );

    if (matchingSectors.length > 0) {
      confidence += matchingSectors.length * 20; // Increased from 5 to meet threshold
      indicators.push(`Targeted sector: ${matchingSectors.join(', ')}`);
    }

    // Check for country targeting
    const threatCountries = extractTargetedCountries(threat);
    const matchingCountries = threatCountries.filter(c =>
      apt.targetedCountries.some(country => country.toLowerCase().includes(c.toLowerCase()))
    );

    if (matchingCountries.length > 0) {
      confidence += matchingCountries.length * 5;
      indicators.push(`Targeted country: ${matchingCountries.join(', ')}`);
    }

    // Check for APT group name mentions in title/description
    const threatText = `${threat.title} ${threat.description || ''}`.toLowerCase();
    const aptNames = [apt.name, ...apt.aliases].map(n => n.toLowerCase());

    for (const name of aptNames) {
      if (threatText.includes(name)) {
        confidence += 40;
        indicators.push(`APT name mentioned: ${name}`);
        break;
      }
    }

    // Only include matches with confidence >= 20
    if (confidence >= 20) {
      matches.push({
        aptId: apt.id,
        aptName: apt.name,
        country: apt.country,
        confidence: Math.min(confidence, 100),
        indicators,
        mitreAttackId: apt.mitreAttackId,
      });
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract malware names from threat tags and description
 * @param {Object} threat - Threat item
 * @returns {Array<string>} - Array of malware names
 */
function extractMalwareNames(threat) {
  const malware = [];
  const text = `${threat.title} ${threat.description || ''} ${threat.tags?.join(' ') || ''}`;

  // Common malware patterns - updated to catch hyphenated names and more variants
  const malwarePatterns = [
    /\b(cobalt strike|mimikatz|metasploit|empire|covenant)\b/gi,
    /\b([A-Z][a-z]+(?:RAT|Trojan|Backdoor|Wiper|Ransomware))\b/g,
    /\b(wannacry|notpetya|sunburst|teardrop|emotet|trickbot|qakbot)\b/gi,
    // Hyphenated malware names (X-Agent, BLINDINGCAN, etc.)
    /\b([A-Z][\w-]+(?:Agent|CAN|Loader|Dropper|Stealer))\b/gi,
    // Common APT malware families
    /\b(sofacy|x-agent|blindingcan|wannacry)\b/gi,
  ];

  for (const pattern of malwarePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      malware.push(...matches.map(m => m.trim()));
    }
  }

  return [...new Set(malware)];
}

/**
 * Extract MITRE ATT&CK technique IDs from threat tags
 * @param {Object} threat - Threat item
 * @returns {Array<string>} - Array of technique IDs (e.g., T1566.001)
 */
function extractMITRETechniques(threat) {
  const techniques = [];
  const tags = threat.tags || [];

  for (const tag of tags) {
    const match = tag.match(/T\d{4}(?:\.\d{3})?/);
    if (match) {
      techniques.push(match[0]);
    }
  }

  return techniques;
}

/**
 * Extract tool names from threat description
 * @param {Object} threat - Threat item
 * @returns {Array<string>} - Array of tool names
 */
function extractToolNames(threat) {
  const tools = [];
  const text = `${threat.title} ${threat.description || ''}`.toLowerCase();

  const commonTools = [
    'mimikatz',
    'cobalt strike',
    'metasploit',
    'powershell empire',
    'impacket',
    'bloodhound',
    'sharphound',
    'rubeus',
    'kerberoast',
    'psexec',
    'wmi',
    'powershell',
    'cmd',
    'certutil',
    'bitsadmin',
    'responder',
    'crackmapexec',
    'empire',
  ];

  for (const tool of commonTools) {
    if (text.includes(tool)) {
      // Return the tool name in the case it appears in the text
      const regex = new RegExp(`\\b${tool}\\b`, 'i');
      const match = `${threat.title} ${threat.description || ''}`.match(regex);
      if (match) {
        tools.push(match[0]);
      }
    }
  }

  return tools;
}

/**
 * Extract targeted sectors from threat tags and description
 * @param {Object} threat - Threat item
 * @returns {Array<string>} - Array of sector names
 */
function extractTargetedSectors(threat) {
  const sectors = [];
  const text =
    `${threat.title} ${threat.description || ''} ${threat.tags?.join(' ') || ''}`.toLowerCase();

  const sectorKeywords = {
    Government: ['government', 'federal', 'state', 'municipal', 'agencies', 'agency'],
    Financial: ['bank', 'financial', 'fintech', 'payment', 'cryptocurrency'],
    Healthcare: ['healthcare', 'hospital', 'medical', 'health'],
    Energy: ['energy', 'oil', 'gas', 'utility', 'power'],
    Technology: ['tech', 'software', 'saas', 'cloud'],
    Defense: ['defense', 'military', 'army', 'navy', 'air force'],
    Telecommunications: ['telecom', 'telco', '5g', 'network provider'],
    Manufacturing: ['manufacturing', 'industrial', 'factory'],
    Education: ['education', 'university', 'school', 'academic'],
    Retail: ['retail', 'ecommerce', 'shopping'],
    Media: ['media', 'news', 'journalism', 'press', 'broadcasting'],
  };

  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      sectors.push(sector);
    }
  }

  return sectors;
}

/**
 * Extract targeted countries from threat description
 * @param {Object} threat - Threat item
 * @returns {Array<string>} - Array of country names
 */
function extractTargetedCountries(threat) {
  const countries = [];
  const text = `${threat.title} ${threat.description || ''}`.toLowerCase();

  const countryKeywords = [
    'united states',
    'usa',
    'u.s.',
    'america',
    'ukraine',
    'russia',
    'china',
    'iran',
    'north korea',
    'israel',
    'saudi arabia',
    'uae',
    'qatar',
    'germany',
    'france',
    'uk',
    'united kingdom',
    'britain',
    'japan',
    'south korea',
    'taiwan',
    'india',
    'australia',
    'canada',
    'mexico',
    'brazil',
  ];

  for (const country of countryKeywords) {
    if (text.includes(country)) {
      countries.push(country);
    }
  }

  return [...new Set(countries)];
}

/**
 * Add APT correlation data to threats
 * @param {Array} threats - Array of threat items
 * @param {Array} profiles - APT profiles
 * @returns {Array} - Threats with APT correlation data
 */
export function addAPTCorrelation(threats, profiles = aptProfiles) {
  return threats.map(threat => {
    const aptMatches = correlateAPTGroups(threat, profiles);

    return {
      ...threat,
      aptAttribution: aptMatches.length > 0 ? aptMatches : undefined,
      hasAPTAttribution: aptMatches.length > 0,
    };
  });
}
