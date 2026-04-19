"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Cat = { id: string; nome: string };

type Desp = {
  id: string;
  repasseId: string;
  categoriaId: string;
  valor: string;
  dataDespesa: string;
  descricao: string | null;
  notaFiscalCaminho: string | null;
  comprovanteCaminho: string | null;
};

export default function EditarDespesaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [desp, setDesp] = useState<Desp | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/despesas/${id}`, { credentials: "include" }),
      fetch("/api/categorias", { credentials: "include" }),
    ]);
    if (!r1.ok) {
      setErr("Despesa não encontrada.");
      return;
    }
    setDesp(await r1.json());
    if (r2.ok) setCats(await r2.json());
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!desp) return;
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const nfFile = fd.get("nf") as File;
      const cpFile = fd.get("comprovante") as File;
      const nf = nfFile?.size ? await uploadFile(nfFile) : desp.notaFiscalCaminho;
      const cp = cpFile?.size ? await uploadFile(cpFile) : desp.comprovanteCaminho;

      const body = {
        categoriaId: String(fd.get("categoriaId")),
        valor: Number(String(fd.get("valor")).replace(",", ".")),
        dataDespesa: String(fd.get("dataDespesa")),
        descricao: String(fd.get("descricao") || "") || null,
        notaFiscalCaminho: nf,
        comprovanteCaminho: cp,
      };

      setLoading(true);
      const r = await fetch(`/api/despesas/${id}`, {
        method: "PUT",
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

  if (!desp && !err) return <p className="text-slate-800">Carregando…</p>;
  if (err && !desp) return <p className="font-medium text-red-800">{err}</p>;
  if (!desp) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-950">Editar despesa</h1>
      <p className="text-xs font-medium text-slate-700">
        Repasse não pode ser alterado após criação.
      </p>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-300 bg-white p-6 text-slate-900"
      >
        <label className="block text-sm font-medium text-slate-800">
          <span>Categoria</span>
          <select
            name="categoriaId"
            required
            defaultValue={desp.categoriaId}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          >
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
            defaultValue={desp.valor}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Data da despesa</span>
          <input
            name="dataDespesa"
            type="date"
            required
            defaultValue={desp.dataDespesa.slice(0, 10)}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        {desp.notaFiscalCaminho && (
          <p className="text-xs text-slate-800">
            NF atual:{" "}
            <a
              href={desp.notaFiscalCaminho}
              className="font-medium text-emerald-900 underline underline-offset-2"
              target="_blank"
            >
              abrir
            </a>
          </p>
        )}
        <label className="block text-sm font-medium text-slate-800">
          <span>Nova NF (opcional)</span>
          <input
            name="nf"
            type="file"
            accept=".pdf,.xml"
            className="mt-1 w-full text-sm text-slate-800 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900"
          />
        </label>
        {desp.comprovanteCaminho && (
          <p className="text-xs text-slate-800">
            Comprovante:{" "}
            <a
              href={desp.comprovanteCaminho}
              className="font-medium text-emerald-900 underline underline-offset-2"
              target="_blank"
            >
              abrir
            </a>
          </p>
        )}
        <label className="block text-sm font-medium text-slate-800">
          <span>Novo comprovante (opcional)</span>
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
            defaultValue={desp.descricao ?? ""}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
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
