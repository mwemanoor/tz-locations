import { Hono } from "hono";
import { success, badRequest } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/autocomplete?q=bug&limit=5
app.get("/", async (c) => {
  const q = c.req.query("q");
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 5, 1), 20);

  if (!q || q.length < 2) {
    return badRequest(c, "Query parameter 'q' is required (min 2 characters)");
  }

  const db = c.env.DB;
  const sanitized = q.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!sanitized) return badRequest(c, "Query must contain at least one alphanumeric character");

  try {
    // FTS5 prefix search
    const { results } = await db
      .prepare(
        `SELECT name, type, postcode, full_path
         FROM locations_fts
         WHERE locations_fts MATCH ?
         ORDER BY rank LIMIT ?`
      )
      .bind(`"${sanitized}"*`, limit)
      .all();

    const data = results.map((r: any) => ({
      name: r.name,
      type: r.type,
      postcode: r.postcode || null,
      full_path: r.full_path,
    }));

    return success(c, data);
  } catch {
    // Fallback to LIKE
    const { results } = await db
      .prepare(
        `SELECT name, type, postcode, full_path
         FROM locations_fts
         WHERE name LIKE ?
         LIMIT ?`
      )
      .bind(`${sanitized}%`, limit)
      .all();

    const data = results.map((r: any) => ({
      name: r.name,
      type: r.type,
      postcode: r.postcode || null,
      full_path: r.full_path,
    }));

    return success(c, data);
  }
});

export default app;
