import { isDbConfigured, prisma } from "@/lib/db";
import { DbUnavailableError } from "@/lib/collaborators";
import type { SurveyType, SurveyStatus } from "@prisma/client";

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

type PillColor = "green" | "red" | "amber" | "blue" | "gray";

export const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  CLIMA: "Clima",
  ENPS: "eNPS",
  PULSE: "Pulse",
  EXPERIENCIA: "Experiência",
  DESLIGAMENTO: "Desligamento",
};

export const SURVEY_TYPE_COLORS: Record<SurveyType, PillColor> = {
  CLIMA: "blue",
  ENPS: "green",
  PULSE: "amber",
  EXPERIENCIA: "gray",
  DESLIGAMENTO: "red",
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  OPEN: "Aberta",
  CLOSED: "Encerrada",
};

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, PillColor> = {
  OPEN: "green",
  CLOSED: "gray",
};

// ------------------------------------------------------------------
// eNPS
// ------------------------------------------------------------------

export type EnpsResult = {
  enps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
};

/**
 * Calcula o eNPS a partir de uma lista de notas (0-10).
 * Regra: 9-10 promotor, 7-8 neutro, 0-6 detrator.
 * eNPS = round(%promotores - %detratores), intervalo -100..100.
 */
export function computeENPS(scores: number[]): EnpsResult {
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const total = scores.length;
  const enps =
    total === 0
      ? 0
      : Math.round((promoters / total) * 100 - (detractors / total) * 100);
  return { enps, promoters, passives, detractors, total };
}

/** Classifica uma nota (0-10) em categoria de eNPS e cor da pill. */
export function scoreCategory(score: number): {
  label: string;
  color: PillColor;
} {
  if (score >= 9) return { label: "Promotor", color: "green" };
  if (score >= 7) return { label: "Neutro", color: "amber" };
  return { label: "Detrator", color: "red" };
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

export type SurveyListItem = {
  id: string;
  title: string;
  type: SurveyType;
  status: SurveyStatus;
  question: string | null;
  createdAt: Date;
  participacao: number;
  enps: number | null;
};

/** Lista pesquisas com participação e, quando eNPS, o índice calculado. */
export async function listSurveys(): Promise<SurveyListItem[]> {
  assertDb();
  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      responses: { select: { score: true } },
    },
  });

  return surveys.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    status: s.status,
    question: s.question,
    createdAt: s.createdAt,
    participacao: s.responses.length,
    enps:
      s.type === "ENPS"
        ? computeENPS(s.responses.map((r) => r.score)).enps
        : null,
  }));
}

/** Uma pesquisa com respostas (incluindo o nome do colaborador). */
export async function getSurvey(id: string) {
  assertDb();
  return prisma.survey.findUnique({
    where: { id },
    include: {
      responses: {
        orderBy: { createdAt: "desc" },
        include: {
          collaborator: { select: { id: true, name: true } },
        },
      },
    },
  });
}

/** Reconhecimentos recentes com quem deu e quem recebeu. */
export async function listRecognitions() {
  assertDb();
  return prisma.recognition.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } },
    },
  });
}

export type EngagementKpis = {
  enpsGeral: EnpsResult;
  pesquisasAtivas: number;
  totalReconhecimentos: number;
  participacaoMedia: number;
};

/** Indicadores agregados de engajamento. */
export async function engagementKpis(): Promise<EngagementKpis> {
  assertDb();

  const [enpsResponses, pesquisasAtivas, totalReconhecimentos, totalPesquisas, totalRespostas] =
    await Promise.all([
      prisma.surveyResponse.findMany({
        where: { survey: { type: "ENPS" } },
        select: { score: true },
      }),
      prisma.survey.count({ where: { status: "OPEN" } }),
      prisma.recognition.count(),
      prisma.survey.count(),
      prisma.surveyResponse.count(),
    ]);

  const enpsGeral = computeENPS(enpsResponses.map((r) => r.score));
  const participacaoMedia =
    totalPesquisas === 0 ? 0 : Math.round(totalRespostas / totalPesquisas);

  return {
    enpsGeral,
    pesquisasAtivas,
    totalReconhecimentos,
    participacaoMedia,
  };
}

export type CollaboratorOption = { id: string; name: string };

/** Colaboradores (id + nome) para popular selects. */
export async function listCollaboratorsForSelect(): Promise<CollaboratorOption[]> {
  assertDb();
  return prisma.collaborator.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
