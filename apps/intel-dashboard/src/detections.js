// Detection Engineering Module
import dataService from './services/data-service.js';

let allDetections = [];
let filteredDetections = [];
let aptProfiles = []; // APT profiles for correlation
let coverageFilters = {
  severity: '',
  platform: '',
};

// Load APT profiles for correlation
async function loadAPTProfiles() {
  try {
    console.log('[Detections] Loading APT profiles from centralized data service...');
    aptProfiles = await dataService.loadAPTProfiles();
    console.log(`[Detections] Loaded ${aptProfiles.length} APT profiles for correlation`);
  } catch (error) {
    console.error('[Detections] Failed to load APT profiles:', error);
    aptProfiles = [];
  }
}

// Correlate detection with APT groups based on techniques
function correlateAPTGroups(detection) {
  const correlatedAPTs = [];

  aptProfiles.forEach(apt => {
    const matchingTechniques = detection.techniques.filter(detTech =>
      apt.techniques?.includes(detTech.id)
    );

    if (matchingTechniques.length > 0) {
      correlatedAPTs.push({
        name: apt.name,
        mitreId: apt.mitreId || apt.id,
        matchCount: matchingTechniques.length,
        matchingTechniques: matchingTechniques.map(t => t.id)
      });
    }
  });

  // Sort by match count (highest first)
  correlatedAPTs.sort((a, b) => b.matchCount - a.matchCount);

  return correlatedAPTs;
}

// Load detections from JSON
async function loadDetections() {
  try {
    // Load both detections and APT profiles
    await loadAPTProfiles();

    const response = await fetch('/data/detections.json');
    const data = await response.json();
    allDetections = data.detections || [];

    // Add APT correlation to each detection
    allDetections = allDetections.map(detection => ({
      ...detection,
      correlatedAPTs: correlateAPTGroups(detection)
    }));

    filteredDetections = [...allDetections];

    updateStats();
    populateFilters();
    renderDetections();
    renderCoverageMatrix();

    // Initialize analytics after data is loaded
    initializeAnalytics();
  } catch (error) {
    console.error('Error loading detections:', error);
    document.getElementById('detectionGrid').innerHTML =
      '<p style="color: var(--text-secondary);">Error loading detections. Please try again later.</p>';
  }
}

// Update statistics
function updateStats() {
  const total = allDetections.length;
  const critical = allDetections.filter(d => d.severity === 'CRITICAL').length;
  const high = allDetections.filter(d => d.severity === 'HIGH').length;

  // Count unique techniques
  const techniques = new Set();
  allDetections.forEach(d => {
    d.techniques.forEach(t => techniques.add(t.id));
  });

  document.getElementById('totalDetections').textContent = total;
  document.getElementById('criticalCount').textContent = critical;
  document.getElementById('highCount').textContent = high;
  document.getElementById('techniquesCovered').textContent = techniques.size;
}

// Populate filter dropdowns
function populateFilters() {
  const platforms = new Set();
  allDetections.forEach(d => platforms.add(d.platform));

  const platformFilter = document.getElementById('platformFilter');
  platforms.forEach(platform => {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    platformFilter.appendChild(option);
  });
}

// Render detection cards
function renderDetections() {
  const grid = document.getElementById('detectionGrid');

  if (filteredDetections.length === 0) {
    grid.innerHTML =
      '<p style="color: var(--text-secondary);">No detections match your filters.</p>';
    return;
  }

  grid.innerHTML = filteredDetections.map(detection => createDetectionCard(detection)).join('');

  // Add click handlers
  document.querySelectorAll('.detection-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const detection = allDetections.find(d => d.id === id);
      showDetectionModal(detection);
    });
  });
}

