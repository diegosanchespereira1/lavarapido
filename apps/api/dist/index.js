import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
const app = createApp();
const port = Number(process.env.PORT ?? "3011");
serve({
    fetch: app.fetch,
    port,
});
console.log(`[lava-api] Ouvir em http://localhost:${port} — documentação rápida: GET http://localhost:${port}/v1/health`);
//# sourceMappingURL=index.js.map