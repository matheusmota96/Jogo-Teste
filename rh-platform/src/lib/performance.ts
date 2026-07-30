import { isDbConfigured, prisma } from "@/lib/db";
import { DbUnavailableError } from "@/lib/collaborators";
import type { ReviewType, ReviewStatus, PdiStatus } from "@prisma/client";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

// ------------------------------------------------------------------
// Label maps + cores para pills
// ------------------------------------------------------------------

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  AUTO: "Autoavaliação",
  NINETY: "90°",
  ONE_EIGHTY: "180°",
  THREE_SIXTY: "360°",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
};

export const PDI_STATUS_LABELS: Record<PdiStatus, string> = {
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

type PillColor = "green" | "red" | "amber" | "blue" | "gray";

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, PillColor> = {
  DRAFT: "gray",
  IN_PROGRESS: "amber",
  COMPLETED: "green",
};

export const PDI_STATUS_COLORS: Record<PdiStatus, PillColor> = {
  IN_PROGRESS: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};

/** Converte uma nota de 1 a 5 em porcentagem (0-100) para barras `.meter`. */
export function scoreToPct(score: number): number {
  return (score / 5) * 100;
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

/** Avaliações de desempenho com colaborador, avaliador e competências. */
export async function listReviews() {
  assertDb();
  return prisma.performanceReview.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      collaborator: true,
      reviewer: true,
      ratings: true,
    },
  });
}

/** Uma avaliação com colaborador, avaliador e competências. */
export async function getReview(id: string) {
  assertDb();
  return prisma.performanceReview.findUnique({
    where: { id },
    include: {
      collaborator: true,
      reviewer: true,
      ratings: true,
    },
  });
}

/** PDIs com colaborador e ações, mais recentes primeiro. */
export async function listPdis() {
  assertDb();
  return prisma.pdi.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      collaborator: true,
      actions: true,
    },
  });
}

export type PerformanceKpis = {
  notaMedia: number | null;
  totalAvaliacoes: number;
  pdisEmAndamento: number;
  pdisConcluidos: number;
  highPerformers: number;
  lowPerformers: number;
};

/** Indicadores agregados de performance. */
export async function performanceKpis(): Promise<PerformanceKpis> {
  assertDb();

  const [reviews, totalAvaliacoes, pdisEmAndamento, pdisConcluidos] =
    await Promise.all([
      prisma.performanceReview.findMany({
        where: { status: "COMPLETED", overallScore: { not: null } },
        select: { overallScore: true },
      }),
      prisma.performanceReview.count(),
      prisma.pdi.count({ where: { status: "IN_PROGRESS" } }),
      prisma.pdi.count({ where: { status: "COMPLETED" } }),
    ]);

  const scores = reviews
    .map((r) => r.overallScore)
    .filter((s): s is number => s !== null);

  const notaMedia =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  const highPerformers = scores.filter((s) => s >= 4).length;
  const lowPerformers = scores.filter((s) => s <= 2).length;

  return {
    notaMedia,
    totalAvaliacoes,
    pdisEmAndamento,
    pdisConcluidos,
    highPerformers,
    lowPerformers,
  };
}

/** Colaboradores (id + nome) para popular selects. */
export async function listCollaboratorsForSelect() {
  assertDb();
  return prisma.collaborator.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type CollaboratorOption = { id: string; name: string };
