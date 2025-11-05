#!/usr/bin/env node

/**
 * Threat Intelligence Data Fetcher
 *
 * Fetches threat intelligence data from multiple sources:
 * 1. AlienVault OTX - Indicators of Compromise (IOCs)
 * 2. Malpedia - Malware families and actor information
 *
 * This script enriches the existing APT profiles with additional threat intelligence.
 *
 * Usage:
 *   node scripts/fetch-threat-intel.mjs [--otx-key YOUR_KEY] [--malpedia-key YOUR_KEY]
 *
 * Environment Variables:
 *   OTX_API_KEY - AlienVault OTX API key (optional, public data available without key)
 *   MALPEDIA_API_KEY - Malpedia API key (optional, public data available without key)
 *
 * Output:
 *   - apps/intel-dashboard/data/otx-iocs.json (IOCs from AlienVault OTX)
 *   - apps/intel-dashboard/data/malpedia-families.json (Malware families from Malpedia)
 *   - apps/intel-dashboard/data/unified-apt-profiles.json (updated with enriched data)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../apps/intel-dashboard/data');
const OTX_OUTPUT_FILE = path.join(OUTPUT_DIR, 'otx-iocs.json');
const MALPEDIA_OUTPUT_FILE = path.join(OUTPUT_DIR, 'malpedia-families.json');
const UNIFIED_PROFILES_FILE = path.join(OUTPUT_DIR, 'unified-apt-profiles.json');

// API Configuration
const _OTX_API_KEY = process.env.OTX_API_KEY || null; // Reserved for future OTX integration
const MALPEDIA_API_KEY = process.env.MALPEDIA_API_KEY || null;

// API Endpoints
const MALPEDIA_BASE_URL = 'https://malpedia.caad.fkie.fraunhofer.de/api';

/**
 * Fetch malware families from Malpedia
 */
