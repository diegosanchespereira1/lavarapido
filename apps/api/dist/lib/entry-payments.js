import { and, eq, inArray } from "drizzle-orm";
import { payments } from "../db/schema.js";
export function emptyPaymentSummary() {
    return {
        isPaid: false,
        paidAt: null,
        paymentMethod: null,
        paymentId: null,
        paymentAmountCents: null,
    };
}
export function enrichEntryWithPayment(entry, payment) {
    if (!payment) {
        return { ...entry, ...emptyPaymentSummary() };
    }
    return {
        ...entry,
        isPaid: true,
        paidAt: payment.createdAt.toISOString(),
        paymentMethod: payment.method,
        paymentId: payment.id,
        paymentAmountCents: payment.amountCents,
    };
}
export async function loadPaymentsForEntries(tx, tenantId, entryIds) {
    if (entryIds.length === 0)
        return new Map();
    const rows = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.tenantId, tenantId), inArray(payments.vehicleEntryId, entryIds)));
    const map = new Map();
    for (const row of rows) {
        if (row.vehicleEntryId && !map.has(row.vehicleEntryId)) {
            map.set(row.vehicleEntryId, row);
        }
    }
    return map;
}
export async function findPaymentForEntry(tx, tenantId, entryId) {
    const rows = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.tenantId, tenantId), eq(payments.vehicleEntryId, entryId)))
        .limit(1);
    return rows[0];
}
//# sourceMappingURL=entry-payments.js.map