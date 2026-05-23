import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { checkMinioConnection } from "../lib/minio.js";
import { redisPing } from "../lib/redis.js";

export const systemRoutes = new Hono();

systemRoutes.get("/health", async (c) =>
  c.json({
    estado: "ok",
    mensagem: "API ativa.",
  }),
);

systemRoutes.get("/ready", async (c) => {
  try {
    await getDb().execute(sql`select 1`);
  } catch (e: unknown) {
    const detalhes = e instanceof Error ? e.message : String(e);
    return c.json(
      {
        pronto: false,
        erro: "Banco PostgreSQL indisponível.",
        postgres: false,
        detalhes,
      },
      503,
    );
  }

  const configuradoRedis = !!process.env.REDIS_URL?.trim?.();
  const redisResponde = configuradoRedis ? await redisPing() : null;
  const minioResponde = await checkMinioConnection();

  return c.json({
    pronto: true,
    mensagem:
      configuradoRedis && redisResponde === false
        ? "PostgreSQL OK; Redis configurado mas sem resposta (opcional em dev)."
        : "Serviços críticos atendendo requisição.",
    postgres: true,
    redis: configuradoRedis
      ? {
          configurado: true,
          responde: redisResponde,
        }
      : { configurado: false },
    minio:
      minioResponde === null
        ? { configurado: false }
        : {
            configurado: true,
            responde: minioResponde,
            bucket: process.env.MINIO_BUCKET?.trim() || "lava-rapido",
            publicUrl: process.env.MINIO_PUBLIC_URL?.trim() || null,
          },
  });
});
