import type { MiddlewareHandler } from "hono";

export const cacheControl = (maxAge = 86400): MiddlewareHandler => {
  return async (c, next) => {
    await next();
    if (c.res.ok) {
      c.header("Cache-Control", `public, max-age=${maxAge}`);
    }
  };
};
