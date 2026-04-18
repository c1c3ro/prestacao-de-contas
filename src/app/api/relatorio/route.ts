import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { pmjnCalcularSaldo } from "@/lib/pmjn-financeiro";

const qSchema = z.object({
  ano: z.coerce.number().int(),
  mes: z.coerce.number().int().min(1).max(12),
});

export async function GET(req: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = qSchema.safeParse({
    ano: url.searchParams.get("ano"),
    mes: url.searchParams.get("mes"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe ano e mês." }, { status: 400 });
  }

  const { ano, mes } = parsed.data;
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  const [repasses, despesas, fechado] = await Promise.all([
    prisma.pmjnRepasse.findMany({
      where: { dataRecebimento: { gte: inicio, lte: fim } },
      orderBy: { dataRecebimento: "asc" },
    }),
    prisma.pmjnDespesa.findMany({
      where: { dataDespesa: { gte: inicio, lte: fim } },
      include: { categoria: true, repasse: { select: { numeroOrdemBancaria: true } } },
      orderBy: { dataDespesa: "asc" },
    }),
    prisma.pmjnFechamentoMensal.findUnique({
      where: { ano_mes: { ano, mes } },
    }),
  ]);

  const totRep = repasses.reduce((a, r) => a + Number(r.valor), 0);
  const totDesp = despesas.reduce((a, d) => a + Number(d.valor), 0);

  const saldosRepasse = await Promise.all(
    repasses.map(async (r) => ({
      id: r.id,
      numeroOrdemBancaria: r.numeroOrdemBancaria,
      valor: Number(r.valor),
      saldoAtual: await pmjnCalcularSaldo(prisma, r.id),
    })),
  );

  return NextResponse.json({
    periodo: { ano, mes },
    fechado: !!fechado,
    resumo: {
      totalRecebidoPeriodo: totRep,
      totalDespesasPeriodo: totDesp,
      saldoPeriodo: totRep - totDesp,
    },
    repasses: repasses.map((r) => ({
      ...r,
      valor: r.valor.toString(),
    })),
    despesas: despesas.map((d) => ({
      ...d,
      valor: d.valor.toString(),
    })),
    saldosRepasse,
  });
}
