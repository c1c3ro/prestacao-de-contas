import { PrismaClient, PmjnPapelUsuario } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.pmjnUsuario.upsert({
    where: { email: "gestor@hospital.local" },
    create: {
      id: "seed_gestor",
      email: "gestor@hospital.local",
      passwordHash:
        "$2b$10$GoKl2j7ug1pP4uMD2tdPY.jgHACzOwxJyAJvelyjGZQ3gT9WZsOvu",
      nome: "Gestor do Hospital",
      papel: PmjnPapelUsuario.GESTOR,
    },
    update: {
      passwordHash:
        "$2b$10$GoKl2j7ug1pP4uMD2tdPY.jgHACzOwxJyAJvelyjGZQ3gT9WZsOvu",
    },
  });

  await prisma.pmjnUsuario.upsert({
    where: { email: "auditor@prefeitura.local" },
    create: {
      id: "seed_auditor",
      email: "auditor@prefeitura.local",
      passwordHash:
        "$2b$10$x0WbhUX8tgsUOCapu7KdQOwxIDnp9FIHDyYaSeh6rAuVEqztbM1om",
      nome: "Auditor da Prefeitura",
      papel: PmjnPapelUsuario.AUDITOR,
    },
    update: {
      passwordHash:
        "$2b$10$x0WbhUX8tgsUOCapu7KdQOwxIDnp9FIHDyYaSeh6rAuVEqztbM1om",
    },
  });

  const cats = [
    "Medicamentos",
    "Salários",
    "Energia",
    "Oxigênio",
    "Alimentação",
  ];
  for (const nome of cats) {
    const existing = await prisma.pmjnCategoriaDespesa.findFirst({
      where: { nome },
    });
    if (!existing) {
      await prisma.pmjnCategoriaDespesa.create({ data: { nome } });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
