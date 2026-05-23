"use client";

import { DEV_AUTH_STORAGE_KEY } from "@/lib/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ROLE_KEY = "DEV_ROLE";

export type DevRole = "admin" | "operator";

type AuthState = {
  token: string | null;
  role: DevRole;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (token: string, role?: DevRole) => void;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const COOKIE_NAME = "lr_dev_auth";

function persistAuth(token: string, role: DevRole) {
  if (typeof document === "undefined") return;
  localStorage.setItem(DEV_AUTH_STORAGE_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuth() {
  if (typeof document === "undefined") return;
  localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
  localStorage.removeItem(ROLE_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

function readStoredRole(): DevRole {
  if (typeof window === "undefined") return "operator";
  const r = localStorage.getItem(ROLE_KEY);
  return r === "admin" ? "admin" : "operator";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<DevRole>("operator");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    setToken(t);
    setRole(readStoredRole());
    setReady(true);
  }, []);

  /** Recuperação: token em localStorage (DEV_AUTH) sem cookie faz o middleware barrar SSR/navegação. */
  useEffect(() => {
    if (!ready || typeof document === "undefined") return;
    const t = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!t) return;
    const cookiePair = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    const hasCookie = Boolean(cookiePair?.split("=").slice(1).join("=")?.length);
    if (!hasCookie) {
      persistAuth(t, readStoredRole());
    }
  }, [ready]);

  const login = useCallback((nextToken: string, nextRole: DevRole = "admin") => {
    persistAuth(nextToken, nextRole);
    setToken(nextToken);
    setRole(nextRole);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setRole("operator");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      ready,
      login,
      logout,
      isAdmin: role === "admin",
    }),
    [token, role, ready, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
