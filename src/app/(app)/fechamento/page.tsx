"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Fech = {
  id: string;
  ano: number;
  mes: number;
  criadoEm: string;
  usuario: { nome: string };
};

export default function FechamentoPage() {
  const { data: session } = useSession();
  const gestor = session?.user?.role === "GESTOR";
  const [list, setList] = useState<Fech[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/fechamento", { credentials: "include" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const r = await fetch("/api/fechamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ano, mes }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Erro.");
      return;
    }
    setMsg("Relatório mensal gerado. Registros deste mês ficam congelados.");
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Fechamento mensal</h1>
        <p className="text-sm text-slate-800">
          Ao gerar o relatório do mês, receitas e despesas daquele período passam a ser
          somente leitura.
        </p>
      </div>

      {gestor && (
        <form
          onSubmit={gerar}
          className="max-w-md space-y-3 rounded-lg border border-slate-300 bg-white p-6 text-slate-900"
        >
          <p className="text-sm font-semibold text-slate-950">Gerar relatório e congelar mês</p>
          <div className="flex gap-2">
            <label className="text-sm font-medium text-slate-800">
              Ano
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Mês
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err && <p className="text-sm font-medium text-red-800">{err}</p>}
          {msg && <p className="text-sm font-medium text-emerald-950">{msg}</p>}
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Gerar e congelar
          </button>
        </form>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-950">Meses já fechados</h2>
        <ul className="mt-2 max-w-md divide-y divide-slate-200 rounded-lg border border-slate-300 bg-white text-sm text-slate-900">
          {list.map((f) => (
            <li key={f.id} className="flex justify-between px-4 py-2">
              <span className="font-medium">
                {String(f.mes).padStart(2, "0")}/{f.ano}
              </span>
              <span className="text-slate-800">{f.usuario.nome}</span>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-700">Nenhum fechamento.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
