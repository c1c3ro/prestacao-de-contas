"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Rep = { id: string; numeroOrdemBancaria: string; saldoDisponivel: number };
type Cat = { id: string; nome: string };

export default function NovaDespesaPage() {
  const router = useRouter();
  const [repasses, setRepasses] = useState<Rep[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOpts = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/repasses", { credentials: "include" }),
      fetch("/api/categorias", { credentials: "include" }),
    ]);
    if (r1.ok) setRepasses(await r1.json());
    if (r2.ok) setCats(await r2.json());
  }, []);

  useEffect(() => {
    void loadOpts();
  }, [loadOpts]);

  async function uploadFile(f: File | null) {
    if (!f || f.size === 0) return null;
    const up = new FormData();
    up.append("file", f);
    const ur = await fetch("/api/upload", { method: "POST", body: up, credentials: "include" });
    if (!ur.ok) throw new Error("Falha no upload.");
    const uj = (await ur.json()) as { url: string | null; storageSkipped?: boolean };
    return uj.url ?? null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const envR = await fetch("/api/app-env");
      const env = (await envR.json()) as { persistUploadedFiles: boolean };
      const persist = env.persistUploadedFiles;

      const nfFile = fd.get("nf") as File | null;
      const cpFile = fd.get("comprovante") as File | null;
      if (persist) {
        if (!nfFile || nfFile.size === 0) {
          setErr("Envie a nota fiscal (PDF ou XML).");
          return;
        }
        if (!cpFile || cpFile.size === 0) {
          setErr("Envie o comprovante de pagamento.");
          return;
        }
      }

      const nf = await uploadFile(nfFile);
      const cp = await uploadFile(cpFile);
      const body = {
        repasseId: String(fd.get("repasseId")),
        categoriaId: String(fd.get("categoriaId")),
        valor: Number(String(fd.get("valor")).replace(",", ".")),
        dataDespesa: String(fd.get("dataDespesa")),
        descricao: String(fd.get("descricao") || "") || null,
        notaFiscalCaminho: nf,
        comprovanteCaminho: cp,
      };
      setLoading(true);
      const r = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setLoading(false);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr((j as { error?: string }).error ?? "Erro ao salvar.");
        return;
      }
      router.push("/despesas");
      router.refresh();
    } catch {
      setErr("Erro no envio de arquivos.");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-950">Nova despesa</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-300 bg-white p-6 text-slate-900"
      >
        <label className="block text-sm font-medium text-slate-800">
          <span>Repasse</span>
          <select
            name="repasseId"
            required
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          >
            <option value="">Selecione…</option>
            {repasses.map((r) => (
              <option key={r.id} value={r.id}>
                {r.numeroOrdemBancaria} — saldo {r.saldoDisponivel.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Categoria</span>
          <select
            name="categoriaId"
            required
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          >
            <option value="">Selecione…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Valor (R$)</span>
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Data da despesa</span>
          <input
            name="dataDespesa"
            type="date"
            required
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Nota fiscal (PDF ou XML)</span>
          <input
            name="nf"
            type="file"
            accept=".pdf,.xml"
            className="mt-1 w-full text-sm text-slate-800 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Comprovante de pagamento</span>
          <input
            name="comprovante"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="mt-1 w-full text-sm text-slate-800 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Descrição</span>
          <textarea
            name="descricao"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500"
          />
        </label>
        {err && <p className="text-sm font-medium text-red-800">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-700 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
