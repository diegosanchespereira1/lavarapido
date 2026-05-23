"use client";

import { BoardColumn } from "@/components/ops/BoardColumn";
import { BoardQueueSync } from "@/contexts/board-queue-context";
import { useBranchContext } from "@/contexts/branch-context";
import { BOARD_GROUPS, useBoardEntries } from "@/hooks/use-board-entries";
import type { Branch } from "@/lib/types";
import { Building2 } from "lucide-react";

export default function BoardPage() {
  const { branchIdForApi, selection, branches } = useBranchContext();
  const { grouped, queueCount, refresh, initialLoading, error } = useBoardEntries();

  const consolidado = selection === "consolidated";
  const totalsMap = new Map<string, number>();
  for (const [, { items }] of grouped) {
    for (const e of items) {
      totalsMap.set(e.branchId, (totalsMap.get(e.branchId) ?? 0) + 1);
    }
  }

  return (
    <>
      <BoardQueueSync count={queueCount} />
      <div className="w-full pb-[120px]">
        {initialLoading && branchIdForApi ? (
          <div className="mb-6 flex justify-center rounded-2xl border border-black/10 bg-white/85 py-8 text-[14px] text-[var(--text-muted)] backdrop-blur">
            Carregando quadro…
          </div>
        ) : null}
        {error ? (
          <p className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--danger)_48%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-5 py-3 text-[13px] text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {consolidado ? (
          <ConsolidadoTiles branches={branches} totals={totalsMap} />
        ) : null}

        <div
          role="tabpanel"
          className="flex gap-3.5 overflow-x-auto scroll-pb-2 pb-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {BOARD_GROUPS.map((group) => {
            const bundle = grouped.get(group.key) ?? { group, items: [] };
            return (
              <BoardColumn
                key={group.key}
                group={group}
                branchSelection={branchIdForApi}
                refresh={refresh}
                items={bundle.items}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

function ConsolidadoTiles({
  branches,
  totals,
}: {
  branches: Branch[];
  totals: Map<string, number>;
}) {
  if (!branches.length) return null;
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {branches.map((b) => {
        const active = totals.get(b.id) ?? 0;
        return (
          <div
            key={b.id}
            className="flex items-center gap-4 rounded-[18px] border border-[rgba(43,95,140,0.1)] bg-white/92 px-5 py-4 shadow-[0_8px_24px_rgba(43,95,140,0.06)] backdrop-blur-sm"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(91,168,140,0.12)]">
              <Building2 className="size-7 text-[var(--primary)]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{b.name}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {active} nos quadros combinados
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
