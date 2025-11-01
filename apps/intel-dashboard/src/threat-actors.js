/**
 * Threat Actors Dashboard
 * Displays threat actor profiles and attribution data
 */

let actorData = null;
let currentTab = 'all';
const filters = {
  search: '',
  type: '',
  country: '',
  sophistication: '',
  status: '',
};

/**
 * Load threat actor data
 */
async function loadThreatActors() {
  try {
    const response = await fetch('/data/threat-actors.json');
    actorData = await response.json();

    updateStats();
    populateFilters();
    renderActors();
  } catch (error) {
    console.error('Failed to load threat actors:', error);
    document.getElementById('actorsGrid').innerHTML =
      '<p class="error">Failed to load threat actors</p>';
  }
}

/**
 * Update statistics
 */
function updateStats() {
  if (!actorData || !actorData.threatActors) return;

  const actors = actorData.threatActors;

  document.getElementById('totalActors').textContent = actors.length;
  document.getElementById('activeActors').textContent = actors.filter(
    a => a.status === 'active'
  ).length;
  document.getElementById('nationStateCount').textContent = actors.filter(
    a => a.type === 'nation-state'
  ).length;
  document.getElementById('cybercrimeCount').textContent = actors.filter(
    a => a.type === 'cybercrime'
  ).length;
  document.getElementById('totalCampaigns').textContent = actors.reduce(
    (sum, a) => sum + (a.campaigns?.length || 0),
    0
  );
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
  if (!actorData || !actorData.threatActors) return;

  const actors = actorData.threatActors;

  // Populate country filter
  const countries = [...new Set(actors.map(a => a.country))].sort();
  const countryFilter = document.getElementById('countryFilter');
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countryFilter.appendChild(option);
  });
}

/**
 * Render actors based on current tab and filters
 */
function renderActors() {
  if (!actorData || !actorData.threatActors) return;

  let actors = actorData.threatActors;

  // Filter by tab
  if (currentTab === 'nation-state') {
    actors = actors.filter(a => a.type === 'nation-state');
  } else if (currentTab === 'cybercrime') {
    actors = actors.filter(a => a.type === 'cybercrime');
  }

  // Apply filters
  actors = applyFilters(actors);

  const grid = document.getElementById('actorsGrid');

  if (actors.length === 0) {
    grid.innerHTML = '<p class="no-results">No threat actors found matching your filters</p>';
    return;
  }

  grid.innerHTML = actors.map(actor => createActorCard(actor)).join('');

  // Add click handlers
  document.querySelectorAll('.actor-card').forEach(card => {
    card.addEventListener('click', () => {
      const actorId = card.dataset.actorId;
      const actor = actorData.threatActors.find(a => a.id === actorId);
      if (actor) {
        showActorModal(actor);
      }
    });
  });
}

/**
 * Create actor card HTML
 */
function createActorCard(actor) {
  const typeClass = actor.type.replace('-', '');
  const sophisticationClass = actor.sophistication;
  const statusClass = actor.status;

  return `
    <div class="actor-card" data-actor-id="${actor.id}">
      <div class="actor-header">
        <h3 class="actor-name">${actor.name}</h3>
        <span class="actor-type-badge ${typeClass}">${actor.type}</span>
      </div>
      
      <div class="actor-aliases">
        ${(actor.aliases || [])
          .slice(0, 3)
          .map(alias => `<span class="alias-tag">${alias}</span>`)
          .join('')}
        ${actor.aliases && actor.aliases.length > 3 ? `<span class="alias-tag">+${actor.aliases.length - 3} more</span>` : ''}
      </div>
      
      <div class="actor-meta">
        <div class="meta-item">
          <span class="meta-label">Country:</span>
          <span class="meta-value">${actor.country}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Sophistication:</span>
          <span class="sophistication-badge ${sophisticationClass}">${actor.sophistication}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status:</span>
          <span class="status-badge ${statusClass}">${actor.status}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Campaigns:</span>
          <span class="meta-value">${actor.campaigns?.length || 0}</span>
        </div>
      </div>
      
      <div class="actor-motivation">
        ${(actor.motivation || []).map(m => `<span class="motivation-tag">${m}</span>`).join('')}
      </div>
      
      <div class="actor-footer">
        <span class="last-seen">Last seen: ${formatDate(actor.lastSeen)}</span>
      </div>
    </div>
  `;
}

/**
 * Show actor modal with full details
 */
