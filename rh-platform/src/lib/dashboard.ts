import { Prisma } from "@prisma/client";
import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError("DATABASE_URL nao configurada.");
  }
}

// ---------- Helpers ----------

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function monthLabel(d: Date): string {
  return `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

export function formatBRL(n: number, decimals = 0): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTenure(admission: Date | null): string {
  if (!admission) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - admission.getFullYear()) * 12 + (now.getMonth() - admission.getMonth());
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y > 0) return m > 0 ? `${y}a ${m}m` : `${y}a`;
  return `${m}m`;
}

export type Period = "mes" | "3m" | "6m" | "12m" | "ano";

export const PERIOD_LABELS: Record<Period, string> = {
  mes: "Mês atual",
  "3m": "3 meses",
  "6m": "6 meses",
  "12m": "12 meses",
  ano: "Ano atual",
};

type Bucket = { label: string; start: Date; end: Date };

function monthBuckets(period: Period): Bucket[] {
  const now = new Date();
  let count: number;
  if (period === "mes") count = 1;
  else if (period === "3m") count = 3;
  else if (period === "6m") count = 6;
  else if (period === "12m") count = 12;
  else count = now.getMonth() + 1; // ano atual: jan..mes corrente

  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); // exclusivo
    buckets.push({ label: monthLabel(start), start, end });
  }
  return buckets;
}

// ---------- Tipos de retorno ----------

export type DashboardFilters = {
  period: Period;
  companyId?: string;
  department?: string;
  managerId?: string;
};

export type SectorMember = {
  id: string;
  name: string;
  role: string | null;
  manager: string | null;
  admissionDate: Date | null;
  salary: number | null;
  tenure: string;
};

export type Sector = {
  department: string;
  people: number;
  pctHeadcount: number;
  cost: number;
  pctCost: number;
  avgCost: number;
  members: SectorMember[];
};

export type Birthday = {
  id: string;
  name: string;
  department: string | null;
  dateLabel: string;
  turningAge: number;
  daysUntil: number;
};

export type DashboardData = {
  cards: {
    headcount: number;
    headcountDelta: number | null;
    monthlyCost: number;
    admissions: number;
    terminations: number;
    netGrowth: number;
    turnover: number;
    avgPerformance: number | null;
  };
  totals: { people: number; cost: number };
  sectors: Sector[];
  distribution: Array<{ department: string; count: number }>;
  evolution: Array<{ label: string; headcount: number; cost: number }>;
  hiresVsExits: Array<{ label: string; hires: number; exits: number }>;
  admissionsList: Array<{ id: string; name: string; department: string | null; date: Date | null }>;
  terminationsList: Array<{ id: string; name: string; department: string | null; date: Date | null }>;
  performance: {
    avg: number | null;
    high: number;
    expected: number;
    below: number;
    pending: number;
    bySector: Array<{ department: string; avg: number | null; count: number }>;
  };
  alerts: Array<{ level: "info" | "warn" | "critical"; text: string }>;
  birthdays: Birthday[];
  hasHistory: boolean;
  hasPerformance: boolean;
};

export type FilterOptions = {
  companies: Array<{ id: string; name: string }>;
  departments: string[];
  managers: Array<{ id: string; name: string }>;
};

// ---------- Consultas ----------

export async function getFilterOptions(): Promise<FilterOptions> {
  assertDb();
  const [companies, depts, managers] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collaborator.findMany({
      where: { department: { not: null } },
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" },
    }),
    prisma.collaborator.findMany({
      where: { reports: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    companies,
    departments: depts.map((d) => d.department!).filter(Boolean),
    managers,
  };
}

function baseWhere(filters: DashboardFilters): Prisma.CollaboratorWhereInput {
  const where: Prisma.CollaboratorWhereInput = {};
  if (filters.companyId) where.companies = { some: { id: filters.companyId } };
  if (filters.department) where.department = filters.department;
  if (filters.managerId) where.managerId = filters.managerId;
  return where;
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  assertDb();

  const scope = baseWhere(filters);
  const buckets = monthBuckets(filters.period);
  const periodStart = buckets[0].start;
  const now = new Date();

  // Base: colaboradores ativos (snapshot atual) e todos (para historico).
  const [active, all, reviews, overduePdis] = await Promise.all([
    prisma.collaborator.findMany({
      where: { ...scope, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        salary: true,
        admissionDate: true,
        birthDate: true,
        manager: { select: { name: true } },
      },
    }),
    prisma.collaborator.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        department: true,
        salary: true,
        status: true,
        admissionDate: true,
        terminationDate: true,
      },
    }),
    prisma.performanceReview.findMany({
      where: { status: "COMPLETED", overallScore: { not: null }, collaborator: { ...scope, status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      select: { collaboratorId: true, overallScore: true, collaborator: { select: { department: true } } },
    }),
    prisma.pdiAction.count({
      where: { done: false, dueDate: { lt: now }, pdi: { collaborator: scope } },
    }),
  ]);

  // --- Headcount e custo (snapshot) ---
  const headcount = active.length;
  const monthlyCost = active.reduce((s, c) => s + (c.salary ?? 0), 0);

  // --- Setores ---
  const byDept = new Map<string, typeof active>();
  for (const c of active) {
    const key = c.department ?? "Sem setor";
    if (!byDept.has(key)) byDept.set(key, []);
    byDept.get(key)!.push(c);
  }
  const sectors: Sector[] = [...byDept.entries()]
    .map(([department, members]) => {
      const cost = members.reduce((s, m) => s + (m.salary ?? 0), 0);
      return {
        department,
        people: members.length,
        pctHeadcount: headcount ? (members.length / headcount) * 100 : 0,
        cost,
        pctCost: monthlyCost ? (cost / monthlyCost) * 100 : 0,
        avgCost: members.length ? cost / members.length : 0,
        members: members
          .map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            manager: m.manager?.name ?? null,
            admissionDate: m.admissionDate,
            salary: m.salary,
            tenure: formatTenure(m.admissionDate),
          }))
          .sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0)),
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const distribution = sectors
    .map((s) => ({ department: s.department, count: s.people }))
    .sort((a, b) => b.count - a.count);

  // --- Admissoes / desligamentos no periodo ---
  const admissionsList = all
    .filter((c) => c.admissionDate && c.admissionDate >= periodStart && c.admissionDate < now)
    .map((c) => ({ id: c.id, name: c.name, department: c.department, date: c.admissionDate }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const terminationsList = all
    .filter(
      (c) =>
        c.status === "TERMINATED" &&
        c.terminationDate &&
        c.terminationDate >= periodStart &&
        c.terminationDate < now
    )
    .map((c) => ({ id: c.id, name: c.name, department: c.department, date: c.terminationDate }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const admissions = admissionsList.length;
  const terminations = terminationsList.length;
  const netGrowth = admissions - terminations;
  const turnover = headcount ? (terminations / headcount) * 100 : 0;

  const hasHistory = all.some((c) => c.admissionDate || c.terminationDate);

  // Delta de headcount no mes corrente (real, se houver datas).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthHires = all.filter((c) => c.admissionDate && c.admissionDate >= monthStart).length;
  const monthExits = all.filter(
    (c) => c.terminationDate && c.terminationDate >= monthStart && c.status === "TERMINATED"
  ).length;
  const headcountDelta = hasHistory ? monthHires - monthExits : null;

  // --- Evolucao mensal (headcount x custo) ---
  const evolution = buckets.map((b) => {
    const membersAt = all.filter(
      (c) =>
        c.admissionDate &&
        c.admissionDate < b.end &&
        (!c.terminationDate || c.terminationDate >= b.end)
    );
    return {
      label: b.label,
      headcount: membersAt.length,
      cost: membersAt.reduce((s, c) => s + (c.salary ?? 0), 0),
    };
  });

  const hiresVsExits = buckets.map((b) => ({
    label: b.label,
    hires: all.filter((c) => c.admissionDate && c.admissionDate >= b.start && c.admissionDate < b.end)
      .length,
    exits: all.filter(
      (c) => c.terminationDate && c.terminationDate >= b.start && c.terminationDate < b.end
    ).length,
  }));

  // --- Performance ---
  const latestByCollab = new Map<string, { score: number; department: string | null }>();
  for (const r of reviews) {
    if (!latestByCollab.has(r.collaboratorId) && r.overallScore != null) {
      latestByCollab.set(r.collaboratorId, {
        score: r.overallScore,
        department: r.collaborator.department,
      });
    }
  }
  const scores = [...latestByCollab.values()];
  const avgPerformance = scores.length
    ? Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 10) / 10
    : null;
  const high = scores.filter((s) => s.score >= 4).length;
  const expected = scores.filter((s) => s.score >= 3 && s.score < 4).length;
  const below = scores.filter((s) => s.score < 3).length;
  const pending = Math.max(0, headcount - latestByCollab.size);

  const perfByDept = new Map<string, number[]>();
  for (const s of scores) {
    const key = s.department ?? "Sem setor";
    if (!perfByDept.has(key)) perfByDept.set(key, []);
    perfByDept.get(key)!.push(s.score);
  }
  const bySector = sectors.map((sec) => {
    const arr = perfByDept.get(sec.department) ?? [];
    return {
      department: sec.department,
      count: arr.length,
      avg: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
    };
  });

  // --- Alertas do RH (apenas o que e computavel a partir de dados reais) ---
  const alerts: DashboardData["alerts"] = [];
  if (pending > 0) {
    alerts.push({
      level: "warn",
      text: `${pending} ${pending === 1 ? "colaborador" : "colaboradores"} sem avaliacao de desempenho registrada`,
    });
  }
  if (below > 0) {
    alerts.push({
      level: "critical",
      text: `${below} ${below === 1 ? "colaborador" : "colaboradores"} abaixo do esperado em performance`,
    });
  }
  if (overduePdis > 0) {
    alerts.push({ level: "warn", text: `${overduePdis} ${overduePdis === 1 ? "PDI atrasado" : "PDIs atrasados"}` });
  }
  // Fim de periodo de experiencia (75-90 dias de casa) — depende de admissionDate.
  const expEnding = all.filter((c) => {
    if (!c.admissionDate || c.status !== "ACTIVE") return false;
    const days = (now.getTime() - c.admissionDate.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 75 && days <= 90;
  }).length;
  if (expEnding > 0) {
    alerts.push({
      level: "info",
      text: `${expEnding} ${expEnding === 1 ? "colaborador encerra" : "colaboradores encerram"} o periodo de experiencia nos proximos 15 dias`,
    });
  }
  // Turnover de setor acima da media (so faz sentido com historico).
  if (hasHistory && turnover > 0) {
    for (const sec of sectors) {
      const secExits = terminationsList.filter((t) => (t.department ?? "Sem setor") === sec.department).length;
      const secTurnover = sec.people ? (secExits / sec.people) * 100 : 0;
      if (secTurnover > turnover * 1.5 && secExits > 0) {
        alerts.push({
          level: "warn",
          text: `Turnover de ${sec.department} (${secTurnover.toFixed(0)}%) acima da media da empresa`,
        });
      }
    }
  }

  // --- Proximos aniversariantes (UTC, para evitar off-by-one de fuso) ---
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const birthdays: Birthday[] = active
    .filter((c) => c.birthDate)
    .map((c) => {
      const b = c.birthDate as Date;
      const bm = b.getUTCMonth();
      const bd = b.getUTCDate();
      let nextUTC = Date.UTC(now.getUTCFullYear(), bm, bd);
      if (nextUTC < todayUTC) nextUTC = Date.UTC(now.getUTCFullYear() + 1, bm, bd);
      const daysUntil = Math.round((nextUTC - todayUTC) / 86400000);
      return {
        id: c.id,
        name: c.name,
        department: c.department,
        dateLabel: `${String(bd).padStart(2, "0")}/${String(bm + 1).padStart(2, "0")}`,
        turningAge: new Date(nextUTC).getUTCFullYear() - b.getUTCFullYear(),
        daysUntil,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  return {
    cards: {
      headcount,
      headcountDelta,
      monthlyCost,
      admissions,
      terminations,
      netGrowth,
      turnover: Math.round(turnover * 10) / 10,
      avgPerformance,
    },
    totals: { people: headcount, cost: monthlyCost },
    sectors,
    distribution,
    evolution,
    hiresVsExits,
    admissionsList,
    terminationsList,
    performance: { avg: avgPerformance, high, expected, below, pending, bySector },
    alerts,
    birthdays,
    hasHistory,
    hasPerformance: scores.length > 0,
  };
}
