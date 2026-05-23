"use client";

import type { PaymentMethod } from "@lava-rapido/shared";
import { PAYMENT_METHODS, paymentMethodLabel } from "@lava-rapido/shared";
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

const ICONS: Record<PaymentMethod, ComponentType<{ className?: string }>> = {
  dinheiro: Banknote,
  pix: Smartphone,
  cartao_debito: Wallet,
  cartao_credito: CreditCard,
};

type Props = {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
};

export function PaymentMethodPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {PAYMENT_METHODS.map((method) => {
        const Icon = ICONS[method];
        const selected = value === method;
        return (
          <button
            key={method}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-semibold transition",
              selected
                ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,white)] text-[var(--primary)] shadow-[0_4px_12px_rgba(43,95,140,0.12)]"
                : "border-black/10 bg-white text-[var(--text-main)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {paymentMethodLabel(method)}
          </button>
        );
      })}
    </div>
  );
}
