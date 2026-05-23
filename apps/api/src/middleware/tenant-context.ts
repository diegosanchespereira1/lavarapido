import { createMiddleware } from "hono/factory";
import { problema } from "../lib/errors.js";

/**
 * Propaga `tenantId` do token para o contexto da requisição.
 * O `SET LOCAL app.tenant_id` em transação ocorre em `withTenantTx()` (db/client),
 * usado pelos handlers em cada operação ao banco.
 */
export const tenantContextMiddleware = createMiddleware(async (c, next) => {
  const auth = c.var.auth;
  if (!auth?.tenantId) {
    return problema(
      c,
      500,
      "Contexto de tenant ausente após autenticação.",
      undefined,
    );
  }
  c.set("tenantId", auth.tenantId);
  await next();
});
