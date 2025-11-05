# WatchLockAI Architecture

## System Overview

WatchLockAI is an enterprise-grade threat intelligence platform built on a serverless architecture using Cloudflare Workers for the API backend and GitHub Pages for the static dashboard frontend.

```
┌─────────────────────────────────────────────────────────────┐
│                     WatchLockAI Platform                     │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │   Dashboard    │         │   Worker API   │
        │ (GitHub Pages) │◄────────┤  (Cloudflare)  │
        └────────────────┘         └────────┬───────┘
                                            │
                                   ┌────────▼────────┐
                                   │   KV Storage    │
                                   │  (Cache Layer)  │
                                   └─────────────────┘
```

## Components

### 1. Cloudflare Worker API (`services/worker/`)

**Purpose**: Serverless API for threat intelligence aggregation, processing, and serving.

**Key Files**:

- `src/index.js` - Main worker entry point with request routing
- `src/feeds.js` - Feed fetching and normalization
- `src/deduplication.js` - Advanced deduplication logic (Phase 1)
- `src/correlation.js` - Cross-source correlation (Phase 1)
- `src/scoring.js` - Base risk scoring
- `src/scoring-phase2.js` - Enhanced scoring with bonuses (Phase 2)
- `src/utils.js` - Utility functions
- `src/sources.js` - Source management

**Endpoints**:

- `GET /api/threats?limit=100` - Full threat list with pagination
- `GET /api/top?limit=10` - Top threats sorted by bubble-up algorithm
- `GET /health` - Health check
- `GET /version` - API version info

**Processing Pipeline**:

```
1. Fetch feeds (12+ sources)
2. Normalize items
3. Basic deduplication (exact URL/title)
4. Advanced deduplication (CVE, title similarity, IOC)
5. Add correlation data (related threats)
6. Calculate base risk scores
7. Apply Phase 2 enhancements (bonuses, badges)
8. Bubble-up sort (score → sourceCount → recency)
9. Cache in KV
10. Return JSON response
```

**Cron Schedule**: Every 15 minutes (`*/15 * * * *`)

**KV Storage**:

- `unified-threats` - Full processed threat list (TTL: 30 min)
- `top-threats` - Top 20 threats (TTL: 30 min)

### 2. Dashboard (`apps/intel-dashboard/`)

**Purpose**: Interactive web UI for threat visualization and analysis.

**Technology Stack**:

- Vite (build tool)
- Vanilla JavaScript (no framework overhead)
- Modern CSS with CSS Grid and Flexbox

**Key Files**:

- `index.html` - Main HTML structure
- `src/main.js` - Application logic
- `src/style.css` - Styling
- `vite.config.js` - Build configuration

**Features**:

- **Executive View**: Top 10 threats as cards with badges
- **Analyst View**: Full table with sorting and filtering
- **Auto-Refresh**: Updates every 60 seconds
- **Fallback**: Demo dataset when API unavailable
- **Responsive**: Mobile-friendly design

**Data Flow**:

```
1. Try primary API (Cloudflare Worker)
2. If fails, try fallback dataset
3. Parse and validate data
4. Render based on current view
5. Update statistics
6. Start auto-refresh timer
```

### 3. Schemas (`packages/schemas/`)

**Purpose**: JSON Schema for data validation and documentation.

**File**: `unified-threat.schema.json`

**Validation**: Used in CI pipeline with AJV to ensure data integrity.

## Phase 1: Enhanced Data Aggregation & Correlation

### Deduplication Algorithm

**Matching Strategies** (in order of priority):

1. **Exact URL Match** (100% confidence)
   - Normalized URL comparison
   - Removes query params and fragments

2. **CVE Match** (95% confidence)
   - Exact CVE identifier match
   - Requires title similarity ≥60%

3. **Title Similarity** (85%+ confidence)
   - Levenshtein distance algorithm
   - Threshold: 85% similarity

4. **IOC Match** (75% confidence)
   - Shared IPs, domains, or file hashes
   - Requires 50%+ overlap + 50%+ title similarity

**Merge Strategy**:

- Use most recent item as primary
- Combine sources array
- Merge tags (unique)
- Keep alternate links

### Correlation Engine

**Relation Scoring**:

