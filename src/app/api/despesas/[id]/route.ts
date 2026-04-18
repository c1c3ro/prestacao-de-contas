import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGestor, requireSession } from "@/lib/api-auth";
import {
  pmjnCalcularSaldo,
  pmjnGarantirDespesaNaoCongelada,
  pmjnRegistrarLogEstouro,
  pmjnValidarNF,
} from "@/lib/pmjn-financeiro";
import { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;

  const desp = await prisma.pmjnDespesa.findUnique({
    where: { id },
    include: {
      repasse: true,
      categoria: true,
      usuario: { select: { nome: true } },
    },
  });
  if (!desp) return NextResponse.json({ error: "Despesa não encontrada." }, { status: 404 });

  return NextResponse.json({
    ...desp,
    valor: desp.valor.toString(),
    repasse: { ...desp.repasse, valor: desp.repasse.valor.toString() },
  });
}

const updateSchema = z.object({
  categoriaId: z.string().min(1),
  valor: z.coerce.number().positive(),
  dataDespesa: z.string().min(8),
  descricao: z.string().max(5000).optional().nullable(),
  notaFiscalCaminho: z.string().max(500).optional().nullable(),
  comprovanteCaminho: z.string().max(500).optional().nullable(),
});

export async function PUT(req: Request, ctx: Ctx) {
  const { session, error } = await requireGestor();
  if (error) return error;
  const { id } = await ctx.params;

  const exist = await prisma.pmjnDespesa.findUnique({ where: { id } });
  if (!exist) return NextResponse.json({ error: "Despesa não encontrada." }, { status: 404 });

  try {
    await pmjnGarantirDespesaNaoCongelada(prisma, exist.dataDespesa);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mês fechado.";
    return NextResponse.json({ error: msg }, { status: 423 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const dataDespesa = new Date(parsed.data.dataDespesa + "T12:00:00.000Z");
  if (Number.isNaN(dataDespesa.getTime())) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  try {
    await pmjnGarantirDespesaNaoCongelada(prisma, dataDespesa);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mês fechado.";
    return NextResponse.json({ error: msg }, { status: 423 });
  }

  const nf = parsed.data.notaFiscalCaminho;
  if (nf && !pmjnValidarNF(nf)) {
    return NextResponse.json(
      { error: "Nota fiscal: envie arquivo PDF ou XML." },
      { status: 400 },
    );
  }

  const repasseId = exist.repasseId;
  const saldoAtual = await pmjnCalcularSaldo(prisma, repasseId);
  const saldoComLinhaLiberada = saldoAtual + Number(exist.valor);
  const valor = parsed.data.valor;

  if (saldoComLinhaLiberada <= 0) {
    return NextResponse.json(
      { error: "Saldo do repasse zerado. Não é permitido lançar despesas." },
      { status: 400 },
    );
  }

  if (valor > saldoComLinhaLiberada) {
    await pmjnRegistrarLogEstouro(prisma, {
      usuarioId: session!.user.id,
      repasseId,
      valorSolicitado: valor,
      saldoDisponivel: saldoComLinhaLiberada,
    });
    return NextResponse.json(
      {
        error:
          "Despesa superior ao saldo disponível deste repasse. O evento foi registrado no log (pmjnLog).",
      },
      { status: 400 },
    );
  }

  const desp = await prisma.pmjnDespesa.update({
    where: { id },
    data: {
      categoriaId: parsed.data.categoriaId,
      valor: new Prisma.Decimal(valor),
      dataDespesa,
      descricao: parsed.data.descricao ?? null,
      notaFiscalCaminho: nf ?? null,
      comprovanteCaminho: parsed.data.comprovanteCaminho ?? null,
      usuarioId: session!.user.id,
    },
  });

  return NextResponse.json({ ...desp, valor: desp.valor.toString() });
}
