"use client";

import type { VehicleEntry } from "@/lib/types";
import type { KanbanBoardGroup, KanbanColumnKey } from "@/hooks/use-board-entries";
import { VehicleEntryCard } from "@/components/ops/VehicleEntryCard";
import { cn } from "@/lib/utils";

const COL_SURFACE: Partial<Record<KanbanColumnKey, string>> = {
  prep: "border-[rgba(43,95,140,0.08)] bg-[rgba(43,95,140,0.06)]",
  wash: "border-[rgba(74,144,194,0.12)] bg-[rgba(74,144,194,0.07)]",
  fin: "border-[rgba(123,107,168,0.1)] bg-[rgba(123,107,168,0.06)]",
  ready: "border-[rgba(91,168,140,0.1)] bg-[rgba(91,168,140,0.08)]",
};

type Props = {
  group: KanbanBoardGroup;
  items: VehicleEntry[];
  branchSelection: string | "consolidated" | null;
  refresh: () => void;
};

export function BoardColumn({ group, items, branchSelection, refresh }: Props) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-[260px] snap-start flex-col rounded-2xl border p-3",
        COL_SURFACE[group.key]
      )}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[14px] font-bold tracking-tight text-[var(--text-main)]">
          {group.title}
        </h2>
        <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-[var(--text-main)] shadow-[0_2px_8px_rgba(43,95,140,0.08)] backdrop-blur-sm">
          {items.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pb-1">
        {items.map((entry) => (
          <VehicleEntryCard
            key={entry.id}
            entry={entry}
            groupKey={group.key}
            branchSelection={branchSelection}
            onAfterChange={refresh}
          />
        ))}
      </div>
    </section>
  );
}
