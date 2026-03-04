import type { MiddlewareHandler } from "hono";
import { tooManyRequests } from "../lib/response.js";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per Worker isolate)
const store = new Map<string, RateLimitEntry>();

function cleanupStore() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export const rateLimit: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count++;

  c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
  c.header("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - entry.count)));
  c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > MAX_REQUESTS) {
    return tooManyRequests(c);
  }

  await next();

  // Periodic cleanup
  if (store.size > 10_000) {
    cleanupStore();
  }
};
