// Executado no build da Vercel: aplica o schema (prisma db push) e roda os
// seeds de dados reais. Idempotente. Usa a conexao DIRETA (sem pgbouncer).
import { execSync } from "node:child_process";

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!url) {
  console.log("[db-init] Sem DATABASE_URL — pulando migracao/seed (build local).");
  process.exit(0);
}

const env = { ...process.env, DATABASE_URL: url };

console.log("[db-init] Aplicando schema (prisma db push)...");
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });

const seeds = ["prisma/seed-team.ts", "prisma/seed-allhands.ts", "prisma/seed-events.ts"];
for (const s of seeds) {
  try {
    console.log(`[db-init] Seed ${s}...`);
    execSync(`npx tsx ${s}`, { stdio: "inherit", env });
  } catch (e) {
    console.warn(`[db-init] Seed ${s} falhou (nao-fatal): ${e?.message ?? e}`);
  }
}
console.log("[db-init] Concluido.");
