"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Painel" },
  { href: "/repasses", label: "Receitas (repasses)" },
  { href: "/despesas", label: "Despesas" },
  { href: "/categorias", label: "Categorias" },
  { href: "/fechamento", label: "Fechamento mensal" },
  { href: "/relatorio/imprimir", label: "Relatório (impressão)" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user?.role;

  return (
    <header className="border-b border-slate-300 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="font-semibold text-emerald-950">
            PMJN Transparência
          </Link>
          {role && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
              {role === "GESTOR" ? "Gestor" : "Auditor (leitura)"}
            </span>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2 py-1 font-medium ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-emerald-200 text-emerald-950"
                  : "text-slate-800 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm text-slate-800">
          <span className="hidden max-w-[180px] truncate sm:inline">
            {data?.user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-800 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
