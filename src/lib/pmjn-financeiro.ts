import type { Prisma, PrismaClient } from "@prisma/client";

/** Saldo do repasse: valor recebido − soma das despesas (regra pmjn). */
export async function pmjnCalcularSaldo(
  db: PrismaClient | Prisma.TransactionClient,
  repasseId: string,
): Promise<number> {
  const rep = await db.pmjnRepasse.findUnique({
    where: { id: repasseId },
    select: { valor: true },
  });
  if (!rep) return 0;
  const agg = await db.pmjnDespesa.aggregate({
    where: { repasseId },
    _sum: { valor: true },
  });
  return Number(rep.valor) - Number(agg._sum.valor ?? 0);
}

/** Aceita PDF ou XML no caminho da nota fiscal. */
export function pmjnValidarNF(caminho: string | null | undefined): boolean {
  if (!caminho) return false;
  return /\.(pdf|xml)$/i.test(caminho);
}

export async function pmjnMesEstaCongelado(
  db: PrismaClient,
  ano: number,
  mes: number,
): Promise<boolean> {
  const row = await db.pmjnFechamentoMensal.findUnique({
    where: { ano_mes: { ano, mes } },
  });
  return !!row;
}

function datePartsUTC(d: Date): { ano: number; mes: number } {
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

export async function pmjnGarantirRepasseNaoCongelado(
  db: PrismaClient,
  dataRecebimento: Date,
): Promise<void> {
  const { ano, mes } = datePartsUTC(dataRecebimento);
  if (await pmjnMesEstaCongelado(db, ano, mes)) {
    throw new Error("Mês fechado: registros de receita deste período são somente leitura.");
  }
}

export async function pmjnGarantirDespesaNaoCongelada(
  db: PrismaClient,
  dataDespesa: Date,
): Promise<void> {
  const { ano, mes } = datePartsUTC(dataDespesa);
  if (await pmjnMesEstaCongelado(db, ano, mes)) {
    throw new Error("Mês fechado: registros de despesa deste período são somente leitura.");
  }
}

export async function pmjnRegistrarLogEstouro(
  db: PrismaClient,
  input: {
    usuarioId: string | null;
    repasseId: string;
    valorSolicitado: number;
    saldoDisponivel: number;
  },
): Promise<void> {
  await db.pmjnLog.create({
    data: {
      mensagem:
        "pmjnLog: tentativa de lançamento de despesa acima do saldo disponível do repasse.",
      usuarioId: input.usuarioId ?? undefined,
      metadata: JSON.stringify({
        tipo: "ESTOURO_ORCAMENTO",
        repasseId: input.repasseId,
        valorSolicitado: input.valorSolicitado,
        saldoDisponivel: input.saldoDisponivel,
      }),
    },
  });
}
