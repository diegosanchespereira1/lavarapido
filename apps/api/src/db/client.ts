import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as fullSchema from "./schema.js";

declare global {
  // eslint-disable-next-line no-var -- singleton HMR-aware
  var ___lavaDb: PostgresJsDatabase<typeof fullSchema> | undefined;
  // eslint-disable-next-line no-var
  var ___lavaPg: ReturnType<typeof postgres> | undefined;
}

export type AppDb = PostgresJsDatabase<typeof fullSchema>;

function createConnection(databaseUrl: string) {
  const pg = postgres(databaseUrl, { max: 10 });
  const db = drizzle(pg, { schema: fullSchema });
  return { pg, db };
}

/** Client Drizzle singleton (postgres.js). */
export function getDb(): AppDb {
  const url =
    process.env.DATABASE_URL ??
    "postgres://lava:lava_dev@127.0.0.1:5433/lava_rapido";
  if (!globalThis.___lavaDb || !globalThis.___lavaPg) {
    const { pg, db } = createConnection(url);
    globalThis.___lavaPg = pg;
    globalThis.___lavaDb = db;
  }
  return globalThis.___lavaDb!;
}

export async function disposeDb(): Promise<void> {
  if (globalThis.___lavaPg) {
    await globalThis.___lavaPg.end({ timeout: 5 });
    globalThis.___lavaPg = undefined;
    globalThis.___lavaDb = undefined;
  }
}

type TxLike = Omit<AppDb, "transaction"> &
  Pick<AppDb, "select" | "insert" | "update" | "delete" | "execute">;

export type { TxLike };

/**
 * Executa função dentro de uma transação com `SET LOCAL app.tenant_id`
 * conforme modelo multi-tenant do projeto.
 */
export async function withTenantTx<T>(
  tenantId: string,
  fn: (tx: TxLike) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.tenant_id', ${tenantId}::text, true)`,
    );
    return fn(tx as unknown as TxLike);
  });
}
