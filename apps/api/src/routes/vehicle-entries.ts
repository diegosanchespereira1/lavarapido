import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  PAYMENT_METHODS,
  PIPELINE_COLUMNS,
  VehicleStatus,
  validateMercosulPlate,
  type PaymentMethod,
} from "@lava-rapido/shared";
import { withTenantTx } from "../db/client.js";
import { payments, vehicleEntries, washTypes } from "../db/schema.js";
import {
  enrichEntryWithPayment,
  loadPaymentsForEntries,
  findPaymentForEntry,
} from "../lib/entry-payments.js";
import { problema, CODIGOS } from "../lib/errors.js";
import {
  requireBranchHeader,
  requireRouteId,
  type AppCtx,
  type AppVariables,
} from "../lib/guards.js";
import { publishVehicleEvent } from "../lib/pubsub.js";

const forwardOrder = [...PIPELINE_COLUMNS, VehicleStatus.ENTREGUE] as const;

const paymentMethodSchema = z.enum(
  PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]],
);

const createSchema = z.object({
  plate: z.string().min(1),
  wash_type_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  payment: z
    .object({
      method: paymentMethodSchema,
      amount_cents: z.number().int().positive().optional(),
    })
    .optional(),
});

const patchOptionalSchema = z.object({
  plate: z.string().min(1).optional(),
  wash_type_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const statusSchema = z.object({
  action: z.enum(["forward", "back", "cancel"]),
});

export const vehicleEntriesRoutes = new Hono<{ Variables: AppVariables }>();

vehicleEntriesRoutes.get("/", async (c: AppCtx) => {
  const branchHead = requireBranchHeader(c);
  if (branchHead instanceof Response) return branchHead;
  const activeBranchId: string = branchHead;
  const auth = c.var.auth;
  const rows = await withTenantTx(auth.tenantId, async (tx) => {
    const entries = await tx
      .select()
      .from(vehicleEntries)
      .where(
        and(
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .orderBy(desc(vehicleEntries.updatedAt));
    const payMap = await loadPaymentsForEntries(
      tx,
      auth.tenantId,
      entries.map((e) => e.id),
    );
    return entries.map((e) =>
      enrichEntryWithPayment(e, payMap.get(e.id)),
    );
  });
  return c.json(rows);
});

vehicleEntriesRoutes.get("/:id", async (c: AppCtx) => {
  const branchHead = requireBranchHeader(c);
  if (branchHead instanceof Response) return branchHead;
  const activeBranchId: string = branchHead;
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const row = await withTenantTx(auth.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(vehicleEntries)
      .where(
        and(
          eq(vehicleEntries.id, id),
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .limit(1);
    const entry = rows[0];
    if (!entry) return null;
    const payment = await findPaymentForEntry(tx, auth.tenantId, entry.id);
    return enrichEntryWithPayment(entry, payment);
  });
  if (!row) {
    return problema(
      c,
      404,
      "Entrada não encontrada nesta filial.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }
  return c.json(row);
});

vehicleEntriesRoutes.post("/", async (c: AppCtx) => {
  const branchHeader = requireBranchHeader(c);
  if (branchHeader instanceof Response) return branchHeader;
  const activeBranchId: string = branchHeader;
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }
  const v = validateMercosulPlate(body.plate);
  if (!v.ok || !v.normalized) {
    return problema(c, 400, v.reason ?? "Placa inválida.", CODIGOS.VALIDACAO);
  }
  const plateNormalized = v.normalized;
  const auth = c.var.auth;
  const inserted = await withTenantTx(auth.tenantId, async (tx) => {
    const wtRows = await tx
      .select()
      .from(washTypes)
      .where(
        and(
          eq(washTypes.id, body.wash_type_id),
          eq(washTypes.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const washType = wtRows[0];
    if (!washType) {
      return { erroWashType: true as const };
    }

    const [ins] = await tx
      .insert(vehicleEntries)
      .values({
        tenantId: auth.tenantId,
        branchId: activeBranchId,
        customerId: body.customer_id ?? null,
        plate: plateNormalized,
        washTypeId: body.wash_type_id,
        status: VehicleStatus.RECEBIDO,
        notes: body.notes ?? null,
      })
      .returning();

    let paymentRow: typeof payments.$inferSelect | undefined;
    if (body.payment) {
      const amountCents = body.payment.amount_cents ?? washType.priceCents;
      const [pay] = await tx
        .insert(payments)
        .values({
          tenantId: auth.tenantId,
          branchId: activeBranchId,
          vehicleEntryId: ins!.id,
          amountCents,
          method: body.payment.method,
        })
        .returning();
      paymentRow = pay;
    }

    return { entry: ins!, payment: paymentRow };
  });

  if ("erroWashType" in inserted && inserted.erroWashType) {
    return problema(
      c,
      404,
      "Tipo de lavagem não encontrado.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }

  const result = inserted as {
    entry: typeof vehicleEntries.$inferSelect;
    payment?: typeof payments.$inferSelect;
  };

  await publishVehicleEvent(auth.tenantId, activeBranchId, {
    tipo: "vehicle_entry.criado",
    id: result.entry.id,
  });

  if (result.payment) {
    await publishVehicleEvent(auth.tenantId, activeBranchId, {
      tipo: "pagamento.registrado",
      id: result.payment.id,
      vehicle_entry_plate: result.entry.plate,
    });
  }

  return c.json(
    enrichEntryWithPayment(result.entry, result.payment),
    201,
  );
});

vehicleEntriesRoutes.patch("/:id/status", async (c: AppCtx) => {
  const branchHead = requireBranchHeader(c);
  if (branchHead instanceof Response) return branchHead;
  const activeBranchId: string = branchHead;
  let body: z.infer<typeof statusSchema>;
  try {
    body = statusSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }

  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;

  const idxOf = (s: VehicleStatus) =>
    forwardOrder.indexOf(s as (typeof forwardOrder)[number]);

  const computeNext = (current: VehicleStatus, action: "forward" | "back") => {
    if (
      current === VehicleStatus.CANCELADO ||
      current === VehicleStatus.ENTREGUE
    ) {
      return null as VehicleStatus | null;
    }
    const i = idxOf(current);
    if (i < 0) return null as VehicleStatus | null;
    if (action === "forward") {
      if (i >= forwardOrder.length - 1) return null as VehicleStatus | null;
      return forwardOrder[i + 1]!;
    }
    if (action === "back") {
      if (i <= 0) return null as VehicleStatus | null;
      return forwardOrder[i - 1]!;
    }
    return null as VehicleStatus | null;
  };

  const updated = await withTenantTx(auth.tenantId, async (tx) => {
    const rows = await tx
      .select({ status: vehicleEntries.status })
      .from(vehicleEntries)
      .where(
        and(
          eq(vehicleEntries.id, id),
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .limit(1);
    const currRaw = rows[0]?.status;
    if (!currRaw) return { erro404: true as const };

    const curr = currRaw as VehicleStatus;

    let nextStatus: VehicleStatus | null = null;

    if (body.action === "cancel") {
      if (
        curr === VehicleStatus.CANCELADO ||
        curr === VehicleStatus.ENTREGUE
      ) {
        return { invalidTransition: true as const };
      }
      nextStatus = VehicleStatus.CANCELADO;
    } else if (body.action === "forward") {
      nextStatus = computeNext(curr, "forward") as VehicleStatus | null;
    } else if (body.action === "back") {
      nextStatus = computeNext(curr, "back") as VehicleStatus | null;
    }

    if (nextStatus === null) {
      return { invalidTransition: true as const };
    }

    const [row] = await tx
      .update(vehicleEntries)
      .set({ status: nextStatus!, updatedAt: new Date() })
      .where(
        and(
          eq(vehicleEntries.id, id),
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .returning();

    const payment = await findPaymentForEntry(tx, auth.tenantId, id);
    return { row: row!, nextStatus, payment };
  });

  if ("erro404" in updated && updated.erro404) {
    return problema(
      c,
      404,
      "Entrada não encontrada nesta filial.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }

  if ("invalidTransition" in updated && updated.invalidTransition) {
    return problema(
      c,
      400,
      "Transição de status inválida para o estado atual.",
      CODIGOS.VALIDACAO,
    );
  }

  await publishVehicleEvent(auth.tenantId, activeBranchId, {
    tipo: "vehicle_entry.status",
    id,
    para: updated.nextStatus,
  });

  const final = updated as {
    row: typeof vehicleEntries.$inferSelect;
    nextStatus: VehicleStatus;
    payment?: typeof payments.$inferSelect;
  };

  return c.json(enrichEntryWithPayment(final.row, final.payment));
});

vehicleEntriesRoutes.patch("/:id", async (c: AppCtx) => {
  const branchHead = requireBranchHeader(c);
  if (branchHead instanceof Response) return branchHead;
  const activeBranchId: string = branchHead;
  let body: z.infer<typeof patchOptionalSchema>;
  try {
    body = patchOptionalSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }
  if (Object.keys(body).length === 0) {
    return problema(
      c,
      400,
      "Nenhum campo para atualização foi enviado.",
      CODIGOS.VALIDACAO,
    );
  }
  let plateNormalized: string | undefined;
  if (body.plate) {
    const pv = validateMercosulPlate(body.plate);
    if (!pv.ok || !pv.normalized) {
      return problema(
        c,
        400,
        pv.reason ?? "Placa inválida.",
        CODIGOS.VALIDACAO,
      );
    }
    plateNormalized = pv.normalized;
  }

  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;

  const patchPayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (plateNormalized !== undefined) patchPayload.plate = plateNormalized;
  if (body.wash_type_id !== undefined)
    patchPayload.washTypeId = body.wash_type_id;
  if (body.customer_id !== undefined)
    patchPayload.customerId = body.customer_id ?? null;
  if (body.notes !== undefined) patchPayload.notes = body.notes ?? null;

  const updated = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .update(vehicleEntries)
      .set(patchPayload as typeof vehicleEntries.$inferInsert)
      .where(
        and(
          eq(vehicleEntries.id, id),
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .returning();
    if (!row) return null;
    const payment = await findPaymentForEntry(tx, auth.tenantId, id);
    return enrichEntryWithPayment(row, payment);
  });

  if (!updated) {
    return problema(
      c,
      404,
      "Entrada não encontrada nesta filial.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }
  await publishVehicleEvent(auth.tenantId, activeBranchId, {
    tipo: "vehicle_entry.atualizado",
    id: updated.id,
  });
  return c.json(updated);
});

vehicleEntriesRoutes.delete("/:id", async (c: AppCtx) => {
  const branchHead = requireBranchHeader(c);
  if (branchHead instanceof Response) return branchHead;
  const activeBranchId: string = branchHead;
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;

  const removed = await withTenantTx(auth.tenantId, async (tx) => {
    const linked = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.vehicleEntryId, id),
          eq(payments.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (linked.length > 0) {
      return { conflict: true as const };
    }

    const [row] = await tx
      .delete(vehicleEntries)
      .where(
        and(
          eq(vehicleEntries.id, id),
          eq(vehicleEntries.tenantId, auth.tenantId),
          eq(vehicleEntries.branchId, activeBranchId),
        ),
      )
      .returning({ id: vehicleEntries.id });
    return row ? ({ ok: row } as const) : null;
  });

  if (removed && "conflict" in removed) {
    return problema(
      c,
      409,
      "Não é possível excluir: existem pagamentos vinculados a esta entrada.",
      CODIGOS.CONFLITO,
    );
  }
  if (
    removed &&
    typeof removed === "object" &&
    "ok" in removed &&
    removed.ok?.id
  ) {
    await publishVehicleEvent(auth.tenantId, activeBranchId, {
      tipo: "vehicle_entry.removido",
      id: removed.ok.id,
    });
    return new Response(null, { status: 204 });
  }

  return problema(
    c,
    404,
    "Entrada não encontrada nesta filial.",
    CODIGOS.NAO_ENCONTRADO,
  );
});
