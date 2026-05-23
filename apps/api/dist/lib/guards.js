import { problema, CODIGOS } from "./errors.js";
/** Parâmetro de rota obrigatório (ex.: `:id`). */
export function requireRouteParam(c, name) {
    const raw = c.req.param(name)?.trim();
    if (!raw) {
        return problema(c, 400, "Parâmetro de rota ausente.", CODIGOS.VALIDACAO);
    }
    return raw;
}
export function requireRouteId(c) {
    return requireRouteParam(c, "id");
}
/** Garante `X-Branch-Id` resolvido (após `branchContext`). */
export function requireBranchHeader(c) {
    const id = c.var.branchId;
    if (!id) {
        return problema(c, 400, "Informe o cabeçalho X-Branch-Id para esta operação.", CODIGOS.VALIDACAO);
    }
    return id;
}
/** Bloqueia operadores quando a ação é administrativa do tenant. */
export function requireAdmin(c) {
    if (!c.var.isTenantAdmin) {
        return problema(c, 403, "Somente administradores podem executar esta ação.", CODIGOS.NAO_AUTORIZADO);
    }
    return null;
}
//# sourceMappingURL=guards.js.map