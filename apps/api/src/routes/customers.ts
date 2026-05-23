import { Hono } from "hono";
import { and, asc, eq, ilike, inArray, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  formatPlate,
  normalizePlateInput,
  validateBrazilianPlate,
} from "@lava-rapido/shared";
import { withTenantTx } from "../db/client.js";
import { customers, vehicleEntries } from "../db/schema.js";
import { problema, CODIGOS } from "../lib/errors.js";
import {
  requireAdmin,
  requireRouteId,
  type AppCtx,
  type AppVariables,
} from "../lib/guards.js";

function normalizePlateForDb(pl: string): string | null {
  const v = validateBrazilianPlate(pl);
  if (!v.ok || !v.normalized) return null;
  return v.normalized;
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullish(),
  document: z.string().nullable().optional(),
  plate: z.string().nullable().optional(),
});

const patchSchema = createSchema.partial();

export const customersRoutes = new Hono<{ Variables: AppVariables }>();

customersRoutes.get("/search", async (c: AppCtx) => {
  const auth = c.var.auth;
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) {
    return problema(
      c,
      400,
      "Envie pelo menos 2 caracteres em q para buscar.",
      CODIGOS.VALIDACAO,
    );
  }
  const pattern = `%${q}%`;
  const plateFragment = normalizePlateInput(q);
  const platePattern = `%${plateFragment}%`;
  const normalizedPlate = normalizePlateForDb(q);
  const likes = [
    ilike(customers.name, pattern),
    ilike(customers.phone, pattern),
    ilike(customers.document, pattern),
    ilike(customers.email, pattern),
    ilike(customers.plate, platePattern),
  ];
  if (normalizedPlate) {
    likes.push(eq(customers.plate, normalizedPlate));
  }

  const rows = await withTenantTx(auth.tenantId, async (tx) => {
    const entryMatches = await tx
      .selectDistinct({ customerId: vehicleEntries.customerId })
      .from(vehicleEntries)
      .where(
        and(
          eq(vehicleEntries.tenantId, auth.tenantId),
          isNotNull(vehicleEntries.customerId),
          normalizedPlate
            ? or(
                ilike(vehicleEntries.plate, platePattern),
                eq(vehicleEntries.plate, normalizedPlate),
              )
            : ilike(vehicleEntries.plate, platePattern),
        ),
      );

    const idsFromEntries = entryMatches
      .map((r) => r.customerId)
      .filter((id): id is string => typeof id === "string");

    const whereClause =
      idsFromEntries.length > 0
        ? and(
            eq(customers.tenantId, auth.tenantId),
            or(...likes, inArray(customers.id, idsFromEntries)),
          )
        : and(eq(customers.tenantId, auth.tenantId), or(...likes));

    return tx
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(asc(customers.name))
      .limit(50);
  });
  return c.json(rows);
});

customersRoutes.get("/", async (c: AppCtx) => {
  const auth = c.var.auth;
  const rows = await withTenantTx(auth.tenantId, async (tx) =>
    tx
      .select()
      .from(customers)
      .where(eq(customers.tenantId, auth.tenantId))
      .orderBy(asc(customers.name)),
  );
  return c.json(rows);
});

customersRoutes.get("/:id", async (c: AppCtx) => {
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const row = await withTenantTx(auth.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)),
      )
      .limit(1);
    return rows[0];
  });
  if (!row) {
    return problema(c, 404, "Cliente não encontrado.", CODIGOS.NAO_ENCONTRADO);
  }
  return c.json(row);
});

customersRoutes.post("/", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }
  if (body.plate) {
    const v = validateBrazilianPlate(body.plate);
    if (!v.ok) {
      return problema(
        c,
        400,
        v.reason ?? "Placa inválida.",
        CODIGOS.VALIDACAO,
      );
    }
  }
  const auth = c.var.auth;
  const normalizedPlate =
    body.plate && validateBrazilianPlate(body.plate).normalized
      ? validateBrazilianPlate(body.plate).normalized!
      : null;

  const inserted = await withTenantTx(auth.tenantId, async (tx) => {
    const [ins] = await tx
      .insert(customers)
      .values({
        tenantId: auth.tenantId,
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        document: body.document ?? null,
        plate: normalizedPlate ?? null,
      })
      .returning();
    return ins!;
  });
  const out = { ...inserted, plateFormatted: inserted.plate ? formatPlate(inserted.plate) : null };
  return c.json(out, 201);
});

customersRoutes.patch("/:id", async (c: AppCtx) => {
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
  if (body.plate) {
    const v = validateBrazilianPlate(body.plate);
    if (!v.ok) {
      return problema(
        c,
        400,
        v.reason ?? "Placa inválida.",
        CODIGOS.VALIDACAO,
      );
    }
  }
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const patch: Partial<typeof customers.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.phone !== undefined) patch.phone = body.phone ?? null;
  if (body.email !== undefined) patch.email = body.email ?? null;
  if (body.document !== undefined) patch.document = body.document ?? null;
  if (body.plate !== undefined)
    patch.plate = body.plate
      ? validateBrazilianPlate(body.plate).normalized!
      : null;

  const updated = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .update(customers)
      .set(patch)
      .where(
        and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)),
      )
      .returning();
    return row;
  });
  if (!updated) {
    return problema(c, 404, "Cliente não encontrado.", CODIGOS.NAO_ENCONTRADO);
  }
  return c.json(updated);
});

customersRoutes.delete("/:id", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const deleted = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .delete(customers)
      .where(
        and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)),
      )
      .returning({ id: customers.id });
    return row;
  });
  if (!deleted) {
    return problema(c, 404, "Cliente não encontrado.", CODIGOS.NAO_ENCONTRADO);
  }
  return new Response(null, { status: 204 });
});
