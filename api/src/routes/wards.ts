import { Hono } from "hono";
import { success, notFound, badRequest, isValidSlug } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/wards/:slug
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return badRequest(c, "Invalid slug format");
  const db = c.env.DB;

  const ward = await db
    .prepare(
      `SELECT w.id, w.name, w.slug, w.postcode,
              d.name AS district_name, d.slug AS district_slug,
              r.name AS region_name, r.slug AS region_slug,
              (SELECT COUNT(*) FROM streets s WHERE s.ward_id = w.id) AS street_count
       FROM wards w
       JOIN districts d ON w.district_id = d.id
       JOIN regions r ON d.region_id = r.id
       WHERE w.slug = ?`
    )
    .bind(slug)
    .first();

  if (!ward) return notFound(c, `Ward '${slug}' not found`);

  return success(c, {
    id: ward.id,
    name: ward.name,
    slug: ward.slug,
    postcode: ward.postcode,
    street_count: ward.street_count,
    district: { name: ward.district_name, slug: ward.district_slug },
    region: { name: ward.region_name, slug: ward.region_slug },
    _links: {
      self: `/v1/wards/${ward.slug}`,
      streets: `/v1/wards/${ward.slug}/streets`,
      district: `/v1/districts/${ward.district_slug}`,
    },
  });
});

// GET /v1/wards/:slug/streets
app.get("/:slug/streets", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) return badRequest(c, "Invalid slug format");
  const db = c.env.DB;

  const ward = await db
    .prepare(
      `SELECT w.id, w.name, w.slug, w.postcode,
              d.name AS district_name, d.slug AS district_slug,
              r.name AS region_name, r.slug AS region_slug
       FROM wards w
       JOIN districts d ON w.district_id = d.id
       JOIN regions r ON d.region_id = r.id
       WHERE w.slug = ?`
    )
    .bind(slug)
    .first();

  if (!ward) return notFound(c, `Ward '${slug}' not found`);

  const { results } = await db
    .prepare(
      "SELECT id, name, postcode FROM streets WHERE ward_id = ? ORDER BY name"
    )
    .bind(ward.id)
    .all();

  const data = results.map((s: any) => ({
    id: s.id,
    name: s.name,
    postcode: s.postcode,
    ward: { name: ward.name, slug: ward.slug, postcode: ward.postcode },
    district: { name: ward.district_name, slug: ward.district_slug },
    region: { name: ward.region_name, slug: ward.region_slug },
    _links: {
      self: `/v1/streets/${s.id}`,
      ward: `/v1/wards/${slug}`,
    },
  }));

  return success(c, data, { total: data.length, ward: ward.name as string });
});

export default app;
