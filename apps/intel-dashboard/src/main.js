/**
 * WatchLockAI Dashboard - Main Application
 */

const API_ENDPOINTS = {
  primary: 'https://watchlockai-intel-api.craig-glatt.workers.dev',
  fallback: '/data/demo/unified-threats.sample.json',
};

const REFRESH_INTERVAL = 60000; // 60 seconds
let currentView = 'executive'; // 'executive' or 'analyst'
let _refreshTimer = null;
let _countdownTimer = null;
let countdown = 60;
let threatsData = null;

/**
 * Initialize the dashboard
 */
async function init() {
  setupEventListeners();
  await fetchThreats();
  startAutoRefresh();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  const viewToggle = document.getElementById('viewToggle');
  viewToggle.addEventListener('click', toggleView);
}

/**
 * Toggle between Executive and Analyst views
 */
function toggleView() {
  currentView = currentView === 'executive' ? 'analyst' : 'executive';
  document.getElementById('currentView').textContent =
    currentView === 'executive' ? 'Executive' : 'Analyst';

  const topSection = document.getElementById('topThreatsSection');
  const allSection = document.getElementById('allThreatsSection');

  if (currentView === 'executive') {
    topSection.style.display = 'block';
    allSection.style.display = 'none';
  } else {
    topSection.style.display = 'none';
    allSection.style.display = 'block';
  }

  renderThreats();
}

/**
 * Fetch threats from API with fallback
 */
async function fetchThreats() {
  updateStatus('loading', 'Fetching threats...');

  try {
    // Try primary API first
    const response = await fetch(`${API_ENDPOINTS.primary}/api/top?limit=20`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    threatsData = data;
    updateStatus('success', 'Connected');
    renderThreats();
    updateStats();
  } catch (error) {
    console.warn('Primary API failed, trying fallback:', error.message);

    try {
      // Try fallback dataset
      const response = await fetch(API_ENDPOINTS.fallback);
      const data = await response.json();
      threatsData = data;
      updateStatus('fallback', 'Using demo data');
      renderThreats();
      updateStats();
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      updateStatus('error', 'Failed to load data');
      renderError();
    }
  }
}

/**
 * Update status indicator
 */
function updateStatus(status, text) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  statusDot.className = 'status-dot';
  if (status === 'error') {
    statusDot.classList.add('error');
  }

  statusText.textContent = text;
}

/**
 * Render threats based on current view
 */
function renderThreats() {
  if (!threatsData || !threatsData.items) return;

  if (currentView === 'executive') {
    renderTopThreats();
  } else {
    renderAllThreats();
  }
}

/**
 * Render top threats as cards (Executive view)
 */
function renderTopThreats() {
  const container = document.getElementById('topThreatsContainer');
  const threats = threatsData.items.slice(0, 10);

  container.innerHTML = threats.map(threat => createThreatCard(threat)).join('');
}

/**
 * Create a threat card HTML
 */
function createThreatCard(threat) {
  const severityClass = threat.severity.toLowerCase();
  const badges = threat.badges || [];
  const sources = threat.sources || [threat.source];
  const sourceCount = threat.sourceCount || sources.length;

  return `
    <div class="threat-card ${severityClass}" onclick="window.open('${threat.link}', '_blank')">
      <div class="threat-header">
        <div class="threat-score ${severityClass}">${threat.riskScore || threat.severity_score || 0}</div>
        <div class="threat-severity ${severityClass}">${threat.severity}</div>
      </div>
      
      <div class="threat-title">${escapeHtml(threat.title)}</div>
      
      <div class="threat-meta">
        <div class="meta-chip">
          📊 Reported by ${sourceCount} source${sourceCount > 1 ? 's' : ''}
        </div>
        <div class="meta-chip">
          📅 ${formatDate(threat.pubDate || threat.first_seen)}
        </div>
      </div>
      
      ${
        badges.length > 0
          ? `
        <div class="badges">
          ${badges
            .map(
              badge => `
            <span class="badge ${badge.toLowerCase().replace(/_/g, '-')}">${badge}</span>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    </div>
  `;
}

/**
 * Render all threats as table (Analyst view)
 */
function renderAllThreats() {
  const tbody = document.getElementById('threatsTableBody');
  const threats = threatsData.items;

  tbody.innerHTML = threats
    .map(threat => {
      const severityClass = threat.severity.toLowerCase();
      const badges = threat.badges || [];
      const sources = threat.sources || [threat.source];
      const sourceCount = threat.sourceCount || sources.length;

      return `
      <tr onclick="window.open('${threat.link}', '_blank')" style="cursor: pointer;">
        <td><strong class="threat-score ${severityClass}">${threat.riskScore || 0}</strong></td>
        <td><span class="threat-severity ${severityClass}">${threat.severity}</span></td>
        <td>${escapeHtml(threat.title)}</td>
        <td>${sourceCount}</td>
        <td>
          ${badges
            .map(
              badge => `
            <span class="badge ${badge.toLowerCase().replace(/_/g, '-')}">${badge}</span>
          `
            )
            .join(' ')}
        </td>
        <td>${formatDate(threat.pubDate || threat.first_seen)}</td>
      </tr>
    `;
    })
    .join('');
}

/**
 * Update statistics
 */
function updateStats() {
  if (!threatsData || !threatsData.items) return;

  const threats = threatsData.items;
  const criticalCount = threats.filter(t => t.severity === 'CRITICAL').length;
  const highCount = threats.filter(t => t.severity === 'HIGH').length;
  const multiSourceCount = threats.filter(t => (t.sourceCount || 1) > 1).length;

  document.getElementById('totalCount').textContent = threats.length;
  document.getElementById('criticalCount').textContent = criticalCount;
  document.getElementById('highCount').textContent = highCount;
  document.getElementById('multiSourceCount').textContent = multiSourceCount;
  document.getElementById('lastUpdated').textContent = formatTime(
    threatsData.updated || new Date().toISOString()
  );
}

/**
 * Render error message
 */
function renderError() {
  const container = document.getElementById('topThreatsContainer');
  container.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--text-muted);">
      <h3>⚠️ Unable to load threat data</h3>
      <p>Please check your connection and try again.</p>
    </div>
  `;
}

/**
 * Start auto-refresh timer
 */
function startAutoRefresh() {
  // Refresh data every 60 seconds
  refreshTimer = setInterval(async () => {
    await fetchThreats();
    countdown = 60;
  }, REFRESH_INTERVAL);

  // Update countdown every second
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown < 0) countdown = 60;
    document.getElementById('countdown').textContent = countdown;
  }, 1000);
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Utility: Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Utility: Format time
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
