import type { Context } from "hono";
import { problema, CODIGOS } from "./errors.js";
import type { AuthState } from "../middleware/auth.js";

export type AppVariables = {
  requestId?: string;
  auth: AuthState;
  tenantId: string;
  branchId?: string;
  isTenantAdmin?: boolean;
};

export type AppCtx = Context<{ Variables: AppVariables }>;

/** Parâmetro de rota obrigatório (ex.: `:id`). */
export function requireRouteParam(c: Context, name: string): string | Response {
  const raw = c.req.param(name)?.trim();
  if (!raw) {
    return problema(
      c,
      400,
      "Parâmetro de rota ausente.",
      CODIGOS.VALIDACAO,
    );
  }
  return raw;
}

export function requireRouteId(c: Context): string | Response {
  return requireRouteParam(c, "id");
}

/** Garante `X-Branch-Id` resolvido (após `branchContext`). */
export function requireBranchHeader(c: AppCtx): string | Response {
  const id = c.var.branchId;
  if (!id) {
    return problema(
      c,
      400,
      "Informe o cabeçalho X-Branch-Id para esta operação.",
      CODIGOS.VALIDACAO,
    );
  }
  return id;
}

/** Bloqueia operadores quando a ação é administrativa do tenant. */
export function requireAdmin(c: AppCtx): Response | null {
  if (!c.var.isTenantAdmin) {
    return problema(
      c,
      403,
      "Somente administradores podem executar esta ação.",
      CODIGOS.NAO_AUTORIZADO,
    );
  }
  return null;
}
