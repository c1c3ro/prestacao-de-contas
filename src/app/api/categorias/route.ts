import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGestor, requireSession } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const list = await prisma.pmjnCategoriaDespesa.findMany({
    where: { ativa: true },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(list);
}

const createSchema = z.object({
  nome: z.string().min(2).max(120),
});

export async function POST(req: Request) {
  const { error } = await requireGestor();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const cat = await prisma.pmjnCategoriaDespesa.create({
    data: { nome: parsed.data.nome.trim() },
  });
  return NextResponse.json(cat, { status: 201 });
}
