"use client";

import {
  getVehicleEntry,
  listBranches,
  listWashTypes,
} from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { useBranchContext } from "@/contexts/branch-context";
import type { VehicleEntry } from "@/lib/types";
import { VehicleStatus } from "@lava-rapido/shared";
import { paymentMethodLabel } from "@lava-rapido/shared";
import { formatPlateDisplay } from "@/lib/plate";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function statusPt(s: VehicleStatus): string {
  switch (s) {
    case VehicleStatus.RECEBIDO:
      return "Recebido";
    case VehicleStatus.FILA:
      return "Na fila interna";
    case VehicleStatus.LAVANDO:
      return "Lavagem em andamento";
    case VehicleStatus.SECANDO:
      return "Secagem / finalização";
    case VehicleStatus.PRONTO:
      return "Pronto para retirada";
    case VehicleStatus.ENTREGUE:
      return "Entregue ao cliente";
    case VehicleStatus.CANCELADO:
      return "Ordem cancelada";
    default:
      return String(s);
  }
}

async function tryLoadAcrossBranches(uid: string) {
  const bs = await listBranches();
  for (const b of bs) {
    try {
      return await getVehicleEntry(uid, b.id);
    } catch {
      continue;
    }
  }
  throw new Error();
}

export default function TicketPage() {
  const params = useParams<{ id?: string | string[] }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { branchIdForApi } = useBranchContext();
  const [entry, setEntry] = useState<VehicleEntry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [washTitles, setWashTitles] = useState<Map<string, string> | null>(
    null,
  );

  useEffect(() => {
    void listWashTypes().then((w) =>
      setWashTitles(new Map(w.map((x) => [x.id, x.name]))),
    );
  }, []);

  useEffect(() => {
    if (!id) return;
    setErr(null);
    const hdr =
      branchIdForApi === "consolidated" ? null : branchIdForApi;
    void getVehicleEntry(id, hdr)
      .then(setEntry)
      .catch(() =>
        tryLoadAcrossBranches(id)
          .then(setEntry)
          .catch(() => setErr("Registro não encontrado.")),
      );
  }, [branchIdForApi, id]);

  const plateLabel = entry ? formatPlateDisplay(entry.plate) : "—";
  const svcName =
    entry && washTitles
      ? washTitles.get(entry.washTypeId) ?? `#${entry.washTypeId.slice(0, 8)}`
      : "…";

  return (
    <div className="min-h-[100dvh] px-8 pb-16 pt-12 print:bg-white print:p-12 md:mx-auto md:max-w-xl">
      <div className="mb-10 print:hidden md:mb-14">
        <Link
          href="/board"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-full"
          )}
        >
          Voltar ao quadro
        </Link>
      </div>
      {err ? <p className="text-[15px] text-[var(--danger)]">{err}</p> : null}
      {entry ? (
        <article className="rounded-3xl border border-black/[0.08] bg-white px-8 py-12 text-center shadow-[0_26px_64px_-26px_rgba(43,95,140,0.38)] print:shadow-none">
          <header className="mb-12 md:mb-14">
            <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Lava Rápido
            </p>
            <h1 className="mt-5 font-heading text-[1.825rem] font-bold leading-tight tracking-tighter text-[var(--text-main)]">
              Comprovante de serviço
            </h1>
          </header>
          <p className="mb-8 text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] md:mb-11">
            Placa
          </p>
          <div className="mb-12 inline-flex flex-col rounded-[21px] border-[2px] border-[var(--primary)] bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_85%)] px-10 py-[22px] font-mono font-medium text-[clamp(36px,_9vw,_48px)] leading-none tracking-[0.06em] text-[var(--text-main)] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_18px_40px_-8px_color-mix(in_srgb,var(--primary)_74%,transparent)] md:mb-16 md:px-16 md:py-[26px]">
            {plateLabel}
          </div>
          <dl className="mt-10 space-y-8 text-[15px] md:mt-12 md:space-y-9">
            <div className="flex justify-between gap-6 border-t border-black/[0.045] pt-9 text-[14px] first:border-none first:pt-0 md:gap-8">
              <dt className="text-[color-mix(in_srgb,var(--text-muted)_90%,transparent)]">
                Serviço
              </dt>
              <dd className="font-semibold text-[var(--text-main)]">{svcName}</dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-black/[0.045] pt-9 text-[14px] md:gap-8">
              <dt className="text-[color-mix(in_srgb,var(--text-muted)_90%,transparent)]">
                Situação
              </dt>
              <dd className="font-semibold tracking-wide text-[var(--text-main)]">
                {statusPt(entry.status as VehicleStatus)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-black/[0.045] pt-9 text-[14px] md:gap-8">
              <dt className="text-[color-mix(in_srgb,var(--text-muted)_90%,transparent)]">
                Pagamento
              </dt>
              <dd className="font-semibold tracking-wide text-[var(--text-main)]">
                {entry.isPaid
                  ? entry.paymentMethod
                    ? `Pago · ${paymentMethodLabel(entry.paymentMethod)}`
                    : "Pago"
                  : "Pendente — pagar na entrega ou pelo quadro"}
              </dd>
            </div>
          </dl>
          <footer className="mt-16 border-t border-[color-mix(in_srgb,var(--primary)_40%,transparent)] pt-11 text-[12px] italic text-[var(--text-muted)] md:mt-20 md:pt-16">
            Obrigado pela preferência — volte sempre
          </footer>
        </article>
      ) : null}
    </div>
  );
}
