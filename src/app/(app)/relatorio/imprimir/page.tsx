"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/money";

type Rel = {
  periodo: { ano: number; mes: number };
  fechado: boolean;
  resumo: {
    totalRecebidoPeriodo: number;
    totalDespesasPeriodo: number;
    saldoPeriodo: number;
  };
  repasses: { id: string; valor: string; dataRecebimento: string; numeroOrdemBancaria: string }[];
  despesas: {
    id: string;
    valor: string;
    dataDespesa: string;
    descricao: string | null;
    categoria: { nome: string };
    repasse: { numeroOrdemBancaria: string };
  }[];
};

export default function RelatorioImprimirPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<Rel | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(
      `/api/relatorio?ano=${encodeURIComponent(String(ano))}&mes=${encodeURIComponent(String(mes))}`,
      { credentials: "include" },
    );
    if (!r.ok) {
      setErr("Não foi possível carregar o relatório.");
      return;
    }
    setData(await r.json());
  }, [ano, mes]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="no-print flex flex-wrap items-end gap-3 rounded-lg border border-slate-300 bg-white p-4 text-slate-900">
        <label className="text-sm font-medium text-slate-800">
          Ano
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="mt-1 block rounded-md border border-slate-400 bg-white px-2 py-1.5 text-sm text-slate-950"
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Mês
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="mt-1 block rounded-md border border-slate-400 bg-white px-2 py-1.5 text-sm text-slate-950"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Atualizar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Imprimir / PDF
        </button>
      </div>

      {err && <p className="text-sm font-medium text-red-800">{err}</p>}

      {data && (
        <article className="rounded-lg border border-slate-300 bg-white p-8 text-slate-950 shadow-sm print:border-0 print:shadow-none">
          <header className="border-b border-slate-300 pb-4 text-center">
            <h1 className="text-xl font-semibold text-slate-950">Prestação de contas — PMJN</h1>
            <p className="text-sm font-medium text-slate-800">
              Período: {String(data.periodo.mes).padStart(2, "0")}/{data.periodo.ano}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-700">
              {data.fechado ? "Mês encerrado (relatório gerado)." : "Mês em aberto."}
            </p>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Recebido no período
              </p>
              <p className="text-lg font-semibold text-slate-950">
                {formatBRL(data.resumo.totalRecebidoPeriodo)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Despesas no período
              </p>
              <p className="text-lg font-semibold text-slate-950">
                {formatBRL(data.resumo.totalDespesasPeriodo)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Saldo do período
              </p>
              <p className="text-lg font-semibold text-emerald-950">
                {formatBRL(data.resumo.saldoPeriodo)}
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              Receitas (repasses)
            </h2>
            <table className="mt-2 w-full text-left text-sm text-slate-900 print:text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100">
                  <th className="py-2 pl-0 pr-2 font-semibold">Data</th>
                  <th className="py-2 px-2 font-semibold">Ordem bancária</th>
                  <th className="py-2 pl-2 pr-0 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.repasses.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200">
                    <td className="py-2">{r.dataRecebimento.slice(0, 10)}</td>
                    <td className="py-2 font-mono text-xs text-slate-900">{r.numeroOrdemBancaria}</td>
                    <td className="py-2 text-right font-medium">{formatBRL(Number(r.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Despesas</h2>
            <table className="mt-2 w-full text-left text-sm text-slate-900 print:text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100">
                  <th className="py-2 pl-0 pr-2 font-semibold">Data</th>
                  <th className="py-2 px-2 font-semibold">Repasse</th>
                  <th className="py-2 px-2 font-semibold">Categoria</th>
                  <th className="py-2 pl-2 pr-0 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.despesas.map((d) => (
                  <tr key={d.id} className="border-b border-slate-200">
                    <td className="py-2">{d.dataDespesa.slice(0, 10)}</td>
                    <td className="py-2 font-mono text-xs text-slate-900">
                      {d.repasse.numeroOrdemBancaria}
                    </td>
                    <td className="py-2">{d.categoria.nome}</td>
                    <td className="py-2 text-right font-medium">{formatBRL(Number(d.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer className="mt-12 border-t border-slate-300 pt-6 text-center text-sm text-slate-800">
            <p>______________________________</p>
            <p className="mt-1 font-medium text-slate-950">Responsável / Auditor</p>
            <p className="mt-4 text-xs font-medium text-slate-600">
              Documento gerado pelo sistema PMJN — Módulo de Transparência
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}
