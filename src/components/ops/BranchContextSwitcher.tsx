"use client";

import type { Branch } from "@/lib/types";
import { useBranchContext } from "@/contexts/branch-context";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function BranchContextSwitcher({
  className,
}: {
  className?: string;
}) {
  const { branches, selection, selectBranch, canConsolidated, loading } =
    useBranchContext();
  const [open, setOpen] = useState(false);

  const label = loading
    ? "Carregando…"
    : selection === "consolidated"
      ? "Visão consolidada"
      : selection
        ? selection.name
        : "Filial";

  function pick(sel: Branch | "consolidated") {
    selectBranch(sel);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex max-w-[min(100%,240px)] min-w-[10rem] items-center gap-2 rounded-full border border-white/22 bg-white/[0.18] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm backdrop-blur-md",
          "transition hover:bg-white/25"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <Building2 className="size-4 shrink-0 opacity-95" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 opacity-85 motion-safe:transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu de filiais"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-64 min-w-[220px] overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-2 shadow-xl backdrop-blur-xl"
          >
            {canConsolidated ? (
              <li>
                <button
                  type="button"
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-black/5",
                    selection === "consolidated" &&
                      "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] font-semibold text-[var(--primary)]"
                  )}
                  onClick={() => pick("consolidated")}
                >
                  Visão consolidada
                </button>
              </li>
            ) : null}
            {branches.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-black/5",
                    selection !== "consolidated" &&
                      (selection as Branch)?.id === b.id &&
                      "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] font-semibold text-[var(--primary)]"
                  )}
                  onClick={() => pick(b)}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
