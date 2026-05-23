import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { getDb, withTenantTx } from "../db/client.js";
import { branches } from "../db/schema.js";
import { problema, CODIGOS } from "../lib/errors.js";
function allowedForBranch(auth, branchId) {
    if (auth.allowedBranchIds === "all")
        return true;
    return auth.allowedBranchIds.includes(branchId);
}
/**
 * Lê `X-Branch-Id` quando informado, valida existência no tenant e permissões.
 * Rotas que exigem filial devem checar `c.var.branchId` após este middleware.
 */
export const branchContextMiddleware = createMiddleware(async (c, next) => {
    const auth = c.var.auth;
    const raw = c.req.header("X-Branch-Id");
    if (!raw) {
        c.set("branchId", undefined);
        await next();
        return;
    }
    if (!allowedForBranch(auth, raw)) {
        return problema(c, 403, "Você não tem permissão para acessar esta filial.", CODIGOS.NAO_AUTORIZADO);
    }
    const present = await withTenantTx(auth.tenantId, async (tx) => {
        const rows = await tx
            .select({ id: branches.id })
            .from(branches)
            .where(and(eq(branches.id, raw), eq(branches.tenantId, auth.tenantId)))
            .limit(1);
        return rows.length > 0;
    });
    if (!present) {
        return problema(c, 404, "Filial não encontrada neste cliente.", CODIGOS.NAO_ENCONTRADO);
    }
    c.set("branchId", raw);
    await next();
});
/** Utilitário opcional quando uma rota precisa apenas validar contra o banco direto sem transação especial. */
export async function branchExists(tenantId, branchId) {
    const db = getDb();
    const rows = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
        .limit(1);
    return rows.length > 0;
}
//# sourceMappingURL=branch-context.js.map