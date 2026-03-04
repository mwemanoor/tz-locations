-- Migration: Initial schema
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(region_id, slug)
);

CREATE TABLE wards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district_id INTEGER NOT NULL REFERENCES districts(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  postcode TEXT NOT NULL,
  UNIQUE(district_id, slug)
);

CREATE TABLE streets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id INTEGER NOT NULL REFERENCES wards(id),
  name TEXT NOT NULL,
  postcode TEXT,
  UNIQUE(ward_id, name)
);

CREATE INDEX idx_districts_region ON districts(region_id);
CREATE INDEX idx_wards_district ON wards(district_id);
CREATE INDEX idx_wards_postcode ON wards(postcode);
CREATE INDEX idx_streets_ward ON streets(ward_id);
CREATE INDEX idx_streets_postcode ON streets(postcode);

-- Full-text search virtual table
CREATE VIRTUAL TABLE locations_fts USING fts5(
  name, type, postcode, full_path, entity_id,
  tokenize='porter unicode61'
);
