import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { withTenantTx } from "../db/client.js";
import { branches } from "../db/schema.js";
import { problema, CODIGOS } from "../lib/errors.js";
import {
  requireAdmin,
  requireRouteId,
  type AppCtx,
  type AppVariables,
} from "../lib/guards.js";

const createSchema = z.object({
  name: z.string().min(1, "Nome da filial é obrigatório."),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
});

export const branchesRoutes = new Hono<{ Variables: AppVariables }>();

branchesRoutes.get("/", async (c: AppCtx) => {
  const auth = c.var.auth;
  const rows = await withTenantTx(auth.tenantId, async (tx) => {
    const q = await tx
      .select()
      .from(branches)
      .where(eq(branches.tenantId, auth.tenantId))
      .orderBy(asc(branches.name));
    if (auth.allowedBranchIds === "all") return q;
    const allow = new Set(auth.allowedBranchIds);
    return q.filter((b) => allow.has(b.id));
  });
  return c.json(rows);
});

branchesRoutes.get("/:id", async (c: AppCtx) => {
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const forbidden = problema(
    c,
    403,
    "Você não tem permissão para acessar esta filial.",
    CODIGOS.NAO_AUTORIZADO,
  );
  if (auth.allowedBranchIds !== "all" && !auth.allowedBranchIds.includes(id)) {
    return forbidden;
  }
  const row = await withTenantTx(auth.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(branches)
      .where(
        and(eq(branches.id, id), eq(branches.tenantId, auth.tenantId)),
      )
      .limit(1);
    return rows[0];
  });
  if (!row)
    return problema(c, 404, "Filial não encontrada.", CODIGOS.NAO_ENCONTRADO);
  return c.json(row);
});

branchesRoutes.post("/", async (c: AppCtx) => {
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
      .insert(branches)
      .values({ tenantId: auth.tenantId, name: body.name })
      .returning();
    return ins!;
  });
  return c.json(inserted, 201);
});

branchesRoutes.patch("/:id", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await c.req.json());
  } catch {
    return problema(c, 400, "Corpo JSON inválido.", CODIGOS.VALIDACAO);
  }
  if (!body.name) {
    return problema(
      c,
      400,
      "Informe pelo menos o campo name para atualizar.",
      CODIGOS.VALIDACAO,
    );
  }
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const updated = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .update(branches)
      .set({ name: body.name })
      .where(and(eq(branches.id, id), eq(branches.tenantId, auth.tenantId)))
      .returning();
    return row;
  });
  if (!updated)
    return problema(c, 404, "Filial não encontrada.", CODIGOS.NAO_ENCONTRADO);
  return c.json(updated);
});

branchesRoutes.delete("/:id", async (c: AppCtx) => {
  const denied = requireAdmin(c);
  if (denied) return denied;
  const auth = c.var.auth;
  const routeId = requireRouteId(c);
  if (routeId instanceof Response) return routeId;
  const id = routeId;
  const deleted = await withTenantTx(auth.tenantId, async (tx) => {
    const [row] = await tx
      .delete(branches)
      .where(and(eq(branches.id, id), eq(branches.tenantId, auth.tenantId)))
      .returning({ id: branches.id });
    return row;
  });
  if (!deleted)
    return problema(c, 404, "Filial não encontrada.", CODIGOS.NAO_ENCONTRADO);
  return new Response(null, { status: 204 });
});