function showActorModal(actor) {
  const modal = document.getElementById('actorModal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>${actor.name}</h2>
      <span class="actor-type-badge ${actor.type.replace('-', '')}">${actor.type}</span>
    </div>
    
    <div class="modal-section">
      <h3>Aliases</h3>
      <div class="alias-list">
        ${(actor.aliases || []).map(alias => `<span class="alias-tag">${alias}</span>`).join('')}
      </div>
    </div>
    
    <div class="modal-section">
      <h3>Profile</h3>
      <div class="profile-grid">
        <div class="profile-item">
          <span class="profile-label">Country:</span>
          <span class="profile-value">${actor.country}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">Sophistication:</span>
          <span class="sophistication-badge ${actor.sophistication}">${actor.sophistication}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">Status:</span>
          <span class="status-badge ${actor.status}">${actor.status}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">First Seen:</span>
          <span class="profile-value">${formatDate(actor.firstSeen)}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">Last Seen:</span>
          <span class="profile-value">${formatDate(actor.lastSeen)}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">Motivation:</span>
          <span class="profile-value">${(actor.motivation || []).join(', ')}</span>
        </div>
      </div>
    </div>
    
    ${
      actor.targets
        ? `
    <div class="modal-section">
      <h3>Targets</h3>
      <div class="targets-grid">
        ${
          actor.targets.industries && actor.targets.industries.length > 0
            ? `
        <div class="target-category">
          <h4>Industries</h4>
          <div class="target-tags">
            ${actor.targets.industries.map(i => `<span class="target-tag">${i}</span>`).join('')}
          </div>
        </div>
        `
            : ''
        }
        ${
          actor.targets.countries && actor.targets.countries.length > 0
            ? `
        <div class="target-category">
          <h4>Countries</h4>
          <div class="target-tags">
            ${actor.targets.countries.map(c => `<span class="target-tag">${c}</span>`).join('')}
          </div>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }
    
    ${
      actor.ttps && actor.ttps.length > 0
        ? `
    <div class="modal-section">
      <h3>TTPs (MITRE ATT&CK)</h3>
      <div class="ttp-list">
        ${actor.ttps
          .map(
            ttp => `
          <div class="ttp-item">
            <span class="ttp-id">${ttp.id}</span>
            <span class="ttp-name">${ttp.name}</span>
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
      actor.malwareFamilies && actor.malwareFamilies.length > 0
        ? `
    <div class="modal-section">
      <h3>Malware Families</h3>
      <div class="malware-list">
        ${actor.malwareFamilies.map(m => `<span class="malware-tag">${m}</span>`).join('')}
      </div>
    </div>
    `
        : ''
    }
    
    ${
      actor.infrastructure
        ? `
    <div class="modal-section">
      <h3>Infrastructure</h3>
      <div class="infrastructure-grid">
        ${
          actor.infrastructure.domains && actor.infrastructure.domains.length > 0
            ? `
        <div class="infra-category">
          <h4>Domains</h4>
          <div class="infra-list">
            ${actor.infrastructure.domains.map(d => `<code>${d}</code>`).join('')}
          </div>
        </div>
        `
            : ''
        }
        ${
          actor.infrastructure.ips && actor.infrastructure.ips.length > 0
            ? `
        <div class="infra-category">
          <h4>IP Addresses</h4>
          <div class="infra-list">
            ${actor.infrastructure.ips.map(ip => `<code>${ip}</code>`).join('')}
          </div>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }
    
    ${
      actor.campaigns && actor.campaigns.length > 0
        ? `
    <div class="modal-section">
      <h3>Known Campaigns</h3>
      <div class="campaigns-list">
        ${actor.campaigns
          .map(
            campaign => `
          <div class="campaign-item">
            <div class="campaign-header">
              <h4>${campaign.name}</h4>
              <span class="campaign-date">${formatDate(campaign.date)}</span>
            </div>
            <p class="campaign-description">${campaign.description}</p>
            ${
              campaign.targets && campaign.targets.length > 0
                ? `
            <div class="campaign-targets">
              <strong>Targets:</strong> ${campaign.targets.join(', ')}
            </div>
            `
                : ''
            }
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
      actor.attribution
        ? `
    <div class="modal-section">
      <h3>Attribution</h3>
      <div class="attribution-info">
        <div class="attribution-confidence">
          <span class="confidence-label">Confidence:</span>
          <span class="confidence-badge ${actor.attribution.confidence}">${actor.attribution.confidence}</span>
        </div>
        ${
          actor.attribution.evidence && actor.attribution.evidence.length > 0
            ? `
        <div class="attribution-evidence">
          <h4>Evidence:</h4>
          <ul>
            ${actor.attribution.evidence.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
        `
            : ''
        }
      </div>
    </div>
    `
        : ''
    }
    
    ${
      actor.references && actor.references.length > 0
        ? `
    <div class="modal-section">
      <h3>References</h3>
      <div class="references-list">
        ${actor.references
          .map(
            ref => `
          <div class="reference-item">
            <a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.title}</a>
            ${ref.date ? `<span class="reference-date">(${formatDate(ref.date)})</span>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }
  `;

  modal.style.display = 'block';
}

/**
 * Apply filters to actors
 */
function applyFilters(actors) {
  return actors.filter(actor => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = actor.name.toLowerCase().includes(searchLower);
      const matchesAlias = (actor.aliases || []).some(alias =>
        alias.toLowerCase().includes(searchLower)
      );
      if (!matchesName && !matchesAlias) return false;
    }

    // Type filter
    if (filters.type && actor.type !== filters.type) return false;

    // Country filter
    if (filters.country && actor.country !== filters.country) return false;

    // Sophistication filter
    if (filters.sophistication && actor.sophistication !== filters.sophistication) return false;

    // Status filter
    if (filters.status && actor.status !== filters.status) return false;

    return true;
  });
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
      renderActors();
    });
  });

  // Search input
  document.getElementById('searchInput').addEventListener('input', e => {
    filters.search = e.target.value;
    renderActors();
  });

  // Filter selects
  document.getElementById('typeFilter').addEventListener('change', e => {
    filters.type = e.target.value;
    renderActors();
  });

  document.getElementById('countryFilter').addEventListener('change', e => {
    filters.country = e.target.value;
    renderActors();
  });

  document.getElementById('sophisticationFilter').addEventListener('change', e => {
    filters.sophistication = e.target.value;
    renderActors();
  });

  document.getElementById('statusFilter').addEventListener('change', e => {
    filters.status = e.target.value;
    renderActors();
  });

  // Modal close
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('actorModal').style.display = 'none';
  });

  window.addEventListener('click', e => {
    const modal = document.getElementById('actorModal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadThreatActors();
});
