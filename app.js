/**
 * Frontend application for APT Tracker dashboard
 */

// Configuration
const API_BASE = 'https://apt-tracker-mitre-aiq-intel.craig-glatt.workers.dev';
const THREATS_POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes
const TRENDS_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

// State
let threatsChart = null;
let tagsChart = null;
let filterState = {
  severity: 'ALL',
  threatType: 'ALL',
  timeWindow: 'ALL',
  actionability: 'ALL',
  search: '',
};

/**
 * Initialize the dashboard
 */
async function init() {
  console.log('Initializing APT Tracker dashboard...');

  // Set up filter event listeners
  setupFilters();

  // Initial load
  await Promise.all([loadThreats(), loadTrends(), loadSources()]);

  // Set up polling
  setInterval(loadThreats, THREATS_POLL_INTERVAL);
  setInterval(loadTrends, TRENDS_POLL_INTERVAL);
  setInterval(loadSources, TRENDS_POLL_INTERVAL);
}

/**
 * Set up filter event listeners
 */
function setupFilters() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const filterType = e.target.dataset.filter;
      const filterValue = e.target.dataset.value;

      // Update active state
      document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => {
        b.classList.remove('active');
      });
      e.target.classList.add('active');

      // Update filter state
      filterState[filterType] = filterValue;

      // Reload threats
      loadThreats();
      updateActiveFilters();
    });
  });

  // Search box
  const searchBox = document.getElementById('searchBox');
  let searchTimeout;
  searchBox.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterState.search = e.target.value;
      loadThreats();
      updateActiveFilters();
    }, 500); // Debounce 500ms
  });
}

/**
 * Update active filters display
 */
function updateActiveFilters() {
  const container = document.getElementById('activeFilters');
  const pills = [];

  // Add filter pills
  if (filterState.severity !== 'ALL') {
    pills.push({
      type: 'severity',
      value: filterState.severity,
      label: `Severity: ${filterState.severity}`,
    });
  }
  if (filterState.threatType !== 'ALL') {
    pills.push({
      type: 'threatType',
      value: filterState.threatType,
      label: `Type: ${filterState.threatType}`,
    });
  }
  if (filterState.timeWindow !== 'ALL') {
    pills.push({
      type: 'timeWindow',
      value: filterState.timeWindow,
      label: `Time: ${filterState.timeWindow}`,
    });
  }
  if (filterState.actionability !== 'ALL') {
    pills.push({
      type: 'actionability',
      value: filterState.actionability,
      label: `Filter: ${filterState.actionability}`,
    });
  }
  if (filterState.search) {
    pills.push({
      type: 'search',
      value: filterState.search,
      label: `Search: "${filterState.search}"`,
    });
  }

  if (pills.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML =
    pills
      .map(
        pill => `
    <span class="filter-pill">
      ${escapeHtml(pill.label)}
      <span class="filter-pill-remove" onclick="removeFilter('${pill.type}')">&times;</span>
    </span>
  `
      )
      .join('') +
    `
    <button class="clear-filters-btn" onclick="clearAllFilters()">Clear All</button>
  `;
}

/**
 * Remove a specific filter
 * Currently unused but kept for future use
 */
// eslint-disable-next-line no-unused-vars
function removeFilter(filterType) {
  if (filterType === 'search') {
    filterState.search = '';
    document.getElementById('searchBox').value = '';
  } else {
    filterState[filterType] = 'ALL';
    // Reset button state
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === 'ALL') {
        btn.classList.add('active');
      }
    });
  }
  loadThreats();
  updateActiveFilters();
}

/**
 * Clear all filters
 * Currently unused but kept for future use
 */
// eslint-disable-next-line no-unused-vars
function clearAllFilters() {
  filterState = {
    severity: 'ALL',
    threatType: 'ALL',
    timeWindow: 'ALL',
    actionability: 'ALL',
    search: '',
  };

  // Reset all buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.value === 'ALL') {
      btn.classList.add('active');
    }
  });

  // Reset search box
  document.getElementById('searchBox').value = '';

  loadThreats();
  updateActiveFilters();
}

/**
 * Load current threats
 */
