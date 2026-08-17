import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError("DATABASE_URL nao configurada.");
  }
}

/** Meia-noite UTC de hoje (para comparar apenas datas, sem fuso). */
function todayUtcMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

export function daysUntil(date: Date): number {
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((target - todayUtcMs()) / 86400000);
}

/** Formata a data em pt-BR usando UTC (evita off-by-one de fuso). */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
}

export function whenLabel(days: number): string {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanha";
  if (days < 0) return "Realizado";
  return `em ${days} dias`;
}

export type AllHandsItem = {
  id: string;
  date: Date;
  title: string | null;
  notes: string | null;
  daysUntil: number;
  past: boolean;
};

export async function listAllHands(): Promise<AllHandsItem[]> {
  assertDb();
  const rows = await prisma.allHands.findMany({ orderBy: { date: "asc" } });
  return rows.map((r) => {
    const d = daysUntil(r.date);
    return { id: r.id, date: r.date, title: r.title, notes: r.notes, daysUntil: d, past: d < 0 };
  });
}

/** Proximo all hands (data >= hoje), para exibir no Dashboard. */
export async function getNextAllHands(): Promise<{ date: Date; title: string | null; daysUntil: number } | null> {
  if (!isDbConfigured) return null;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const next = await prisma.allHands.findFirst({
    where: { date: { gte: start } },
    orderBy: { date: "asc" },
  });
  if (!next) return null;
  return { date: next.date, title: next.title, daysUntil: daysUntil(next.date) };
}
