/**
 * Geopolitical Risk Dashboard
 * Displays country-level cyber risk profiles
 */

let countriesData = null;
let currentTab = 'all';
const filters = {
  search: '',
  region: '',
  riskLevel: '',
  trend: '',
};

/**
 * Load geopolitical risk data
 */
async function loadGeopoliticalRisks() {
  try {
    const response = await fetch('/data/geopolitical-risks.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    countriesData = await response.json();
    updateStats();
    populateFilters();
    renderCountries();
  } catch (error) {
    console.error('Error loading geopolitical risks:', error);
    document.getElementById('countries-grid').innerHTML =
      '<p class="error">Failed to load geopolitical risk data. Please try again later.</p>';
  }
}

/**
 * Update statistics dashboard
 */
function updateStats() {
  if (!countriesData || !countriesData.countries) return;

  const countries = countriesData.countries;
  const totalCountries = countries.length;
  const criticalRisk = countries.filter(c => c.riskLevel === 'critical').length;
  const highRisk = countries.filter(c => c.riskLevel === 'high').length;
  const mediumRisk = countries.filter(c => c.riskLevel === 'medium').length;
  const lowRisk = countries.filter(c => c.riskLevel === 'low').length;

  const totalScore = countries.reduce((sum, c) => sum + c.riskScore, 0);
  const averageRisk = Math.round(totalScore / totalCountries);

  document.getElementById('total-countries').textContent = totalCountries;
  document.getElementById('critical-risk').textContent = criticalRisk;
  document.getElementById('high-risk').textContent = highRisk;
  document.getElementById('medium-risk').textContent = mediumRisk;
  document.getElementById('low-risk').textContent = lowRisk;
  document.getElementById('average-risk').textContent = averageRisk;
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
  if (!countriesData || !countriesData.countries) return;

  // Get unique regions
  const regions = [...new Set(countriesData.countries.map(c => c.region))].sort();

  const regionFilter = document.getElementById('region-filter');
  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });
}

/**
 * Render countries based on current tab and filters
 */
function renderCountries() {
  if (!countriesData || !countriesData.countries) return;

  let countries = [...countriesData.countries];

  // Apply tab filter
  if (currentTab !== 'all') {
    countries = countries.filter(c => c.riskLevel === currentTab);
  }

  // Apply filters
  countries = applyFilters(countries);

  // Sort by risk score (highest first)
  countries.sort((a, b) => b.riskScore - a.riskScore);

  const grid = document.getElementById('countries-grid');

  if (countries.length === 0) {
    grid.innerHTML = '<p class="no-results">No countries match the current filters.</p>';
    return;
  }

  grid.innerHTML = countries.map(country => createCountryCard(country)).join('');

  // Add click event listeners
  document.querySelectorAll('.country-card').forEach(card => {
    card.addEventListener('click', () => {
      const countryId = card.dataset.countryId;
      const country = countriesData.countries.find(c => c.id === countryId);
      if (country) {
        showCountryModal(country);
      }
    });
  });
}

/**
 * Create country card HTML
 */
