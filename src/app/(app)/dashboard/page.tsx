"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/money";

type Resumo = {
  totalRecebido: number;
  totalDespesas: number;
  saldoGlobal: number;
  porRepasse: {
    id: string;
    numeroOrdemBancaria: string;
    valorRecebido: number;
    saldoDisponivel: number;
  }[];
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const gestor = session?.user?.role === "GESTOR";
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/resumo", { credentials: "include" });
    if (!r.ok) {
      setErr("Não foi possível carregar o resumo.");
      return;
    }
    const j = (await r.json()) as Resumo;
    setResumo(j);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Painel</h1>
        <p className="text-slate-800">
          Saldo atualizado conforme receitas e despesas cadastradas (regra de integridade
          pmjn).
        </p>
      </div>

      {err && <p className="text-sm font-medium text-red-800">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Total recebido
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">
            {resumo ? formatBRL(resumo.totalRecebido) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Total despesas
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {resumo ? formatBRL(resumo.totalDespesas) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Saldo global
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">
            {resumo ? formatBRL(resumo.saldoGlobal) : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Atualizar saldos
        </button>
        {gestor && (
          <>
            <Link
              href="/repasses/novo"
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Nova receita
            </Link>
            <Link
              href="/despesas/novo"
              className="rounded-md border border-emerald-800 px-3 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50"
            >
              Nova despesa
            </Link>
          </>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-950">Saldo por repasse</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-200 text-xs font-semibold uppercase text-slate-800">
              <tr>
                <th className="px-3 py-2">Ordem bancária</th>
                <th className="px-3 py-2">Recebido</th>
                <th className="px-3 py-2">Saldo disponível</th>
              </tr>
            </thead>
            <tbody>
              {(resumo?.porRepasse ?? []).map((r) => (
                <tr key={r.id} className="border-t border-slate-200 bg-white">
                  <td className="px-3 py-2 font-mono text-xs text-slate-900">
                    {r.numeroOrdemBancaria}
                  </td>
                  <td className="px-3 py-2 text-slate-900">{formatBRL(r.valorRecebido)}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-950">
                    {formatBRL(r.saldoDisponivel)}
                  </td>
                </tr>
              ))}
              {resumo && resumo.porRepasse.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-700">
                    Nenhum repasse cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
