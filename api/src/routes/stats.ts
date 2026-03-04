import { Hono } from "hono";
import { success } from "../lib/response.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// GET /v1/stats
app.get("/", async (c) => {
  const db = c.env.DB;

  const [regions, districts, wards, streets] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM regions").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM districts").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM wards").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM streets").first<{ count: number }>(),
  ]);

  return success(c, {
    regions: regions?.count ?? 0,
    districts: districts?.count ?? 0,
    wards: wards?.count ?? 0,
    streets: streets?.count ?? 0,
  });
});

export default app;
