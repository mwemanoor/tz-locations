import { Hono } from "hono";
import { success, notFound } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/districts/:slug
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = c.env.DB;

  const district = await db
    .prepare(
      `SELECT d.id, d.name, d.slug, d.region_id,
              r.name AS region_name, r.slug AS region_slug,
              (SELECT COUNT(*) FROM wards w WHERE w.district_id = d.id) AS ward_count,
              (SELECT COUNT(*) FROM streets s JOIN wards w ON s.ward_id = w.id WHERE w.district_id = d.id) AS street_count
       FROM districts d
       JOIN regions r ON d.region_id = r.id
       WHERE d.slug = ?`
    )
    .bind(slug)
    .first();

  if (!district) return notFound(c, `District '${slug}' not found`);

  return success(c, {
    id: district.id,
    name: district.name,
    slug: district.slug,
    ward_count: district.ward_count,
    street_count: district.street_count,
    region: { name: district.region_name, slug: district.region_slug },
    _links: {
      self: `/v1/districts/${district.slug}`,
      wards: `/v1/districts/${district.slug}/wards`,
      region: `/v1/regions/${district.region_slug}`,
    },
  });
});

// GET /v1/districts/:slug/wards
app.get("/:slug/wards", async (c) => {
  const slug = c.req.param("slug");
  const db = c.env.DB;

  const district = await db
    .prepare(
      `SELECT d.id, d.name, d.slug, r.name AS region_name, r.slug AS region_slug
       FROM districts d JOIN regions r ON d.region_id = r.id
       WHERE d.slug = ?`
    )
    .bind(slug)
    .first();

  if (!district) return notFound(c, `District '${slug}' not found`);

  const { results } = await db
    .prepare(
      `SELECT w.id, w.name, w.slug, w.postcode,
              (SELECT COUNT(*) FROM streets s WHERE s.ward_id = w.id) AS street_count
       FROM wards w WHERE w.district_id = ? ORDER BY w.name`
    )
    .bind(district.id)
    .all();

  const data = results.map((w: any) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    postcode: w.postcode,
    street_count: w.street_count,
    district: { name: district.name, slug: district.slug },
    region: { name: district.region_name, slug: district.region_slug },
    _links: {
      self: `/v1/wards/${w.slug}`,
      streets: `/v1/wards/${w.slug}/streets`,
      district: `/v1/districts/${slug}`,
    },
  }));

  return success(c, data, { total: data.length, district: district.name as string });
});

export default app;
