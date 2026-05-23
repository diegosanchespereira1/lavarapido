"use client";

import { listBranches } from "@/lib/api";
import type { Branch } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "lr_branch_context";

export type BranchSelection = Branch | "consolidated";

type BranchContextValue = {
  branches: Branch[];
  selection: BranchSelection | null;
  branchIdForApi: string | "consolidated" | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectBranch: (b: BranchSelection) => void;
  canConsolidated: boolean;
};

const BranchContext = createContext<BranchContextValue | null>(null);

function pickInitialSelection(
  branches: Branch[],
  isAdmin: boolean
): BranchSelection | null {
  if (!branches.length) return null;
  if (typeof window === "undefined") return branches[0] ?? null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "consolidated" && isAdmin) return "consolidated";
  if (raw && branches.some((b) => b.id === raw)) {
    return branches.find((b) => b.id === raw) ?? branches[0] ?? null;
  }
  return branches[0] ?? null;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, isAdmin, token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selection, setSelection] = useState<BranchSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listBranches();
      setBranches(list);
      let next = pickInitialSelection(list, isAdmin);
      if (!isAdmin && next === "consolidated") {
        next = list[0] ?? null;
      }
      setSelection(next);
      if (typeof window !== "undefined" && next && next !== "consolidated") {
        localStorage.setItem(STORAGE_KEY, next.id);
      }
      if (typeof window !== "undefined" && next === "consolidated") {
        localStorage.setItem(STORAGE_KEY, "consolidated");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar filiais.");
      setBranches([]);
      setSelection(null);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      setBranches([]);
      setSelection(null);
      setLoading(false);
      setError(null);
      return;
    }
    void refresh();
  }, [authReady, token, refresh]);

  const selectBranch = useCallback((b: BranchSelection) => {
    if (b === "consolidated") {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "consolidated");
      }
      setSelection("consolidated");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, b.id);
    }
    setSelection(b);
  }, []);

  useEffect(() => {
    if (!authReady || isAdmin) return;
    if (selection === "consolidated") {
      const first = branches[0];
      if (first) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, first.id);
        }
        setSelection(first);
      }
    }
  }, [authReady, isAdmin, selection, branches]);

  const branchIdForApi: string | "consolidated" | null =
    selection === null
      ? null
      : selection === "consolidated"
        ? "consolidated"
        : selection.id;

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      selection,
      branchIdForApi,
      loading,
      error,
      refresh,
      selectBranch,
      canConsolidated: isAdmin && branches.length > 0,
    }),
    [branches, selection, branchIdForApi, loading, error, refresh, selectBranch, isAdmin]
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranchContext() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranchContext requer BranchProvider.");
  return ctx;
}
