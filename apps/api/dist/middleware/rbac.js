import { createMiddleware } from "hono/factory";
/** Expõe flag simples para evitar repetir checks de papel. */
export const rbacMiddleware = createMiddleware(async (c, next) => {
    c.set("isTenantAdmin", c.var.auth.role === "admin");
    await next();
});
//# sourceMappingURL=rbac.js.map