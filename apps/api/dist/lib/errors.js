export const CODIGOS = {
    TOKEN_INVALIDO: "TOKEN_INVALIDO",
    TOKEN_AUSENTE: "TOKEN_AUSENTE",
    NAO_AUTORIZADO: "NAO_AUTORIZADO",
    CONFLITO: "CONFLITO",
    VALIDACAO: "VALIDACAO",
    NAO_ENCONTRADO: "NAO_ENCONTRADO",
    SERVICO_INDISPONIVEL: "SERVICO_INDISPONIVEL",
};
function resolveRequestId(c) {
    const rid = c.var?.requestId;
    if (typeof rid === "string" && rid.length > 0)
        return rid;
    const header = c.req.header("X-Request-Id");
    return typeof header === "string" && header.length > 0 ? header : undefined;
}
export function problema(c, status, erro, codigo, detalhes) {
    const body = {
        erro,
        codigo,
        requestId: resolveRequestId(c),
        detalhes,
    };
    return c.json(body, status);
}
//# sourceMappingURL=errors.js.map