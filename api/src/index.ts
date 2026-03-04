import { Hono } from "hono";
import { cors } from "hono/cors";
import { cacheControl } from "./middleware/cache.js";
import { rateLimit } from "./middleware/rateLimit.js";
import regions from "./routes/regions.js";
import districts from "./routes/districts.js";
import wards from "./routes/wards.js";
import streets from "./routes/streets.js";
import postcodes from "./routes/postcodes.js";
import search from "./routes/search.js";
import autocomplete from "./routes/autocomplete.js";
import stats from "./routes/stats.js";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// Global middleware
app.use("*", cors());
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
});
app.use("/v1/*", rateLimit);
app.use("/v1/*", cacheControl(86400));

// Routes
app.route("/v1/regions", regions);
app.route("/v1/districts", districts);
app.route("/v1/wards", wards);
app.route("/v1/streets", streets);
app.route("/v1/postcodes", postcodes);
app.route("/v1/search", search);
app.route("/v1/autocomplete", autocomplete);
app.route("/v1/stats", stats);

// Root
app.get("/", (c) => {
  return c.json({
    name: "address-tz",
    description: "Tanzania Locations API — Regions, Districts, Wards, Streets & Postcodes",
    version: "1.0.0",
    docs: "/v1/docs",
    endpoints: {
      regions: "/v1/regions",
      districts: "/v1/districts/:slug",
      wards: "/v1/wards/:slug",
      streets: "/v1/streets/:id",
      postcodes: "/v1/postcodes/:postcode",
      search: "/v1/search?q=query",
      autocomplete: "/v1/autocomplete?q=query",
      stats: "/v1/stats",
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    { error: { code: "NOT_FOUND", message: "Endpoint not found" } },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    500
  );
});

export default app;
