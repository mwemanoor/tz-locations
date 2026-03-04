import type { Region, District, Ward, Street, Location, PostcodeLookupResult } from "./types.js";

// Re-export types
export type { Region, District, Ward, Street, Location, PostcodeLookupResult };

// Data imports — these will be populated after scraping
// For now, initialize with empty arrays; the build script copies scraped data here
let regionsData: Region[] = [];
let districtsData: District[] = [];
let wardsData: Ward[] = [];
let streetsData: Street[] = [];

try {
  regionsData = (await import("./data/regions.json", { with: { type: "json" } })).default as Region[];
  districtsData = (await import("./data/districts.json", { with: { type: "json" } })).default as District[];
  wardsData = (await import("./data/wards.json", { with: { type: "json" } })).default as Ward[];
  streetsData = (await import("./data/streets.json", { with: { type: "json" } })).default as Street[];
} catch {
  // Data files not yet available — functions will return empty arrays
}

// --- Lookup indexes (lazy-built) ---

let _districtsByRegion: Map<string, District[]> | null = null;
let _wardsByDistrict: Map<string, Ward[]> | null = null;
let _streetsByWard: Map<string, Street[]> | null = null;
let _postcodeIndex: Map<string, Street[]> | null = null;

function getDistrictsByRegionIndex(): Map<string, District[]> {
  if (!_districtsByRegion) {
    _districtsByRegion = new Map();
    for (const d of districtsData) {
      const list = _districtsByRegion.get(d.region_slug) ?? [];
      list.push(d);
      _districtsByRegion.set(d.region_slug, list);
    }
  }
  return _districtsByRegion;
}

function getWardsByDistrictIndex(): Map<string, Ward[]> {
  if (!_wardsByDistrict) {
    _wardsByDistrict = new Map();
    for (const w of wardsData) {
      const key = `${w.region_slug}/${w.district_slug}`;
      const list = _wardsByDistrict.get(key) ?? [];
      list.push(w);
      _wardsByDistrict.set(key, list);
    }
  }
  return _wardsByDistrict;
}

function getStreetsByWardIndex(): Map<string, Street[]> {
  if (!_streetsByWard) {
    _streetsByWard = new Map();
    for (const s of streetsData) {
      const key = `${s.region_slug}/${s.district_slug}/${s.ward_slug}`;
      const list = _streetsByWard.get(key) ?? [];
      list.push(s);
      _streetsByWard.set(key, list);
    }
  }
  return _streetsByWard;
}

function getPostcodeIndex(): Map<string, Street[]> {
  if (!_postcodeIndex) {
    _postcodeIndex = new Map();
    for (const s of streetsData) {
      if (s.postcode) {
        const list = _postcodeIndex.get(s.postcode) ?? [];
        list.push(s);
        _postcodeIndex.set(s.postcode, list);
      }
    }
  }
  return _postcodeIndex;
}

// --- Public API ---

/** Get all 31 regions of Tanzania. */
export function getRegions(): Region[] {
  return regionsData;
}

/** Get a single region by slug. */
export function getRegion(slug: string): Region | undefined {
  return regionsData.find((r) => r.slug === slug);
}

/** Get all districts, optionally filtered by region slug. */
export function getDistricts(regionSlug?: string): District[] {
  if (regionSlug) {
    return getDistrictsByRegionIndex().get(regionSlug) ?? [];
  }
  return districtsData;
}

/** Alias: Get districts by region slug. */
export function getDistrictsByRegion(regionSlug: string): District[] {
  return getDistricts(regionSlug);
}

/** Get a single district by slug. */
export function getDistrict(slug: string): District | undefined {
  return districtsData.find((d) => d.slug === slug);
}

/** Get all wards, optionally filtered by district. */
export function getWards(regionSlug?: string, districtSlug?: string): Ward[] {
  if (regionSlug && districtSlug) {
    return getWardsByDistrictIndex().get(`${regionSlug}/${districtSlug}`) ?? [];
  }
  return wardsData;
}

/** Get wards by district slug (within a region). */
export function getWardsByDistrict(regionSlug: string, districtSlug: string): Ward[] {
  return getWards(regionSlug, districtSlug);
}

/** Get a single ward by slug. */
export function getWard(slug: string): Ward | undefined {
  return wardsData.find((w) => w.slug === slug);
}

/** Get streets in a specific ward. */
export function getStreets(regionSlug: string, districtSlug: string, wardSlug: string): Street[] {
  return getStreetsByWardIndex().get(`${regionSlug}/${districtSlug}/${wardSlug}`) ?? [];
}

/** Lookup location(s) by postcode. */
export function getByPostcode(postcode: string): PostcodeLookupResult {
  const streets = getPostcodeIndex().get(postcode) ?? [];
  const ward = wardsData.find((w) =>
    streets.length > 0
      ? w.slug === streets[0].ward_slug &&
        w.district_slug === streets[0].district_slug &&
        w.region_slug === streets[0].region_slug
      : false
  ) ?? null;

  return { ward, streets };
}

/** Search locations by name (case-insensitive substring match). */
export function searchLocations(query: string, options?: { type?: Location["type"]; limit?: number }): Location[] {
  const q = query.toLowerCase();
  const limit = options?.limit ?? 10;
  const results: Location[] = [];

  const shouldSearch = (type: Location["type"]) => !options?.type || options.type === type;

  if (shouldSearch("region")) {
    for (const r of regionsData) {
      if (results.length >= limit) break;
      if (r.name.toLowerCase().includes(q)) {
        results.push({ type: "region", name: r.name, slug: r.slug });
      }
    }
  }

  if (shouldSearch("district")) {
    for (const d of districtsData) {
      if (results.length >= limit) break;
      if (d.name.toLowerCase().includes(q)) {
        results.push({ type: "district", name: d.name, slug: d.slug, region_slug: d.region_slug });
      }
    }
  }

  if (shouldSearch("ward")) {
    for (const w of wardsData) {
      if (results.length >= limit) break;
      if (w.name.toLowerCase().includes(q)) {
        results.push({
          type: "ward",
          name: w.name,
          slug: w.slug,
          district_slug: w.district_slug,
          region_slug: w.region_slug,
        });
      }
    }
  }

  if (shouldSearch("street")) {
    for (const s of streetsData) {
      if (results.length >= limit) break;
      if (s.name.toLowerCase().includes(q)) {
        results.push({
          type: "street",
          name: s.name,
          postcode: s.postcode,
          ward_slug: s.ward_slug,
          district_slug: s.district_slug,
          region_slug: s.region_slug,
        });
      }
    }
  }

  return results;
}

/** Get summary statistics. */
export function getStats() {
  return {
    regions: regionsData.length,
    districts: districtsData.length,
    wards: wardsData.length,
    streets: streetsData.length,
  };
}
