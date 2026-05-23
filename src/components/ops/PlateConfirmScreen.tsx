"use client";

import {
  detectPlateFormat,
  formatPlate,
  plateFormatLabel,
} from "@lava-rapido/shared";

type Props = {
  plateNormalized: string;
  onConfirm: () => void;
  onCorrect: () => void;
};

export function PlateConfirmScreen({
  plateNormalized,
  onConfirm,
  onCorrect,
}: Props) {
  const display =
    plateNormalized.length === 7
      ? formatPlate(plateNormalized)
      : plateNormalized;
  const format = detectPlateFormat(plateNormalized);

  return (
    <div className="rounded-3xl bg-white px-7 py-9 text-center shadow-[0_12px_40px_rgba(43,95,140,0.12)]">
      <h2 className="mb-2 text-[14px] font-medium text-[var(--text-muted)]">
        Confirme a placa
      </h2>
      {format ? (
        <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
          {plateFormatLabel(format)}
        </p>
      ) : (
        <div className="mb-5" />
      )}
      <div className="mb-8 inline-block rounded-xl border-[2px] border-[var(--primary)] bg-[linear-gradient(180deg,white_0%,#F7F9FB_100%)] px-10 py-5 font-mono text-4xl font-medium tracking-[0.08em] text-[var(--text-main)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_16px_rgba(43,95,140,0.1)]">
        {display}
      </div>
      <button
        type="button"
        className="mb-2.5 w-full rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] py-4 text-[16px] font-bold text-white shadow-[0_4px_16px_rgba(43,95,140,0.25)]"
        onClick={onConfirm}
      >
        Confirmar
      </button>
      <button
        type="button"
        className="w-full rounded-xl bg-transparent py-3 text-[15px] font-semibold text-[var(--text-muted)]"
        onClick={onCorrect}
      >
        Corrigir placa
      </button>
    </div>
  );
}
