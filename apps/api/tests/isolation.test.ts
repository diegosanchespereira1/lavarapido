import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { customers, tenants } from "../src/db/schema.js";
import { disposeDb, getDb } from "../src/db/client.js";

const outrosTenantIds = {
  tenant: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customer: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

describe.skipIf(!process.env.DATABASE_URL)(
  "isolamento multitenant na API",
  () => {
    let app!: ReturnType<typeof createApp>;

    beforeAll(() => {
      process.env.DEV_AUTH = "true";
      app = createApp();
    });

  afterAll(async () => {
    const db = getDb();
    await db.delete(tenants).where(eq(tenants.id, outrosTenantIds.tenant));
    await disposeDb();
  });

  it("bloqueia leituras de registros pertencentes a outro tenant", async () => {
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx.delete(tenants).where(eq(tenants.id, outrosTenantIds.tenant));
      await tx.insert(tenants).values({
        id: outrosTenantIds.tenant,
        name: "Tenant fake — cenário adversário",
      });
      await tx.insert(customers).values({
        id: outrosTenantIds.customer,
        tenantId: outrosTenantIds.tenant,
        name: "Cliente que não deve vazar para o tenant demo",
        phone: "+5500000000000",
      });
    });

    const resposta = await app.request(
      `/v1/customers/${outrosTenantIds.customer}`,
      {
        headers: {
          Authorization: "Bearer dev-admin",
        },
      },
    );

    expect(resposta.status).toBe(404);
    const corpo = (await resposta.json()) as { erro?: string };
    expect(typeof corpo.erro).toBe("string");
    expect(corpo.erro?.length ?? 0).toBeGreaterThan(0);
  });
});
