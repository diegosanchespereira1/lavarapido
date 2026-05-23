"use client";

import type { CashSummary } from "@/lib/types";
import { paymentMethodLabel } from "@lava-rapido/shared";
import type { PaymentMethod } from "@lava-rapido/shared";
import { Banknote } from "lucide-react";

function methodLabel(method: string): string {
  if (
    method === "dinheiro" ||
    method === "pix" ||
    method === "cartao_debito" ||
    method === "cartao_credito"
  ) {
    return paymentMethodLabel(method as PaymentMethod);
  }
  return method;
}

export function CashRegisterSummaryView({
  summary,
  loading,
  errorMessage,
}: {
  summary: CashSummary | null;
  loading?: boolean;
  errorMessage?: string | null;
}) {
  const totalFmt =
    summary != null
      ? (summary.totalCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "—";

  return (
    <div className="rounded-3xl border border-black/10 bg-white/90 px-8 py-9 shadow-[0_16px_48px_rgba(43,95,140,0.1)] backdrop-blur-md">
      <div className="mb-10 flex justify-center">
        <div className="flex size-24 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,var(--accent)_0%,#3d8a72_100%)] text-white shadow-lg">
          <Banknote className="size-12" strokeWidth={2} aria-hidden />
        </div>
      </div>

      <h2 className="mb-12 text-center text-lg font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Resumo do caixa
      </h2>

      <p className="text-center font-mono text-5xl font-medium tracking-[0.04em] text-[var(--text-main)] md:text-[3.75rem]">
        {loading ? (
          <span className="animate-pulse text-[var(--text-muted)]">…</span>
        ) : (
          totalFmt
        )}
      </p>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        Data de referência: {summary?.date ?? "—"}
      </p>

      {summary?.consolidated ? (
        <p className="mt-6 text-center text-sm font-medium text-[var(--accent)]">
          Visão consolidada — todas as filiais autorizadas.
        </p>
      ) : null}

      {!summary?.consolidated &&
      summary?.porMetodo &&
      summary.porMetodo.length ? (
        <ul className="mt-14 space-y-4">
          {summary.porMetodo.map((row) => (
            <li
              key={row.method}
              className="flex justify-between rounded-2xl border border-black/[0.06] bg-[var(--sheet-bg-muted)] px-5 py-4 text-sm font-medium text-[var(--text-muted)]"
            >
              {methodLabel(row.method)}
              <span className="text-[var(--text-main)]">
                {(row.totalCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                  ({row.count} pag.)
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary?.consolidated && summary.linhasPorFilial?.length ? (
        <ul className="mt-14 space-y-4">
          {summary.linhasPorFilial.map((ln) => (
            <li
              key={ln.branchId}
              className="flex justify-between rounded-2xl border border-black/[0.06] bg-[var(--sheet-bg-muted)] px-5 py-4 text-sm"
            >
              <span className="font-semibold">{ln.branchName ?? ln.branchId}</span>
              <span className="font-medium text-[var(--text-main)]">
                {(ln.totalCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {errorMessage ? (
        <p className="mt-8 text-center text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
