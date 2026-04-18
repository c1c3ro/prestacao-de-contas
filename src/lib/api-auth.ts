import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { session, error: null as null };
}

export async function requireGestor() {
  const r = await requireSession();
  if (r.error) return r;
  if (r.session!.user.role !== "GESTOR") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Perfil Auditor: apenas visualização." },
        { status: 403 },
      ),
    };
  }
  return { session: r.session, error: null };
}
