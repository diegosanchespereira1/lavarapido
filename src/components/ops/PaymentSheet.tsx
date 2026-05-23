"use client";

import { registerPayment } from "@/lib/api";
import type { VehicleEntry } from "@/lib/types";
import type { PaymentMethod } from "@lava-rapido/shared";
import { paymentMethodLabel } from "@lava-rapido/shared";
import { formatPlateDisplay } from "@/lib/plate";
import { PaymentMethodPicker } from "@/components/ops/PaymentMethodPicker";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  entry: VehicleEntry;
  branchId: string;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
};

export function PaymentSheet({
  open,
  entry,
  branchId,
  onOpenChange,
  onPaid,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const amountCents =
    entry.paymentAmountCents ?? entry.washType?.priceCents ?? 0;
  const amountFmt = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  async function confirm() {
    if (!method) {
      setErr("Escolha a forma de pagamento.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await registerPayment({
        branchId,
        vehicleEntryId: entry.id,
        method,
        amountCents: amountCents || undefined,
      });
      setMethod(null);
      onOpenChange(false);
      onPaid();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="fixed inset-0 z-[80] bg-[rgba(26,61,92,0.55)] backdrop-blur-sm"
        onClick={() => !submitting && onOpenChange(false)}
      />
      <div className="fixed inset-x-4 bottom-[max(112px,calc(env(safe-area-inset-bottom)+112px))] z-[90] mx-auto w-[calc(100%-2rem)] max-w-[440px] rounded-[24px] border border-black/10 bg-[var(--sheet-bg)] px-6 py-8 shadow-[0_-8px_40px_rgba(43,95,140,0.15)]">
        <header className="relative mb-6 flex items-center">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              Registrar pagamento
            </h2>
            <p className="mt-1 font-mono text-sm tracking-wider text-[var(--text-muted)]">
              {formatPlateDisplay(entry.plate)}
            </p>
          </div>
          <button
            type="button"
            className="absolute right-0 inline-flex size-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-black/[0.05]"
            onClick={() => !submitting && onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        <p className="mb-1 text-center text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Valor
        </p>
        <p className="mb-6 text-center font-mono text-3xl font-medium text-[var(--text-main)]">
          {amountFmt}
        </p>

        <p className="mb-3 text-sm font-medium text-[var(--text-main)]">
          Forma de pagamento
        </p>
        <PaymentMethodPicker
          value={method}
          onChange={(m) => {
            setMethod(m);
            setErr(null);
          }}
          disabled={submitting}
        />

        {method ? (
          <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
            {paymentMethodLabel(method)} selecionado
          </p>
        ) : null}

        {err ? (
          <p className="mt-4 text-center text-sm text-[var(--danger)]">{err}</p>
        ) : null}

        <Button
          type="button"
          className="mt-6 w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] py-4 text-[15px] font-bold text-white"
          disabled={submitting || !method}
          onClick={() => void confirm()}
        >
          {submitting ? "Registrando…" : "Confirmar pagamento"}
        </Button>
      </div>
    </>
  );
}
