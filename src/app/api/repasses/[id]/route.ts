import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGestor, requireSession } from "@/lib/api-auth";
import {
  pmjnCalcularSaldo,
  pmjnGarantirRepasseNaoCongelado,
} from "@/lib/pmjn-financeiro";
import { pmjnPersistedFilePathFromClient } from "@/lib/pmjn-file-storage";
import { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;

  const rep = await prisma.pmjnRepasse.findUnique({
    where: { id },
    include: { usuario: { select: { nome: true, email: true } } },
  });
  if (!rep) return NextResponse.json({ error: "Repasse não encontrado." }, { status: 404 });

  const saldo = await pmjnCalcularSaldo(prisma, id);
  return NextResponse.json({
    ...rep,
    valor: rep.valor.toString(),
    saldoDisponivel: saldo,
  });
}

const updateSchema = z.object({
  valor: z.coerce.number().positive(),
  dataRecebimento: z.string().min(8),
  numeroOrdemBancaria: z.string().min(1).max(120),
  extratoCaminho: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(5000).optional().nullable(),
});

export async function PUT(req: Request, ctx: Ctx) {
  const { error } = await requireGestor();
  if (error) return error;
  const { id } = await ctx.params;

  const exist = await prisma.pmjnRepasse.findUnique({ where: { id } });
  if (!exist) return NextResponse.json({ error: "Repasse não encontrado." }, { status: 404 });

  try {
    await pmjnGarantirRepasseNaoCongelado(prisma, exist.dataRecebimento);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mês fechado.";
    return NextResponse.json({ error: msg }, { status: 423 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
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

  const novoValor = new Prisma.Decimal(parsed.data.valor);
  const saldoAtual = await pmjnCalcularSaldo(prisma, id);
  const gasto = Number(exist.valor) - saldoAtual;
  if (Number(novoValor) < gasto) {
    return NextResponse.json(
      {
        error: `Valor do repasse não pode ser menor que o total já empenhado em despesas (${gasto.toFixed(2)}).`,
      },
      { status: 400 },
    );
  }

  const rep = await prisma.pmjnRepasse.update({
    where: { id },
    data: {
      valor: novoValor,
      dataRecebimento,
      numeroOrdemBancaria: parsed.data.numeroOrdemBancaria.trim(),
      extratoCaminho: pmjnPersistedFilePathFromClient(parsed.data.extratoCaminho),
      observacoes: parsed.data.observacoes ?? null,
    },
  });

  const saldo = await pmjnCalcularSaldo(prisma, id);
  return NextResponse.json({
    ...rep,
    valor: rep.valor.toString(),
    saldoDisponivel: saldo,
  });
}
