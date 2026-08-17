import { PrismaClient } from "@prisma/client";

// Calendario de All Hands informado pela empresa (datas de 2026).
// Idempotente: nao duplica datas ja cadastradas.
// Rode com: npm run db:seed:allhands

const prisma = new PrismaClient();

const DATES_2026 = [
  "2026-08-26",
  "2026-09-10",
  "2026-09-24",
  "2026-10-08",
  "2026-10-22",
  "2026-11-05",
  "2026-11-19",
  "2026-12-03",
  "2026-12-17",
];

async function main() {
  let created = 0;
  for (const d of DATES_2026) {
    const date = new Date(`${d}T00:00:00.000Z`);
    const existing = await prisma.allHands.findFirst({ where: { date } });
    if (existing) continue;
    await prisma.allHands.create({ data: { date } });
    created++;
  }
  console.log(`All Hands: ${created} datas cadastradas (${DATES_2026.length} no total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
