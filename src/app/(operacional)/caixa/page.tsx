"use client";

import { CashRegisterSummaryView } from "@/components/ops/CashRegisterSummary";
import { useBranchContext } from "@/contexts/branch-context";
import { getCashRegister } from "@/lib/api";
import type { CashSummary } from "@/lib/types";
import { useEffect, useState } from "react";

export default function CaixaPage() {
  const { branchIdForApi } = useBranchContext();
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      if (!branchIdForApi) {
        setSummary(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const s = await getCashRegister({ branchId: branchIdForApi });
        if (!cancelled) setSummary(s);
      } catch {
        if (!cancelled) setErr("Não foi possível carregar o caixa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void pull();
    const t = window.setInterval(() => void pull(), 9000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [branchIdForApi]);

  return (
    <section className="mx-auto mt-10 w-full max-w-md pb-[120px]">
      <h1 className="mb-4 text-xl font-bold text-[var(--text-main)]">Caixa</h1>
      <CashRegisterSummaryView
        summary={summary}
        loading={loading}
        errorMessage={err}
      />
      <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
        Atualiza automaticamente enquanto a página está visível · parâmetro
        obrigatório da API{" "}
        <code className="font-mono text-[11px]">date</code>.
      </p>
    </section>
  );
}
