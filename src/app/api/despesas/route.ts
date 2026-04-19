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
import { pmjnPersistedFilePathFromClient } from "@/lib/pmjn-file-storage";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const list = await prisma.pmjnDespesa.findMany({
    orderBy: { dataDespesa: "desc" },
    include: {
      repasse: { select: { numeroOrdemBancaria: true } },
      categoria: { select: { nome: true } },
      usuario: { select: { nome: true } },
    },
  });

  return NextResponse.json(
    list.map((d) => ({
      ...d,
      valor: d.valor.toString(),
    })),
  );
}

const createSchema = z.object({
  repasseId: z.string().min(1),
  categoriaId: z.string().min(1),
  valor: z.coerce.number().positive(),
  dataDespesa: z.string().min(8),
  descricao: z.string().max(5000).optional().nullable(),
  notaFiscalCaminho: z.string().max(500).optional().nullable(),
  comprovanteCaminho: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const { session, error } = await requireGestor();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const repasse = await prisma.pmjnRepasse.findUnique({
    where: { id: parsed.data.repasseId },
  });
  if (!repasse) {
    return NextResponse.json({ error: "Repasse não encontrado." }, { status: 404 });
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

  const nf = pmjnPersistedFilePathFromClient(parsed.data.notaFiscalCaminho);
  if (nf && !pmjnValidarNF(nf)) {
    return NextResponse.json(
      { error: "Nota fiscal: envie arquivo PDF ou XML." },
      { status: 400 },
    );
  }

  const saldo = await pmjnCalcularSaldo(prisma, parsed.data.repasseId);
  const valor = parsed.data.valor;

  if (saldo <= 0) {
    return NextResponse.json(
      { error: "Saldo do repasse zerado. Não é permitido lançar despesas." },
      { status: 400 },
    );
  }

  if (valor > saldo) {
    await pmjnRegistrarLogEstouro(prisma, {
      usuarioId: session!.user.id,
      repasseId: parsed.data.repasseId,
      valorSolicitado: valor,
      saldoDisponivel: saldo,
    });
    return NextResponse.json(
      {
        error:
          "Despesa superior ao saldo disponível deste repasse. O evento foi registrado no log (pmjnLog).",
      },
      { status: 400 },
    );
  }

  const desp = await prisma.pmjnDespesa.create({
    data: {
      repasseId: parsed.data.repasseId,
      categoriaId: parsed.data.categoriaId,
      valor: new Prisma.Decimal(valor),
      dataDespesa,
      descricao: parsed.data.descricao ?? null,
      notaFiscalCaminho: nf ?? null,
      comprovanteCaminho: pmjnPersistedFilePathFromClient(parsed.data.comprovanteCaminho),
      usuarioId: session!.user.id,
    },
  });

  return NextResponse.json({ ...desp, valor: desp.valor.toString() }, { status: 201 });
}
