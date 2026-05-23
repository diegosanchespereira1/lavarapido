/**
 * Propaga `tenantId` do token para o contexto da requisição.
 * O `SET LOCAL app.tenant_id` em transação ocorre em `withTenantTx()` (db/client),
 * usado pelos handlers em cada operação ao banco.
 */
export declare const tenantContextMiddleware: import("hono").MiddlewareHandler<any, string, {}, Response>;
//# sourceMappingURL=tenant-context.d.ts.map