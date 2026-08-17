import { PrismaClient } from "@prisma/client";

// Eventos da empresa informados (2026). Idempotente: nao duplica.
// Rode com: npm run db:seed:events

const prisma = new PrismaClient();

const EVENTS: Array<{ date: string; title: string; type: "CAFE_DA_MANHA" | "CONFRATERNIZACAO" }> = [
  { date: "2026-09-09", title: "Cafe da manha B4you", type: "CAFE_DA_MANHA" },
  { date: "2026-10-06", title: "Cafe da manha B4you", type: "CAFE_DA_MANHA" },
  { date: "2026-11-06", title: "Cafe da manha B4you", type: "CAFE_DA_MANHA" },
  { date: "2026-12-18", title: "Confraternizacao da empresa", type: "CONFRATERNIZACAO" },
];

async function main() {
  let created = 0;
  for (const ev of EVENTS) {
    const date = new Date(`${ev.date}T00:00:00.000Z`);
    const existing = await prisma.companyEvent.findFirst({ where: { date, title: ev.title } });
    if (existing) continue;
    await prisma.companyEvent.create({ data: { date, title: ev.title, type: ev.type } });
    created++;
  }
  console.log(`Eventos da empresa: ${created} cadastrados (${EVENTS.length} no total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
