import { Redis } from "ioredis";
type RedisConn = InstanceType<typeof Redis>;
/** Tipo público para assinatura Redis/subscriber nos handlers. */
export type RedisClient = RedisConn;
/** Retorna cliente Redis ou null se `REDIS_URL` não estiver configurada. */
export declare function getRedis(): RedisConn | null;
export declare function redisPing(): Promise<boolean>;
export declare function disposeRedis(): Promise<void>;
export {};
//# sourceMappingURL=redis.d.ts.map