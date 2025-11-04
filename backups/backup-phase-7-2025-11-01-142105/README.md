# WatchLockAI

**Enterprise-Grade Threat Intelligence Platform**

> Know the Threat • Detect the Threat • Hunt the Threat

## 🎯 Overview

WatchLockAI is a free, open-source threat intelligence aggregation and correlation platform that rivals commercial solutions like Recorded Future. It combines structured data from 12+ authoritative security sources with advanced deduplication, cross-source correlation, and intelligent risk scoring.

## 🚀 Live Demo

- **Dashboard**: https://tweakn74.github.io/WatchLockAI/
- **API**: https://watchlockai-intel-api.craig-glatt.workers.dev

## ✨ Features

### Phase 1: Enhanced Data Aggregation & Correlation ✅

- **Advanced Deduplication**: CVE-based, title similarity (Levenshtein), IOC matching
- **Cross-Source Correlation**: Identifies related threats across multiple sources
- **Multi-Source Tracking**: Shows which sources reported each threat
- **IOC Extraction**: Automatic extraction of IPs, domains, file hashes

### Phase 2: Bubble-Up Logic & Critical Alerts ✅

- **Enhanced Risk Scoring**: Multi-source bonus, critical combo detection
- **Top Threats Dashboard**: Auto-sorted by score → sources → recency
- **Executive/Analyst Toggle**: Compact view vs. full table
- **Auto-Refresh**: Real-time updates every 60 seconds
- **Visual Badges**: 🔴 CRITICAL, 🟠 HIGH, 🔵 TRENDING, 🟣 APT

### Coming Soon

- **Phase 3**: Free API Integrations (AbuseIPDB, VirusTotal, OTX)
- **Phase 4-5**: Site Merge (APT Profiles + Detection Engineering)
- **Phase 6**: Universal Search
- **Phase 7**: Dark Web Intelligence
- **Phase 8**: Community Intelligence

## 📁 Repository Structure

```
WatchLockAI/
├── apps/
│   └── intel-dashboard/     # GitHub Pages dashboard
│       ├── src/
│       ├── public/
│       └── dist/
├── services/
│   └── worker/              # Cloudflare Worker API
│       ├── src/
│       └── wrangler.toml
├── packages/
│   ├── scoring/             # Risk scoring logic
│   ├── correlator/          # Correlation engine
│   └── schemas/             # JSON schemas
├── data/
│   ├── demo/                # Sample datasets
│   ├── out/                 # Generated outputs
│   └── schemas/             # Data schemas
├── docs/
│   ├── ARCHITECTURE.md
│   └── OPERATIONS.md
└── .github/
    └── workflows/           # CI/CD pipelines
```

## 🛠️ Development

### Prerequisites

- Node.js ≥18.0.0
- Cloudflare account (free tier)
- GitHub account

### Setup

```bash
# Clone repository
git clone https://github.com/tweakn74/WatchLockAI.git
cd WatchLockAI

# Install dependencies
npm install

# Run dashboard locally
npm run dev

# Run worker locally
npm run worker:dev
```

### Deployment

```bash
# Deploy Cloudflare Worker
npm run worker:deploy

# Build dashboard for GitHub Pages
npm run build
```

## 📊 API Endpoints

- `GET /api/threats` - Full unified threat list
- `GET /api/top?limit=10` - Top threats sorted by score
- `GET /health` - Health check
- `GET /version` - API version

## 🔒 Security & Privacy

- **Free Tier Only**: No paid APIs or data collection
- **No ToS Violations**: Uses only approved feeds and public advisories
- **CORS Enabled**: Public API with proper headers
- **Schema Validation**: All data validated with JSON Schema

## 📝 License

MIT License - See [LICENSE](LICENSE) for details

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📧 Contact

- **Author**: CG
- **Email**: craig.glatt@gmail.com
- **GitHub**: [@tweakn74](https://github.com/tweakn74)

---

**Built with ❤️ for the security community**
