import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Respostas de erro sempre em PT-BR. */
export interface ApiErrorBody {
  erro: string;
  codigo?: string;
  /** ID único por requisição (útil ao cruzar com logs). */
  requestId?: string;
  detalhes?: unknown;
}

export const CODIGOS = {
  TOKEN_INVALIDO: "TOKEN_INVALIDO",
  TOKEN_AUSENTE: "TOKEN_AUSENTE",
  NAO_AUTORIZADO: "NAO_AUTORIZADO",
  CONFLITO: "CONFLITO",
  VALIDACAO: "VALIDACAO",
  NAO_ENCONTRADO: "NAO_ENCONTRADO",
  SERVICO_INDISPONIVEL: "SERVICO_INDISPONIVEL",
} as const;

function resolveRequestId(c: Context): string | undefined {
  const rid = c.var?.requestId;
  if (typeof rid === "string" && rid.length > 0) return rid;
  const header = c.req.header("X-Request-Id");
  return typeof header === "string" && header.length > 0 ? header : undefined;
}

export function problema(
  c: Context,
  status: number,
  erro: string,
  codigo?: string,
  detalhes?: unknown,
): Response {
  const body: ApiErrorBody = {
    erro,
    codigo,
    requestId: resolveRequestId(c),
    detalhes,
  };
  return c.json(body, status as ContentfulStatusCode);
}
