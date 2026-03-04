import { Hono } from "hono";
import { success, notFound } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/streets/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id < 1) {
    return notFound(c, "Invalid street ID");
  }

  const db = c.env.DB;

  const street = await db
    .prepare(
      `SELECT s.id, s.name, s.postcode,
              w.name AS ward_name, w.slug AS ward_slug, w.postcode AS ward_postcode,
              d.name AS district_name, d.slug AS district_slug,
              r.name AS region_name, r.slug AS region_slug
       FROM streets s
       JOIN wards w ON s.ward_id = w.id
       JOIN districts d ON w.district_id = d.id
       JOIN regions r ON d.region_id = r.id
       WHERE s.id = ?`
    )
    .bind(id)
    .first();

  if (!street) return notFound(c, `Street with ID ${id} not found`);

  return success(c, {
    id: street.id,
    name: street.name,
    postcode: street.postcode,
    ward: { name: street.ward_name, slug: street.ward_slug, postcode: street.ward_postcode },
    district: { name: street.district_name, slug: street.district_slug },
    region: { name: street.region_name, slug: street.region_slug },
    _links: {
      self: `/v1/streets/${street.id}`,
      ward: `/v1/wards/${street.ward_slug}`,
    },
  });
});

export default app;
