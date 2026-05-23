import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as fullSchema from "./schema.js";
declare global {
    var ___lavaDb: PostgresJsDatabase<typeof fullSchema> | undefined;
    var ___lavaPg: ReturnType<typeof postgres> | undefined;
}
export type AppDb = PostgresJsDatabase<typeof fullSchema>;
/** Client Drizzle singleton (postgres.js). */
export declare function getDb(): AppDb;
export declare function disposeDb(): Promise<void>;
type TxLike = Omit<AppDb, "transaction"> & Pick<AppDb, "select" | "insert" | "update" | "delete" | "execute">;
export type { TxLike };
/**
 * Executa função dentro de uma transação com `SET LOCAL app.tenant_id`
 * conforme modelo multi-tenant do projeto.
 */
export declare function withTenantTx<T>(tenantId: string, fn: (tx: TxLike) => Promise<T>): Promise<T>;
//# sourceMappingURL=client.d.ts.map