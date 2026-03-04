import { Hono } from "hono";
import { success, notFound, badRequest } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/postcodes/:postcode
app.get("/:postcode", async (c) => {
  const postcode = c.req.param("postcode");

  if (!/^\d{5}$/.test(postcode)) {
    return badRequest(c, "Postcode must be a 5-digit number");
  }

  const db = c.env.DB;

  // Check wards first
  const ward = await db
    .prepare(
      `SELECT w.id, w.name, w.slug, w.postcode,
              d.name AS district_name, d.slug AS district_slug,
              r.name AS region_name, r.slug AS region_slug
       FROM wards w
       JOIN districts d ON w.district_id = d.id
       JOIN regions r ON d.region_id = r.id
       WHERE w.postcode = ?`
    )
    .bind(postcode)
    .first();

  // Also get streets with this postcode
  const { results: streets } = await db
    .prepare(
      `SELECT s.id, s.name, s.postcode,
              w.name AS ward_name, w.slug AS ward_slug
       FROM streets s
       JOIN wards w ON s.ward_id = w.id
       WHERE s.postcode = ?
       ORDER BY s.name`
    )
    .bind(postcode)
    .all();

  if (!ward && streets.length === 0) {
    return notFound(c, `No locations found for postcode ${postcode}`);
  }

  return success(c, {
    postcode,
    ward: ward
      ? {
          id: ward.id,
          name: ward.name,
          slug: ward.slug,
          district: { name: ward.district_name, slug: ward.district_slug },
          region: { name: ward.region_name, slug: ward.region_slug },
        }
      : null,
    streets: streets.map((s: any) => ({
      id: s.id,
      name: s.name,
      ward: { name: s.ward_name, slug: s.ward_slug },
    })),
  });
});

export default app;