// Create detection card HTML
function createDetectionCard(detection) {
  return `
    <div class="detection-card" data-id="${detection.id}">
      <div class="detection-header">
        <div>
          <div class="detection-name">${detection.name}</div>
          <div class="detection-id">${detection.id}</div>
        </div>
        <div>
          <span class="severity-badge severity-${detection.severity.toLowerCase()}">${detection.severity}</span>
        </div>
      </div>
      
      <div class="detection-meta">
        <div class="meta-item">
          <span class="status-badge status-${detection.status}">${detection.status}</span>
        </div>
        <div class="meta-item">
          <span class="platform-badge">${detection.platform}</span>
        </div>
        ${
          detection.falsePositiveRate
            ? `
          <div class="meta-item">
            <span class="fp-rate fp-${detection.falsePositiveRate}">FP: ${detection.falsePositiveRate}</span>
          </div>
        `
            : ''
        }
      </div>
      
      <div class="detection-description">
        ${detection.description}
      </div>
      
      <div class="techniques-section">
        <div class="section-label">🎯 MITRE ATT&CK Techniques</div>
        <div class="technique-tags">
          ${detection.techniques
            .map(
              t => `
            <span class="technique-tag" title="${t.name} - ${t.tactic}">${t.id}</span>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

// Show detection detail modal
function showDetectionModal(detection) {
  const modal = document.getElementById('detectionModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <h2>${detection.name}</h2>
    <div style="margin-bottom: 20px;">
      <span class="severity-badge severity-${detection.severity.toLowerCase()}">${detection.severity}</span>
      <span class="status-badge status-${detection.status}">${detection.status}</span>
      <span class="platform-badge">${detection.platform} - ${detection.queryLanguage}</span>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3>Description</h3>
      <p style="color: var(--text-primary); line-height: 1.6;">${detection.description}</p>
    </div>
    
    ${
      detection.useCase
        ? `
      <div style="margin-bottom: 20px;">
        <h3>Use Case</h3>
        <p style="color: var(--text-primary);">${detection.useCase}</p>
      </div>
    `
        : ''
    }
    
    <div style="margin-bottom: 20px;">
      <h3>Detection Query</h3>
      <div class="query-block">${detection.query}</div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3>MITRE ATT&CK Techniques</h3>
      <div class="technique-tags">
        ${detection.techniques
          .map(
            t => `
          <span class="technique-tag" title="${t.name} - ${t.tactic}">
            ${t.id}: ${t.name} (${t.tactic})
          </span>
        `
          )
          .join('')}
      </div>
    </div>
    
    ${
      detection.dataSource
        ? `
      <div style="margin-bottom: 20px;">
        <h3>Required Data Sources</h3>
        <ul style="color: var(--text-primary);">
          ${detection.dataSource.map(ds => `<li>${ds}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }
    
    ${
      detection.enrichment
        ? `
      <div style="margin-bottom: 20px;">
        <h3>Enrichment Strategy</h3>
        <p style="color: var(--text-primary); line-height: 1.6;">${detection.enrichment}</p>
      </div>
    `
        : ''
    }
    
    ${
      detection.tuning
        ? `
      <div style="margin-bottom: 20px;">
        <h3>Tuning Notes</h3>
        <p style="color: var(--text-primary); line-height: 1.6;">${detection.tuning}</p>
      </div>
    `
        : ''
    }
    
    ${
      detection.responseActions
        ? `
      <div style="margin-bottom: 20px;">
        <h3>Response Actions</h3>
        <ul class="response-actions">
          ${detection.responseActions.map(action => `<li>${action}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }
    
    ${
      detection.falsePositiveRate
        ? `
      <div style="margin-bottom: 20px;">
        <h3>False Positive Rate</h3>
        <span class="fp-rate fp-${detection.falsePositiveRate}">${detection.falsePositiveRate.toUpperCase()}</span>
      </div>
    `
        : ''
    }
    
    <div style="margin-bottom: 20px;">
      <h3>Metadata</h3>
      <p style="color: var(--text-secondary); font-size: 0.9em;">
        <strong>Author:</strong> ${detection.author || 'Unknown'}<br>
        <strong>Created:</strong> ${detection.created || 'Unknown'}<br>
        <strong>Last Updated:</strong> ${detection.lastUpdated || 'Unknown'}
      </p>
    </div>
  `;

  modal.style.display = 'block';
}

// Filter detections
function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const severity = document.getElementById('severityFilter').value;
  const status = document.getElementById('statusFilter').value;
  const platform = document.getElementById('platformFilter').value;

  filteredDetections = allDetections.filter(detection => {
    const matchesSearch =
      !searchTerm ||
      detection.name.toLowerCase().includes(searchTerm) ||
      detection.description.toLowerCase().includes(searchTerm) ||
      detection.techniques.some(
        t => t.id.toLowerCase().includes(searchTerm) || t.name.toLowerCase().includes(searchTerm)
      );

    const matchesSeverity = !severity || detection.severity === severity;
    const matchesStatus = !status || detection.status === status;
    const matchesPlatform = !platform || detection.platform === platform;

    return matchesSearch && matchesSeverity && matchesStatus && matchesPlatform;
  });

  renderDetections();
}

// Render MITRE ATT&CK coverage matrix (Dashboard 6: Detection Coverage Heatmap)
function renderCoverageMatrix() {
  const matrix = document.getElementById('coverageMatrix');

  // Define MITRE ATT&CK tactics in order
  const tactics = [
    'Reconnaissance',
    'Resource Development',
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact',
  ];

  // Filter detections based on coverage filters
  let detectionsToShow = allDetections;
  if (coverageFilters.severity || coverageFilters.platform) {
    detectionsToShow = allDetections.filter(detection => {
      const matchesSeverity =
        !coverageFilters.severity || detection.severity === coverageFilters.severity;
      const matchesPlatform =
        !coverageFilters.platform || detection.platform === coverageFilters.platform;
      return matchesSeverity && matchesPlatform;
    });
  }

  // Build coverage map: technique ID -> detection count
  const coverageMap = {};
  const techniqueDetails = {}; // technique ID -> {name, tactic, detections[]}

  detectionsToShow.forEach(detection => {
    detection.techniques.forEach(technique => {
      const techId = technique.id;

      if (!coverageMap[techId]) {
        coverageMap[techId] = 0;
        techniqueDetails[techId] = {
          name: technique.name,
          tactic: technique.tactic,
          detections: [],
        };
      }

      coverageMap[techId]++;
      techniqueDetails[techId].detections.push(detection);
    });
  });

  // Group techniques by tactic
  const tacticTechniques = {};
  tactics.forEach(tactic => {
    tacticTechniques[tactic] = [];
  });

  Object.keys(techniqueDetails).forEach(techId => {
    const tactic = techniqueDetails[techId].tactic;
    if (tacticTechniques[tactic]) {
      tacticTechniques[tactic].push(techId);
    }
  });

  // Calculate coverage statistics
  const totalTechniques = Object.keys(coverageMap).length;
  const fullCoverage = Object.values(coverageMap).filter(count => count >= 3).length;
  const partialCoverage = Object.values(coverageMap).filter(
    count => count >= 1 && count < 3
  ).length;
  const _noCoverage = 0; // We only show covered techniques for now

  // Render coverage statistics
  let html = `
    <div style="margin-bottom: 30px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: var(--brand);">${totalTechniques}</div>
          <div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Techniques Covered</div>
        </div>
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: var(--brand-alt);">${fullCoverage}</div>
          <div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Full Coverage (3+)</div>
        </div>
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: #fbbf24;">${partialCoverage}</div>
          <div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Partial Coverage (1-2)</div>
        </div>
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; text-align: center;">
          <div style="font-size: 2em; font-weight: 700; color: var(--text-primary);">${((fullCoverage / totalTechniques) * 100).toFixed(1)}%</div>
          <div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Coverage Rate</div>
        </div>
      </div>

      <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px; margin-bottom: 20px;">
        <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">Coverage Legend:</div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: var(--brand-alt); border-radius: 4px;"></div>
            <span style="color: var(--text-muted); font-size: 0.9em;">Full Coverage (3+ detections)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #fbbf24; border-radius: 4px;"></div>
            <span style="color: var(--text-muted); font-size: 0.9em;">Partial Coverage (1-2 detections)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #ef4444; border-radius: 4px;"></div>
            <span style="color: var(--text-muted); font-size: 0.9em;">No Coverage</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render heatmap by tactic
  html +=
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">';

  tactics.forEach(tactic => {
    const techniques = tacticTechniques[tactic] || [];

    if (techniques.length === 0) return; // Skip tactics with no covered techniques

    html += `
      <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px;">
        <h3 style="color: var(--brand); margin-bottom: 15px; font-size: 1.1em; font-weight: 600;">${tactic}</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${techniques
            .sort()
            .map(techId => {
              const count = coverageMap[techId];
              const details = techniqueDetails[techId];

              // Determine color based on coverage
              let bgColor;
              if (count >= 3) {
                bgColor = 'var(--brand-alt)'; // Green
              } else if (count >= 1) {
                bgColor = '#fbbf24'; // Yellow
              } else {
                bgColor = '#ef4444'; // Red
              }

              return `
              <div class="coverage-technique" data-tech-id="${techId}" style="background: ${bgColor}; padding: 10px; border-radius: 6px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-family: monospace; font-size: 0.85em; color: #000; font-weight: 600;">${techId}</div>
                    <div style="font-size: 0.85em; color: #000; margin-top: 2px;">${details.name}</div>
                  </div>
                  <div style="background: rgba(0,0,0,0.2); color: #000; font-weight: 700; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${count}</div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
  });

  html += '</div>';
  matrix.innerHTML = html;

  // Add click handlers to show detections for each technique
  document.querySelectorAll('.coverage-technique').forEach(element => {
    element.addEventListener('click', () => {
      const techId = element.dataset.techId;
      const details = techniqueDetails[techId];
      showTechniqueDetections(techId, details);
    });
  });
}

// Show detections for a specific technique
function showTechniqueDetections(techId, details) {
  const modal = document.getElementById('detectionModal');
  const modalContent = document.getElementById('modalContent');

  let html = `
    <h2 style="color: var(--brand); margin-bottom: 10px;">${techId}: ${details.name}</h2>
    <p style="color: var(--text-muted); margin-bottom: 20px;">Tactic: ${details.tactic}</p>

    <h3 style="color: var(--text-primary); margin-bottom: 15px;">Detections (${details.detections.length})</h3>
    <div style="display: flex; flex-direction: column; gap: 15px;">
      ${details.detections
        .map(
          detection => `
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">${detection.name}</div>
              <div style="font-family: monospace; font-size: 0.85em; color: var(--text-muted);">${detection.id}</div>
            </div>
            <span class="severity-badge severity-${detection.severity.toLowerCase()}">${detection.severity}</span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 10px;">${detection.description}</p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <span class="platform-badge">${detection.platform}</span>
            <span class="status-badge status-${detection.status}">${detection.status}</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  modalContent.innerHTML = html;
  modal.style.display = 'block';
}

// Export coverage data to CSV
function exportCoverageCSV() {
  // Build coverage data
  const _coverageData = [];

  // Filter detections based on current filters
  let detectionsToExport = allDetections;
  if (coverageFilters.severity || coverageFilters.platform) {
    detectionsToExport = allDetections.filter(detection => {
      const matchesSeverity =
        !coverageFilters.severity || detection.severity === coverageFilters.severity;
      const matchesPlatform =
        !coverageFilters.platform || detection.platform === coverageFilters.platform;
      return matchesSeverity && matchesPlatform;
    });
  }

  // Build technique coverage map
  const techniqueMap = {};
  detectionsToExport.forEach(detection => {
    detection.techniques.forEach(technique => {
      const techId = technique.id;
      if (!techniqueMap[techId]) {
        techniqueMap[techId] = {
          id: techId,
          name: technique.name,
          tactic: technique.tactic,
          detectionCount: 0,
          detections: [],
        };
      }
      techniqueMap[techId].detectionCount++;
      techniqueMap[techId].detections.push(detection.name);
    });
  });

  // Convert to CSV format
  const headers = [
    'Technique ID',
    'Technique Name',
    'Tactic',
    'Detection Count',
    'Coverage Level',
    'Detections',
  ];
  const rows = Object.values(techniqueMap).map(tech => {
    const coverageLevel =
      tech.detectionCount >= 3 ? 'Full' : tech.detectionCount >= 1 ? 'Partial' : 'None';
    return [
      tech.id,
      tech.name,
      tech.tactic,
      tech.detectionCount,
      coverageLevel,
      tech.detections.join('; '),
    ];
  });

  // Build CSV string
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  // Download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `mitre-coverage-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export coverage data to JSON
function exportCoverageJSON() {
  // Filter detections based on current filters
  let detectionsToExport = allDetections;
  if (coverageFilters.severity || coverageFilters.platform) {
    detectionsToExport = allDetections.filter(detection => {
      const matchesSeverity =
        !coverageFilters.severity || detection.severity === coverageFilters.severity;
      const matchesPlatform =
        !coverageFilters.platform || detection.platform === coverageFilters.platform;
      return matchesSeverity && matchesPlatform;
    });
  }

  // Build technique coverage map
  const techniqueMap = {};
  detectionsToExport.forEach(detection => {
    detection.techniques.forEach(technique => {
      const techId = technique.id;
      if (!techniqueMap[techId]) {
        techniqueMap[techId] = {
          id: techId,
          name: technique.name,
          tactic: technique.tactic,
          detectionCount: 0,
          coverageLevel: '',
          detections: [],
        };
      }
      techniqueMap[techId].detectionCount++;
      techniqueMap[techId].detections.push({
        id: detection.id,
        name: detection.name,
        severity: detection.severity,
        platform: detection.platform,
        status: detection.status,
      });
    });
  });

  // Add coverage level
  Object.values(techniqueMap).forEach(tech => {
    tech.coverageLevel =
      tech.detectionCount >= 3 ? 'Full' : tech.detectionCount >= 1 ? 'Partial' : 'None';
  });

  // Build export object
  const exportData = {
    exportDate: new Date().toISOString(),
    filters: {
      severity: coverageFilters.severity || 'All',
      platform: coverageFilters.platform || 'All',
    },
    summary: {
      totalTechniques: Object.keys(techniqueMap).length,
      fullCoverage: Object.values(techniqueMap).filter(t => t.detectionCount >= 3).length,
      partialCoverage: Object.values(techniqueMap).filter(
        t => t.detectionCount >= 1 && t.detectionCount < 3
      ).length,
      totalDetections: detectionsToExport.length,
    },
    techniques: Object.values(techniqueMap),
  };

  // Download JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `mitre-coverage-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadDetections();

  // Filter event listeners
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('severityFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('platformFilter').addEventListener('change', applyFilters);

  // Modal close
  document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('detectionModal').style.display = 'none';
  });

  window.addEventListener('click', event => {
    const modal = document.getElementById('detectionModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active content
      document
        .querySelectorAll('.tab-content')
        .forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabName}Tab`).classList.add('active');
    });
  });

  // Coverage filter event listeners
  const coverageSeverityFilter = document.getElementById('coverageSeverityFilter');
  const coveragePlatformFilter = document.getElementById('coveragePlatformFilter');

  if (coverageSeverityFilter) {
    coverageSeverityFilter.addEventListener('change', e => {
      coverageFilters.severity = e.target.value;
      renderCoverageMatrix();
    });
  }

  if (coveragePlatformFilter) {
    coveragePlatformFilter.addEventListener('change', e => {
      coverageFilters.platform = e.target.value;
      renderCoverageMatrix();
    });
  }

  // Export button event listeners
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportCoverageCSV);
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportCoverageJSON);
  }

  // Note: initializeAnalytics() is now called from loadDetections() after data is loaded
});

// ============================================================================
// ANALYTICS DASHBOARD FUNCTIONS
// ============================================================================

let currentTimeRange = 30; // Default to 30 days
let trendData = null;

// Initialize Analytics Dashboard
function initializeAnalytics() {
  // Generate mock data
  trendData = generateDetectionTrends(currentTimeRange);

  // Render all charts
  renderTrendChart();
  renderDonutChart();
  renderPlatformChart();
  renderTopDetectionsTable();

  // Setup time range selector
  document.querySelectorAll('.time-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update time range and regenerate data
      currentTimeRange = parseInt(btn.dataset.range);
      trendData = generateDetectionTrends(currentTimeRange);

      // Re-render charts
      renderTrendChart();
      renderTopDetectionsTable();
    });
  });
}

// Generate mock detection trend data
function generateDetectionTrends(days) {
  const trends = {
    dates: [],
    critical: [],
    high: [],
    medium: [],
  };

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Format date based on range
    if (days <= 7) {
      trends.dates.push(
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      );
    } else if (days <= 30) {
      trends.dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    } else {
      trends.dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // Generate realistic trend data with some variation
    const baseMultiplier = 1 + Math.sin(i / 7) * 0.3; // Weekly pattern
    trends.critical.push(Math.floor((Math.random() * 6 + 3) * baseMultiplier)); // 3-9 per day
    trends.high.push(Math.floor((Math.random() * 12 + 8) * baseMultiplier)); // 8-20 per day
    trends.medium.push(Math.floor((Math.random() * 4 + 2) * baseMultiplier)); // 2-6 per day
  }

  return trends;
}

// Render Detection Trends Line Chart
function renderTrendChart() {
  const svg = document.getElementById('trendChart');
  const tooltip = document.getElementById('trendTooltip');

  // Clear existing content
  svg.innerHTML = '';

  // Chart dimensions
  const width = svg.clientWidth || 600;
  const height = svg.clientHeight || 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Set SVG dimensions
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Find max value for scaling
  const allValues = [...trendData.critical, ...trendData.high, ...trendData.medium];
  const maxValue = Math.max(...allValues);
  const yScale = chartHeight / (maxValue * 1.1); // 10% padding

  // Draw grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'chart-grid-line');
    svg.appendChild(line);

    // Y-axis labels
    const value = Math.round(maxValue * (1 - i / gridLines));
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', padding.left - 10);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'chart-axis-label');
    text.textContent = value;
    svg.appendChild(text);
  }

  // Draw lines
  const drawLine = (data, className, color) => {
    const points = data
      .map((value, index) => {
        const x = padding.left + (chartWidth / (data.length - 1)) * index;
        const y = padding.top + chartHeight - value * yScale;
        return `${x},${y}`;
      })
      .join(' ');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('class', `chart-line ${className}`);
    svg.appendChild(polyline);

    // Draw dots
    data.forEach((value, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - value * yScale;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 4);
      circle.setAttribute('fill', color);
      circle.setAttribute('class', 'chart-dot');
      circle.setAttribute('data-index', index);
      circle.setAttribute('data-type', className.replace('chart-line-', ''));

      // Tooltip on hover
      circle.addEventListener('mouseenter', e => {
        const idx = parseInt(e.target.dataset.index);
        tooltip.innerHTML = `
          <div class="tooltip-date">${trendData.dates[idx]}</div>
          <div class="tooltip-item">
            <div class="tooltip-color" style="background: #dc2626;"></div>
            <div class="tooltip-label">Critical:</div>
            <div class="tooltip-value">${trendData.critical[idx]}</div>
          </div>
          <div class="tooltip-item">
            <div class="tooltip-color" style="background: #ea580c;"></div>
            <div class="tooltip-label">High:</div>
            <div class="tooltip-value">${trendData.high[idx]}</div>
          </div>
          <div class="tooltip-item">
            <div class="tooltip-color" style="background: #f59e0b;"></div>
            <div class="tooltip-label">Medium:</div>
            <div class="tooltip-value">${trendData.medium[idx]}</div>
          </div>
        `;
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY - 10}px`;
        tooltip.classList.add('visible');
      });

      circle.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      svg.appendChild(circle);
    });
  };

  drawLine(trendData.critical, 'chart-line-critical', '#dc2626');
  drawLine(trendData.high, 'chart-line-high', '#ea580c');
  drawLine(trendData.medium, 'chart-line-medium', '#f59e0b');

  // X-axis labels (show every nth label to avoid crowding)
  const labelInterval = Math.ceil(trendData.dates.length / 6);
  trendData.dates.forEach((date, index) => {
    if (index % labelInterval === 0 || index === trendData.dates.length - 1) {
      const x = padding.left + (chartWidth / (trendData.dates.length - 1)) * index;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', height - padding.bottom + 20);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'chart-axis-label');
      text.textContent = date;
      svg.appendChild(text);
    }
  });
}

