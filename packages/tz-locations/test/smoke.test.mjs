#!/usr/bin/env node

/**
 * Smoke test for the built tz-locations npm package.
 * Imports from ./dist/index.js and asserts core functionality works.
 * Exits with code 1 on any failure.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, "../dist/index.js");

let errors = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  OK: ${msg}`);
  } else {
    console.error(`FAIL: ${msg}`);
    errors++;
  }
}

console.log("--- npm package smoke test ---\n");
console.log(`Importing from: ${distPath}\n`);

const pkg = await import(distPath);

// 1. getRegions returns 31 items
const regions = pkg.getRegions();
assert(regions.length === 31, `getRegions() returns 31 items (got ${regions.length})`);

// 2. getDistrictsByRegion('dar-es-salaam') returns results
const darDistricts = pkg.getDistrictsByRegion("dar-es-salaam");
assert(darDistricts.length > 0, `getDistrictsByRegion('dar-es-salaam') returns ${darDistricts.length} results`);

// 3. getByPostcode('12102') returns a ward
const postcodeResult = pkg.getByPostcode("12102");
assert(postcodeResult.ward !== null, `getByPostcode('12102') returns a ward: ${postcodeResult.ward?.name ?? "null"}`);

// 4. searchLocations('buguruni') returns results
const searchResults = pkg.searchLocations("buguruni");
assert(searchResults.length > 0, `searchLocations('buguruni') returns ${searchResults.length} results`);

// 5. getStats() returns expected counts
const stats = pkg.getStats();
assert(stats.regions === 31, `getStats().regions === 31 (got ${stats.regions})`);
assert(stats.districts === 168, `getStats().districts === 168 (got ${stats.districts})`);
assert(stats.wards === 4054, `getStats().wards === 4054 (got ${stats.wards})`);
assert(stats.streets === 75061, `getStats().streets === 75061 (got ${stats.streets})`);

// Summary
console.log(`\n--- Results: ${errors === 0 ? "ALL PASSED" : `${errors} FAILURE(S)`} ---`);
process.exit(errors > 0 ? 1 : 0);
