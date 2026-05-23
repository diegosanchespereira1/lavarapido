import { and, eq, inArray } from "drizzle-orm";
import type { PaymentMethod } from "@lava-rapido/shared";
import type { TxLike } from "../db/client.js";
import { payments, type vehicleEntries } from "../db/schema.js";

export type EntryPaymentSummary = {
  isPaid: boolean;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  paymentId: string | null;
  paymentAmountCents: number | null;
};

export function emptyPaymentSummary(): EntryPaymentSummary {
  return {
    isPaid: false,
    paidAt: null,
    paymentMethod: null,
    paymentId: null,
    paymentAmountCents: null,
  };
}

export function enrichEntryWithPayment(
  entry: typeof vehicleEntries.$inferSelect,
  payment: typeof payments.$inferSelect | undefined,
): typeof vehicleEntries.$inferSelect & EntryPaymentSummary {
  if (!payment) {
    return { ...entry, ...emptyPaymentSummary() };
  }
  return {
    ...entry,
    isPaid: true,
    paidAt: payment.createdAt.toISOString(),
    paymentMethod: payment.method as PaymentMethod,
    paymentId: payment.id,
    paymentAmountCents: payment.amountCents,
  };
}

export async function loadPaymentsForEntries(
  tx: TxLike,
  tenantId: string,
  entryIds: string[],
): Promise<Map<string, typeof payments.$inferSelect>> {
  if (entryIds.length === 0) return new Map();
  const rows = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        inArray(payments.vehicleEntryId, entryIds),
      ),
    );
  const map = new Map<string, typeof payments.$inferSelect>();
  for (const row of rows) {
    if (row.vehicleEntryId && !map.has(row.vehicleEntryId)) {
      map.set(row.vehicleEntryId, row);
    }
  }
  return map;
}

export async function findPaymentForEntry(
  tx: TxLike,
  tenantId: string,
  entryId: string,
): Promise<typeof payments.$inferSelect | undefined> {
  const rows = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.vehicleEntryId, entryId),
      ),
    )
    .limit(1);
  return rows[0];
}
