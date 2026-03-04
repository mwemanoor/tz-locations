# tz-locations

[![npm version](https://img.shields.io/npm/v/tz-locations)](https://www.npmjs.com/package/tz-locations)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Complete Tanzania location data — 31 regions, 168 districts, 4,054 wards, 75,061 streets with postcodes.

Offline-first. Fully typed. Zero network dependency.

## Why use this?

Every developer building for Tanzania ends up scraping address data, maintaining spreadsheets, or hardcoding locations. This package gives you the entire Tanzania postal hierarchy in a single `npm install` — no API calls, no network latency, works offline.

- **Complete coverage**: Every region, district, ward, and street with official postcodes
- **TypeScript-first**: Full type definitions for all entities
- **Zero dependencies**: Just data and pure functions
- **Offline-first**: Works without network — ideal for mobile and edge
- **Fast lookups**: Lazy-built `Map` indexes for O(1) access by slug or postcode

## Install

```bash
npm install tz-locations
```

## Quick Start

```typescript
import {
  getRegions,
  getDistrictsByRegion,
  getWardsByDistrict,
  getStreets,
  searchLocations,
  getByPostcode,
} from 'tz-locations';

// All 31 regions
const regions = getRegions();

// Districts in Dar es Salaam
const districts = getDistrictsByRegion('dar-es-salaam');

// Wards in Ilala district
const wards = getWardsByDistrict('dar-es-salaam', 'ilala');

// Streets in Buguruni ward
const streets = getStreets('dar-es-salaam', 'ilala', 'buguruni');

// Search by name
const results = searchLocations('buguruni', { type: 'ward', limit: 5 });

// Lookup by postcode
const location = getByPostcode('12102');
```

## API Reference

| Function | Returns | Description |
|----------|---------|-------------|
| `getRegions()` | `Region[]` | All 31 regions |
| `getRegion(slug)` | `Region \| undefined` | Single region by slug |
| `getDistricts(regionSlug?)` | `District[]` | All districts or filtered by region |
| `getDistrictsByRegion(slug)` | `District[]` | Districts in a region |
| `getDistrict(slug)` | `District \| undefined` | Single district by slug |
| `getWards(regionSlug?, districtSlug?)` | `Ward[]` | All wards or filtered |
| `getWardsByDistrict(region, district)` | `Ward[]` | Wards in a district |
| `getWard(slug)` | `Ward \| undefined` | Single ward by slug |
| `getStreets(region, district, ward)` | `Street[]` | Streets in a ward |
| `getByPostcode(postcode)` | `PostcodeLookupResult` | Lookup by 5-digit postcode |
| `searchLocations(query, options?)` | `Location[]` | Search by name |
| `getStats()` | `object` | Count of each entity type |

## TypeScript Types

```typescript
interface Region {
  name: string;
  slug: string;
}

interface District {
  name: string;
  slug: string;
  region_slug: string;
}

interface Ward {
  name: string;
  slug: string;
  district_slug: string;
  region_slug: string;
}

interface Street {
  name: string;
  postcode: string;
  ward_slug: string;
  district_slug: string;
  region_slug: string;
}

interface Location {
  type: 'region' | 'district' | 'ward' | 'street';
  name: string;
  slug?: string;
  postcode?: string;
  ward_slug?: string;
  district_slug?: string;
  region_slug?: string;
}

interface PostcodeLookupResult {
  ward: Ward | null;
  streets: Street[];
}
```

## Real-World Examples

### Cascading Address Select

```typescript
import { getRegions, getDistrictsByRegion, getWardsByDistrict, getStreets } from 'tz-locations';

// Step 1: User picks a region
const regions = getRegions();
// → [{ name: "Dar es Salaam", slug: "dar-es-salaam" }, ...]

// Step 2: Load districts for selected region
const districts = getDistrictsByRegion('dar-es-salaam');
// → [{ name: "Ilala", slug: "ilala", region_slug: "dar-es-salaam" }, ...]

// Step 3: Load wards for selected district
const wards = getWardsByDistrict('dar-es-salaam', 'ilala');
// → [{ name: "Buguruni", slug: "buguruni", ... }, ...]

// Step 4: Load streets for selected ward
const streets = getStreets('dar-es-salaam', 'ilala', 'buguruni');
// → [{ name: "Malapa", postcode: "12102", ... }, ...]
```

### Postcode Validation

```typescript
import { getByPostcode } from 'tz-locations';

function validatePostcode(postcode: string): boolean {
  const result = getByPostcode(postcode);
  return result.streets.length > 0;
}

// Get full location from postcode
const location = getByPostcode('12102');
if (location.ward) {
  console.log(`${location.ward.name}, ${location.ward.district_slug}`);
  // → "Buguruni, ilala"
}
```

### Search-as-you-type

```typescript
import { searchLocations } from 'tz-locations';

function onSearchInput(query: string) {
  if (query.length < 2) return [];
  return searchLocations(query, { limit: 10 });
}

// Returns mixed results: regions, districts, wards, streets
const results = onSearchInput('kinu');
// → [{ type: "district", name: "Kinondoni", ... }, ...]
```

## Performance

All lookups use lazy-built `Map` indexes. The first call to a lookup function builds the index (fast — just iterating arrays), and subsequent calls are O(1). Data is loaded once from bundled JSON files.

## REST API

Need server-side or cross-platform access? The same data is available as a REST API deployed on Cloudflare Workers with full-text search and autocomplete.

- [API Documentation](https://tz-locations-docs.pages.dev)
- [GitHub Repository](https://github.com/mwemanoor/tz-locations)

## Data Source

Scraped from [tanzaniapostcode.com](https://www.tanzaniapostcode.com) and verified.

## License

MIT
