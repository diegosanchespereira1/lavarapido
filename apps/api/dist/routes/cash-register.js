import { Hono } from "hono";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { withTenantTx } from "../db/client.js";
import { branches, payments } from "../db/schema.js";
import { problema, CODIGOS } from "../lib/errors.js";
function parseDateOnly(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m)
        return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31)
        return null;
    const startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const endExclusiveMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
    return { start: new Date(startMs), endExclusive: new Date(endExclusiveMs) };
}
export const cashRegisterRoutes = new Hono();
cashRegisterRoutes.get("/", async (c) => {
    const auth = c.var.auth;
    const dateStr = z.string().min(10).safeParse(c.req.query("date"));
    const consolidatedRaw = z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .safeParse(c.req.query("consolidated"));
    const branchQuery = z
        .string()
        .uuid()
        .optional()
        .safeParse(c.req.query("branch_id"));
    if (!dateStr.success) {
        return problema(c, 400, "Informe uma data válida em date=YYYY-MM-DD.", CODIGOS.VALIDACAO);
    }
    const parsed = parseDateOnly(dateStr.data);
    if (!parsed) {
        return problema(c, 400, "Informe uma data válida em date=YYYY-MM-DD.", CODIGOS.VALIDACAO);
    }
    const consolidated = consolidatedRaw.success
        ? consolidatedRaw.data === "true"
        : false;
    if (!branchQuery.success) {
        return problema(c, 400, "Parâmetro branch_id inválido.", CODIGOS.VALIDACAO);
    }
    if (!consolidated && !branchQuery.data) {
        return problema(c, 400, "Envie consolidated=true ou branch_id com uma filial válida.", CODIGOS.VALIDACAO);
    }
    if (consolidated && branchQuery.data) {
        return problema(c, 400, "Não combine consolidated=true com branch_id. Use apenas um modo.", CODIGOS.VALIDACAO);
    }
    const tenantFilter = [
        eq(payments.tenantId, auth.tenantId),
        gte(payments.createdAt, parsed.start),
        lt(payments.createdAt, parsed.endExclusive),
    ];
    let rows;
    if (!consolidated) {
        const branchId = branchQuery.data;
        if (auth.allowedBranchIds !== "all" &&
            !auth.allowedBranchIds.includes(branchId)) {
            return problema(c, 403, "Você não tem permissão para consultar o caixa desta filial.", CODIGOS.NAO_AUTORIZADO);
        }
        rows = await withTenantTx(auth.tenantId, async (tx) => tx
            .select({
            branchId: payments.branchId,
            branchName: branches.name,
            totalCents: sql `coalesce(sum(${payments.amountCents}), 0)::int`,
            count: sql `count(*)::int`,
        })
            .from(payments)
            .innerJoin(branches, eq(branches.id, payments.branchId))
            .where(and(...tenantFilter, eq(payments.branchId, branchId)))
            .groupBy(payments.branchId, branches.name)
            .orderBy(asc(branches.name)));
    }
    else {
        const branchFilter = auth.allowedBranchIds === "all"
            ? undefined
            : inArray(payments.branchId, auth.allowedBranchIds);
        rows = await withTenantTx(auth.tenantId, async (tx) => tx
            .select({
            branchId: payments.branchId,
            branchName: branches.name,
            totalCents: sql `coalesce(sum(${payments.amountCents}), 0)::int`,
            count: sql `count(*)::int`,
        })
            .from(payments)
            .innerJoin(branches, eq(branches.id, payments.branchId))
            .where(branchFilter ? and(...tenantFilter, branchFilter) : and(...tenantFilter))
            .groupBy(payments.branchId, branches.name)
            .orderBy(asc(branches.name)));
    }
    const total_centavos = rows.reduce((acc, r) => acc + Number(r.totalCents), 0);
    /** Modo detalhe por método quando há filtro de filial explícito. */
    if (!consolidated && branchQuery.data) {
        const methodRows = await withTenantTx(auth.tenantId, async (tx) => tx
            .select({
            method: payments.method,
            totalCents: sql `coalesce(sum(${payments.amountCents}), 0)::int`,
            count: sql `count(*)::int`,
        })
            .from(payments)
            .where(and(...tenantFilter, eq(payments.branchId, branchQuery.data)))
            .groupBy(payments.method)
            .orderBy(asc(payments.method)));
        return c.json({
            data: dateStr.data,
            consolidado: false,
            branch_id: branchQuery.data,
            linhas_filial: rows,
            por_metodo: methodRows,
            total_centavos,
        });
    }
    return c.json({
        data: dateStr.data,
        consolidado: true,
        linhas: rows,
        total_centavos,
    });
});
//# sourceMappingURL=cash-register.js.map