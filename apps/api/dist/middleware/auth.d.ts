import type { UserRole } from "@lava-rapido/shared";
export type AuthState = {
    subject: string;
    tenantId: string;
    role: UserRole;
    /** `all` para administradores com acesso a todas as filiais do tenant. */
    allowedBranchIds: "all" | string[];
};
export declare const authMiddleware: import("hono").MiddlewareHandler<any, string, {}, Response>;
//# sourceMappingURL=auth.d.ts.map