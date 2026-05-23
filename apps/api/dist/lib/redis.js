import { Redis } from "ioredis";
let redis;
/** Retorna cliente Redis ou null se `REDIS_URL` não estiver configurada. */
export function getRedis() {
    if (redis === undefined) {
        const url = process.env.REDIS_URL;
        if (!url) {
            redis = null;
        }
        else {
            redis = new Redis(url, {
                maxRetriesPerRequest: 2,
                lazyConnect: true,
            });
        }
    }
    return redis;
}
export async function redisPing() {
    const r = getRedis();
    if (!r)
        return false;
    try {
        const res = await r.ping();
        return res === "PONG";
    }
    catch {
        return false;
    }
}
export async function disposeRedis() {
    if (redis) {
        await redis.quit();
        redis = undefined;
    }
}
//# sourceMappingURL=redis.js.map