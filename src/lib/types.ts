/** Modelos camelCase conforme Drizzle/`c.json()` da API. */

import type { PaymentMethod, VehicleStatus as VS } from "@lava-rapido/shared";

export type VehicleStatus = VS;

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  createdAt?: string;
}

export interface WashType {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  createdAt?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email?: string | null;
  document?: string | null;
  plate?: string | null;
}

export interface VehicleEntry {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string | null;
  plate: string;
  washTypeId: string;
  status: VehicleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isPaid: boolean;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  paymentId: string | null;
  paymentAmountCents: number | null;
  washType?: WashType | null;
  customer?: Customer | null;
}

export interface CashSummary {
  date: string;
  consolidated: boolean;
  branchId?: string | null;
  /** Total em centavos (API: total_centavos). */
  totalCents: number;
  linhasPorFilial?: Array<{
    branchId: string;
    branchName: string | null;
    totalCents: number;
    count: number;
  }>;
  porMetodo?: Array<{ method: string; totalCents: number; count: number }>;
}