- Shared CVEs: +50 points per CVE
- Shared tags (3+): +20 points
- Same APT group: +30 points
- Temporal proximity (<24h): +10 points

**Threshold**: Minimum 30 points to be considered related

**Output**: Up to 5 related threats per item

## Phase 2: Bubble-Up Logic & Critical Alerts

### Enhanced Risk Scoring

**Base Score** (from Phase 1):

- KEV: 40 points
- Zero-day: 30 points
- CVE: 20 points
- MITRE ATT&CK: +10 points
- Temporal: 0-20 points
- Exploitability: 0-30 points
- Threat type: 0-10 points

**Phase 2 Bonuses**:

- Multi-source (3+): +10 points
- Gov sources (2+): +15 points
- Critical combo (KEV + Zero-day + Exploited): +20 points
- Ransomware combo (Ransomware + POC + Critical): +15 points
- Trending (3+ related): +5 points

**Severity Thresholds**:

- CRITICAL: ≥95
- HIGH: 85-94
- MEDIUM: 70-84
- LOW: 40-69
- INFO: <40

### Bubble-Up Algorithm

**Sort Priority**:

1. Risk score (descending)
2. Source count (descending)
3. Recency (newest first)

**Implementation**: `bubbleUpSort()` function in `scoring-phase2.js`

### Badge System

- **MULTI-SOURCE**: Reported by 3+ sources
- **GOV-CONFIRMED**: Confirmed by 2+ government sources
- **CRITICAL-COMBO**: KEV + Zero-day + Active exploitation
- **RANSOMWARE-CRITICAL**: Ransomware + POC + Critical severity
- **TRENDING**: 3+ related threats
- **APT-TARGETED**: APT group identified

## Data Sources

**Current Sources** (12+):

1. CISA KEV (Known Exploited Vulnerabilities)
2. CISA News
3. NCSC UK
4. Microsoft Security Blog
5. Cisco Talos Blog
6. Mandiant
7. Google Threat Analysis Group
8. BleepingComputer
9. The Record (Recorded Future)
10. Krebs on Security
11. US-CERT Alerts
12. Additional RSS/JSON feeds

**Source Tiers**:

- Tier 1 (Gov/Official): 1.2x multiplier
- Tier 2 (Vendor/Research): 1.1x multiplier
- Tier 3 (News): 1.0x multiplier

## Deployment Architecture

### Production Environment

```
GitHub Pages (Dashboard)
    ↓ HTTPS
Cloudflare Worker (API)
    ↓
KV Storage (Cache)
    ↓
External Feeds (12+ sources)
```

### CI/CD Pipeline

**On Push to Main**:

1. Run ESLint
2. Run Prettier check
3. Validate JSON Schema
4. Run Playwright tests
5. Build dashboard
6. Deploy to GitHub Pages
7. Deploy Worker to Cloudflare

**Workflows**:

- `.github/workflows/ci.yml` - Lint, test, validate
- `.github/workflows/pages.yml` - Deploy dashboard
- `.github/workflows/worker-deploy.yml` - Deploy worker

## Security Considerations

1. **CORS**: Enabled for public API access
2. **Rate Limiting**: Cloudflare automatic protection
3. **Input Validation**: All feeds sanitized
4. **XSS Prevention**: HTML escaping in dashboard
5. **HTTPS Only**: All connections encrypted
6. **No Secrets in Code**: Environment variables for sensitive data

## Performance Optimizations

1. **KV Caching**: 15-minute TTL reduces API calls
2. **Edge Computing**: Cloudflare global network
3. **Lazy Loading**: Dashboard loads incrementally
4. **Minification**: Vite production builds
5. **CDN**: GitHub Pages with global CDN

## Monitoring & Observability

**Metrics**:

- API response time
- Cache hit rate
- Error rate
- Threat count
- Correlation statistics

**Logging**:

- Structured JSON logs
- Error tracking
- Performance metrics

## Future Enhancements

**Phase 3**: Free API Integrations (AbuseIPDB, VirusTotal, OTX)
**Phase 4-5**: Site Merge (APT Profiles + Detection Engineering)
**Phase 6**: Universal Search
**Phase 7**: Dark Web Intelligence
**Phase 8**: Community Intelligence

---

**Last Updated**: 2025-11-01  
**Version**: 2.0.0  
**Phase**: Phase 2 Complete
