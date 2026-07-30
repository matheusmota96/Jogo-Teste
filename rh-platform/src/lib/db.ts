import { PrismaClient } from "@prisma/client";

// Singleton para evitar multiplas conexoes em dev (hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** True quando o banco nao foi configurado (DATABASE_URL ausente). */
export const isDbConfigured = Boolean(process.env.DATABASE_URL);
