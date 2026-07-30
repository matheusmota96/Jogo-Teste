import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";
import type { DiscFactor } from "./disc/types";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError("DATABASE_URL nao configurada.");
  }
}

export type PeopleAnalytics = {
  headcount: number;
  terminated: number;
  turnover: number; // %
  discCoverage: number; // %
  performanceAvg: number | null; // 1-5
  enps: number; // -100..100
  pdisConcluidos: number;
  onboardingEmAndamento: number;
  vagasAbertas: number;
  riscoDesligamento: number; // nº colaboradores em risco
  byDepartment: Array<{ department: string; count: number }>;
  byDiscPrimary: Array<{ factor: DiscFactor; count: number }>;
};

/** Painel executivo — agrega indicadores de todos os modulos. */
export async function getPeopleAnalytics(): Promise<PeopleAnalytics> {
  assertDb();

  const [collaborators, latestReviews, enpsResponses, pdisConcluidos, onboardingEmAndamento, vagasAbertas] =
    await Promise.all([
      prisma.collaborator.findMany({
        include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.performanceReview.findMany({
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.surveyResponse.findMany({
        where: { survey: { type: "ENPS" } },
        select: { score: true },
      }),
      prisma.pdi.count({ where: { status: "COMPLETED" } }),
      prisma.onboardingPlan.count({ where: { status: "IN_PROGRESS" } }),
      prisma.job.count({ where: { status: "OPEN" } }),
    ]);

  const active = collaborators.filter((c) => c.status === "ACTIVE");
  const terminated = collaborators.filter((c) => c.status === "TERMINATED").length;
  const headcount = active.length;
  const total = collaborators.length || 1;
  const turnover = Math.round((terminated / total) * 100);

  const mapped = collaborators.filter((c) => c.assessments.length > 0).length;
  const discCoverage = Math.round((mapped / total) * 100);

  // Performance media (ultima review por colaborador).
  const latestByCollaborator = new Map<string, number>();
  for (const r of latestReviews) {
    if (!latestByCollaborator.has(r.collaboratorId) && r.overallScore != null) {
      latestByCollaborator.set(r.collaboratorId, r.overallScore);
    }
  }
  const scores = [...latestByCollaborator.values()];
  const performanceAvg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  // Risco de desligamento: colaboradores ativos com ultima avaliacao <= 2.
  const riscoDesligamento = [...latestByCollaborator.entries()].filter(([id, s]) => {
    const c = collaborators.find((x) => x.id === id);
    return c?.status === "ACTIVE" && s <= 2;
  }).length;

  // eNPS.
  const promoters = enpsResponses.filter((r) => r.score >= 9).length;
  const detractors = enpsResponses.filter((r) => r.score <= 6).length;
  const enpsTotal = enpsResponses.length || 1;
  const enps = enpsResponses.length
    ? Math.round((promoters / enpsTotal) * 100 - (detractors / enpsTotal) * 100)
    : 0;

  // Distribuicoes.
  const deptMap = new Map<string, number>();
  for (const c of active) {
    const key = c.department ?? "Sem area";
    deptMap.set(key, (deptMap.get(key) ?? 0) + 1);
  }
  const byDepartment = [...deptMap.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const factors: DiscFactor[] = ["D", "I", "S", "C"];
  const byDiscPrimary = factors.map((factor) => ({
    factor,
    count: collaborators.filter((c) => c.assessments[0]?.primary === factor).length,
  }));

  return {
    headcount,
    terminated,
    turnover,
    discCoverage,
    performanceAvg,
    enps,
    pdisConcluidos,
    onboardingEmAndamento,
    vagasAbertas,
    riscoDesligamento,
    byDepartment,
    byDiscPrimary,
  };
}

// ==== Nine Box (Sucessao & Talentos) ====

export type NineBoxCell = {
  index: number; // 0..8
  title: string;
  band: "low" | "mid" | "high";
  people: Array<{ id: string; name: string }>;
};

const NINE_BOX_TITLES = [
  // linha 0 = alto potencial
  "Enigma", "Forte desempenho", "Estrela",
  // linha 1 = potencial medio
  "Questionavel", "Mantenedor", "Alto desempenho",
  // linha 2 = baixo potencial
  "Risco", "Eficaz", "Especialista",
];

// Faixa 1-5 -> 0 (baixo) / 1 (medio) / 2 (alto)
function band(score: number): 0 | 1 | 2 {
  if (score <= 2.33) return 0;
  if (score <= 3.66) return 1;
  return 2;
}

export async function getNineBox(): Promise<NineBoxCell[]> {
  assertDb();

  const reviews = await prisma.performanceReview.findMany({
    where: { overallScore: { not: null }, potentialScore: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { collaborator: { select: { id: true, name: true } } },
  });

  // Ultima review por colaborador.
  const seen = new Set<string>();
  const cells: NineBoxCell[] = NINE_BOX_TITLES.map((title, index) => ({
    index,
    title,
    band: index < 3 ? "high" : index < 6 ? "mid" : "low",
    people: [],
  }));

  for (const r of reviews) {
    if (seen.has(r.collaboratorId)) continue;
    seen.add(r.collaboratorId);
    const perf = band(r.overallScore!); // coluna: 0 baixo -> 2 alto
    const pot = band(r.potentialScore!); // linha
    // linha visual: alto potencial no topo (row 0). row = 2 - pot.
    const row = 2 - pot;
    const cellIndex = row * 3 + perf;
    cells[cellIndex].people.push({ id: r.collaborator.id, name: r.collaborator.name });
  }

  return cells;
}
