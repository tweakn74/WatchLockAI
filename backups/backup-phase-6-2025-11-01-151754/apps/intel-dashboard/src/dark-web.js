/**
 * Dark Web Intelligence Dashboard
 * Displays ransomware victims and paste site findings
 */

let darkWebData = null;
let filteredVictims = [];
let filteredPastes = [];

// Load dark web intelligence data
async function loadDarkWebIntel() {
  try {
    const response = await fetch('/data/dark-web-intel.json');
    darkWebData = await response.json();

    filteredVictims = darkWebData.ransomwareVictims || [];
    filteredPastes = darkWebData.pasteFindings || [];

    updateStats();
    populateFilters();
    renderVictims();
    renderPastes();
  } catch (error) {
    console.error('Failed to load dark web intelligence:', error);
  }
}

// Update statistics
function updateStats() {
  if (!darkWebData) return;

  const victims = darkWebData.ransomwareVictims || [];
  const pastes = darkWebData.pasteFindings || [];

  document.getElementById('totalVictims').textContent = victims.length;
  document.getElementById('totalPastes').textContent = pastes.length;
  document.getElementById('criticalVictims').textContent = victims.filter(
    v => v.severity === 'CRITICAL'
  ).length;
  document.getElementById('criticalPastes').textContent = pastes.filter(
    p => p.severity === 'CRITICAL'
  ).length;
  document.getElementById('activeIncidents').textContent = victims.filter(
    v => v.status === 'active' || v.status === 'negotiating'
  ).length;
  document.getElementById('leakedIncidents').textContent = victims.filter(
    v => v.status === 'leaked'
  ).length;
}

// Populate filter dropdowns
function populateFilters() {
  if (!darkWebData) return;

  // Populate ransomware group filter
  const groups = [...new Set(darkWebData.ransomwareVictims.map(v => v.ransomwareGroup))].sort();
  const groupSelect = document.getElementById('ransomwareGroup');
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    groupSelect.appendChild(option);
  });
}

// Render ransomware victims
function renderVictims() {
  const grid = document.getElementById('victimsGrid');

  if (filteredVictims.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-secondary);">No victims match your filters.</p>';
    return;
  }

  grid.innerHTML = filteredVictims.map(victim => createVictimCard(victim)).join('');

  // Add click handlers
  document.querySelectorAll('.victim-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const victim = darkWebData.ransomwareVictims.find(v => v.id === id);
      showVictimModal(victim);
    });
  });
}

