import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGestor, requireSession } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const list = await prisma.pmjnFechamentoMensal.findMany({
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
    include: { usuario: { select: { nome: true, email: true } } },
  });
  return NextResponse.json(list);
}

const bodySchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

export async function POST(req: Request) {
  const { session, error } = await requireGestor();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ano/mês inválidos." }, { status: 400 });
  }

  const { ano, mes } = parsed.data;

  try {
    const row = await prisma.pmjnFechamentoMensal.create({
      data: {
        ano,
        mes,
        usuarioId: session!.user.id,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Este mês já possui relatório gerado (fechado)." },
      { status: 409 },
    );
  }
}
