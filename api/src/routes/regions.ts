import { Hono } from "hono";
import { success, notFound, badRequest, isValidSlug } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/regions
app.get("/", async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT r.id, r.name, r.slug,
              (SELECT COUNT(*) FROM districts d WHERE d.region_id = r.id) AS district_count
       FROM regions r ORDER BY r.name`
    )
    .all();

  const data = results.map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    district_count: r.district_count,
    _links: {
      self: `/v1/regions/${r.slug}`,
      districts: `/v1/regions/${r.slug}/districts`,
    },
  }));

  return success(c, data, { total: data.length });
});

// GET /v1/regions/:slug
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return badRequest(c, "Invalid slug format");
  const db = c.env.DB;

  const region = await db
    .prepare(
      `SELECT r.id, r.name, r.slug,
              (SELECT COUNT(*) FROM districts d WHERE d.region_id = r.id) AS district_count,
              (SELECT COUNT(*) FROM wards w JOIN districts d ON w.district_id = d.id WHERE d.region_id = r.id) AS ward_count,
              (SELECT COUNT(*) FROM streets s JOIN wards w ON s.ward_id = w.id JOIN districts d ON w.district_id = d.id WHERE d.region_id = r.id) AS street_count
       FROM regions r WHERE r.slug = ?`
    )
    .bind(slug)
    .first();

  if (!region) return notFound(c, `Region '${slug}' not found`);

  return success(c, {
    id: region.id,
    name: region.name,
    slug: region.slug,
    district_count: region.district_count,
    ward_count: region.ward_count,
    street_count: region.street_count,
    _links: {
      self: `/v1/regions/${region.slug}`,
      districts: `/v1/regions/${region.slug}/districts`,
    },
  });
});

// GET /v1/regions/:slug/districts
app.get("/:slug/districts", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return badRequest(c, "Invalid slug format");
  const db = c.env.DB;

  const region = await db
    .prepare("SELECT id, name, slug FROM regions WHERE slug = ?")
    .bind(slug)
    .first();

  if (!region) return notFound(c, `Region '${slug}' not found`);

  const { results } = await db
    .prepare(
      `SELECT d.id, d.name, d.slug,
              (SELECT COUNT(*) FROM wards w WHERE w.district_id = d.id) AS ward_count
       FROM districts d WHERE d.region_id = ? ORDER BY d.name`
    )
    .bind(region.id)
    .all();

  const data = results.map((d: any) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    ward_count: d.ward_count,
    region: { name: region.name, slug: region.slug },
    _links: {
      self: `/v1/districts/${d.slug}`,
      wards: `/v1/districts/${d.slug}/wards`,
      region: `/v1/regions/${slug}`,
    },
  }));

  return success(c, data, { total: data.length, region: region.name as string });
});

export default app;
