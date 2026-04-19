"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NovoRepassePage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const extrato = fd.get("extrato") as File | null;
    let extratoCaminho: string | null = null;
    if (extrato && extrato.size > 0) {
      const up = new FormData();
      up.append("file", extrato);
      const ur = await fetch("/api/upload", { method: "POST", body: up, credentials: "include" });
      if (!ur.ok) {
        const j = await ur.json().catch(() => ({}));
        setErr((j as { error?: string }).error ?? "Falha no upload do extrato.");
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
    const r = await fetch("/api/repasses", {
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
    router.push("/repasses");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-950">Novo repasse</h1>
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
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Data do recebimento</span>
          <input
            name="dataRecebimento"
            type="date"
            required
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Número da ordem bancária</span>
          <input
            name="numeroOrdemBancaria"
            required
            maxLength={120}
            className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>Cópia do extrato (PDF/imagem)</span>
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
