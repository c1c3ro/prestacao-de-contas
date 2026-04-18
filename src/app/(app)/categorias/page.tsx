"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Cat = { id: string; nome: string };

export default function CategoriasPage() {
  const { data: session } = useSession();
  const gestor = session?.user?.role === "GESTOR";
  const [list, setList] = useState<Cat[]>([]);
  const [nome, setNome] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/categorias", { credentials: "include" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Erro.");
      return;
    }
    setNome("");
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Categorias de despesa</h1>
        <p className="text-sm text-slate-800">
          Classificação usada em cada lançamento (medicamentos, salários, etc.).
        </p>
      </div>

      {gestor && (
        <form
          onSubmit={add}
          className="flex max-w-md flex-wrap items-end gap-2 rounded-lg border border-slate-300 bg-white p-4"
        >
          <label className="min-w-[200px] flex-1 text-sm font-medium text-slate-800">
            <span>Nova categoria</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              maxLength={120}
              className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Adicionar
          </button>
        </form>
      )}
      {err && <p className="text-sm font-medium text-red-800">{err}</p>}

      <ul className="max-w-md divide-y divide-slate-200 rounded-lg border border-slate-300 bg-white text-slate-900">
        {list.map((c) => (
          <li key={c.id} className="px-4 py-2 text-sm font-medium">
            {c.nome}
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-4 py-6 text-center text-slate-700">Nenhuma categoria.</li>
        )}
      </ul>
    </div>
  );
}
