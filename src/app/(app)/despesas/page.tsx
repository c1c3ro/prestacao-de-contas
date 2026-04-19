"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/money";

type Row = {
  id: string;
  valor: string;
  dataDespesa: string;
  descricao: string | null;
  notaFiscalCaminho: string | null;
  comprovanteCaminho: string | null;
  repasse: { numeroOrdemBancaria: string };
  categoria: { nome: string };
};

export default function DespesasPage() {
  const { data: session } = useSession();
  const gestor = session?.user?.role === "GESTOR";
  const [list, setList] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/despesas", { credentials: "include" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Despesas</h1>
          <p className="text-sm text-slate-800">
            Cada despesa está vinculada a um repasse. Anexos (NF e comprovante) são
            obrigatórios apenas quando o servidor persiste arquivos (por exemplo, em
            ambiente local); na Vercel eles ficam opcionais e não são armazenados.
          </p>
        </div>
        {gestor && (
          <Link
            href="/despesas/novo"
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Nova despesa
          </Link>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="min-w-full text-left text-sm text-slate-900">
          <thead className="bg-slate-200 text-xs font-semibold uppercase text-slate-800">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Repasse</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Docs</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{row.dataDespesa.slice(0, 10)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-900">
                  {row.repasse.numeroOrdemBancaria}
                </td>
                <td className="px-3 py-2">{row.categoria.nome}</td>
                <td className="px-3 py-2 font-medium">{formatBRL(Number(row.valor))}</td>
                <td className="px-3 py-2 text-xs">
                  {row.notaFiscalCaminho && (
                    <a
                      className="font-medium text-emerald-900 underline underline-offset-2"
                      href={row.notaFiscalCaminho}
                      target="_blank"
                    >
                      NF
                    </a>
                  )}
                  {row.notaFiscalCaminho && row.comprovanteCaminho && " · "}
                  {row.comprovanteCaminho && (
                    <a
                      className="font-medium text-emerald-900 underline underline-offset-2"
                      href={row.comprovanteCaminho}
                      target="_blank"
                    >
                      Pag.
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {gestor && (
                    <Link
                      href={`/despesas/${row.id}/editar`}
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
                <td colSpan={6} className="px-3 py-8 text-center text-slate-700">
                  Nenhuma despesa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
