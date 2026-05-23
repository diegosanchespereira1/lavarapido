import { Redis } from "ioredis";

type RedisConn = InstanceType<typeof Redis>;

/** Tipo público para assinatura Redis/subscriber nos handlers. */
export type RedisClient = RedisConn;

let redis: RedisConn | null | undefined;

/** Retorna cliente Redis ou null se `REDIS_URL` não estiver configurada. */
export function getRedis(): RedisConn | null {
  if (redis === undefined) {
    const url = process.env.REDIS_URL;
    if (!url) {
      redis = null;
    } else {
      redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
    }
  }
  return redis;
}

export async function redisPing(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const res = await r.ping();
    return res === "PONG";
  } catch {
    return false;
  }
}

export async function disposeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}