function createCountryCard(country) {
  const trendIcon = getTrendIcon(country.trends?.direction);
  const trendClass = country.trends?.direction || 'stable';

  return `
    <div class="country-card" data-country-id="${country.id}">
      <div class="country-header">
        <div class="country-name-section">
          <h3 class="country-name">${country.name}</h3>
          <span class="country-code">${country.code}</span>
        </div>
        <span class="risk-level-badge ${country.riskLevel}">${country.riskLevel.toUpperCase()}</span>
      </div>
      <div class="country-meta">
        <div class="meta-item">
          <span class="meta-label">Region:</span>
          <span class="meta-value">${country.region}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Risk Score:</span>
          <span class="meta-value risk-score-${country.riskLevel}">${country.riskScore}/100</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Trend:</span>
          <span class="meta-value trend-${trendClass}">${trendIcon} ${country.trends?.direction || 'N/A'}</span>
        </div>
      </div>
      <div class="country-factors">
        <div class="factor-item">
          <div class="factor-label">Threat Actors</div>
          <div class="factor-bar">
            <div class="factor-fill" style="width: ${(country.factors.threatActorPresence.score / 40) * 100}%"></div>
          </div>
          <div class="factor-score">${country.factors.threatActorPresence.score}/40</div>
        </div>
        <div class="factor-item">
          <div class="factor-label">Cyber Conflicts</div>
          <div class="factor-bar">
            <div class="factor-fill" style="width: ${(country.factors.cyberConflictHistory.score / 30) * 100}%"></div>
          </div>
          <div class="factor-score">${country.factors.cyberConflictHistory.score}/30</div>
        </div>
        <div class="factor-item">
          <div class="factor-label">Infrastructure</div>
          <div class="factor-bar">
            <div class="factor-fill" style="width: ${(country.factors.criticalInfrastructureExposure.score / 20) * 100}%"></div>
          </div>
          <div class="factor-score">${country.factors.criticalInfrastructureExposure.score}/20</div>
        </div>
        <div class="factor-item">
          <div class="factor-label">Regulations</div>
          <div class="factor-bar">
            <div class="factor-fill" style="width: ${(country.factors.regulatoryEnvironment.score / 10) * 100}%"></div>
          </div>
          <div class="factor-score">${country.factors.regulatoryEnvironment.score}/10</div>
        </div>
      </div>
      <div class="country-footer">
        <span class="event-count">${country.events?.length || 0} major events</span>
        <span class="last-updated">Updated: ${formatDate(country.lastUpdated)}</span>
      </div>
    </div>
  `;
}

/**
 * Show country detail modal
 */
