#!/usr/bin/env node

/**
 * MITRE ATT&CK Data Fetcher
 *
 * Fetches APT groups from MITRE ATT&CK STIX 2.1 data and converts them
 * to the WatchLockAI unified schema format.
 *
 * Data Source: https://github.com/mitre-attack/attack-stix-data
 * STIX 2.1 Enterprise ATT&CK: https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json
 *
 * Usage:
 *   node scripts/fetch-mitre-attack.mjs
 *
 * Output:
 *   - apps/intel-dashboard/data/mitre-apt-groups.json (raw MITRE data)
 *   - apps/intel-dashboard/data/unified-apt-profiles.json (updated with MITRE groups)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MITRE_STIX_URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';
const OUTPUT_DIR = path.join(__dirname, '../apps/intel-dashboard/data');
const MITRE_OUTPUT_FILE = path.join(OUTPUT_DIR, 'mitre-apt-groups.json');
const UNIFIED_PROFILES_FILE = path.join(OUTPUT_DIR, 'unified-apt-profiles.json');

/**
 * Fetch MITRE ATT&CK STIX data
 */
async function fetchMITREData() {
  console.log('📥 Fetching MITRE ATT&CK STIX data...');
  console.log(`   URL: ${MITRE_STIX_URL}`);

  try {
    const response = await fetch(MITRE_STIX_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.objects?.length || 0} STIX objects`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching MITRE data:', error.message);
    throw error;
  }
}

/**
 * Extract APT groups from STIX data
 */
function extractAPTGroups(stixData) {
  console.log('\n🔍 Extracting APT groups from STIX data...');

  const groups = stixData.objects.filter(
    obj => obj.type === 'intrusion-set' && !obj.revoked && !obj.x_mitre_deprecated
  );

  console.log(`✅ Found ${groups.length} active APT groups`);
  return groups;
}

/**
 * Convert MITRE STIX group to unified schema
 */
function convertToUnifiedSchema(stixGroup, techniques, software, stixData) {
  // Extract aliases
  const aliases = stixGroup.aliases || [];
  const name = stixGroup.name || aliases[0] || 'Unknown';

  // Extract MITRE ATT&CK ID
  const mitreId =
    stixGroup.external_references?.find(ref => ref.source_name === 'mitre-attack')?.external_id ||
    null;

  // Extract description
  const description = stixGroup.description || 'No description available.';

  // Extract techniques used by this group
  const groupTechniques = techniques
    .filter(rel => rel.source_ref === stixGroup.id && rel.type === 'relationship')
    .map(rel => {
      const technique = stixData.objects.find(obj => obj.id === rel.target_ref);
      return technique?.external_references?.find(ref => ref.source_name === 'mitre-attack')
        ?.external_id;
    })
    .filter(Boolean);

  // Extract software/tools used by this group
  const groupSoftware = software
    .filter(rel => rel.source_ref === stixGroup.id && rel.type === 'relationship')
    .map(rel => {
      const tool = stixData.objects.find(obj => obj.id === rel.target_ref);
      return tool?.name;
    })
    .filter(Boolean);

  // Extract targeted sectors (if available)
  const sectors = [];
  if (description.toLowerCase().includes('financial')) sectors.push('Financial');
  if (description.toLowerCase().includes('government')) sectors.push('Government');
  if (description.toLowerCase().includes('healthcare')) sectors.push('Healthcare');
  if (description.toLowerCase().includes('energy')) sectors.push('Energy');
  if (description.toLowerCase().includes('defense')) sectors.push('Defense');
  if (description.toLowerCase().includes('technology')) sectors.push('Technology');
  if (description.toLowerCase().includes('telecom')) sectors.push('Telecommunications');

  // Extract targeted countries (if available)
  const countries = [];
  if (
    description.toLowerCase().includes('united states') ||
    description.toLowerCase().includes('u.s.')
  )
    countries.push('United States');
  if (description.toLowerCase().includes('china')) countries.push('China');
  if (description.toLowerCase().includes('russia')) countries.push('Russia');
  if (description.toLowerCase().includes('iran')) countries.push('Iran');
  if (description.toLowerCase().includes('north korea')) countries.push('North Korea');
  if (description.toLowerCase().includes('ukraine')) countries.push('Ukraine');
  if (description.toLowerCase().includes('europe')) countries.push('Europe');
  if (description.toLowerCase().includes('asia')) countries.push('Asia');

  // Determine origin country (if available)
  let originCountry = 'Unknown';
  if (description.toLowerCase().includes('russian') || description.toLowerCase().includes('russia'))
    originCountry = 'Russia';
  else if (
    description.toLowerCase().includes('chinese') ||
    description.toLowerCase().includes('china')
  )
    originCountry = 'China';
  else if (
    description.toLowerCase().includes('iranian') ||
    description.toLowerCase().includes('iran')
  )
    originCountry = 'Iran';
  else if (
    description.toLowerCase().includes('north korean') ||
    description.toLowerCase().includes('north korea')
  )
    originCountry = 'North Korea';

  // Determine sophistication level (heuristic based on description)
  let sophistication = 'Medium';
  if (
    description.toLowerCase().includes('advanced') ||
    description.toLowerCase().includes('sophisticated')
  )
    sophistication = 'High';
  else if (
    description.toLowerCase().includes('simple') ||
    description.toLowerCase().includes('basic')
  )
    sophistication = 'Low';

  // Determine motivation (heuristic based on description)
  const motivations = [];
  if (
    description.toLowerCase().includes('espionage') ||
    description.toLowerCase().includes('intelligence')
  )
    motivations.push('Espionage');
  if (
    description.toLowerCase().includes('financial') ||
    description.toLowerCase().includes('money')
  )
    motivations.push('Financial Gain');
  if (
    description.toLowerCase().includes('disrupt') ||
    description.toLowerCase().includes('sabotage')
  )
    motivations.push('Disruption');
  if (description.toLowerCase().includes('political')) motivations.push('Political');

  // Determine activity status
  const activeSince = stixGroup.created
    ? new Date(stixGroup.created).getFullYear().toString()
    : 'Unknown';
  const lastSeen = stixGroup.modified
    ? new Date(stixGroup.modified).getFullYear().toString()
    : 'Unknown';

  return {
    id: mitreId || stixGroup.id,
    name,
    aliases,
    description,
    origin: originCountry,
    targets: {
      countries,
      sectors,
    },
    techniques: groupTechniques.slice(0, 20), // Limit to top 20 techniques
    tools: groupSoftware.slice(0, 10), // Limit to top 10 tools
    malware: [], // Will be populated from software relationships
    sophistication,
    motivation: motivations.length > 0 ? motivations : ['Unknown'],
    activeSince,
    lastSeen,
    references: stixGroup.external_references || [],
    mitreId,
    stixId: stixGroup.id,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MITRE ATT&CK Data Fetcher\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Fetch MITRE data
    const stixData = await fetchMITREData();

    // Step 2: Extract APT groups
    const groups = extractAPTGroups(stixData);

    // Step 3: Extract relationships (techniques and software)
    const relationships = stixData.objects.filter(obj => obj.type === 'relationship');
    const techniques = relationships.filter(rel => rel.relationship_type === 'uses');
    const software = relationships.filter(rel => rel.relationship_type === 'uses');

    // Step 4: Convert to unified schema
    console.log('\n🔄 Converting to unified schema...');
    const unifiedGroups = groups.map(group =>
      convertToUnifiedSchema(group, techniques, software, stixData)
    );

    // Step 5: Save raw MITRE data
    console.log(`\n💾 Saving raw MITRE data to ${MITRE_OUTPUT_FILE}...`);
    fs.writeFileSync(
      MITRE_OUTPUT_FILE,
      JSON.stringify({ groups, relationships }, null, 2),
      'utf-8'
    );
    console.log(`✅ Saved ${groups.length} groups to ${MITRE_OUTPUT_FILE}`);

    // Step 6: Load existing unified profiles
    console.log(`\n📂 Loading existing unified profiles from ${UNIFIED_PROFILES_FILE}...`);
    let existingProfiles = [];
    if (fs.existsSync(UNIFIED_PROFILES_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(UNIFIED_PROFILES_FILE, 'utf-8'));
      existingProfiles = existingData.profiles || [];
      console.log(`✅ Loaded ${existingProfiles.length} existing profiles`);
    }

    // Step 7: Merge with existing profiles (avoid duplicates)
    console.log('\n🔀 Merging with existing profiles...');
    const mergedProfiles = [...existingProfiles];
    let addedCount = 0;
    let updatedCount = 0;

    for (const newGroup of unifiedGroups) {
      const existingIndex = mergedProfiles.findIndex(
        p => p.mitreId === newGroup.mitreId || p.name === newGroup.name
      );

      if (existingIndex >= 0) {
        // Update existing profile
        mergedProfiles[existingIndex] = {
          ...mergedProfiles[existingIndex],
          ...newGroup,
          // Preserve manual fields if they exist
          attackiqScenarios: mergedProfiles[existingIndex].attackiqScenarios || [],
        };
        updatedCount++;
      } else {
        // Add new profile
        mergedProfiles.push(newGroup);
        addedCount++;
      }
    }

    console.log(`✅ Added ${addedCount} new profiles`);
    console.log(`✅ Updated ${updatedCount} existing profiles`);
    console.log(`✅ Total profiles: ${mergedProfiles.length}`);

    // Step 8: Save merged profiles
    const output = {
      version: '2.1.0',
      schemaVersion: 'unified-v2',
      lastUpdated: new Date().toISOString(),
      source: 'MITRE ATT&CK + Manual Curation',
      profiles: mergedProfiles,
    };

    console.log(`\n💾 Saving merged profiles to ${UNIFIED_PROFILES_FILE}...`);
    fs.writeFileSync(UNIFIED_PROFILES_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ Saved ${mergedProfiles.length} profiles to ${UNIFIED_PROFILES_FILE}`);

    // Step 9: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ MITRE ATT&CK Data Fetch Complete!\n');
    console.log('📊 Summary:');
    console.log(`   - MITRE APT Groups: ${groups.length}`);
    console.log(`   - New Profiles Added: ${addedCount}`);
    console.log(`   - Existing Profiles Updated: ${updatedCount}`);
    console.log(`   - Total Profiles: ${mergedProfiles.length}`);
    console.log(`   - Output File: ${UNIFIED_PROFILES_FILE}`);
    console.log('\n🎉 Phase 2: Data Expansion - In Progress!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
