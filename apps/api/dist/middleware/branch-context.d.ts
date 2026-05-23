/**
 * Lê `X-Branch-Id` quando informado, valida existência no tenant e permissões.
 * Rotas que exigem filial devem checar `c.var.branchId` após este middleware.
 */
export declare const branchContextMiddleware: import("hono").MiddlewareHandler<any, string, {}, Response>;
/** Utilitário opcional quando uma rota precisa apenas validar contra o banco direto sem transação especial. */
export declare function branchExists(tenantId: string, branchId: string): Promise<boolean>;
//# sourceMappingURL=branch-context.d.ts.map