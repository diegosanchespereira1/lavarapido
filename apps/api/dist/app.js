import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { branchContextMiddleware } from "./middleware/branch-context.js";
import { rbacMiddleware } from "./middleware/rbac.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { tenantContextMiddleware } from "./middleware/tenant-context.js";
import { branchesRoutes } from "./routes/branches.js";
import { cashRegisterRoutes } from "./routes/cash-register.js";
import { customersRoutes } from "./routes/customers.js";
import { eventsRoutes } from "./routes/events.js";
import { paymentsRoutes } from "./routes/payments.js";
import { systemRoutes } from "./routes/system.js";
import { vehicleEntriesRoutes } from "./routes/vehicle-entries.js";
import { washTypesRoutes } from "./routes/wash-types.js";
function corsOrigins() {
    const fromEnv = process.env.CORS_ORIGIN?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (fromEnv?.length)
        return fromEnv;
    return ["http://localhost:3012", "http://localhost:3000"];
}
/** Instância configurada da API (testes ou servidor Node). */
export function createApp() {
    const app = new Hono();
    app.use("*", cors({
        origin: corsOrigins(),
        allowHeaders: [
            "Authorization",
            "Content-Type",
            "X-Request-Id",
            "X-Branch-Id",
            "Accept",
        ],
        allowMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        exposeHeaders: ["X-Request-Id"],
        maxAge: 600,
    }));
    app.use("*", requestIdMiddleware);
    const publicV1 = new Hono();
    publicV1.route("/", systemRoutes);
    const privateV1 = new Hono();
    privateV1.use("*", authMiddleware);
    privateV1.use("*", tenantContextMiddleware);
    privateV1.use("*", branchContextMiddleware);
    privateV1.use("*", rbacMiddleware);
    privateV1.route("/branches", branchesRoutes);
    privateV1.route("/wash-types", washTypesRoutes);
    privateV1.route("/customers", customersRoutes);
    privateV1.route("/vehicle-entries", vehicleEntriesRoutes);
    privateV1.route("/payments", paymentsRoutes);
    privateV1.route("/cash-register", cashRegisterRoutes);
    privateV1.route("/events", eventsRoutes);
    const v1 = new Hono();
    v1.route("/", publicV1);
    v1.route("/", privateV1);
    app.route("/v1", v1);
    return app;
}
//# sourceMappingURL=app.js.map