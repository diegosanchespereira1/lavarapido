import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { withTenantTx } from "../db/client.js";
import { washTypes } from "../db/schema.js";
import { problema, CODIGOS } from "../lib/errors.js";
import {
  requireAdmin,
  requireRouteId,
  type AppCtx,
  type AppVariables,
} from "../lib/guards.js";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().positive(),
  duration_minutes: z.number().int().positive().optional(),
});

const patchSchema = createSchema.partial();

export const washTypesRoutes = new Hono<{ Variables: AppVariables }>();

washTypesRoutes.get("/", async (c: AppCtx) => {
  const auth = c.var.auth;
  const rows = await withTenantTx(auth.tenantId, async (tx) =>
    tx
      .select()
      .from(washTypes)
      .where(eq(washTypes.tenantId, auth.tenantId))
      .orderBy(asc(washTypes.name)),
  );
  return c.json(rows);
});

washTypesRoutes.get("/:id", async (c: AppCtx) => {
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const row = await withTenantTx(auth.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(washTypes)
      .where(
        and(eq(washTypes.id, id), eq(washTypes.tenantId, auth.tenantId)),
      )
      .limit(1);
    return rows[0];
  });
  if (!row) {
    return problema(
      c,
      404,
      "Tipo de lavagem não encontrado.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }
  return c.json(row);
});

washTypesRoutes.post("/", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }
  const auth = c.var.auth;
  const inserted = await withTenantTx(auth.tenantId, async (tx) => {
    const [ins] = await tx
      .insert(washTypes)
      .values({
        tenantId: auth.tenantId,
        name: body.name,
        description: body.description ?? null,
        priceCents: body.price_cents,
        durationMinutes: body.duration_minutes ?? 30,
      })
      .returning();
    return ins!;
  });
  return c.json(inserted, 201);
});

washTypesRoutes.patch("/:id", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await c.req.json());
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
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const patch: Partial<typeof washTypes.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined)
    patch.description = body.description ?? null;
  if (body.price_cents !== undefined) patch.priceCents = body.price_cents;
  if (body.duration_minutes !== undefined)
    patch.durationMinutes = body.duration_minutes;

  const updated = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .update(washTypes)
      .set(patch)
      .where(
        and(eq(washTypes.id, id), eq(washTypes.tenantId, auth.tenantId)),
      )
      .returning();
    return row;
  });
  if (!updated) {
    return problema(
      c,
      404,
      "Tipo de lavagem não encontrado.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }
  return c.json(updated);
});

washTypesRoutes.delete("/:id", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const deleted = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .delete(washTypes)
      .where(
        and(eq(washTypes.id, id), eq(washTypes.tenantId, auth.tenantId)),
      )
      .returning({ id: washTypes.id });
    return row;
  });
  if (!deleted) {
    return problema(
      c,
      404,
      "Tipo de lavagem não encontrado.",
      CODIGOS.NAO_ENCONTRADO,
    );
  }
  return new Response(null, { status: 204 });
});
