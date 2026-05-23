"use client";

import type { WashType } from "@/lib/types";
import {
  createWashType,
  deleteWashType,
  listWashTypes,
  updateWashType,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

export default function TiposPage() {
  const [items, setItems] = useState<WashType[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("45");
  const [duration, setDuration] = useState("30");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setItems(await listWashTypes());
  }, []);

  useEffect(() => {
    refresh().catch(() => setMsg("Erro ao carregar."));
  }, [refresh]);

  return (
    <div className="mx-auto mt-10 w-full max-w-lg pb-[120px]">
      <h1 className="mb-10 text-xl font-bold">Tipos de lavagem</h1>
      <section className="mb-14 rounded-[20px] bg-white px-8 py-8 shadow-[0_8px_36px_-8px_rgba(43,95,140,0.15)]">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Novo tipo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Nome"
            className="rounded-lg border px-4 py-2.5 text-sm sm:col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Descrição opcional"
            className="rounded-lg border px-4 py-2.5 text-sm sm:col-span-2"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            placeholder="Preço em reais (52,90)"
            className="rounded-lg border px-4 py-2.5 text-sm"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            placeholder="Tempo médio min"
            inputMode="numeric"
            className="rounded-lg border px-4 py-2.5 text-sm"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <Button
          type="button"
          className="mt-5"
          onClick={() =>
            void (async () => {
              const cents = Math.round(Number(price.replace(",", ".")) * 100);
              if (!name.trim() || !Number.isFinite(cents)) {
                setMsg("Nome e preço válidos obrigatórios.");
                return;
              }
              try {
                await createWashType({
                  name: name.trim(),
                  description: desc.trim() || null,
                  price_cents: cents,
                  duration_minutes: Number(duration) || 30,
                });
                setName("");
                setDesc("");
                setMsg(null);
                await refresh();
              } catch {
                setMsg("Somente admins podem alterar catálogo na demo.");
              }
            })()
          }
        >
          Criar tipo
        </Button>
      </section>
      <ul className="divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] bg-white/94">
        {items.map((t) => (
          <TipoLinha key={t.id} tipo={t} onChanged={refresh} setMsg={setMsg} />
        ))}
      </ul>
      {msg ? (
        <p className="mt-6 text-[13px] text-[var(--danger)]">{msg}</p>
      ) : null}
    </div>
  );
}

function TipoLinha({
  tipo,
  onChanged,
  setMsg,
}: {
  tipo: WashType;
  onChanged: () => Promise<void>;
  setMsg: (v: string | null) => void;
}) {
  const [nome, setNome] = useState(tipo.name);

  return (
    <li className="flex flex-wrap items-start gap-3 px-6 py-4">
      <div className="min-w-[220px] flex-1 space-y-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-[14px]"
        />
        <p className="text-[12px] text-[var(--text-muted)]">
          {(tipo.priceCents / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          · {tipo.durationMinutes} min
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          void updateWashType(tipo.id, { name: nome.trim() })
            .then(() => onChanged())
            .catch(() => setMsg("Falhou ao atualizar tipo."))
        }
      >
        Salvar nome
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-[var(--danger)]"
        onClick={() =>
          void deleteWashType(tipo.id)
            .then(() => onChanged())
            .catch(() => setMsg("Exclusão recusada."))
        }
      >
        Excluir
      </Button>
    </li>
  );
}
