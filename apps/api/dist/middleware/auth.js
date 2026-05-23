import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { DEMO_IDS } from "@lava-rapido/shared";
import { problema, CODIGOS } from "../lib/errors.js";
const DEV_ADMIN = "dev-admin";
const DEV_OPERATOR = "dev-operator";
function parseBearer(header) {
    if (!header)
        return null;
    const m = /^Bearer\s+(.+)$/i.exec(header.trim());
    return m?.[1] ?? null;
}
function claimsToAuthState(payload) {
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const tenant_id = typeof payload.tenant_id === "string" ? payload.tenant_id : null;
    const role = typeof payload.role === "string" &&
        (payload.role === "admin" || payload.role === "user")
        ? payload.role
        : null;
    if (!sub || !tenant_id || !role)
        return null;
    const rawBranches = payload.branch_ids;
    let allowed = "all";
    if (role === "user") {
        if (!Array.isArray(rawBranches) || rawBranches.length === 0)
            return null;
        allowed = rawBranches.filter((b) => typeof b === "string");
    }
    return {
        subject: sub,
        tenantId: tenant_id,
        role,
        allowedBranchIds: allowed,
    };
}
export const authMiddleware = createMiddleware(async (c, next) => {
    const token = parseBearer(c.req.header("Authorization"));
    if (!token) {
        return problema(c, 401, "Credenciais ausentes. Envie o cabeçalho Authorization: Bearer <token>.", CODIGOS.TOKEN_AUSENTE);
    }
    const devAuth = process.env.DEV_AUTH === "true";
    if (devAuth && token === DEV_ADMIN) {
        c.set("auth", {
            subject: "dev:admin",
            tenantId: DEMO_IDS.tenantId,
            role: "admin",
            allowedBranchIds: "all",
        });
        await next();
        return;
    }
    if (devAuth && token === DEV_OPERATOR) {
        c.set("auth", {
            subject: "dev:operator",
            tenantId: DEMO_IDS.tenantId,
            role: "user",
            allowedBranchIds: [DEMO_IDS.branchCentroId],
        });
        await next();
        return;
    }
    if (devAuth) {
        return problema(c, 401, "Token de desenvolvimento inválido. Use dev-admin ou dev-operator quando DEV_AUTH=true.", CODIGOS.TOKEN_INVALIDO);
    }
    const keycloakIssuer = process.env.KEYCLOAK_ISSUER?.replace(/\/$/, "");
    if (keycloakIssuer) {
        try {
            const jwks = jose.createRemoteJWKSet(new URL(`${keycloakIssuer}/protocol/openid-connect/certs`));
            const { payload } = await jose.jwtVerify(token, jwks, {
                issuer: keycloakIssuer,
            });
            const auth = claimsToAuthState(payload);
            if (!auth) {
                return problema(c, 401, "Token Keycloak inválido: claims obrigatórias ausentes (sub, tenant_id, role).", CODIGOS.TOKEN_INVALIDO);
            }
            c.set("auth", auth);
            await next();
            return;
        }
        catch {
            return problema(c, 401, "Não foi possível validar o token Keycloak.", CODIGOS.TOKEN_INVALIDO);
        }
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 8) {
        return problema(c, 503, "Autenticação JWT não configurada (variável JWT_SECRET).", CODIGOS.SERVICO_INDISPONIVEL);
    }
    try {
        const key = new TextEncoder().encode(secret);
        const { payload } = await jose.jwtVerify(token, key);
        const auth = claimsToAuthState(payload);
        if (!auth) {
            return problema(c, 401, "Token JWT inválido: claims obrigatórias ausentes (sub, tenant_id, role).", CODIGOS.TOKEN_INVALIDO);
        }
        c.set("auth", auth);
        await next();
    }
    catch {
        return problema(c, 401, "Não foi possível validar o token JWT.", CODIGOS.TOKEN_INVALIDO);
    }
});
//# sourceMappingURL=auth.js.map