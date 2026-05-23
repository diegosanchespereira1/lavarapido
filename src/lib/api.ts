"use client";

import type {
  Branch,
  CashSummary,
  Customer,
  VehicleEntry,
  WashType,
} from "@/lib/types";
import type { PaymentMethod } from "@lava-rapido/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3011";

export const DEV_AUTH_STORAGE_KEY = "DEV_AUTH";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEV_AUTH_STORAGE_KEY);
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida da API.");
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    branchId?: string | null;
    token?: string | null;
  } = {}
): Promise<T> {
  const { branchId, token: tokenOverride, headers: extraHeaders, ...rest } =
    init;
  const token = tokenOverride ?? getToken();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${API_BASE}${normalizedPath}`;

  const headers = new Headers(extraHeaders);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (branchId) {
    headers.set("X-Branch-Id", branchId);
  }
  if (rest.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await parseJson(res.clone());
    } catch {
      errBody = await res.text();
    }
    let msg = `Erro ${res.status}`;
    if (
      typeof errBody === "object" &&
      errBody !== null &&
      "erro" in errBody &&
      typeof (errBody as { erro?: unknown }).erro === "string"
    ) {
      msg = (errBody as { erro: string }).erro;
    }
    throw new ApiError(msg, res.status, errBody);
  }

  return parseJson<T>(res);
}

function unwrapArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

function unwrapObj<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    (raw as { data: unknown }).data !== undefined
  ) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export async function listBranches(): Promise<Branch[]> {
  const raw = await apiFetch<unknown>("/v1/branches");
  return unwrapArray<Branch>(raw);
}

export async function createBranch(body: { name: string }): Promise<Branch> {
  const raw = await apiFetch<unknown>("/v1/branches", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrapObj<Branch>(raw);
}

export async function updateBranch(
  id: string,
  patch: { name: string }
): Promise<Branch> {
  const raw = await apiFetch<unknown>(`/v1/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrapObj<Branch>(raw);
}

export async function deleteBranch(id: string): Promise<void> {
  await apiFetch(`/v1/branches/${id}`, { method: "DELETE" });
}

export async function listWashTypes(): Promise<WashType[]> {
  const raw = await apiFetch<unknown>("/v1/wash-types");
  return unwrapArray<WashType>(raw);
}

export async function createWashType(body: {
  name: string;
  description?: string | null;
  price_cents: number;
  duration_minutes?: number;
}): Promise<WashType> {
  const raw = await apiFetch<unknown>("/v1/wash-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrapObj<WashType>(raw);
}

export async function updateWashType(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
  }>
): Promise<WashType> {
  const raw = await apiFetch<unknown>(`/v1/wash-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrapObj<WashType>(raw);
}

export async function deleteWashType(id: string): Promise<void> {
  await apiFetch(`/v1/wash-types/${id}`, { method: "DELETE" });
}

export async function listCustomers(): Promise<Customer[]> {
  const raw = await apiFetch<unknown>("/v1/customers");
  return unwrapArray<Customer>(raw);
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const raw = await apiFetch<unknown>(
    `/v1/customers/search?${new URLSearchParams({ q })}`,
  );
  return unwrapArray<Customer>(raw);
}

export async function createCustomer(body: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<Customer> {
  const raw = await apiFetch<unknown>("/v1/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return unwrapObj<Customer>(raw);
}

export async function listVehicleEntriesForBranch(
  branchId: string
): Promise<VehicleEntry[]> {
  const raw = await apiFetch<unknown>(`/v1/vehicle-entries`, { branchId });
  return unwrapArray<VehicleEntry>(raw);
}

export async function getVehicleEntry(
  id: string,
  branchId: string | null
): Promise<VehicleEntry> {
  const raw = await apiFetch<unknown>(`/v1/vehicle-entries/${id}`, {
    branchId,
  });
  return unwrapObj<VehicleEntry>(raw);
}

export async function patchVehicleEntryAction(opts: {
  id: string;
  action: "forward" | "back" | "cancel";
  branchId: string;
}): Promise<VehicleEntry> {
  const raw = await apiFetch<unknown>(`/v1/vehicle-entries/${opts.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: opts.action }),
    branchId: opts.branchId,
  });
  return unwrapObj<VehicleEntry>(raw);
}

export async function createVehicleEntryForBranch(
  branchId: string,
  body: {
    plate: string;
    wash_type_id: string;
    customer_id?: string | null;
    notes?: string | null;
    payment?: {
      method: PaymentMethod;
      amount_cents?: number;
    };
  }
): Promise<VehicleEntry> {
  const raw = await apiFetch<unknown>(`/v1/vehicle-entries`, {
    method: "POST",
    body: JSON.stringify(body),
    branchId,
  });
  return unwrapObj<VehicleEntry>(raw);
}

export async function registerPayment(opts: {
  branchId: string;
  vehicleEntryId: string;
  method: PaymentMethod;
  amountCents?: number;
}): Promise<{ id: string }> {
  const raw = await apiFetch<unknown>(`/v1/payments`, {
    method: "POST",
    body: JSON.stringify({
      vehicle_entry_id: opts.vehicleEntryId,
      method: opts.method,
      amount_cents: opts.amountCents,
    }),
    branchId: opts.branchId,
  });
  return unwrapObj<{ id: string }>(raw);
}

type MethodBreakdown = {
  method: string;
  totalCents: number;
  count: number;
};

type BranchBreakdownRow = {
  branchId: string;
  branchName: string | null;
  totalCents: number;
  count: number;
};

export async function getCashRegister(opts: {
  branchId: string | "consolidated";
  dateISO?: string;
}): Promise<CashSummary> {
  const date = opts.dateISO ?? new Date().toISOString().slice(0, 10);
  const qs = new URLSearchParams({ date });
  if (opts.branchId === "consolidated") {
    qs.set("consolidated", "true");
  } else {
    qs.set("branch_id", opts.branchId);
  }
  const raw = await apiFetch<Record<string, unknown>>(`/v1/cash-register?${qs}`);
  const total = Number(raw.total_centavos ?? 0);

  if (raw.consolidado === false && typeof raw.branch_id === "string") {
    const porMetodo = Array.isArray(raw.por_metodo)
      ? (raw.por_metodo as MethodBreakdown[]).map((r) => ({
          method: r.method,
          totalCents: Number(r.totalCents),
          count: Number(r.count),
        }))
      : [];

    return {
      date: String(raw.data ?? date),
      consolidated: false,
      branchId: raw.branch_id,
      totalCents: total,
      porMetodo,
    };
  }

  const linhas = Array.isArray(raw.linhas)
    ? (raw.linhas as BranchBreakdownRow[])
    : [];

  return {
    date: String(raw.data ?? date),
    consolidated: true,
    totalCents: total,
    linhasPorFilial: linhas.map((ln) => ({
      branchId: ln.branchId,
      branchName: ln.branchName,
      totalCents: Number(ln.totalCents),
      count: Number(ln.count),
    })),
  };
}
