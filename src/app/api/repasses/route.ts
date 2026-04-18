import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGestor, requireSession } from "@/lib/api-auth";
import {
  pmjnCalcularSaldo,
  pmjnGarantirRepasseNaoCongelado,
} from "@/lib/pmjn-financeiro";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const repasses = await prisma.pmjnRepasse.findMany({
    orderBy: { dataRecebimento: "desc" },
    include: {
      usuario: { select: { nome: true, email: true } },
    },
  });

  const comSaldo = await Promise.all(
    repasses.map(async (r) => {
      const saldo = await pmjnCalcularSaldo(prisma, r.id);
      return {
        ...r,
        valor: r.valor.toString(),
        saldoDisponivel: saldo,
      };
    }),
  );

  return NextResponse.json(comSaldo);
}

const createSchema = z.object({
  valor: z.coerce.number().positive(),
  dataRecebimento: z.string().min(8),
  numeroOrdemBancaria: z.string().min(1).max(120),
  extratoCaminho: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(5000).optional().nullable(),
});

export async function POST(req: Request) {
  const { session, error } = await requireGestor();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const dataRecebimento = new Date(parsed.data.dataRecebimento + "T12:00:00.000Z");
  if (Number.isNaN(dataRecebimento.getTime())) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  try {
    await pmjnGarantirRepasseNaoCongelado(prisma, dataRecebimento);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mês fechado.";
    return NextResponse.json({ error: msg }, { status: 423 });
  }

  const rep = await prisma.pmjnRepasse.create({
    data: {
      valor: new Prisma.Decimal(parsed.data.valor),
      dataRecebimento,
      numeroOrdemBancaria: parsed.data.numeroOrdemBancaria.trim(),
      extratoCaminho: parsed.data.extratoCaminho ?? null,
      observacoes: parsed.data.observacoes ?? null,
      usuarioId: session!.user.id,
    },
  });

  return NextResponse.json(
    { ...rep, valor: rep.valor.toString(), saldoDisponivel: Number(rep.valor) },
    { status: 201 },
  );
}
