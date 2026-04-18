import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret });
  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/repasses",
    "/repasses/:path*",
    "/categorias",
    "/categorias/:path*",
    "/despesas",
    "/despesas/:path*",
    "/fechamento",
    "/fechamento/:path*",
    "/relatorio",
    "/relatorio/:path*",
    "/api/repasses",
    "/api/repasses/:path*",
    "/api/despesas",
    "/api/despesas/:path*",
    "/api/categorias",
    "/api/categorias/:path*",
    "/api/fechamento",
    "/api/fechamento/:path*",
    "/api/upload",
    "/api/upload/:path*",
    "/api/relatorio",
    "/api/relatorio/:path*",
    "/api/resumo",
  ],
};
