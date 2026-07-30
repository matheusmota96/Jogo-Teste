import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";
import { compatibility } from "./disc/score";
import type { DiscScore } from "./disc/types";
import type { Seniority, ContractType } from "@prisma/client";

export { DbUnavailableError };

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Rotulos legiveis para o enum de senioridade. */
export const SENIORITY_LABELS: Record<Seniority, string> = {
  ESTAGIO: "Estagio",
  ASSISTENTE: "Assistente",
  ANALISTA_JR: "Analista Junior",
  ANALISTA_PL: "Analista Pleno",
  ANALISTA_SR: "Analista Senior",
  COORDENADOR: "Coordenador",
  GERENTE: "Gerente",
  DIRETOR: "Diretor",
};

/** Rotulos legiveis para o enum de tipo de contrato. */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CLT: "CLT",
  PJ: "PJ",
  ESTAGIO: "Estagio",
  TEMPORARIO: "Temporario",
};

export const SENIORITY_VALUES: Seniority[] = [
  "ESTAGIO",
  "ASSISTENTE",
  "ANALISTA_JR",
  "ANALISTA_PL",
  "ANALISTA_SR",
  "COORDENADOR",
  "GERENTE",
  "DIRETOR",
];

export const CONTRACT_TYPE_VALUES: ContractType[] = [
  "CLT",
  "PJ",
  "ESTAGIO",
  "TEMPORARIO",
];

/** Lista cargos ordenados por departamento e titulo, com competencias e contagens. */
export async function listPositions() {
  assertDb();
  return prisma.position.findMany({
    orderBy: [{ department: "asc" }, { title: "asc" }],
    include: {
      competencies: true,
      parent: true,
      _count: { select: { collaborators: true, jobs: true } },
    },
  });
}

/** Cargo com competencias, colaboradores (DISC mais recente), pai e filhos. */
export async function getPosition(id: string) {
  assertDb();
  return prisma.position.findUnique({
    where: { id },
    include: {
      competencies: true,
      parent: true,
      children: true,
      collaborators: {
        include: {
          assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
}

/** Fit comportamental (0-100) entre o perfil ideal do cargo e o do colaborador. */
export function positionFit(
  idealScores: DiscScore,
  collaboratorScores: DiscScore
): number {
  return compatibility(idealScores, collaboratorScores);
}
