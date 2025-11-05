/**
 * WatchLockAI - Geopolitical Threat Map
 * Interactive world map visualization of APT actor locations and threat density
 */

// Country coordinates (capital cities)
const countryCoordinates = {
  Russia: [55.7558, 37.6173],
  China: [39.9042, 116.4074],
  'North Korea': [39.0392, 125.7625],
  Iran: [35.6892, 51.389],
  'United States': [38.9072, -77.0369],
  Israel: [31.7683, 35.2137],
  Vietnam: [21.0285, 105.8542],
  Pakistan: [33.6844, 73.0479],
  India: [28.6139, 77.209],
  Unknown: [0, 0],
};

// Region mapping
const countryRegions = {
  Russia: 'europe',
  China: 'asia',
  'North Korea': 'asia',
  Iran: 'middle-east',
  'United States': 'americas',
  Israel: 'middle-east',
  Vietnam: 'asia',
  Pakistan: 'asia',
  India: 'asia',
  Unknown: 'unknown',
};

let map;
let markers = [];
let allAPTData = [];
let filteredAPTData = [];

/**
 * Initialize the map
 */
function initMap() {
  // Create map centered on world view
  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true,
  });

  // Add dark theme tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);
}

/**
 * Load APT data from JSON file
 */
async function loadAPTData() {
  try {
    const response = await fetch('/data/apt-profiles.json');
    const data = await response.json();
    allAPTData = data.groups;
    filteredAPTData = [...allAPTData];
    return allAPTData;
  } catch (error) {
    console.error('Failed to load APT data:', error);
    return [];
  }
}

/**
 * Calculate threat density by country
 */
function calculateThreatDensity(aptData) {
  const density = {};

  aptData.forEach(apt => {
    const country = apt.country || 'Unknown';
    if (!density[country]) {
      density[country] = {
        count: 0,
        groups: [],
        coords: countryCoordinates[country] || [0, 0],
      };
    }
    density[country].count++;
    density[country].groups.push(apt);
  });

  return density;
}

/**
 * Get marker color based on threat density
 */
function getMarkerColor(count) {
  if (count >= 5) return '#dc2626'; // Critical - Red
  if (count >= 3) return '#ea580c'; // High - Orange
  if (count >= 2) return '#ca8a04'; // Medium - Yellow
  return '#16a34a'; // Low - Green
}

/**
 * Get risk level from risk score
 */
function getRiskLevel(riskScore) {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'medium';
  return 'low';
}

/**
 * Calculate risk score for APT group
 */
function calculateRiskScore(apt) {
  let score = 50; // Base score

  // Sophistication bonus
  if (apt.sophistication === 'advanced') score += 30;
  else if (apt.sophistication === 'high') score += 20;
  else if (apt.sophistication === 'medium') score += 10;

  // Activity bonus
  const lastActivity = new Date(apt.lastActivity);
  const now = new Date();
  const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);

  if (daysSinceActivity < 90)
    score += 20; // Active in last 3 months
  else if (daysSinceActivity < 180) score += 10; // Active in last 6 months

  // Motivation bonus
  if (apt.motivation && apt.motivation.includes('destructive')) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Render markers on map
 */
function renderMarkers(aptData) {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  const density = calculateThreatDensity(aptData);

  Object.entries(density).forEach(([country, data]) => {
    if (country === 'Unknown' || !data.coords) return;

    const color = getMarkerColor(data.count);
    const [lat, lng] = data.coords;

    // Create custom icon
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: ${20 + data.count * 5}px;
        height: ${20 + data.count * 5}px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 0 10px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">${data.count}</div>`,
      iconSize: [20 + data.count * 5, 20 + data.count * 5],
      iconAnchor: [(20 + data.count * 5) / 2, (20 + data.count * 5) / 2],
    });

    // Create marker
    const marker = L.marker([lat, lng], { icon }).addTo(map);

    // Create popup content
    const popupContent = `
      <div style="color: #1f2937; min-width: 200px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 1.1em;">${country}</h3>
        <p style="margin: 5px 0; font-weight: 600;">APT Groups: ${data.count}</p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.groups.map(apt => `<li style="margin: 3px 0;">${apt.name}</li>`).join('')}
        </ul>
      </div>
    `;

    marker.bindPopup(popupContent);
    markers.push(marker);
  });
}

