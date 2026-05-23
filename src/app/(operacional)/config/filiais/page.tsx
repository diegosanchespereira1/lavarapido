"use client";

import type { Branch } from "@/lib/types";
import { createBranch, deleteBranch, listBranches, updateBranch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

export default function FiliaisPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => setItems(await listBranches()), []);

  useEffect(() => {
    refresh().catch(() => setMsg("Erro ao listar."));
  }, [refresh]);

  return (
    <div className="mx-auto mt-10 w-full max-w-lg pb-[120px]">
      <h1 className="mb-10 text-xl font-bold">Filiais</h1>
      <section className="mb-14 rounded-[20px] bg-white px-8 py-8 shadow-[0_8px_36px_-8px_rgba(43,95,140,0.15)]">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Nova filial
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Nome da unidade"
            className="min-w-[200px] flex-1 rounded-lg border border-black/15 px-4 py-2.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            onClick={() =>
              void (async () => {
                if (!name.trim()) return setMsg("Informe o nome.");
                try {
                  await createBranch({ name: name.trim() });
                  setName("");
                  setMsg(null);
                  await refresh();
                } catch {
                  setMsg("Somente administradores podem criar filiais nesta demo.");
                }
              })()
            }
          >
            Adicionar
          </Button>
        </div>
      </section>
      <ul className="divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] bg-white/94">
        {items.map((b) => (
          <FilialRow key={b.id} b={b} onChanged={refresh} setMsg={setMsg} />
        ))}
      </ul>
      {msg ? (
        <p className="mt-6 text-[13px] text-[var(--danger)]">{msg}</p>
      ) : null}
    </div>
  );
}

function FilialRow({
  b,
  onChanged,
  setMsg,
}: {
  b: Branch;
  onChanged: () => Promise<void>;
  setMsg: (s: string | null) => void;
}) {
  const [nome, setNome] = useState(b.name);

  return (
    <li className="flex flex-wrap items-start gap-3 px-6 py-4">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="min-w-[200px] flex-1 rounded-lg border px-4 py-2 text-[15px] font-semibold"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          void updateBranch(b.id, { name: nome.trim() })
            .then(() => onChanged())
            .catch(() =>
              setMsg("Atualização negada ou sem permissão de administrador."),
            )
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
          void deleteBranch(b.id)
            .then(() => onChanged())
            .catch(() => setMsg("Remoção recusada (dependências?)."))
        }
      >
        Excluir
      </Button>
    </li>
  );
}