async function loadThreats() {
  const container = document.getElementById('threats-container');
  const status = document.getElementById('threats-status');

  try {
    status.textContent = 'Loading...';
    status.className = 'status loading';

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', '100'); // Get more items for client-side filtering

    // Server-side filters
    if (filterState.severity !== 'ALL') {
      params.append('severity', filterState.severity);
    }

    if (filterState.search) {
      params.append('q', filterState.search);
    }

    // Time window filter
    if (filterState.timeWindow !== 'ALL') {
      const now = new Date();
      let afterDate;

      if (filterState.timeWindow === '24h') {
        afterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (filterState.timeWindow === '7d') {
        afterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filterState.timeWindow === '30d') {
        afterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (afterDate) {
        params.append('after', afterDate.toISOString());
      }
    }

    const response = await fetch(`${API_BASE}/api/threats?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    let items = data.items || [];

    // Client-side filters
    if (filterState.threatType !== 'ALL') {
      items = items.filter(item => item.tags && item.tags.includes(filterState.threatType));
    }

    if (filterState.actionability !== 'ALL') {
      if (filterState.actionability === 'KEV') {
        items = items.filter(item => item.tags && item.tags.includes('KEV'));
      } else if (filterState.actionability === 'CVE') {
        items = items.filter(item => item.tags && item.tags.some(tag => tag.startsWith('CVE-')));
      } else if (filterState.actionability === 'MITRE') {
        items = items.filter(item => item.tags && item.tags.some(tag => /^T\d{4}/.test(tag)));
      } else if (filterState.actionability === 'POC') {
        items = items.filter(item => {
          const text = `${item.title} ${item.description || ''}`.toLowerCase();
          return /proof[- ]of[- ]concept|poc|exploit.*code|exploit.*available/i.test(text);
        });
      }
    }

    // Limit to 60 for display
    items = items.slice(0, 60);

    if (items.length > 0) {
      renderThreats(items, container);
      status.textContent = 'Live';
      status.className = 'status live';

      // Update aria-live region
      container.setAttribute('aria-live', 'polite');
    } else {
      container.innerHTML =
        '<div class="empty-state"><p>No threats found matching filters</p></div>';
      status.textContent = 'No Data';
      status.className = 'status';
    }
  } catch (error) {
    console.error('Failed to load threats:', error);
    container.innerHTML = `<div class="error-state"><p>Failed to load threats: ${escapeHtml(error.message)}</p></div>`;
    status.textContent = 'Error';
    status.className = 'status error';
  }
}

/**
 * Render threats list
 */
function renderThreats(items, container) {
  const listHtml = items
    .map(item => {
      const isHighPriority = item.tags && item.tags.includes('HIGH-PRIORITY');
      const priorityClass = isHighPriority ? 'high-priority' : '';

      // Severity badge
      const severityHtml = item.severity
        ? `<span class="severity-badge severity-${item.severity.toLowerCase()}">${item.severity}</span>`
        : '';

      // Risk score
      const riskScoreHtml =
        item.riskScore !== undefined
          ? `<span class="risk-score" style="color: ${getSeverityColor(item.severity)}">${item.riskScore}</span>`
          : '';

      const tagsHtml = (item.tags || [])
        .map(tag => {
          let tagClass = 'tag';
          let tagHtml = escapeHtml(tag);

          // Make CVE tags clickable links to Tenable CVE database
          if (tag.startsWith('CVE-')) {
            tagClass += ' cve';
            const cveUrl = `https://www.tenable.com/cve/${tag}`;
            tagHtml = `<a href="${cveUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${escapeHtml(tag)}</a>`;
          } else if (tag.startsWith('T')) {
            tagClass += ' attack';
          } else if (tag === 'HIGH-PRIORITY') {
            tagClass += ' high-priority';
          }

          return `<span class="${tagClass}">${tagHtml}</span>`;
        })
        .join('');

      const localTime = formatLocalTime(item.pubDate);

      return `
      <div class="threat-item ${priorityClass}">
        <div class="threat-title">
          ${severityHtml}
          ${riskScoreHtml}
          <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(item.title)}
          </a>
        </div>
        <div class="threat-meta">
          <span>📰 ${escapeHtml(item.source)}</span>
          <span>🕒 ${localTime}</span>
        </div>
        ${tagsHtml ? `<div class="threat-tags">${tagsHtml}</div>` : ''}
      </div>
    `;
    })
    .join('');

  container.innerHTML = `<div class="threats-list">${listHtml}</div>`;
}

/**
 * Get severity color for display
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'CRITICAL':
      return '#d32f2f';
    case 'HIGH':
      return '#f57c00';
    case 'MEDIUM':
      return '#fbc02d';
    case 'LOW':
      return '#388e3c';
    default:
      return '#757575';
  }
}

/**
 * Load trends data
 */
