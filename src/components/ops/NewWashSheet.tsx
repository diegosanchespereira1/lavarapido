"use client";

import {
  createCustomer,
  createVehicleEntryForBranch,
  listCustomers,
  listWashTypes,
} from "@/lib/api";
import { useBranchContext } from "@/contexts/branch-context";
import { useAuth } from "@/contexts/auth-context";
import type { Branch } from "@/lib/types";
import type { Customer, WashType } from "@/lib/types";
import {
  formatPlateInput,
  normalizePlateInput,
  validateBrazilianPlate,
} from "@lava-rapido/shared";
import { PaymentMethodPicker } from "@/components/ops/PaymentMethodPicker";
import { PlateConfirmScreen } from "@/components/ops/PlateConfirmScreen";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@lava-rapido/shared";
import { paymentMethodLabel } from "@lava-rapido/shared";
import { ArrowLeft, CirclePlus, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Step = "plate" | "confirm" | "type" | "customer" | "payment";

function resolveOperatingBranch(selection: Branch | "consolidated" | null) {
  if (!selection || selection === "consolidated") return null;
  return selection;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

export function NewWashSheet({ open, onOpenChange, onCreated }: Props) {
  const { selection, branches } = useBranchContext();
  const { isAdmin } = useAuth();

  const [step, setStep] = useState<Step>("plate");
  const [plateRaw, setPlateRaw] = useState("");
  const [plateNormalized, setPlateNormalized] = useState("");
  const [types, setTypes] = useState<WashType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [washTypeId, setWashTypeId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const branch = resolveOperatingBranch(selection);

  const reset = useCallback(() => {
    setStep("plate");
    setPlateRaw("");
    setPlateNormalized("");
    setWashTypeId(null);
    setCustomerId(null);
    setNewName("");
    setNewPhone("");
    setPayNow(false);
    setPaymentMethod(null);
    setLoadErr(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [wt, cust] = await Promise.all([
          listWashTypes(),
          listCustomers(),
        ]);
        if (cancelled) return;
        setTypes(wt);
        setCustomers(cust);
      } catch {
        if (!cancelled) setLoadErr("Falha ao carregar dados de apoio.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  if (!open) return null;

  function validatePlateProceed() {
    const v = validateBrazilianPlate(plateRaw);
    const n = v.normalized ?? normalizePlateInput(plateRaw);
    setPlateNormalized(n);
    if (!v.ok) {
      setLoadErr(v.reason ?? "Placa inválida.");
      return;
    }
    setLoadErr(null);
    setStep("confirm");
  }

  async function finalize() {
    const opBranch =
      branch ?? (selection === "consolidated" ? branches[0] : null);
    if (!washTypeId || !opBranch) return;
    setSubmitting(true);
    try {
      let cid = customerId;
      if (!cid && newName.trim()) {
        if (!isAdmin) {
          setLoadErr("Operadores precisam escolher um cliente existente.");
          setSubmitting(false);
          return;
        }
        const c = await createCustomer({
          name: newName.trim(),
          phone: newPhone.trim() || null,
        });
        cid = c.id;
        setCustomerId(cid);
      }
      await createVehicleEntryForBranch(opBranch.id, {
        plate: plateNormalized,
        wash_type_id: washTypeId,
        customer_id: cid ?? null,
        payment:
          payNow && paymentMethod
            ? {
                method: paymentMethod,
                amount_cents: selectedWashType?.priceCents,
              }
            : undefined,
      });
      onOpenChange(false);
      onCreated();
      reset();
    } catch {
      setLoadErr("Não foi possível registrar esta lavagem.");
    } finally {
      setSubmitting(false);
    }
  }

  const showBack =
    selection !== "consolidated" &&
    (step === "confirm" ||
      step === "type" ||
      step === "customer" ||
      step === "payment");

  const selectedWashType = washTypeId
    ? types.find((t) => t.id === washTypeId) ?? null
    : null;

  let body: ReactNode;

  if (selection === "consolidated") {
    body = (
      <p className="text-center text-sm text-[var(--text-muted)]">
        Escolha uma filial no seletor do topo antes de iniciar uma lavagem física —
        modo consolidado mostra apenas o quadro.
      </p>
    );
  } else if (!branch && branches.length === 0) {
    body = (
      <p className="text-center text-sm text-[var(--text-muted)]">
        Cadastre pelo menos uma filial para iniciar operações.
      </p>
    );
  } else if (step === "plate") {
    body = (
      <div className="space-y-4">
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Placa
        </label>
        <input
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          value={plateRaw}
          placeholder="ABC1D23 ou ABC1234"
          maxLength={8}
          inputMode="text"
          onChange={(e) => {
            setPlateRaw(formatPlateInput(e.target.value));
            setLoadErr(null);
          }}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-4 font-mono text-2xl tracking-[0.12em]"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Mercosul (ABC1D23) ou antiga — 3 letras + 4 números (ABC1234)
        </p>
        {loadErr ? (
          <p className="text-sm text-[var(--danger)]">{loadErr}</p>
        ) : null}
      </div>
    );
  } else if (step === "confirm") {
    body = (
      <PlateConfirmScreen
        plateNormalized={plateNormalized}
        onConfirm={() => {
          setStep("type");
          setLoadErr(null);
        }}
        onCorrect={() => setStep("plate")}
      />
    );
  } else if (step === "type") {
    body = (
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {types.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Cadastre tipos primeiro em Configurações.
          </p>
        ) : (
          types.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left shadow-sm transition",
                washTypeId === t.id
                  ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                  : "border-black/10 bg-white"
              )}
              onClick={() => setWashTypeId(t.id)}
            >
              <span className="font-semibold">{t.name}</span>
              <span className="font-mono text-sm text-[var(--text-muted)]">
                {(t.priceCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </button>
          ))
        )}
        <Button
          type="button"
          className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] py-3 text-white shadow-lg"
          disabled={!washTypeId}
          onClick={() => {
            setLoadErr(null);
            setStep("customer");
          }}
        >
          Continuar
        </Button>
      </div>
    );
  } else if (step === "payment") {
    const priceFmt = selectedWashType
      ? (selectedWashType.priceCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "—";

    body = (
      <div className="space-y-5">
        <p className="text-sm font-medium text-[var(--text-main)]">Pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-semibold transition",
              payNow
                ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,white)] text-[var(--primary)]"
                : "border-black/10 bg-white text-[var(--text-muted)]",
            )}
            onClick={() => {
              setPayNow(true);
              setLoadErr(null);
            }}
          >
            Pagar agora
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-semibold transition",
              !payNow
                ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,white)] text-[var(--primary)]"
                : "border-black/10 bg-white text-[var(--text-muted)]",
            )}
            onClick={() => {
              setPayNow(false);
              setPaymentMethod(null);
              setLoadErr(null);
            }}
          >
            Pagar na entrega
          </button>
        </div>

        {payNow ? (
          <>
            <p className="text-center font-mono text-2xl font-medium text-[var(--text-main)]">
              {priceFmt}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Escolha a forma de pagamento:
            </p>
            <PaymentMethodPicker
              value={paymentMethod}
              onChange={(m) => {
                setPaymentMethod(m);
                setLoadErr(null);
              }}
              disabled={submitting}
            />
            {paymentMethod ? (
              <p className="text-center text-xs text-[var(--accent)]">
                {paymentMethodLabel(paymentMethod)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl bg-[var(--sheet-bg-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            O pagamento ficará pendente. Use o botão <strong>Pagar</strong> no
            card do veículo quando receber.
          </p>
        )}

        {loadErr ? (
          <p className="text-sm text-[var(--danger)]">{loadErr}</p>
        ) : null}

        <Button
          type="button"
          className="w-full rounded-xl py-4 text-[16px]"
          disabled={
            submitting ||
            !washTypeId ||
            (payNow && !paymentMethod)
          }
          onClick={() => void finalize()}
        >
          {submitting ? "Registrando…" : "Abrir lavagem"}
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <p className="text-sm font-medium text-[var(--text-main)]">
          Cliente (opcional)
        </p>
        <select
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
          value={customerId ?? ""}
          onChange={(e) => setCustomerId(e.target.value || null)}
        >
          <option value="">Sem vínculo</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` — ${c.phone}` : ""}
            </option>
          ))}
        </select>
        {isAdmin ? (
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              novo cliente (somente demo admin)
            </p>
            <input
              placeholder="Nome completo"
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              placeholder="Telefone"
              inputMode="tel"
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </>
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">
            Operadores usam apenas a lista acima —
            novos cadastros exigem administrador nesta demo.
          </p>
        )}
        {loadErr ? (
          <p className="text-sm text-[var(--danger)]">{loadErr}</p>
        ) : null}
        <Button
          type="button"
          className="w-full rounded-xl py-4 text-[16px]"
          disabled={submitting || !washTypeId}
          onClick={() => {
            setLoadErr(null);
            setStep("payment");
          }}
        >
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="fixed inset-0 z-[60] bg-[rgba(26,61,92,0.55)] backdrop-blur-sm"
        onClick={() => !submitting && onOpenChange(false)}
      />
      <div className="fixed inset-x-4 bottom-[max(112px,calc(env(safe-area-inset-bottom)+112px))] z-[70] mx-auto flex max-h-[85vh] w-[calc(100%-2rem)] max-w-[440px] flex-col overflow-hidden rounded-[24px] border border-black/10 bg-[var(--sheet-bg)] px-6 py-8 shadow-[0_-8px_40px_rgba(43,95,140,0.15)] md:inset-auto md:start-1/2 md:top-[15%] md:-translate-x-1/2">
        <header className="relative mb-6 flex items-center gap-4">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Voltar"
              onClick={() => {
                if (step === "confirm") setStep("plate");
                else if (step === "type") setStep("confirm");
                else if (step === "customer") setStep("type");
                else setStep("customer");
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <div className="size-9" />
          )}
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <CirclePlus className="size-4 text-[var(--primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                Nova lavagem
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-black/[0.05]"
            onClick={() => !submitting && onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{body}</div>
        {step === "plate" && selection !== "consolidated" && branch ? (
          <Button
            type="button"
            className="mt-8 w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] py-4 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(43,95,140,0.35)]"
            onClick={() => validatePlateProceed()}
          >
            Próximo
          </Button>
        ) : null}
      </div>
    </>
  );
}
