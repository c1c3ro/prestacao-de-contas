"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/money";

type Repasse = {
  id: string;
  valor: string;
  dataRecebimento: string;
  numeroOrdemBancaria: string;
  saldoDisponivel: number;
};

export default function RepassesPage() {
  const { data: session } = useSession();
  const gestor = session?.user?.role === "GESTOR";
  const [list, setList] = useState<Repasse[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/repasses", { credentials: "include" });
    if (!r.ok) {
      setErr("Erro ao carregar repasses.");
      return;
    }
    setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Receitas (repasses)</h1>
          <p className="text-sm text-slate-800">
            Registro de entradas vinculadas à ordem bancária e extrato.
          </p>
        </div>
        {gestor && (
          <Link
            href="/repasses/novo"
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Novo repasse
          </Link>
        )}
      </div>
      {err && <p className="text-sm font-medium text-red-800">{err}</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="min-w-full text-left text-sm text-slate-900">
          <thead className="bg-slate-200 text-xs font-semibold uppercase text-slate-800">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Ordem bancária</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{row.dataRecebimento.slice(0, 10)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-900">
                  {row.numeroOrdemBancaria}
                </td>
                <td className="px-3 py-2">{formatBRL(Number(row.valor))}</td>
                <td className="px-3 py-2 font-semibold text-emerald-950">
                  {formatBRL(row.saldoDisponivel)}
                </td>
                <td className="px-3 py-2 text-right">
                  {gestor && (
                    <Link
                      href={`/repasses/${row.id}/editar`}
                      className="font-medium text-emerald-900 underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-700">
                  Nenhum repasse.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
