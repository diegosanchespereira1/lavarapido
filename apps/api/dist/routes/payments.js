import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { PAYMENT_METHODS, } from "@lava-rapido/shared";
import { withTenantTx } from "../db/client.js";
import { branches, payments, vehicleEntries, washTypes } from "../db/schema.js";
import { findPaymentForEntry } from "../lib/entry-payments.js";
import { problema, CODIGOS } from "../lib/errors.js";
import { publishVehicleEvent } from "../lib/pubsub.js";
const paymentMethodSchema = z.enum(PAYMENT_METHODS);
const createSchema = z.object({
    amount_cents: z.number().int().positive().optional(),
    method: paymentMethodSchema,
    vehicle_entry_id: z.string().uuid().optional(),
    branch_id: z.string().uuid().optional(),
    reference: z.string().nullable().optional(),
});
export const paymentsRoutes = new Hono();
paymentsRoutes.post("/", async (c) => {
    const auth = c.var.auth;
    let body;
    try {
        body = createSchema.parse(await c.req.json());
    }
    catch {
        return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
    }
    const headerBranch = typeof c.var.branchId === "string" ? c.var.branchId : undefined;
    if (headerBranch &&
        typeof body.branch_id === "string" &&
        headerBranch !== body.branch_id) {
        return problema(c, 400, "O campo branch_id deve coincidir com o cabeçalho X-Branch-Id.", CODIGOS.VALIDACAO);
    }
    const resolvedBranch = headerBranch ??
        (typeof body.branch_id === "string" ? body.branch_id : undefined);
    const branchResolved = resolvedBranch ?? null;
    if (!branchResolved) {
        return problema(c, 400, "Informe filial via cabeçalho X-Branch-Id ou campo branch_id no corpo.", CODIGOS.VALIDACAO);
    }
    if (!headerBranch) {
        if (auth.allowedBranchIds !== "all" &&
            !auth.allowedBranchIds.includes(branchResolved)) {
            return problema(c, 403, "Você não tem permissão para registrar pagamento nesta filial.", CODIGOS.NAO_AUTORIZADO);
        }
        const ok = await withTenantTx(auth.tenantId, async (tx) => {
            const rows = await tx
                .select({ id: branches.id })
                .from(branches)
                .where(and(eq(branches.id, branchResolved), eq(branches.tenantId, auth.tenantId)))
                .limit(1);
            return rows.length > 0;
        });
        if (!ok) {
            return problema(c, 404, "Filial não encontrada neste cliente.", CODIGOS.NAO_ENCONTRADO);
        }
    }
    let vehicleEntryPlate = null;
    let amountCents = body.amount_cents;
    if (body.vehicle_entry_id) {
        const vehicleEntryId = body.vehicle_entry_id;
        const entryCheck = await withTenantTx(auth.tenantId, async (tx) => {
            const rows = await tx
                .select()
                .from(vehicleEntries)
                .where(and(eq(vehicleEntries.id, vehicleEntryId), eq(vehicleEntries.tenantId, auth.tenantId), eq(vehicleEntries.branchId, branchResolved)))
                .limit(1);
            const entry = rows[0];
            if (!entry)
                return { notFound: true };
            const existing = await findPaymentForEntry(tx, auth.tenantId, vehicleEntryId);
            if (existing)
                return { alreadyPaid: true };
            let resolvedAmount = amountCents;
            if (!resolvedAmount) {
                const wtRows = await tx
                    .select({ priceCents: washTypes.priceCents })
                    .from(washTypes)
                    .where(and(eq(washTypes.id, entry.washTypeId), eq(washTypes.tenantId, auth.tenantId)))
                    .limit(1);
                resolvedAmount = wtRows[0]?.priceCents;
                if (!resolvedAmount)
                    return { noPrice: true };
            }
            return {
                entry,
                amountCents: resolvedAmount,
            };
        });
        if ("notFound" in entryCheck && entryCheck.notFound) {
            return problema(c, 404, "Entrada não encontrada na filial informada.", CODIGOS.NAO_ENCONTRADO);
        }
        if ("alreadyPaid" in entryCheck && entryCheck.alreadyPaid) {
            return problema(c, 409, "Esta lavagem já possui pagamento registrado.", CODIGOS.CONFLITO);
        }
        if ("noPrice" in entryCheck && entryCheck.noPrice) {
            return problema(c, 400, "Informe amount_cents ou vincule a um tipo de lavagem com preço.", CODIGOS.VALIDACAO);
        }
        const ok = entryCheck;
        vehicleEntryPlate = ok.entry.plate ?? null;
        amountCents = ok.amountCents;
    }
    if (!amountCents) {
        return problema(c, 400, "Informe amount_cents para pagamentos avulsos.", CODIGOS.VALIDACAO);
    }
    const row = await withTenantTx(auth.tenantId, async (tx) => {
        const [ins] = await tx
            .insert(payments)
            .values({
            tenantId: auth.tenantId,
            branchId: branchResolved,
            vehicleEntryId: body.vehicle_entry_id ?? null,
            amountCents,
            method: body.method,
            reference: body.reference ?? null,
        })
            .returning();
        return ins;
    });
    await publishVehicleEvent(auth.tenantId, branchResolved, {
        tipo: "pagamento.registrado",
        id: row.id,
        vehicle_entry_plate: vehicleEntryPlate,
    });
    return c.json(row, 201);
});
//# sourceMappingURL=payments.js.map