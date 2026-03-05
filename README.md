# tz-locations

[![npm version](https://img.shields.io/npm/v/tz-locations)](https://www.npmjs.com/package/tz-locations)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The definitive Tanzania locations dataset — **31 regions, 168 districts, 4,054 wards, 75,061 streets** with postcodes.

## Why

There's no structured, developer-friendly address data for Tanzania. Every team building for TZ ends up scraping the same postal data, maintaining brittle spreadsheets, or hardcoding locations. This project fixes that — once and for all.

## Components

| Component | Description |
|-----------|-------------|
| [`api/`](./api/) | REST API — Hono + Cloudflare Workers + D1, 12 endpoints, full-text search |
| [`packages/tz-locations/`](./packages/tz-locations/) | npm package — offline-first, typed, zero network dependency |
| [`scraper/`](./scraper/) | Python async scraper for tanzaniapostcode.com |
| [`docs/`](./docs/) | Single-page documentation site |

## Quick Start: API

```bash
# All regions
curl https://tz-locations-api.mwemanoor.workers.dev/v1/regions

# Districts in Dar es Salaam
curl https://tz-locations-api.mwemanoor.workers.dev/v1/regions/dar-es-salaam/districts

# Search
curl "https://tz-locations-api.mwemanoor.workers.dev/v1/search?q=buguruni&type=ward"

# Postcode lookup
curl https://tz-locations-api.mwemanoor.workers.dev/v1/postcodes/12102
```

## Quick Start: npm Package

```bash
npm install tz-locations
```

```typescript
import { getRegions, getDistrictsByRegion, searchLocations, getByPostcode } from 'tz-locations';

const regions = getRegions();                            // 31 regions
const districts = getDistrictsByRegion('dar-es-salaam'); // districts in DSM
const results = searchLocations('buguruni');              // search
const location = getByPostcode('12102');                  // postcode lookup
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1/regions` | All 31 regions |
| `GET /v1/regions/:slug` | Single region with stats |
| `GET /v1/regions/:slug/districts` | Districts in a region |
| `GET /v1/districts/:slug` | Single district with stats |
| `GET /v1/districts/:slug/wards` | Wards in a district |
| `GET /v1/wards/:slug` | Single ward with postcode |
| `GET /v1/wards/:slug/streets` | Streets in a ward |
| `GET /v1/streets/:id` | Single street |
| `GET /v1/postcodes/:postcode` | Lookup by postcode |
| `GET /v1/search?q=&type=&limit=` | Full-text search |
| `GET /v1/autocomplete?q=&limit=` | Prefix autocomplete |
| `GET /v1/stats` | Counts per level |

## Full Documentation

[tz-locations-docs.pages.dev](https://tz-locations-docs.pages.dev) — interactive API reference, npm package guide, and code examples.

## Data Coverage

| Level | Count |
|-------|-------|
| Regions | 31 |
| Districts | 168 |
| Wards | 4,054 |
| Streets | 75,061 |

Data sourced from [tanzaniapostcode.com](https://www.tanzaniapostcode.com).

## Development

### Scraper

```bash
cd scraper
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scrape.py
```

### API

```bash
cd api
npm install
npx wrangler d1 create address-tz-db
npx wrangler d1 migrations apply address-tz-db --local
npx tsx src/db/seed.ts
npx wrangler d1 execute address-tz-db --local --file=src/db/seed.sql
npx wrangler dev
```

### Deploy

```bash
cd api
npx wrangler d1 migrations apply address-tz-db --remote
npx wrangler d1 execute address-tz-db --remote --file=src/db/seed.sql
npx wrangler deploy
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT
