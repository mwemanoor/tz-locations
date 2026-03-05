#!/usr/bin/env node

/**
 * Data integrity validation for tz-locations.
 * Checks counts, referential integrity, duplicate slugs, and name patterns.
 * Exits with code 1 on any failure.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../packages/tz-locations/src/data");

let errors = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`  OK: ${msg}`);
}

async function loadJSON(name) {
  const raw = await readFile(resolve(dataDir, name), "utf-8");
  return JSON.parse(raw);
}

// Load data
const regions = await loadJSON("regions.json");
const districts = await loadJSON("districts.json");
const wards = await loadJSON("wards.json");
const streets = await loadJSON("streets.json");

console.log("--- Data Validation ---\n");

// 1. Verify counts
const expected = { regions: 31, districts: 168, wards: 4054, streets: 75061 };

for (const [name, count] of Object.entries(expected)) {
  const data = { regions, districts, wards, streets }[name];
  if (data.length === count) {
    pass(`${name}: ${data.length} items`);
  } else {
    fail(`${name}: expected ${count}, got ${data.length}`);
  }
}

// 2. Check no ward/street names contain the ng'[A-Z] pattern (apostrophe stripping)
const ngPattern = /ng [A-Z]/;

for (const ward of wards) {
  if (ngPattern.test(ward.name)) {
    fail(`Ward name contains suspicious "ng [A-Z]" pattern: "${ward.name}" (slug: ${ward.slug})`);
  }
}
for (const street of streets) {
  if (ngPattern.test(street.name)) {
    fail(`Street name contains suspicious "ng [A-Z]" pattern: "${street.name}" (ward: ${street.ward_slug})`);
  }
}
if (errors === 0) {
  pass('No names contain "ng [A-Z]" pattern');
}

// 3. Check no duplicate ward slugs within same district
const wardSlugsByDistrict = new Map();
for (const ward of wards) {
  const key = `${ward.region_slug}/${ward.district_slug}`;
  const slugs = wardSlugsByDistrict.get(key) ?? new Set();
  if (slugs.has(ward.slug)) {
    fail(`Duplicate ward slug "${ward.slug}" in district "${key}"`);
  }
  slugs.add(ward.slug);
  wardSlugsByDistrict.set(key, slugs);
}
pass("No duplicate ward slugs within districts");

// 4. Referential integrity: all district.region_slug must exist in regions
const regionSlugs = new Set(regions.map((r) => r.slug));
for (const d of districts) {
  if (!regionSlugs.has(d.region_slug)) {
    fail(`District "${d.name}" references unknown region_slug "${d.region_slug}"`);
  }
}
pass("All district region_slug references are valid");

// 5. Referential integrity: all ward.district_slug must exist in districts
const districtSlugs = new Set(districts.map((d) => d.slug));
for (const w of wards) {
  if (!districtSlugs.has(w.district_slug)) {
    fail(`Ward "${w.name}" references unknown district_slug "${w.district_slug}"`);
  }
  if (!regionSlugs.has(w.region_slug)) {
    fail(`Ward "${w.name}" references unknown region_slug "${w.region_slug}"`);
  }
}
pass("All ward district_slug and region_slug references are valid");

// 6. Referential integrity: all street.ward_slug must exist in wards
const wardSlugs = new Set(wards.map((w) => w.slug));
for (const s of streets) {
  if (!wardSlugs.has(s.ward_slug)) {
    fail(`Street "${s.name}" references unknown ward_slug "${s.ward_slug}"`);
  }
}
pass("All street ward_slug references are valid");

// Summary
console.log(`\n--- Results: ${errors === 0 ? "ALL PASSED" : `${errors} FAILURE(S)`} ---`);
process.exit(errors > 0 ? 1 : 0);