async function loadTrends() {
  const status = document.getElementById('trends-status');

  try {
    status.textContent = 'Loading...';
    status.className = 'status loading';

    const response = await fetch(`${API_BASE}/api/trends`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.buckets && data.buckets.length > 0) {
      renderTrends(data.buckets);
      status.textContent = 'Live';
      status.className = 'status live';
    } else {
      status.textContent = 'No Data';
      status.className = 'status';
    }
  } catch (error) {
    console.error('Failed to load trends:', error);
    status.textContent = 'Error';
    status.className = 'status error';
  }
}

/**
 * Render trends charts
 */
function renderTrends(buckets) {
  // Prepare data
  const labels = buckets.map(b => formatChartTime(b.bucket));

  // Aggregate sources
  const sourcesData = aggregateTopN(buckets, 'sources', 5);
  const tagsData = aggregateTopN(buckets, 'tags', 5);

  // Render sources chart
  if (threatsChart) {
    threatsChart.destroy();
  }

  const sourcesCtx = document.getElementById('sources-chart').getContext('2d');
  threatsChart = new Chart(sourcesCtx, {
    type: 'line',
    data: {
      labels,
      datasets: Object.entries(sourcesData).map(([name, values], idx) => ({
        label: name,
        data: values,
        borderColor: getChartColor(idx),
        backgroundColor: getChartColor(idx, 0.1),
        tension: 0.3,
      })),
    },
    options: getChartOptions(),
  });

  // Render tags chart
  if (tagsChart) {
    tagsChart.destroy();
  }

  const tagsCtx = document.getElementById('tags-chart').getContext('2d');
  tagsChart = new Chart(tagsCtx, {
    type: 'line',
    data: {
      labels,
      datasets: Object.entries(tagsData).map(([name, values], idx) => ({
        label: name,
        data: values,
        borderColor: getChartColor(idx),
        backgroundColor: getChartColor(idx, 0.1),
        tension: 0.3,
      })),
    },
    options: getChartOptions(),
  });
}

/**
 * Aggregate top N items from buckets
 */
function aggregateTopN(buckets, field, n) {
  // Count totals
  const totals = {};
  buckets.forEach(bucket => {
    Object.entries(bucket.data[field] || {}).forEach(([name, count]) => {
      totals[name] = (totals[name] || 0) + count;
    });
  });

  // Get top N
  const topN = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);

  // Build datasets
  const datasets = {};
  topN.forEach(name => {
    datasets[name] = buckets.map(bucket => bucket.data[field][name] || 0);
  });

  return datasets;
}

/**
 * Load new sources
 */
async function loadSources() {
  const container = document.getElementById('sources-container');
  const status = document.getElementById('sources-status');

  try {
    status.textContent = 'Loading...';
    status.className = 'status loading';

    const response = await fetch(`${API_BASE}/api/sources`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.recentlyApproved && data.recentlyApproved.length > 0) {
      renderSources(data.recentlyApproved, container);
      status.textContent = 'Live';
      status.className = 'status live';
    } else {
      container.innerHTML =
        '<div class="empty-state"><p>No new sources in the last 7 days</p></div>';
      status.textContent = 'No Data';
      status.className = 'status';
    }
  } catch (error) {
    console.error('Failed to load sources:', error);
    container.innerHTML = '<div class="error-state"><p>Failed to load sources</p></div>';
    status.textContent = 'Error';
    status.className = 'status error';
  }
}

/**
 * Render sources list
 */
function renderSources(sources, container) {
  const listHtml = sources
    .map(source => {
      const url = typeof source === 'string' ? source : source.url;
      const approvedAt = source.approvedAt ? formatLocalTime(source.approvedAt) : 'Recently';
      const title = source.title || new URL(url).hostname;

      return `
      <li class="source-item">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(title)}
        </a>
        <span class="source-date">${approvedAt}</span>
      </li>
    `;
    })
    .join('');

  container.innerHTML = `<ul class="sources-list">${listHtml}</ul>`;
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
 * Utility: Format local time
 */
function formatLocalTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Utility: Format chart time
 */
function formatChartTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Utility: Get chart color
 */
function getChartColor(index, alpha = 1) {
  const colors = [
    `rgba(88, 166, 255, ${alpha})`,
    `rgba(63, 185, 80, ${alpha})`,
    `rgba(210, 153, 34, ${alpha})`,
    `rgba(248, 81, 73, ${alpha})`,
    `rgba(188, 134, 252, ${alpha})`,
  ];
  return colors[index % colors.length];
}

/**
 * Utility: Chart options
 */
function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#c9d1d9',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8b949e' },
        grid: { color: '#30363d' },
      },
      y: {
        ticks: { color: '#8b949e' },
        grid: { color: '#30363d' },
        beginAtZero: true,
      },
    },
  };
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