/**
 * Render threat cards
 */
function renderThreatCards(aptData) {
  const container = document.getElementById('threatCards');

  if (aptData.length === 0) {
    container.innerHTML =
      '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No APT groups match the selected filters.</p>';
    return;
  }

  // Group by country
  const byCountry = {};
  aptData.forEach(apt => {
    const country = apt.country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(apt);
  });

  let html = '';
  Object.entries(byCountry).forEach(([country, groups]) => {
    groups.forEach(apt => {
      const riskScore = calculateRiskScore(apt);
      const riskLevel = getRiskLevel(riskScore);
      const motivation = apt.motivation ? apt.motivation.join(', ') : 'Unknown';

      html += `
        <div class="threat-card">
          <div class="threat-header">
            <div class="threat-name">${apt.name}</div>
            <div class="country-badge">${country}</div>
          </div>
          <p style="color: var(--text-secondary); margin: 10px 0;">${apt.description}</p>
          <div class="threat-meta">
            <span><strong>Risk:</strong> <span class="risk-badge risk-${riskLevel}">${riskLevel.toUpperCase()}</span></span>
            <span><strong>Motivation:</strong> ${motivation}</span>
            <span><strong>Sophistication:</strong> ${apt.sophistication || 'Unknown'}</span>
            <span><strong>Active Since:</strong> ${apt.firstSeen ? new Date(apt.firstSeen).getFullYear() : 'Unknown'}</span>
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = html;
}

/**
 * Update statistics
 */
function updateStats(aptData) {
  const totalThreats = aptData.length;
  const countries = new Set(aptData.map(apt => apt.country).filter(c => c && c !== 'Unknown'));
  const totalCountries = countries.size;

  // Calculate active threats (active in last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const activeThreats = aptData.filter(apt => {
    if (!apt.lastActivity) return false;
    return new Date(apt.lastActivity) > sixMonthsAgo;
  }).length;

  // Calculate critical threats
  const criticalThreats = aptData.filter(apt => {
    const riskScore = calculateRiskScore(apt);
    return riskScore >= 80;
  }).length;

  document.getElementById('totalThreats').textContent = totalThreats;
  document.getElementById('totalCountries').textContent = totalCountries;
  document.getElementById('activeThreats').textContent = activeThreats;
  document.getElementById('criticalThreats').textContent = criticalThreats;
}

/**
 * Apply filters
 */
function applyFilters() {
  const region = document.getElementById('regionFilter').value;
  const threatType = document.getElementById('threatTypeFilter').value;
  const riskLevel = document.getElementById('riskFilter').value;

  filteredAPTData = allAPTData.filter(apt => {
    // Region filter
    if (region !== 'all') {
      const aptRegion = countryRegions[apt.country] || 'unknown';
      if (aptRegion !== region) return false;
    }

    // Threat type filter
    if (threatType !== 'all') {
      if (!apt.motivation || !apt.motivation.includes(threatType)) return false;
    }

    // Risk level filter
    if (riskLevel !== 'all') {
      const aptRiskLevel = getRiskLevel(calculateRiskScore(apt));
      if (aptRiskLevel !== riskLevel) return false;
    }

    return true;
  });

  renderMarkers(filteredAPTData);
  renderThreatCards(filteredAPTData);
  updateStats(filteredAPTData);
}

/**
 * Initialize the application
 */
async function init() {
  initMap();
  await loadAPTData();
  renderMarkers(filteredAPTData);
  renderThreatCards(filteredAPTData);
  updateStats(filteredAPTData);

  // Set up event listeners
  document.getElementById('regionFilter').addEventListener('change', applyFilters);
  document.getElementById('threatTypeFilter').addEventListener('change', applyFilters);
  document.getElementById('riskFilter').addEventListener('change', applyFilters);
}

// Start the application
init();