function showCountryModal(country) {
  const modal = document.getElementById('country-modal');
  const modalBody = document.getElementById('modal-body');

  const trendIcon = getTrendIcon(country.trends?.direction);

  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>${country.name} (${country.code})</h2>
      <span class="risk-level-badge ${country.riskLevel} large">${country.riskLevel.toUpperCase()} RISK</span>
    </div>

    <div class="modal-section">
      <h3>Risk Overview</h3>
      <div class="risk-overview">
        <div class="risk-score-display">
          <div class="risk-score-circle ${country.riskLevel}">
            <span class="risk-score-number">${country.riskScore}</span>
            <span class="risk-score-label">/100</span>
          </div>
        </div>
        <div class="risk-details">
          <div class="detail-item">
            <span class="detail-label">Region:</span>
            <span class="detail-value">${country.region}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Risk Level:</span>
            <span class="detail-value">${country.riskLevel.toUpperCase()}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Trend:</span>
            <span class="detail-value trend-${country.trends?.direction || 'stable'}">${trendIcon} ${country.trends?.direction || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Velocity:</span>
            <span class="detail-value">${country.trends?.velocity || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <h3>Risk Factors Breakdown</h3>
      <div class="factors-breakdown">
        <div class="factor-detail">
          <div class="factor-header">
            <h4>Threat Actor Presence</h4>
            <span class="factor-score-badge">${country.factors.threatActorPresence.score}/40</span>
          </div>
          <div class="factor-progress">
            <div class="factor-progress-fill" style="width: ${(country.factors.threatActorPresence.score / 40) * 100}%"></div>
          </div>
          <p class="factor-description">${country.factors.threatActorPresence.details}</p>
          <div class="factor-meta">
            <span>Actor Count: ${country.factors.threatActorPresence.actorCount || 0}</span>
            <span>Sophistication: ${country.factors.threatActorPresence.sophistication}</span>
          </div>
        </div>

        <div class="factor-detail">
          <div class="factor-header">
            <h4>Cyber Conflict History</h4>
            <span class="factor-score-badge">${country.factors.cyberConflictHistory.score}/30</span>
          </div>
          <div class="factor-progress">
            <div class="factor-progress-fill" style="width: ${(country.factors.cyberConflictHistory.score / 30) * 100}%"></div>
          </div>
          <p class="factor-description">${country.factors.cyberConflictHistory.details}</p>
          <div class="factor-meta">
            <span>Incident Count: ${country.factors.cyberConflictHistory.incidentCount || 0}</span>
            <span>Severity: ${country.factors.cyberConflictHistory.severity}</span>
          </div>
        </div>

        <div class="factor-detail">
          <div class="factor-header">
            <h4>Critical Infrastructure Exposure</h4>
            <span class="factor-score-badge">${country.factors.criticalInfrastructureExposure.score}/20</span>
          </div>
          <div class="factor-progress">
            <div class="factor-progress-fill" style="width: ${(country.factors.criticalInfrastructureExposure.score / 20) * 100}%"></div>
          </div>
          <p class="factor-description">${country.factors.criticalInfrastructureExposure.details}</p>
          <div class="factor-meta">
            <span>Vulnerability Level: ${country.factors.criticalInfrastructureExposure.vulnerabilityLevel}</span>
          </div>
        </div>

        <div class="factor-detail">
          <div class="factor-header">
            <h4>Regulatory Environment</h4>
            <span class="factor-score-badge">${country.factors.regulatoryEnvironment.score}/10</span>
          </div>
          <div class="factor-progress">
            <div class="factor-progress-fill" style="width: ${(country.factors.regulatoryEnvironment.score / 10) * 100}%"></div>
          </div>
          <p class="factor-description">${country.factors.regulatoryEnvironment.details}</p>
          <div class="factor-meta">
            <span>Maturity: ${country.factors.regulatoryEnvironment.maturity}</span>
          </div>
        </div>
      </div>
    </div>

    ${
      country.events && country.events.length > 0
        ? `
    <div class="modal-section">
      <h3>Major Cyber Events</h3>
      <div class="events-list">
        ${country.events
          .map(
            event => `
          <div class="event-item">
            <div class="event-header">
              <span class="event-date">${formatDate(event.date)}</span>
              <span class="event-impact ${event.impact}">${event.impact.toUpperCase()}</span>
            </div>
            <h4 class="event-title">${event.title}</h4>
            <p class="event-description">${event.description}</p>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      country.trends
        ? `
    <div class="modal-section">
      <h3>Risk Trend Analysis</h3>
      <div class="trend-analysis">
        <div class="trend-item">
          <span class="trend-label">Direction:</span>
          <span class="trend-value trend-${country.trends.direction}">${trendIcon} ${country.trends.direction.toUpperCase()}</span>
        </div>
        <div class="trend-item">
          <span class="trend-label">Velocity:</span>
          <span class="trend-value">${country.trends.velocity.toUpperCase()}</span>
        </div>
        <div class="trend-forecast">
          <h4>Forecast:</h4>
          <p>${country.trends.forecast}</p>
        </div>
      </div>
    </div>
    `
        : ''
    }

    <div class="modal-footer">
      <p class="last-updated-text">Last Updated: ${formatDate(country.lastUpdated)}</p>
    </div>
  `;

  modal.style.display = 'block';
}

/**
 * Apply filters to countries
 */
function applyFilters(countries) {
  return countries.filter(country => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        country.name.toLowerCase().includes(searchLower) ||
        country.code.toLowerCase().includes(searchLower) ||
        country.region.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Region filter
    if (filters.region && country.region !== filters.region) {
      return false;
    }

    // Risk level filter
    if (filters.riskLevel && country.riskLevel !== filters.riskLevel) {
      return false;
    }

    // Trend filter
    if (filters.trend && country.trends?.direction !== filters.trend) {
      return false;
    }

    return true;
  });
}

/**
 * Get trend icon
 */
function getTrendIcon(direction) {
  switch (direction) {
    case 'increasing':
      return '📈';
    case 'decreasing':
      return '📉';
    case 'stable':
      return '➡️';
    default:
      return '❓';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      currentTab = button.dataset.tab;
      renderCountries();
    });
  });

  // Search input
  document.getElementById('search-input').addEventListener('input', e => {
    filters.search = e.target.value;
    renderCountries();
  });

  // Region filter
  document.getElementById('region-filter').addEventListener('change', e => {
    filters.region = e.target.value;
    renderCountries();
  });

  // Risk level filter
  document.getElementById('risk-level-filter').addEventListener('change', e => {
    filters.riskLevel = e.target.value;
    renderCountries();
  });

  // Trend filter
  document.getElementById('trend-filter').addEventListener('change', e => {
    filters.trend = e.target.value;
    renderCountries();
  });

  // Modal close
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('country-modal').style.display = 'none';
  });

  window.addEventListener('click', e => {
    const modal = document.getElementById('country-modal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadGeopoliticalRisks();
});
