import { Hono } from "hono";
import { success, badRequest } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/search?q=buguruni&type=ward&limit=10
app.get("/", async (c) => {
  const q = c.req.query("q");
  const type = c.req.query("type");
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 10, 1), 50);

  if (!q || q.length < 1) {
    return badRequest(c, "Query parameter 'q' is required");
  }

  const validTypes = ["region", "district", "ward", "street"];
  if (type && !validTypes.includes(type)) {
    return badRequest(c, `Invalid type. Must be one of: ${validTypes.join(", ")}`);
  }

  const db = c.env.DB;

  // Sanitize FTS query: escape special chars and add quotes
  const sanitized = q.replace(/['"]/g, "").trim();

  let query: string;
  let params: any[];

  if (type) {
    query = `SELECT name, type, postcode, full_path, entity_id
             FROM locations_fts
             WHERE locations_fts MATCH ? AND type = ?
             ORDER BY rank LIMIT ?`;
    params = [`"${sanitized}"`, type, limit];
  } else {
    query = `SELECT name, type, postcode, full_path, entity_id
             FROM locations_fts
             WHERE locations_fts MATCH ?
             ORDER BY rank LIMIT ?`;
    params = [`"${sanitized}"`, limit];
  }

  try {
    const stmt = db.prepare(query);
    const { results } = await stmt.bind(...params).all();

    const data = results.map((r: any) => ({
      name: r.name,
      type: r.type,
      postcode: r.postcode || null,
      full_path: r.full_path,
      entity_id: Number(r.entity_id),
    }));

    return success(c, data, { total: data.length, query: q });
  } catch {
    // FTS query syntax error — try fallback LIKE query
    const { results } = await db
      .prepare(
        `SELECT name, type, postcode, full_path, entity_id
         FROM locations_fts
         WHERE name LIKE ?
         LIMIT ?`
      )
      .bind(`%${sanitized}%`, limit)
      .all();

    const data = results.map((r: any) => ({
      name: r.name,
      type: r.type,
      postcode: r.postcode || null,
      full_path: r.full_path,
      entity_id: Number(r.entity_id),
    }));

    return success(c, data, { total: data.length, query: q });
  }
});

export default app;
