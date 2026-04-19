"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Rep = {
  id: string;
  valor: string;
  dataRecebimento: string;
  numeroOrdemBancaria: string;
  extratoCaminho: string | null;
  observacoes: string | null;
};

export default function EditarRepassePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rep, setRep] = useState<Rep | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/repasses/${id}`, { credentials: "include" });
    if (!r.ok) {
      setErr("Repasse não encontrado.");
      return;
    }
    setRep(await r.json());
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rep) return;
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const extrato = fd.get("extrato") as File | null;
    let extratoCaminho = rep.extratoCaminho;
    if (extrato && extrato.size > 0) {
      const up = new FormData();
      up.append("file", extrato);
      const ur = await fetch("/api/upload", { method: "POST", body: up, credentials: "include" });
      if (!ur.ok) {
        const j = await ur.json().catch(() => ({}));
        setErr((j as { error?: string }).error ?? "Falha no upload.");
        return;
      }
      const uj = (await ur.json()) as { url: string | null; storageSkipped?: boolean };
      extratoCaminho = uj.url ?? null;
    }

    const body = {
      valor: Number(String(fd.get("valor")).replace(",", ".")),
      dataRecebimento: String(fd.get("dataRecebimento")),
      numeroOrdemBancaria: String(fd.get("numeroOrdemBancaria")),
      extratoCaminho,
      observacoes: String(fd.get("observacoes") || "") || null,
    };

    setLoading(true);
    const r = await fetch(`/api/repasses/${id}`, {
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
    router.push("/repasses");
    router.refresh();
  }

  if (!rep && !err) {
    return <p className="text-slate-800">Carregando…</p>;
  }
  if (err && !rep) {
    return <p className="font-medium text-red-800">{err}</p>;
  }
  if (!rep) return null;

  const d = rep.dataRecebimento.slice(0, 10);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-950">Editar repasse</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-300 bg-white p-6 text-slate-900"
      >
        <label className="block text-sm font-medium text-slate-800">
          <span>Valor (R$)</span>
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={rep.valor}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Data do recebimento</span>
          <input
            name="dataRecebimento"
            type="date"
            required
            defaultValue={d}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Número da ordem bancária</span>
          <input
            name="numeroOrdemBancaria"
            required
            defaultValue={rep.numeroOrdemBancaria}
            maxLength={120}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        {rep.extratoCaminho && (
          <p className="text-xs text-slate-800">
            Extrato atual:{" "}
            <a
              href={rep.extratoCaminho}
              className="font-medium text-emerald-900 underline underline-offset-2"
              target="_blank"
            >
              abrir
            </a>
          </p>
        )}
        <label className="block text-sm font-medium text-slate-800">
          <span>Novo extrato (opcional)</span>
          <input
            name="extrato"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="mt-1 w-full text-sm text-slate-800 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Observações</span>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={rep.observacoes ?? ""}
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
