"use client";

import {
  listCustomers,
  listVehicleEntriesForBranch,
  listWashTypes,
} from "@/lib/api";
import { connectBoardEventStream } from "@/lib/board-events";
import type { VehicleEntry } from "@/lib/types";
import { VehicleStatus } from "@lava-rapido/shared";
import { useBranchContext } from "@/contexts/branch-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Colunas do quadro (UX de 4 colunas agrupando recebimento + fila). */
export const BOARD_GROUPS: {
  key: "prep" | "wash" | "fin" | "ready";
  title: string;
  statuses: VehicleStatus[];
}[] = [
  {
    key: "prep",
    title: "Preparação",
    statuses: [VehicleStatus.RECEBIDO, VehicleStatus.FILA],
  },
  {
    key: "wash",
    title: "Lavando",
    statuses: [VehicleStatus.LAVANDO],
  },
  {
    key: "fin",
    title: "Finalização",
    statuses: [VehicleStatus.SECANDO],
  },
  {
    key: "ready",
    title: "Pronto",
    statuses: [VehicleStatus.PRONTO],
  },
];

export type KanbanColumnKey = (typeof BOARD_GROUPS)[number]["key"];

export type KanbanBoardGroup = (typeof BOARD_GROUPS)[number];

const HIDDEN_STATUS = new Set<VehicleStatus>([
  VehicleStatus.ENTREGUE,
  VehicleStatus.CANCELADO,
]);

type CatalogCache = {
  washNames: Map<string, string>;
  customers: Map<string, NonNullable<VehicleEntry["customer"]>>;
};

function hydrateEntries(rows: VehicleEntry[], washNames: Map<string, string>) {
  return rows.map((e) => ({
    ...e,
    isPaid: e.isPaid === true,
    paidAt: e.paidAt ?? null,
    paymentMethod: e.paymentMethod ?? null,
    paymentId: e.paymentId ?? null,
    paymentAmountCents: e.paymentAmountCents ?? null,
    washType: e.washType ?? {
      id: e.washTypeId,
      tenantId: e.tenantId,
      name: washNames.get(e.washTypeId) ?? "Serviço",
      description: null,
      priceCents: 0,
      durationMinutes: 30,
    },
  }));
}

async function aggregateEntries(branchIds: string[]) {
  const lists = await Promise.all(
    branchIds.map((id) => listVehicleEntriesForBranch(id)),
  );
  return lists.flat();
}

function branchIdsForStream(
  branchIdForApi: string | "consolidated" | null,
  branches: { id: string }[],
): string[] {
  if (!branchIdForApi) return [];
  if (branchIdForApi === "consolidated") {
    return branches.map((b) => b.id);
  }
  return [branchIdForApi];
}

export function useBoardEntries() {
  const { branchIdForApi, branches } = useBranchContext();
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalogRef = useRef<CatalogCache | null>(null);
  const loadGenRef = useRef(0);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!branchIdForApi) return;
      const silent = opts?.silent === true;
      const gen = ++loadGenRef.current;

      if (!silent) {
        setInitialLoading(true);
      }
      setError(null);

      try {
        if (!catalogRef.current) {
          const [wt, cust] = await Promise.all([
            listWashTypes(),
            listCustomers(),
          ]);
          catalogRef.current = {
            washNames: new Map(wt.map((w) => [w.id, w.name])),
            customers: new Map(cust.map((c) => [c.id, c])),
          };
        }

        const { washNames, customers: cmap } = catalogRef.current;

        let raw: VehicleEntry[] = [];
        if (branchIdForApi === "consolidated") {
          raw = await aggregateEntries(branches.map((b) => b.id));
        } else {
          raw = await listVehicleEntriesForBranch(branchIdForApi);
        }

        if (gen !== loadGenRef.current) return;

        const visible = raw.filter((e) => !HIDDEN_STATUS.has(e.status));
        const hydrated = hydrateEntries(visible, washNames).map((e) => ({
          ...e,
          customer: e.customerId ? cmap.get(e.customerId) ?? null : null,
        }));
        setEntries(hydrated);
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar quadro.");
        if (!silent) setEntries([]);
      } finally {
        if (gen === loadGenRef.current && !silent) {
          setInitialLoading(false);
        }
      }
    },
    [branchIdForApi, branches],
  );

  const silentRefresh = useCallback(() => {
    void load({ silent: true });
  }, [load]);

  useEffect(() => {
    catalogRef.current = null;
    void load();
  }, [load]);

  useEffect(() => {
    const ids = branchIdsForStream(branchIdForApi, branches);
    if (ids.length === 0) return;

    const disconnectors = ids.map((branchId) =>
      connectBoardEventStream(branchId, silentRefresh),
    );

    return () => {
      for (const off of disconnectors) off();
    };
  }, [branchIdForApi, branches, silentRefresh]);

  useEffect(() => {
    function refresh() {
      silentRefresh();
    }
    window.addEventListener("lr-board-refresh", refresh);
    return () => window.removeEventListener("lr-board-refresh", refresh);
  }, [silentRefresh]);

  const grouped = useMemo(() => {
    const m = new Map<
      string,
      { group: (typeof BOARD_GROUPS)[number]; items: VehicleEntry[] }
    >();
    for (const g of BOARD_GROUPS) {
      m.set(g.key, { group: g, items: [] });
    }
    for (const entry of entries) {
      const g =
        BOARD_GROUPS.find((grp) =>
          grp.statuses.includes(entry.status as VehicleStatus),
        ) ?? null;
      if (!g) continue;
      const cell = m.get(g.key)!;
      cell.items.push(entry);
    }
    return m;
  }, [entries]);

  const queueCount = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.status !== VehicleStatus.PRONTO &&
          e.status !== VehicleStatus.ENTREGUE &&
          e.status !== VehicleStatus.CANCELADO,
      ).length,
    [entries],
  );

  const statsByBranch = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.branchId, (totals.get(e.branchId) ?? 0) + 1);
    }
    return totals;
  }, [entries]);

  return {
    entries,
    grouped,
    queueCount,
    statsByBranch,
    initialLoading,
    error,
    refresh: silentRefresh,
  };
}