// Render Severity Distribution Donut Chart
function renderDonutChart() {
  const svg = document.getElementById('donutChart');
  const legend = document.getElementById('donutLegend');

  // Clear existing content
  svg.innerHTML = '';
  legend.innerHTML = '';

  // Count detections by severity
  const severityCounts = {
    critical: allDetections.filter(d => d.severity === 'CRITICAL').length,
    high: allDetections.filter(d => d.severity === 'HIGH').length,
    medium: allDetections.filter(d => d.severity === 'MEDIUM').length,
    low: allDetections.filter(d => d.severity === 'LOW').length,
  };

  const total = Object.values(severityCounts).reduce((a, b) => a + b, 0);
  document.getElementById('donutTotal').textContent = total;

  // Donut chart configuration
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const innerRadius = 55;

  const colors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#10b981',
  };

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  // Calculate angles
  let currentAngle = -90; // Start at top

  Object.entries(severityCounts).forEach(([severity, count]) => {
    if (count === 0) return;

    const percentage = (count / total) * 100;
    const angle = (count / total) * 360;

    // Create donut segment
    const startAngle = currentAngle * (Math.PI / 180);
    const endAngle = (currentAngle + angle) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', colors[severity]);
    path.setAttribute('class', 'donut-segment');
    svg.appendChild(path);

    currentAngle += angle;

    // Create legend item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background: ${colors[severity]};"></div>
      <div class="legend-label">${labels[severity]}</div>
      <div class="legend-value">${count} (${percentage.toFixed(1)}%)</div>
    `;
    legend.appendChild(legendItem);
  });
}

// Render Platform Coverage Bar Chart
function renderPlatformChart() {
  const container = document.getElementById('platformChart');
  container.innerHTML = '';

  // Count detections by platform
  const platformCounts = {};
  allDetections.forEach(detection => {
    const platform = detection.platform || 'Unknown';
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });

  // Sort by count
  const sortedPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);

  const maxCount = Math.max(...Object.values(platformCounts));

  // Create bar for each platform
  sortedPlatforms.forEach(([platform, count]) => {
    const percentage = (count / maxCount) * 100;

    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    barItem.innerHTML = `
      <div class="bar-label">${platform}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${percentage}%;">
          <div class="bar-value">${count}</div>
        </div>
      </div>
    `;
    container.appendChild(barItem);
  });
}

// Render Top Triggered Detections Table
function renderTopDetectionsTable() {
  const tbody = document.getElementById('topDetectionsTable');
  tbody.innerHTML = '';

  // Generate mock trigger counts for each detection
  const detectionsWithTriggers = allDetections.map(detection => ({
    ...detection,
    triggers30d: Math.floor(Math.random() * 500) + 50, // 50-550 triggers
    lastTriggered: generateRandomDate(currentTimeRange),
  }));

  // Sort by triggers and take top 5
  const topDetections = detectionsWithTriggers
    .sort((a, b) => b.triggers30d - a.triggers30d)
    .slice(0, 5);

  // Create table rows
  topDetections.forEach(detection => {
    const row = document.createElement('tr');

    const severityClass = `severity-${detection.severity.toLowerCase()}`;

    row.innerHTML = `
      <td class="table-detection-name">${detection.name}</td>
      <td class="table-triggers">${detection.triggers30d.toLocaleString()}</td>
      <td><span class="severity-badge ${severityClass}">${detection.severity}</span></td>
      <td class="table-last-triggered">${formatRelativeTime(detection.lastTriggered)}</td>
    `;

    tbody.appendChild(row);
  });
}

// Helper: Generate random date within last N days
function generateRandomDate(days) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * days);
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  return date;
}

// Helper: Format relative time
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
