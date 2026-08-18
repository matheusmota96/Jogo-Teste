import { PrismaClient } from "@prisma/client";

/**
 * Resolve a URL do banco priorizando a conexao DIRETA (sem pgbouncer), que e
 * mais confiavel com o Prisma. Cai para a pooled adicionando `pgbouncer=true`.
 * Aceita os nomes de variavel injetados pela integracao Neon/Vercel.
 */
function resolveDatabaseUrl(): string | undefined {
  const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (direct) return direct;

  const pooled = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!pooled) return undefined;
  if (pooled.includes("-pooler") && !pooled.includes("pgbouncer=true")) {
    return `${pooled}${pooled.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return pooled;
}

const databaseUrl = resolveDatabaseUrl();

// Singleton para evitar multiplas conexoes em dev (hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** True quando o banco foi configurado (via env). */
export const isDbConfigured = Boolean(databaseUrl);
