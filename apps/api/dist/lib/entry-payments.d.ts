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
export declare function emptyPaymentSummary(): EntryPaymentSummary;
export declare function enrichEntryWithPayment(entry: typeof vehicleEntries.$inferSelect, payment: typeof payments.$inferSelect | undefined): typeof vehicleEntries.$inferSelect & EntryPaymentSummary;
export declare function loadPaymentsForEntries(tx: TxLike, tenantId: string, entryIds: string[]): Promise<Map<string, typeof payments.$inferSelect>>;
export declare function findPaymentForEntry(tx: TxLike, tenantId: string, entryId: string): Promise<typeof payments.$inferSelect | undefined>;
//# sourceMappingURL=entry-payments.d.ts.map