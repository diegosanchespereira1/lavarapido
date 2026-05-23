import { createMiddleware } from "hono/factory";
import { randomUUID } from "node:crypto";

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const headerId = c.req.header("X-Request-Id");
  const id = headerId && headerId.length > 0 ? headerId : randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
});
