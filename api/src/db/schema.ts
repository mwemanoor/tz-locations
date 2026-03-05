import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const regions = sqliteTable("regions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const districts = sqliteTable(
  "districts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => ({
    uniqueRegionSlug: uniqueIndex("uq_districts_region_slug").on(table.regionId, table.slug),
    regionIdx: index("idx_districts_region").on(table.regionId),
  })
);

export const wards = sqliteTable(
  "wards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    postcode: text("postcode").notNull(),
  },
  (table) => ({
    uniqueDistrictSlug: uniqueIndex("uq_wards_district_slug").on(table.districtId, table.slug),
    districtIdx: index("idx_wards_district").on(table.districtId),
    postcodeIdx: index("idx_wards_postcode").on(table.postcode),
  })
);

export const streets = sqliteTable(
  "streets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wardId: integer("ward_id")
      .notNull()
      .references(() => wards.id),
    name: text("name").notNull(),
    postcode: text("postcode"),
  },
  (table) => ({
    uniqueWardName: uniqueIndex("uq_streets_ward_name").on(table.wardId, table.name),
    wardIdx: index("idx_streets_ward").on(table.wardId),
    postcodeIdx: index("idx_streets_postcode").on(table.postcode),
  })
);
