"use client";

import type { KanbanColumnKey } from "@/hooks/use-board-entries";
import type { VehicleEntry } from "@/lib/types";
import { patchVehicleEntryAction } from "@/lib/api";
import { formatPlateDisplay } from "@/lib/plate";
import { PaymentSheet } from "@/components/ops/PaymentSheet";
import { VehicleStatus } from "@lava-rapido/shared";
import { paymentMethodLabel } from "@lava-rapido/shared";
import { ChevronRight, Clock, User, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState } from "react";

function columnAccentClass(groupKey: KanbanColumnKey) {
  if (groupKey === "ready") {
    return "before:bg-[linear-gradient(90deg,var(--accent),color-mix(in_srgb,var(--accent)_72%,white))]";
  }
  if (groupKey === "wash") {
    return "before:bg-[linear-gradient(90deg,var(--wash-mid),var(--wash-end))]";
  }
  if (groupKey === "fin") {
    return "before:bg-[linear-gradient(90deg,var(--fin-start),var(--fin-end))]";
  }
  return "before:bg-[linear-gradient(90deg,var(--primary),var(--wash-mid))]";
}

function elapsedLabel(createdAt: string): string {
  const d = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000
  );
  if (!Number.isFinite(d) || d < 1) return "agora";
  return `${d} min`;
}

type Props = {
  entry: VehicleEntry;
  groupKey: KanbanColumnKey;
  branchSelection: string | "consolidated" | null;
  onAfterChange: () => void;
};

export function VehicleEntryCard({
  entry,
  groupKey,
  branchSelection,
  onAfterChange,
}: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const resolvedBranch =
    branchSelection === "consolidated" ? entry.branchId : branchSelection;

  const isPaid = entry.isPaid === true;

  async function advance() {
    if (!resolvedBranch) return;
    try {
      await patchVehicleEntryAction({
        id: entry.id,
        action: "forward",
        branchId: resolvedBranch,
      });
      onAfterChange();
    } catch {
      /* silenciar — próximo poll atualiza estado */
    }
  }

  const canAdvance =
    entry.status !== VehicleStatus.ENTREGUE &&
    entry.status !== VehicleStatus.CANCELADO;

  const chip =
    entry.status === VehicleStatus.PRONTO ? "Retirada" : elapsedLabel(entry.createdAt);

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-[14px] bg-white pb-11 pl-4 pr-4 pt-4 shadow-[0_4px_16px_rgba(43,95,140,0.08),0_1px_3px_rgba(21,37,53,0.04)] before:pointer-events-none before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] before:rounded-t-[inherit] before:content-['']",
          columnAccentClass(groupKey),
          groupKey === "ready" &&
            "shadow-[0_4px_20px_rgba(91,168,140,0.18),0_1px_3px_rgba(21,37,53,0.04)]"
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-[color-mix(in_srgb,var(--primary)_10%,transparent)] bg-[var(--plate-bg)] px-3 py-1 font-mono text-[17px] font-medium tracking-[0.08em] text-[var(--text-main)]">
            {formatPlateDisplay(entry.plate)}
          </div>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]",
              isPaid
                ? "bg-[color-mix(in_srgb,var(--accent)_18%,white)] text-[var(--accent)]"
                : "bg-[color-mix(in_srgb,var(--warning,#e8a838)_20%,white)] text-[#b45309]",
            )}
          >
            {isPaid ? "Pago" : "A pagar"}
          </span>
        </div>
        <p className="mb-1 text-[13px] text-[var(--text-muted)]">
          <span aria-hidden className="text-[var(--accent)]">
            ✦{" "}
          </span>
          {entry.washType?.name ?? "Serviço"}
        </p>
        {isPaid && entry.paymentMethod ? (
          <p className="mb-1 text-[11px] text-[var(--text-muted)]">
            {paymentMethodLabel(entry.paymentMethod)}
          </p>
        ) : null}
        <p className="flex items-start gap-1 text-xs text-[var(--text-muted)]">
          <User className="mt-px size-3.5 shrink-0 opacity-80" aria-hidden />
          <span>
            {entry.customer?.name ?? "Cliente avulso"}
            {entry.customer?.phone ? ` · ${entry.customer.phone}` : null}
          </span>
        </p>
        <div className="absolute bottom-3 right-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {chip}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/[0.04] pt-3">
          {!isPaid && resolvedBranch ? (
            <Button
              type="button"
              variant="default"
              size="xs"
              className="text-xs"
              onClick={() => setPayOpen(true)}
            >
              <Wallet className="size-3.5" aria-hidden />
              Pagar
            </Button>
          ) : null}
          {canAdvance ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="text-xs"
              onClick={() => void advance()}
            >
              {entry.status === VehicleStatus.PRONTO
                ? "Registrar entrega"
                : "Avançar"}
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          <Link
            href={`/ticket/${entry.id}`}
            prefetch
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "text-xs"
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 opacity-70" aria-hidden /> Ticket
            </span>
          </Link>
        </div>
      </div>

      {resolvedBranch ? (
        <PaymentSheet
          open={payOpen}
          entry={entry}
          branchId={resolvedBranch}
          onOpenChange={setPayOpen}
          onPaid={onAfterChange}
        />
      ) : null}
    </>
  );
}
