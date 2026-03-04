/**
 * Seed script: Load scraped JSON data into D1.
 *
 * Usage:
 *   npx wrangler d1 execute address-tz-db --local --file=src/db/migrations/0000_init.sql
 *   npx tsx src/db/seed.ts  # generates seed.sql
 *   npx wrangler d1 execute address-tz-db --local --file=src/db/seed.sql
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, "../../../scraper/data");

interface RawRegion {
  name: string;
  slug: string;
}
interface RawDistrict {
  name: string;
  slug: string;
  region_slug: string;
}
interface RawWard {
  name: string;
  slug: string;
  district_slug: string;
  region_slug: string;
  postcode?: string;
}
interface RawStreet {
  name: string;
  postcode: string;
  ward_slug: string;
  district_slug: string;
  region_slug: string;
}

function loadJson<T>(filename: string): T {
  const path = resolve(DATA_DIR, filename);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function main() {
  const regions = loadJson<RawRegion[]>("regions.json");
  const districts = loadJson<RawDistrict[]>("districts.json");
  const wards = loadJson<RawWard[]>("wards.json");
  const streets = loadJson<RawStreet[]>("streets.json");

  const sql: string[] = [];
  sql.push("-- Auto-generated seed data");

  // Build lookup maps
  const regionIdMap = new Map<string, number>();
  const districtIdMap = new Map<string, number>();
  const wardIdMap = new Map<string, number>();

  // Insert regions
  let regionId = 1;
  for (const r of regions) {
    sql.push(
      `INSERT INTO regions (id, name, slug) VALUES (${regionId}, '${escapeSql(r.name)}', '${escapeSql(r.slug)}');`
    );
    regionIdMap.set(r.slug, regionId);
    regionId++;
  }

  // Insert districts
  let districtId = 1;
  for (const d of districts) {
    const rId = regionIdMap.get(d.region_slug);
    if (!rId) {
      console.warn(`No region found for district ${d.name} (region: ${d.region_slug})`);
      continue;
    }
    sql.push(
      `INSERT INTO districts (id, region_id, name, slug) VALUES (${districtId}, ${rId}, '${escapeSql(d.name)}', '${escapeSql(d.slug)}');`
    );
    // Key by region_slug + district_slug for uniqueness
    districtIdMap.set(`${d.region_slug}/${d.slug}`, districtId);
    districtId++;
  }

  // Insert wards
  const wardPostcodes = new Map<number, string>();
  let wardId = 1;
  for (const w of wards) {
    const dId = districtIdMap.get(`${w.region_slug}/${w.district_slug}`);
    if (!dId) {
      console.warn(`No district found for ward ${w.name} (${w.region_slug}/${w.district_slug})`);
      continue;
    }
    const wardPc = w.postcode ? escapeSql(w.postcode) : "";
    sql.push(
      `INSERT INTO wards (id, district_id, name, slug, postcode) VALUES (${wardId}, ${dId}, '${escapeSql(w.name)}', '${escapeSql(w.slug)}', '${wardPc}');`
    );
    if (w.postcode) {
      wardPostcodes.set(wardId, w.postcode);
    }
    wardIdMap.set(`${w.region_slug}/${w.district_slug}/${w.slug}`, wardId);
    wardId++;
  }

  // Insert streets and update ward postcodes
  let streetId = 1;
  for (const s of streets) {
    const wId = wardIdMap.get(`${s.region_slug}/${s.district_slug}/${s.ward_slug}`);
    if (!wId) {
      console.warn(`No ward found for street ${s.name} (${s.region_slug}/${s.district_slug}/${s.ward_slug})`);
      continue;
    }
    sql.push(
      `INSERT INTO streets (id, ward_id, name, postcode) VALUES (${streetId}, ${wId}, '${escapeSql(s.name)}', '${escapeSql(s.postcode)}');`
    );
    // Track first postcode per ward
    if (!wardPostcodes.has(wId) && s.postcode) {
      wardPostcodes.set(wId, s.postcode);
    }
    streetId++;
  }

  // Update ward postcodes
  for (const [wId, postcode] of wardPostcodes) {
    sql.push(`UPDATE wards SET postcode = '${escapeSql(postcode)}' WHERE id = ${wId};`);
  }

  // Populate FTS index
  sql.push("\n-- Full-text search index");
  for (const r of regions) {
    const rId = regionIdMap.get(r.slug)!;
    sql.push(
      `INSERT INTO locations_fts (name, type, postcode, full_path, entity_id) VALUES ('${escapeSql(r.name)}', 'region', '', '${escapeSql(r.name)}', '${rId}');`
    );
  }
  for (const d of districts) {
    const dId = districtIdMap.get(`${d.region_slug}/${d.slug}`);
    if (!dId) continue;
    const rName = regions.find((r) => r.slug === d.region_slug)?.name ?? "";
    const path = `${d.name}, ${rName}`;
    sql.push(
      `INSERT INTO locations_fts (name, type, postcode, full_path, entity_id) VALUES ('${escapeSql(d.name)}', 'district', '', '${escapeSql(path)}', '${dId}');`
    );
  }
  for (const w of wards) {
    const wId = wardIdMap.get(`${w.region_slug}/${w.district_slug}/${w.slug}`);
    if (!wId) continue;
    const postcode = wardPostcodes.get(wId) ?? "";
    const dName = districts.find((d) => d.slug === w.district_slug && d.region_slug === w.region_slug)?.name ?? "";
    const rName = regions.find((r) => r.slug === w.region_slug)?.name ?? "";
    const path = `${w.name}, ${dName}, ${rName}`;
    sql.push(
      `INSERT INTO locations_fts (name, type, postcode, full_path, entity_id) VALUES ('${escapeSql(w.name)}', 'ward', '${escapeSql(postcode)}', '${escapeSql(path)}', '${wId}');`
    );
  }

  const output = sql.join("\n");
  const outPath = resolve(__dirname, "seed.sql");
  writeFileSync(outPath, output);
  console.log(`Seed SQL written to ${outPath}`);
  console.log(`  Regions:   ${regionId - 1}`);
  console.log(`  Districts: ${districtId - 1}`);
  console.log(`  Wards:     ${wardId - 1}`);
  console.log(`  Streets:   ${streetId - 1}`);
}

main();
