import type { Context } from "hono";

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export function success<T>(c: Context, data: T, meta?: Record<string, unknown>) {
  const body: ApiResponse<T> = { data };
  if (meta) body.meta = meta;
  return c.json(body);
}

export function notFound(c: Context, message = "Resource not found") {
  return c.json<ApiErrorResponse>(
    { error: { code: "NOT_FOUND", message } },
    404
  );
}

export function badRequest(c: Context, message: string) {
  return c.json<ApiErrorResponse>(
    { error: { code: "BAD_REQUEST", message } },
    400
  );
}

const SLUG_RE = /^[a-z0-9-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 100;
}

export function tooManyRequests(c: Context) {
  return c.json<ApiErrorResponse>(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
    429
  );
}
