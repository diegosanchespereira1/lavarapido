"use client";

import type { Customer, VehicleEntry } from "@/lib/types";
import { listCustomers, listVehicleEntriesForBranch, searchCustomers } from "@/lib/api";
import { useBranchContext } from "@/contexts/branch-context";
import { formatPlateDisplay } from "@/lib/plate";
import { VehicleStatus } from "@lava-rapido/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const { branchIdForApi } = useBranchContext();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await listCustomers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchCustomers(q)
        .then(setCustomers)
        .catch(() => setCustomers([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (query.trim().length < 2 && !loading) {
      void loadAll();
    }
  }, [query, loading, loadAll]);

  const isSearchMode = query.trim().length >= 2;
  const emptyMessage = isSearchMode
    ? "Nenhum cliente encontrado para esta busca."
    : "Nenhum cliente cadastrado.";

  return (
    <div className="mx-auto mt-10 w-full max-w-xl pb-[120px]">
      <h1 className="mb-6 text-xl font-bold">Clientes</h1>

      <label className="relative mb-8 block">
        <span className="sr-only">Buscar clientes</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--text-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, telefone ou placa…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-black/10 bg-white/95 py-3.5 pl-11 pr-4 text-[15px] shadow-[0_4px_16px_rgba(43,95,140,0.06)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
        />
      </label>

      {loading && !isSearchMode ? (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Carregando clientes…
        </p>
      ) : searching ? (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Buscando…
        </p>
      ) : customers.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.06] bg-white/90 px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-[11px]">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              branchIdForApi={branchIdForApi}
              defaultOpen={isSearchMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function translateVehicleStatus(status: VehicleStatus) {
  switch (status) {
    case VehicleStatus.RECEBIDO:
      return "Recebido";
    case VehicleStatus.FILA:
      return "Fila";
    case VehicleStatus.LAVANDO:
      return "Lavagem";
    case VehicleStatus.SECANDO:
      return "Finalização";
    case VehicleStatus.PRONTO:
      return "Pronto";
    case VehicleStatus.ENTREGUE:
      return "Entregue";
    case VehicleStatus.CANCELADO:
      return "Cancelado";
    default:
      return status;
  }
}

function CustomerCard({
  customer,
  branchIdForApi,
  defaultOpen = false,
}: {
  customer: Customer;
  branchIdForApi: string | "consolidated" | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [historico, setHistorico] = useState<VehicleEntry[]>([]);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen, customer.id]);

  const loadHistorico = useCallback(async () => {
    if (!branchIdForApi) return;
    try {
      if (branchIdForApi === "consolidated") {
        const { listBranches } = await import("@/lib/api");
        const bs = await listBranches();
        const rows = (
          await Promise.all(bs.map((b) => listVehicleEntriesForBranch(b.id)))
        ).flat();
        setHistorico(
          rows.filter(
            (e) =>
              e.customerId === customer.id &&
              e.status !== VehicleStatus.CANCELADO &&
              e.status !== VehicleStatus.ENTREGUE,
          ),
        );
      } else {
        const all = await listVehicleEntriesForBranch(branchIdForApi);
        setHistorico(
          all.filter(
            (e) =>
              e.customerId === customer.id &&
              e.status !== VehicleStatus.CANCELADO &&
              e.status !== VehicleStatus.ENTREGUE,
          ),
        );
      }
    } catch {
      setHistorico([]);
    }
  }, [branchIdForApi, customer.id]);

  useEffect(() => {
    if (open && branchIdForApi) {
      void loadHistorico();
    }
  }, [open, branchIdForApi, loadHistorico]);

  async function toggle() {
    setOpen((x) => !x);
  }

  const plateLabel = customer.plate
    ? formatPlateDisplay(customer.plate)
    : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/93 shadow-[0_4px_18px_-4px_rgba(43,95,140,0.07)] backdrop-blur">
      <button
        type="button"
        className="flex min-h-[60px] w-full items-start justify-between gap-4 px-6 py-[18px] text-left hover:bg-black/[0.02]"
        onClick={() => (branchIdForApi ? void toggle() : setOpen(false))}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-tight text-[var(--text-main)]">
            {customer.name}
          </p>
          <p className="mt-[5px] text-[14px] text-[var(--text-muted)]">
            {customer.phone ?? "Sem telefone"}
          </p>
          {plateLabel ? (
            <p className="mt-1 font-mono text-[13px] tracking-wide text-[var(--primary)]">
              {plateLabel}
            </p>
          ) : null}
        </div>
        <span className="text-[23px] text-[color-mix(in_srgb,var(--primary)_92%,transparent)]">
          <span aria-hidden>{open ? "⌄" : "›"}</span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-black/[0.05] px-7 py-8">
          <dl className="mb-6 space-y-3 text-[14px]">
            <DetailRow label="Nome" value={customer.name} />
            <DetailRow label="Telefone" value={customer.phone} />
            <DetailRow label="E-mail" value={customer.email} />
            <DetailRow label="Documento" value={customer.document} />
            <DetailRow label="Placa cadastrada" value={plateLabel} />
          </dl>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Lavagens ativas
          </p>
          {historico.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">
              Nenhuma ordem visível nesta vista.
            </p>
          ) : (
            <div className="space-y-[18px]">
              {historico.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-start justify-between gap-4 pb-[18px] last:pb-0"
                >
                  <div>
                    <p className="font-mono font-semibold text-[var(--text-main)]">
                      {formatPlateDisplay(entry.plate)}
                    </p>
                    <p className="mt-1 inline-block rounded-xl bg-black/[0.05] px-3 py-[3px] text-[12px] font-semibold text-[var(--text-muted)]">
                      {translateVehicleStatus(entry.status)}
                    </p>
                  </div>
                  <Link
                    href={`/ticket/${entry.id}`}
                    prefetch
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-[12px]",
                    )}
                  >
                    Ticket
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--text-main)]">{value}</dd>
    </div>
  );
}