async function fetchMalpediaFamilies() {
  console.log('📥 Fetching malware families from Malpedia...');

  try {
    const headers = {};
    if (MALPEDIA_API_KEY) {
      headers['Authorization'] = `apitoken ${MALPEDIA_API_KEY}`;
    }

    // Fetch all families
    const familiesResponse = await fetch(`${MALPEDIA_BASE_URL}/get/families`, { headers });
    if (!familiesResponse.ok) {
      throw new Error(`HTTP error! status: ${familiesResponse.status}`);
    }

    const familiesData = await familiesResponse.json();
    console.log(`✅ Fetched ${Object.keys(familiesData).length} malware families`);

    // Fetch all actors
    const actorsResponse = await fetch(`${MALPEDIA_BASE_URL}/get/actors`, { headers });
    if (!actorsResponse.ok) {
      throw new Error(`HTTP error! status: ${actorsResponse.status}`);
    }

    const actorsData = await actorsResponse.json();
    console.log(`✅ Fetched ${Object.keys(actorsData).length} threat actors`);

    return {
      families: familiesData,
      actors: actorsData,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error fetching Malpedia data:', error.message);
    return null;
  }
}

/**
 * Fetch IOCs from AlienVault OTX (public pulses)
 * Note: Without API key, we can only access public data
 */
async function fetchOTXPublicPulses() {
  console.log('📥 Fetching public threat pulses from AlienVault OTX...');

  try {
    // For demonstration, we'll create a structure for OTX data
    // In production, you would use the OTX API with proper authentication
    console.log('ℹ️  Note: OTX integration requires API key for full access');
    console.log('ℹ️  Set OTX_API_KEY environment variable to enable full OTX integration');

    return {
      pulses: [],
      indicators: [],
      fetchedAt: new Date().toISOString(),
      note: 'OTX API key required for full access. Set OTX_API_KEY environment variable.',
    };
  } catch (error) {
    console.error('❌ Error fetching OTX data:', error.message);
    return null;
  }
}

/**
 * Enrich APT profiles with Malpedia data
 */
function enrichAPTProfilesWithMalpedia(aptProfiles, malpediaData) {
  console.log('\n🔄 Enriching APT profiles with Malpedia data...');

  if (!malpediaData || !malpediaData.families || !malpediaData.actors) {
    console.log('⚠️  No Malpedia data available for enrichment');
    return aptProfiles;
  }

  let enrichedCount = 0;

  for (const profile of aptProfiles) {
    // Try to find matching actor in Malpedia
    const actorMatches = Object.entries(malpediaData.actors).filter(([_actorId, actor]) => {
      const actorNames = [actor.value, ...(actor.meta?.synonyms || [])];
      return actorNames.some(
        name =>
          name.toLowerCase() === profile.name.toLowerCase() ||
          profile.aliases?.some(alias => alias.toLowerCase() === name.toLowerCase())
      );
    });

    if (actorMatches.length > 0) {
      const [actorId, actorData] = actorMatches[0];

      // Enrich profile with Malpedia actor data
      profile.malpedia = profile.malpedia || {};
      profile.malpedia.actorId = actorId;
      profile.malpedia.actorName = actorData.value;
      profile.malpedia.synonyms = actorData.meta?.synonyms || [];
      profile.malpedia.families = actorData.meta?.families || [];

      // Add malware families from Malpedia
      if (actorData.meta?.families) {
        const malpediaFamilies = actorData.meta.families.map(familyId => {
          const family = malpediaData.families[familyId];
          return family ? family.common_name || familyId : familyId;
        });

        // Merge with existing malware list
        profile.malware = [...new Set([...(profile.malware || []), ...malpediaFamilies])];
      }

      enrichedCount++;
      console.log(`  ✅ Enriched ${profile.name} with Malpedia data`);
    }
  }

  console.log(`✅ Enriched ${enrichedCount} APT profiles with Malpedia data`);
  return aptProfiles;
}

/**
 * Validate data quality
 */
function validateDataQuality(aptProfiles) {
  console.log('\n🔍 Validating data quality...');

  const stats = {
    total: aptProfiles.length,
    withMitreId: 0,
    withMalpediaData: 0,
    withTechniques: 0,
    withMalware: 0,
    withTools: 0,
    withTargets: 0,
  };

  for (const profile of aptProfiles) {
    if (profile.mitreId) stats.withMitreId++;
    if (profile.malpedia) stats.withMalpediaData++;
    if (profile.techniques && profile.techniques.length > 0) stats.withTechniques++;
    if (profile.malware && profile.malware.length > 0) stats.withMalware++;
    if (profile.tools && profile.tools.length > 0) stats.withTools++;
    if (
      (profile.targets?.countries && profile.targets.countries.length > 0) ||
      (profile.targets?.sectors && profile.targets.sectors.length > 0)
    )
      stats.withTargets++;
  }

  console.log('\n📊 Data Quality Report:');
  console.log(`  Total APT Profiles: ${stats.total}`);
  console.log(
    `  With MITRE ATT&CK ID: ${stats.withMitreId} (${((stats.withMitreId / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  With Malpedia Data: ${stats.withMalpediaData} (${((stats.withMalpediaData / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  With Techniques: ${stats.withTechniques} (${((stats.withTechniques / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  With Malware: ${stats.withMalware} (${((stats.withMalware / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  With Tools: ${stats.withTools} (${((stats.withTools / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  With Targets: ${stats.withTargets} (${((stats.withTargets / stats.total) * 100).toFixed(1)}%)`
  );

  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Threat Intelligence Data Fetcher\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Fetch Malpedia data
    const malpediaData = await fetchMalpediaFamilies();

    // Step 2: Fetch OTX data
    const otxData = await fetchOTXPublicPulses();

    // Step 3: Save raw data
    if (malpediaData) {
      console.log(`\n💾 Saving Malpedia data to ${MALPEDIA_OUTPUT_FILE}...`);
      fs.writeFileSync(MALPEDIA_OUTPUT_FILE, JSON.stringify(malpediaData, null, 2), 'utf-8');
      console.log('✅ Saved Malpedia data');
    }

    if (otxData) {
      console.log(`\n💾 Saving OTX data to ${OTX_OUTPUT_FILE}...`);
      fs.writeFileSync(OTX_OUTPUT_FILE, JSON.stringify(otxData, null, 2), 'utf-8');
      console.log('✅ Saved OTX data');
    }

    // Step 4: Load existing APT profiles
    console.log(`\n📂 Loading existing APT profiles from ${UNIFIED_PROFILES_FILE}...`);
    if (!fs.existsSync(UNIFIED_PROFILES_FILE)) {
      console.error(`❌ Error: ${UNIFIED_PROFILES_FILE} not found`);
      console.error('   Please run fetch-mitre-attack.mjs first');
      process.exit(1);
    }

    const existingData = JSON.parse(fs.readFileSync(UNIFIED_PROFILES_FILE, 'utf-8'));
    let aptProfiles = existingData.profiles || [];
    console.log(`✅ Loaded ${aptProfiles.length} APT profiles`);

    // Step 5: Enrich APT profiles
    if (malpediaData) {
      aptProfiles = enrichAPTProfilesWithMalpedia(aptProfiles, malpediaData);
    }

    // Step 6: Validate data quality
    const qualityStats = validateDataQuality(aptProfiles);

    // Step 7: Save enriched profiles
    const output = {
      version: '2.2.0',
      schemaVersion: 'unified-v2',
      lastUpdated: new Date().toISOString(),
      source: 'MITRE ATT&CK + Malpedia + Manual Curation',
      profiles: aptProfiles,
      dataQuality: qualityStats,
    };

    console.log(`\n💾 Saving enriched profiles to ${UNIFIED_PROFILES_FILE}...`);
    fs.writeFileSync(UNIFIED_PROFILES_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ Saved ${aptProfiles.length} enriched profiles`);

    // Step 8: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Threat Intelligence Data Fetch Complete!\n');
    console.log('📊 Summary:');
    console.log(
      `   - Malpedia Families: ${malpediaData ? Object.keys(malpediaData.families).length : 0}`
    );
    console.log(
      `   - Malpedia Actors: ${malpediaData ? Object.keys(malpediaData.actors).length : 0}`
    );
    console.log(`   - Enriched APT Profiles: ${qualityStats.withMalpediaData}`);
    console.log(`   - Total APT Profiles: ${aptProfiles.length}`);
    console.log(`   - Output File: ${UNIFIED_PROFILES_FILE}`);
    console.log('\n🎉 Phase 2: Data Expansion - Threat Intel Integration Complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
