import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { streamSSE } from "hono/streaming";
import { withTenantTx } from "../db/client.js";
import { vehicleEntries } from "../db/schema.js";
import { eventsChannel } from "../lib/channels.js";
import { getRedis } from "../lib/redis.js";
import { requireBranchHeader } from "../lib/guards.js";
export const eventsRoutes = new Hono();
function heartbeatLoop(stream, abortSignal) {
    const heartbeat = setInterval(async () => {
        await stream.writeSSE({
            event: "heartbeat",
            data: JSON.stringify({ tipo: "heartbeat", quando: Date.now() }),
        });
    }, 15_000);
    const stop = () => clearInterval(heartbeat);
    if (abortSignal)
        abortSignal.addEventListener("abort", stop);
    return stop;
}
/** SSE só com snapshot inicial — sem polling; atualizações vêm do pub/sub. */
function snapshotOnlyStream(c, snapshot) {
    const signal = c.req.raw.signal;
    return streamSSE(c, async (stream) => {
        const stopHb = heartbeatLoop(stream, signal);
        const initial = await snapshot();
        await stream.writeSSE({
            event: "snapshot",
            data: JSON.stringify({ tipo: "snapshot", registros: initial }),
        });
        signal.addEventListener("abort", () => stopHb(), { once: true });
    });
}
eventsRoutes.get("/stream", async (c) => {
    const branchHeader = requireBranchHeader(c);
    if (branchHeader instanceof Response)
        return branchHeader;
    const branchId = branchHeader;
    const auth = c.var.auth;
    const channel = eventsChannel(auth.tenantId, branchId);
    const signal = c.req.raw.signal;
    async function snapshot() {
        return withTenantTx(auth.tenantId, async (tx) => tx
            .select()
            .from(vehicleEntries)
            .where(and(eq(vehicleEntries.tenantId, auth.tenantId), eq(vehicleEntries.branchId, branchId)))
            .orderBy(desc(vehicleEntries.updatedAt))
            .limit(200));
    }
    const redisGlobal = getRedis();
    if (!redisGlobal) {
        return snapshotOnlyStream(c, snapshot);
    }
    let subscriber;
    try {
        subscriber = redisGlobal.duplicate();
        await subscriber.subscribe(channel);
    }
    catch {
        if (subscriber)
            await subscriber.quit().catch(() => undefined);
        return snapshotOnlyStream(c, snapshot);
    }
    const sub = subscriber;
    return streamSSE(c, async (stream) => {
        const stopHb = heartbeatLoop(stream, signal);
        const initial = await snapshot();
        await stream.writeSSE({
            event: "snapshot",
            data: JSON.stringify({ tipo: "snapshot", registros: initial }),
        });
        const onMessage = async (_ch, message) => {
            let payload = message;
            try {
                payload = JSON.parse(message);
            }
            catch {
                /* mantém texto */
            }
            await stream.writeSSE({
                event: "evento",
                data: JSON.stringify({ tipo: "redis_pubsub", payload }),
            });
        };
        sub.on("message", onMessage);
        signal.addEventListener("abort", async () => {
            stopHb();
            sub.off("message", onMessage);
            await sub.quit().catch(() => undefined);
        }, { once: true });
    });
});
//# sourceMappingURL=events.js.map