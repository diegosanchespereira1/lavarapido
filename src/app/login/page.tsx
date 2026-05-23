"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Droplets } from "lucide-react";

export default function LoginPage() {
  const { login, ready, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && typeof document !== "undefined") {
      const c = document.cookie.split("; ").find((r) => r.startsWith("lr_dev_auth="));
      const hasCookie = Boolean(c?.split("=")[1]?.length);
      if (token || hasCookie) router.replace("/board");
    }
  }, [ready, token, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--app-gradient)] px-6 py-14">
      <div className="w-full max-w-md rounded-[28px] border border-white/[0.5] bg-white/90 p-12 text-center shadow-[0_32px_64px_-12px_rgba(26,61,92,0.28)] backdrop-blur-2xl">
        <span className="mx-auto mb-8 flex size-20 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,var(--primary-dark),var(--primary))] text-white shadow-[0_20px_40px_-10px_color-mix(in_srgb,var(--primary)_72%,transparent)]">
          <Droplets className="size-10" aria-hidden strokeWidth={1.85} />
        </span>
        <h1 className="font-heading text-[1.625rem] font-bold tracking-tight text-[var(--text-main)]">
          Lava Rápido
        </h1>
        <p className="mb-14 mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
          Demonstração rápida sem Keycloak — escolha o perfil compatível com o modo Dev da sua API local.
        </p>
        <div className="flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          className="flex h-auto min-h-14 w-full flex-col gap-2 rounded-2xl border border-white/35 bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] px-10 py-5 text-[17px] font-bold text-[var(--primary-foreground)] shadow-[0_12px_32px_-4px_color-mix(in_srgb,var(--primary)_74%,transparent)] hover:opacity-[0.97]"
          onClick={() => {
              login("dev-admin", "admin");
              router.replace("/board");
              router.refresh();
            }}
          >
            Entrar como Admin Demo
            <small className="text-[13px] font-medium opacity-[0.90] normal-case opacity-95">
              Token Bearer <code className="font-mono tracking-tight text-[12px]">dev-admin</code>
            </small>
          </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="flex h-auto min-h-14 w-full flex-col gap-3 rounded-2xl border border-black/[0.05] px-12 py-[18px] text-[17px] font-semibold shadow-sm"
            onClick={() => {
              login("dev-operator", "operator");
              router.replace("/board");
              router.refresh();
            }}
          >
            Entrar como Operador Demo
            <small className="text-[13px] font-medium text-[var(--text-muted)]">
              Bearer <span className="font-mono">dev-operator</span>
            </small>
          </Button>
        </div>
      </div>
      <footer className="mt-14 max-w-xl text-center text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
        modo dev apenas · API em localhost:3011 · Web :3012
      </footer>
    </div>
  );
}