// Create victim card HTML
function createVictimCard(victim) {
  return `
    <div class="card victim-card" data-id="${victim.id}">
      <div class="card-header">
        <div>
          <div class="card-title">${victim.victimName}</div>
          <div class="card-subtitle">${victim.ransomwareGroup}</div>
        </div>
        <span class="severity-badge severity-${victim.severity.toLowerCase()}">${victim.severity}</span>
      </div>
      
      <div class="card-meta">
        <div class="meta-item">
          <span class="meta-label">Industry:</span> ${victim.industry}
        </div>
        <div class="meta-item">
          <span class="meta-label">Country:</span> ${victim.country}
        </div>
        <div class="meta-item">
          <span class="meta-label">Discovered:</span> ${new Date(victim.discoveredDate).toLocaleDateString()}
        </div>
        <div class="meta-item">
          <span class="meta-label">Revenue:</span> ${victim.revenue || 'Unknown'}
        </div>
      </div>
      
      <span class="status-badge status-${victim.status}">${victim.status.toUpperCase()}</span>
      
      ${
        victim.techniques && victim.techniques.length > 0
          ? `
        <div class="ioc-section">
          <div class="ioc-label">🎯 MITRE ATT&CK Techniques</div>
          <div class="ioc-tags">
            ${victim.techniques
              .slice(0, 4)
              .map(t => `<span class="ioc-tag">${t.id}</span>`)
              .join('')}
            ${victim.techniques.length > 4 ? `<span class="ioc-tag">+${victim.techniques.length - 4} more</span>` : ''}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// Show victim modal
function showVictimModal(victim) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <h2>${victim.victimName}</h2>
    <p><strong>Ransomware Group:</strong> ${victim.ransomwareGroup}</p>
    <p><strong>Industry:</strong> ${victim.industry} | <strong>Country:</strong> ${victim.country}</p>
    <p><strong>Discovered:</strong> ${new Date(victim.discoveredDate).toLocaleDateString()}</p>
    ${victim.publishedDate ? `<p><strong>Published:</strong> ${new Date(victim.publishedDate).toLocaleDateString()}</p>` : ''}
    <p><strong>Status:</strong> <span class="status-badge status-${victim.status}">${victim.status.toUpperCase()}</span></p>
    <p><strong>Severity:</strong> <span class="severity-badge severity-${victim.severity.toLowerCase()}">${victim.severity}</span></p>
    
    <h3>Description</h3>
    <p>${victim.description}</p>
    
    ${victim.revenue ? `<p><strong>Revenue:</strong> ${victim.revenue}</p>` : ''}
    ${victim.employeeCount ? `<p><strong>Employees:</strong> ${victim.employeeCount}</p>` : ''}
    ${victim.ransomAmount ? `<p><strong>Ransom Amount:</strong> ${victim.ransomAmount}</p>` : ''}
    ${victim.dataLeaked !== undefined ? `<p><strong>Data Leaked:</strong> ${victim.dataLeaked ? 'Yes' : 'No'}</p>` : ''}
    
    ${
      victim.techniques && victim.techniques.length > 0
        ? `
      <h3>MITRE ATT&CK Techniques</h3>
      <div class="ioc-tags">
        ${victim.techniques.map(t => `<span class="ioc-tag" title="${t.name}">${t.id}</span>`).join('')}
      </div>
    `
        : ''
    }
    
    ${
      victim.references && victim.references.length > 0
        ? `
      <h3>References</h3>
      ${victim.references.map(ref => `<p><a href="${ref.url}" target="_blank" style="color: #dc2626;">${ref.title}</a></p>`).join('')}
    `
        : ''
    }
  `;

  modal.style.display = 'block';
}

// Render paste findings
function renderPastes() {
  const grid = document.getElementById('pastesGrid');

  if (filteredPastes.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-secondary);">No pastes match your filters.</p>';
    return;
  }

  grid.innerHTML = filteredPastes.map(paste => createPasteCard(paste)).join('');

  // Add click handlers
  document.querySelectorAll('.paste-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const paste = darkWebData.pasteFindings.find(p => p.id === id);
      showPasteModal(paste);
    });
  });
}

// Create paste card HTML
function createPasteCard(paste) {
  const totalIOCs =
    (paste.iocs?.ips?.length || 0) +
    (paste.iocs?.domains?.length || 0) +
    (paste.iocs?.emails?.length || 0) +
    (paste.iocs?.hashes?.length || 0) +
    (paste.iocs?.cves?.length || 0);

  return `
    <div class="card paste-card" data-id="${paste.id}">
      <div class="card-header">
        <div>
          <div class="card-title">${paste.title}</div>
          <div class="card-subtitle">${paste.pasteSite} - ${paste.category}</div>
        </div>
        <span class="severity-badge severity-${paste.severity.toLowerCase()}">${paste.severity}</span>
      </div>
      
      <div class="card-meta">
        <div class="meta-item">
          <span class="meta-label">Discovered:</span> ${new Date(paste.discoveredDate).toLocaleDateString()}
        </div>
        <div class="meta-item">
          <span class="meta-label">IOCs:</span> ${totalIOCs}
        </div>
        ${
          paste.author
            ? `
          <div class="meta-item">
            <span class="meta-label">Author:</span> ${paste.author}
          </div>
        `
            : ''
        }
      </div>
      
      <p style="color: var(--text-secondary); font-size: 0.9em; margin: 10px 0;">${paste.description}</p>
      
      ${
        totalIOCs > 0
          ? `
        <div class="ioc-section">
          <div class="ioc-label">🔍 IOCs Found: ${totalIOCs}</div>
          <div class="ioc-tags">
            ${
              paste.iocs.ips
                ?.slice(0, 2)
                .map(ip => `<span class="ioc-tag">${ip}</span>`)
                .join('') || ''
            }
            ${
              paste.iocs.domains
                ?.slice(0, 2)
                .map(d => `<span class="ioc-tag">${d}</span>`)
                .join('') || ''
            }
            ${
              paste.iocs.cves
                ?.slice(0, 2)
                .map(c => `<span class="ioc-tag">${c}</span>`)
                .join('') || ''
            }
            ${totalIOCs > 6 ? `<span class="ioc-tag">+${totalIOCs - 6} more</span>` : ''}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// Show paste modal
function showPasteModal(paste) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');

  const totalIOCs =
    (paste.iocs?.ips?.length || 0) +
    (paste.iocs?.domains?.length || 0) +
    (paste.iocs?.emails?.length || 0) +
    (paste.iocs?.hashes?.length || 0) +
    (paste.iocs?.cves?.length || 0);

  modalBody.innerHTML = `
    <h2>${paste.title}</h2>
    <p><strong>Paste Site:</strong> ${paste.pasteSite} | <strong>Category:</strong> ${paste.category}</p>
    <p><strong>Discovered:</strong> ${new Date(paste.discoveredDate).toLocaleDateString()}</p>
    ${paste.author ? `<p><strong>Author:</strong> ${paste.author}</p>` : ''}
    <p><strong>Severity:</strong> <span class="severity-badge severity-${paste.severity.toLowerCase()}">${paste.severity}</span></p>
    <p><strong>URL:</strong> <a href="${paste.pasteUrl}" target="_blank" style="color: #dc2626;">${paste.pasteUrl}</a></p>
    
    <h3>Description</h3>
    <p>${paste.description}</p>
    
    ${
      totalIOCs > 0
        ? `
      <h3>Indicators of Compromise (${totalIOCs})</h3>
      ${
        paste.iocs.ips && paste.iocs.ips.length > 0
          ? `
        <p><strong>IPs (${paste.iocs.ips.length}):</strong></p>
        <div class="ioc-tags">
          ${paste.iocs.ips.map(ip => `<span class="ioc-tag">${ip}</span>`).join('')}
        </div>
      `
          : ''
      }
      ${
        paste.iocs.domains && paste.iocs.domains.length > 0
          ? `
        <p><strong>Domains (${paste.iocs.domains.length}):</strong></p>
        <div class="ioc-tags">
          ${paste.iocs.domains.map(d => `<span class="ioc-tag">${d}</span>`).join('')}
        </div>
      `
          : ''
      }
      ${
        paste.iocs.emails && paste.iocs.emails.length > 0
          ? `
        <p><strong>Emails (${paste.iocs.emails.length}):</strong></p>
        <div class="ioc-tags">
          ${paste.iocs.emails.map(e => `<span class="ioc-tag">${e}</span>`).join('')}
        </div>
      `
          : ''
      }
      ${
        paste.iocs.hashes && paste.iocs.hashes.length > 0
          ? `
        <p><strong>Hashes (${paste.iocs.hashes.length}):</strong></p>
        <div class="ioc-tags">
          ${paste.iocs.hashes.map(h => `<span class="ioc-tag">${h}</span>`).join('')}
        </div>
      `
          : ''
      }
      ${
        paste.iocs.cves && paste.iocs.cves.length > 0
          ? `
        <p><strong>CVEs (${paste.iocs.cves.length}):</strong></p>
        <div class="ioc-tags">
          ${paste.iocs.cves.map(c => `<span class="ioc-tag">${c}</span>`).join('')}
        </div>
      `
          : ''
      }
    `
        : ''
    }
    
    ${
      paste.affectedOrganizations && paste.affectedOrganizations.length > 0
        ? `
      <h3>Affected Organizations</h3>
      <p>${paste.affectedOrganizations.join(', ')}</p>
    `
        : ''
    }
    
    ${
      paste.techniques && paste.techniques.length > 0
        ? `
      <h3>MITRE ATT&CK Techniques</h3>
      <div class="ioc-tags">
        ${paste.techniques.map(t => `<span class="ioc-tag" title="${t.name}">${t.id}</span>`).join('')}
      </div>
    `
        : ''
    }
  `;

  modal.style.display = 'block';
}

// Apply filters for victims
function applyVictimFilters() {
  const search = document.getElementById('victimSearch').value.toLowerCase();
  const severity = document.getElementById('victimSeverity').value;
  const status = document.getElementById('victimStatus').value;
  const group = document.getElementById('ransomwareGroup').value;

  filteredVictims = darkWebData.ransomwareVictims.filter(victim => {
    const matchesSearch =
      !search ||
      victim.victimName.toLowerCase().includes(search) ||
      victim.ransomwareGroup.toLowerCase().includes(search) ||
      victim.industry.toLowerCase().includes(search) ||
      victim.description.toLowerCase().includes(search);

    const matchesSeverity = severity === 'ALL' || victim.severity === severity;
    const matchesStatus = status === 'ALL' || victim.status === status;
    const matchesGroup = group === 'ALL' || victim.ransomwareGroup === group;

    return matchesSearch && matchesSeverity && matchesStatus && matchesGroup;
  });

  renderVictims();
}

// Apply filters for pastes
function applyPasteFilters() {
  const search = document.getElementById('pasteSearch').value.toLowerCase();
  const severity = document.getElementById('pasteSeverity').value;
  const category = document.getElementById('pasteCategory').value;
  const site = document.getElementById('pasteSite').value;

  filteredPastes = darkWebData.pasteFindings.filter(paste => {
    const matchesSearch =
      !search ||
      paste.title.toLowerCase().includes(search) ||
      paste.description.toLowerCase().includes(search) ||
      (paste.author && paste.author.toLowerCase().includes(search));

    const matchesSeverity = severity === 'ALL' || paste.severity === severity;
    const matchesCategory = category === 'ALL' || paste.category === category;
    const matchesSite = site === 'ALL' || paste.pasteSite === site;

    return matchesSearch && matchesSeverity && matchesCategory && matchesSite;
  });

  renderPastes();
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update tab content
    document
      .querySelectorAll('.tab-content')
      .forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
  });
});

// Event listeners for filters
document.getElementById('victimSearch').addEventListener('input', applyVictimFilters);
document.getElementById('victimSeverity').addEventListener('change', applyVictimFilters);
document.getElementById('victimStatus').addEventListener('change', applyVictimFilters);
document.getElementById('ransomwareGroup').addEventListener('change', applyVictimFilters);

document.getElementById('pasteSearch').addEventListener('input', applyPasteFilters);
document.getElementById('pasteSeverity').addEventListener('change', applyPasteFilters);
document.getElementById('pasteCategory').addEventListener('change', applyPasteFilters);
document.getElementById('pasteSite').addEventListener('change', applyPasteFilters);

// Close modal when clicking outside
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') {
    document.getElementById('modal').style.display = 'none';
  }
});

// Initialize
loadDarkWebIntel();
