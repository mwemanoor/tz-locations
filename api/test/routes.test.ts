import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/index.js";

// Mock D1 database for testing
function createMockDB(data: Record<string, any[]> = {}) {
  return {
    prepare(query: string) {
      return {
        bind(...params: any[]) {
          return this;
        },
        async all() {
          return { results: data[query] ?? [] };
        },
        async first<T>(): Promise<T | null> {
          const results = data[query];
          return (results?.[0] as T) ?? null;
        },
        async run() {
          return { success: true };
        },
      };
    },
  } as unknown as D1Database;
}

describe("API Root", () => {
  it("GET / returns API info", async () => {
    const res = await app.request("/", {}, { DB: createMockDB() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("tz-locations-api");
    expect(body.endpoints).toBeDefined();
  });
});

describe("Regions", () => {
  it("GET /v1/regions returns list", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/regions", {}, { DB: mockDB });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /v1/regions/nonexistent returns 404", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/regions/nonexistent", {}, { DB: mockDB });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Postcodes", () => {
  it("GET /v1/postcodes/invalid returns 400", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/postcodes/abc", {}, { DB: mockDB });
    expect(res.status).toBe(400);
  });

  it("GET /v1/postcodes/99999 returns 404 when not found", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/postcodes/99999", {}, { DB: mockDB });
    expect(res.status).toBe(404);
  });
});

describe("Search", () => {
  it("GET /v1/search without q returns 400", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/search", {}, { DB: mockDB });
    expect(res.status).toBe(400);
  });

  it("GET /v1/search with invalid type returns 400", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/search?q=test&type=invalid", {}, { DB: mockDB });
    expect(res.status).toBe(400);
  });
});

describe("Autocomplete", () => {
  it("GET /v1/autocomplete without q returns 400", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/autocomplete", {}, { DB: mockDB });
    expect(res.status).toBe(400);
  });
});

describe("404 Handler", () => {
  it("Unknown routes return 404", async () => {
    const mockDB = createMockDB();
    const res = await app.request("/v1/unknown", {}, { DB: mockDB });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("CORS", () => {
  it("Includes CORS headers", async () => {
    const res = await app.request("/", {}, { DB: createMockDB() });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
