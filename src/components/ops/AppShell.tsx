"use client";

import { BranchContextSwitcher } from "@/components/ops/BranchContextSwitcher";
import { NewWashSheet } from "@/components/ops/NewWashSheet";
import { useAuth } from "@/contexts/auth-context";
import { useBoardQueue } from "@/contexts/board-queue-context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Landmark, LayoutGrid, LogOut, MoreHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, token, role, isAdmin } = useAuth();
  const { queueCount } = useBoardQueue();
  const [washOpen, setWashOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/board" || typeof window === "undefined") return;
    if (sessionStorage.getItem("lr_open_wash") === "1") {
      sessionStorage.removeItem("lr_open_wash");
      setWashOpen(true);
    }
  }, [pathname]);

  const initials = role === "admin" ? "AD" : "OP";

  function navigateWash() {
    if (pathname === "/board") {
      setWashOpen(true);
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lr_open_wash", "1");
    }
    router.push("/board");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--app-gradient)] pb-28 text-[var(--text-main)]">
      <header className="relative z-20 shrink-0 bg-[linear-gradient(135deg,var(--primary-dark)_0%,var(--primary)_100%)] px-4 pb-5 pt-[max(env(safe-area-inset-top),12px)] shadow-[0_12px_32px_-8px_rgba(26,61,92,0.35)] backdrop-blur-sm max-md:rounded-b-[26px]">
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.15] text-xl text-white">
            💧
          </div>
          {pathname === "/board" ? (
            <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-white/95">
              <span
                className="size-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_95%,transparent)] motion-safe:animate-[pulse-soft_2.2s_ease-in-out_infinite]"
                aria-hidden
              />
              {queueCount} na fila
            </span>
          ) : (
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/88">
              {token ? `${isAdmin ? "Admin demo" : "Operador demo"}` : ""}
            </span>
          )}
          <div
            className="flex size-[34px] shrink-0 cursor-default items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#3d8a72_100%)] text-[10px] font-bold uppercase text-white ring-2 ring-white/30"
            title={isAdmin ? "Administrador" : "Operador"}
          >
            {initials}
          </div>
        </div>
        <div className="mt-5 flex justify-center pb-2">
          <BranchContextSwitcher className="[&>button]:max-w-none" />
        </div>
      </header>

      <main className="relative flex min-h-[40vh] flex-1 overflow-x-hidden px-3 pt-3 sm:px-4 md:mx-auto md:max-w-6xl">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(43,95,140,0.08)] bg-[var(--glass-bottom)] backdrop-blur-2xl">
        <div className="mx-auto grid max-w-6xl grid-cols-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
          <BottomLink
            href="/board"
            active={pathname === "/board"}
            icon={<LayoutGrid className="size-[18px]" aria-hidden />}
            label="Quadro"
          />
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]"
            onClick={() => navigateWash()}
          >
            <span
              className={cn(
                "rounded-xl px-4 py-2 text-[18px]",
                washOpen &&
                  pathname === "/board" &&
                  "bg-[rgba(91,168,140,0.14)] text-[var(--primary)]",
                pathname === "/board"
                  ? "text-[var(--primary)] motion-safe:border motion-safe:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                  : ""
              )}
              aria-hidden
            >
              ＋
            </span>
            Lavagem
          </button>
          <BottomLink
            href="/caixa"
            active={pathname === "/caixa"}
            icon={<Landmark className="size-[18px]" aria-hidden />}
            label="Caixa"
          />
          <div className="relative flex justify-center">
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]",
                menuOpen && "text-[var(--primary)]"
              )}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen((m) => !m)}
            >
              <span
                className={cn(
                  "flex items-center px-5 py-2",
                  menuOpen &&
                    "rounded-xl bg-[rgba(91,168,140,0.14)] text-[var(--primary)]"
                )}
              >
                <MoreHorizontal className="size-5" aria-hidden />
              </span>
              Mais
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[39] bg-black/20 backdrop-blur-[2px]"
                  aria-label="Fechar"
                  onClick={() => setMenuOpen(false)}
                />
                <ul className="absolute bottom-[calc(100%+8px)] right-[-8px] z-[45] max-h-[min(70vh,420px)] w-[min(calc(100vw-48px),220px)] overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-3 text-[13px] shadow-2xl">
                  <BottomMenuLink
                    href="/clientes"
                    onPick={() => setMenuOpen(false)}
                  >
                    Clientes
                  </BottomMenuLink>
                  <BottomMenuLink
                    href="/config/filiais"
                    onPick={() => setMenuOpen(false)}
                  >
                    Filiais
                  </BottomMenuLink>
                  <BottomMenuLink
                    href="/config/tipos"
                    onPick={() => setMenuOpen(false)}
                  >
                    Tipos de lavagem
                  </BottomMenuLink>
                  <BottomMenuDivider />
                  <BottomMenuLogout
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      router.push("/login");
                    }}
                  />
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      <NewWashSheet
        open={washOpen}
        onOpenChange={(v) => {
          setWashOpen(v);
          if (v === false && typeof window !== "undefined") {
            sessionStorage.removeItem("lr_open_wash");
          }
        }}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("lr-board-refresh"));
          setWashOpen(false);
        }}
      />
    </div>
  );
}

function BottomMenuLink({
  href,
  children,
  onPick,
}: {
  href: string;
  children: React.ReactNode;
  onPick: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className="flex min-h-[48px] items-center px-5 py-3 font-semibold hover:bg-black/[0.04]"
        onClick={onPick}
      >
        {children}
      </Link>
    </li>
  );
}

function BottomMenuLogout({ onClick }: { onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left font-semibold text-[var(--danger)] hover:bg-black/[0.05]"
        onClick={onClick}
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        Sair
      </button>
    </li>
  );
}

function BottomMenuDivider() {
  return <hr className="my-1 border-black/[0.06]" />;
}

function BottomLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex flex-col items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)]",
        active && "text-[var(--primary)]"
      )}
    >
      <span
        className={cn(
          "flex items-center px-6 py-2",
          active && "rounded-xl bg-[rgba(91,168,140,0.14)] text-[var(--primary)]"
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
