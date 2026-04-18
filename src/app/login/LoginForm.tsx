"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setErr("E-mail ou senha incorretos.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-8 shadow-md">
        <h1 className="text-xl font-semibold text-emerald-950">Acesso ao sistema</h1>
        <p className="mt-1 text-sm font-medium text-slate-800">
          Gestor do Hospital ou Auditor da Prefeitura
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="block text-sm font-medium text-slate-800">
            <span>E-mail</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            <span>Senha</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </label>
          {err && <p className="text-sm font-medium text-red-800">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-emerald-800 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-xs font-medium leading-relaxed text-slate-700">
          Após o seed: gestor@hospital.local / gestor123 · auditor@prefeitura.local /
          auditor123
        </p>
      </div>
    </div>
  );
}
