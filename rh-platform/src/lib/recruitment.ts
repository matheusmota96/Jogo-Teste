import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";
import type { PipelineStage } from "@prisma/client";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Etapas progressivas do funil (REPROVADO e terminal, tratado a parte). */
export const STAGE_ORDER: PipelineStage[] = [
  "INSCRITO",
  "TRIAGEM",
  "TESTE_COMPORTAMENTAL",
  "ENTREVISTA_RH",
  "ENTREVISTA_GESTOR",
  "CASE",
  "OFERTA",
  "CONTRATACAO",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  INSCRITO: "Inscrito",
  TRIAGEM: "Triagem",
  TESTE_COMPORTAMENTAL: "Teste Comportamental",
  ENTREVISTA_RH: "Entrevista RH",
  ENTREVISTA_GESTOR: "Entrevista Gestor",
  CASE: "Case",
  OFERTA: "Oferta",
  CONTRATACAO: "Contratacao",
  REPROVADO: "Reprovado",
};

/** Classe de cor da pill para cada etapa do pipeline. */
export function stageColor(
  stage: PipelineStage
): "green" | "red" | "amber" | "blue" | "gray" {
  switch (stage) {
    case "CONTRATACAO":
      return "green";
    case "REPROVADO":
      return "red";
    case "CASE":
    case "OFERTA":
      return "amber";
    case "TESTE_COMPORTAMENTAL":
    case "ENTREVISTA_RH":
    case "ENTREVISTA_GESTOR":
      return "blue";
    default:
      return "gray";
  }
}

/** Vagas com cargo e contagem de candidaturas, mais recentes primeiro. */
export async function listJobs() {
  assertDb();
  return prisma.job.findMany({
    orderBy: { openedAt: "desc" },
    include: {
      position: true,
      _count: { select: { applications: true } },
    },
  });
}

export type JobListItem = Awaited<ReturnType<typeof listJobs>>[number];

/** Vaga com cargo e candidaturas (incluindo o candidato) para agrupar por etapa. */
export async function getJob(id: string) {
  assertDb();
  return prisma.job.findUnique({
    where: { id },
    include: {
      position: true,
      applications: {
        orderBy: { createdAt: "asc" },
        include: { candidate: true },
      },
    },
  });
}

export type JobWithApplications = NonNullable<Awaited<ReturnType<typeof getJob>>>;

/** Indicadores gerais do modulo de recrutamento. */
export async function recruitmentKpis() {
  assertDb();
  const [vagasAbertas, totalCandidatos, contratacoes] = await Promise.all([
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.application.count(),
    prisma.application.count({ where: { stage: "CONTRATACAO" } }),
  ]);

  const taxaConversao =
    totalCandidatos > 0
      ? Math.round((contratacoes / totalCandidatos) * 100)
      : 0;

  return { vagasAbertas, totalCandidatos, contratacoes, taxaConversao };
}

/** Cargos disponiveis para abrir uma vaga (id, titulo, departamento). */
export async function listPositionsForSelect() {
  assertDb();
  return prisma.position.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, department: true },
  });
}
