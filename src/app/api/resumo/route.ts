import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { pmjnCalcularSaldo } from "@/lib/pmjn-financeiro";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const [aggRep, aggDesp, repasses] = await Promise.all([
    prisma.pmjnRepasse.aggregate({ _sum: { valor: true } }),
    prisma.pmjnDespesa.aggregate({ _sum: { valor: true } }),
    prisma.pmjnRepasse.findMany({ select: { id: true, numeroOrdemBancaria: true, valor: true } }),
  ]);

  const totalRecebido = Number(aggRep._sum.valor ?? 0);
  const totalDespesas = Number(aggDesp._sum.valor ?? 0);

  const porRepasse = await Promise.all(
    repasses.map(async (r) => ({
      id: r.id,
      numeroOrdemBancaria: r.numeroOrdemBancaria,
      valorRecebido: Number(r.valor),
      saldoDisponivel: await pmjnCalcularSaldo(prisma, r.id),
    })),
  );

  return NextResponse.json({
    totalRecebido,
    totalDespesas,
    saldoGlobal: totalRecebido - totalDespesas,
    porRepasse,
  });
}
