/**
 * Seeds idempotentes da demo MVP (tenant, filiais, catálogo, clientes e entradas).
 * Execute depois de `npm run db:push` dentro de `@lava-rapido/api`.
 */
import {
  DEMO_IDS,
  VehicleStatus,
} from "@lava-rapido/shared";
import { eq } from "drizzle-orm";
import {
  branches,
  customers,
  payments,
  tenants,
  vehicleEntries,
  washTypes,
} from "../src/db/schema.js";
import { disposeDb, getDb } from "../src/db/client.js";

async function main() {
  const db = getDb();

  console.log("[seed] Reinserindo dados de demonstração (tenant demo)...");

  const resultado = await db.transaction(async (tx) => {
    await tx.delete(tenants).where(eq(tenants.id, DEMO_IDS.tenantId));

    await tx.insert(tenants).values({
      id: DEMO_IDS.tenantId,
      name: "Cliente demo — Lava Rápido",
    });

    await tx.insert(branches).values([
      {
        id: DEMO_IDS.branchCentroId,
        tenantId: DEMO_IDS.tenantId,
        name: "Centro",
      },
      {
        id: DEMO_IDS.branchNorteId,
        tenantId: DEMO_IDS.tenantId,
        name: "Norte",
      },
    ]);

    await tx.insert(washTypes).values([
      {
        id: DEMO_IDS.washTypeSimpleId,
        tenantId: DEMO_IDS.tenantId,
        name: "Simples",
        description: "Lavagem rápida externa.",
        priceCents: 2500,
        durationMinutes: 20,
      },
      {
        id: DEMO_IDS.washTypeCompletoId,
        tenantId: DEMO_IDS.tenantId,
        name: "Completa",
        description: "Externa + aspiração básica.",
        priceCents: 4900,
        durationMinutes: 45,
      },
      {
        id: DEMO_IDS.washTypeDetalheId,
        tenantId: DEMO_IDS.tenantId,
        name: "Detailing leve",
        description: "Cera + tratamento rápido de plásticos.",
        priceCents: 7900,
        durationMinutes: 90,
      },
    ]);

    await tx.insert(customers).values([
      {
        id: DEMO_IDS.customerJoaoId,
        tenantId: DEMO_IDS.tenantId,
        name: "João Prado",
        phone: "+5541999887766",
        email: "joao.prado@exemplo.dev",
        document: "12345678901",
        plate: "ABC1D34",
      },
      {
        id: DEMO_IDS.customerMariaId,
        tenantId: DEMO_IDS.tenantId,
        name: "Maria Figueiredo",
        phone: "+5541988776655",
        email: null,
        document: null,
        plate: null,
      },
    ]);

    await tx.insert(vehicleEntries).values([
      {
        id: DEMO_IDS.vehicleEntry1Id,
        tenantId: DEMO_IDS.tenantId,
        branchId: DEMO_IDS.branchCentroId,
        customerId: DEMO_IDS.customerJoaoId,
        plate: "ABC1D34",
        washTypeId: DEMO_IDS.washTypeCompletoId,
        status: VehicleStatus.LAVANDO,
        notes: "Cliente mensalista — prioridade média.",
      },
      {
        id: DEMO_IDS.vehicleEntry2Id,
        tenantId: DEMO_IDS.tenantId,
        branchId: DEMO_IDS.branchNorteId,
        customerId: DEMO_IDS.customerMariaId,
        plate: "XYZ9876",
        washTypeId: DEMO_IDS.washTypeSimpleId,
        status: VehicleStatus.FILA,
        notes: "Primeira visita; oferta cupom bem-vindo.",
      },
    ]);

    await tx.insert(payments).values({
      tenantId: DEMO_IDS.tenantId,
      branchId: DEMO_IDS.branchCentroId,
      vehicleEntryId: DEMO_IDS.vehicleEntry1Id,
      amountCents: 4900,
      method: "pix",
    });

    const filiais = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.tenantId, DEMO_IDS.tenantId));

    const entradas = await tx
      .select({ id: vehicleEntries.id })
      .from(vehicleEntries)
      .where(eq(vehicleEntries.tenantId, DEMO_IDS.tenantId));

    return { filiais: filiais.length, entradas: entradas.length };
  });

  console.log(
    `[seed] Concluído — filiais: ${resultado.filiais}, entradas: ${resultado.entradas}`,
  );
}

main()
  .catch((erro: unknown) => {
    console.error("[seed] Falha ao aplicar dados de demonstração:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disposeDb();
  });
