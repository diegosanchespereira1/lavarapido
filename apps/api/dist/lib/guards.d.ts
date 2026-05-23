import type { Context } from "hono";
import type { AuthState } from "../middleware/auth.js";
export type AppVariables = {
    requestId?: string;
    auth: AuthState;
    tenantId: string;
    branchId?: string;
    isTenantAdmin?: boolean;
};
export type AppCtx = Context<{
    Variables: AppVariables;
}>;
/** Parâmetro de rota obrigatório (ex.: `:id`). */
export declare function requireRouteParam(c: Context, name: string): string | Response;
export declare function requireRouteId(c: Context): string | Response;
/** Garante `X-Branch-Id` resolvido (após `branchContext`). */
export declare function requireBranchHeader(c: AppCtx): string | Response;
/** Bloqueia operadores quando a ação é administrativa do tenant. */
export declare function requireAdmin(c: AppCtx): Response | null;
//# sourceMappingURL=guards.d.ts.map