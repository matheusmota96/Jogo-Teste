import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";
import type { OkrLevel } from "@prisma/client";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Ordem canonica dos niveis de OKR. */
export const OKR_LEVEL_ORDER: OkrLevel[] = ["COMPANY", "AREA", "INDIVIDUAL"];

export const OKR_LEVEL_LABELS: Record<OkrLevel, string> = {
  COMPANY: "Empresa",
  AREA: "Área",
  INDIVIDUAL: "Individual",
};

/** Classe de cor da pill para cada nivel de OKR. */
export function levelColor(
  level: OkrLevel
): "green" | "red" | "amber" | "blue" | "gray" {
  switch (level) {
    case "COMPANY":
      return "blue";
    case "AREA":
      return "amber";
    case "INDIVIDUAL":
      return "green";
    default:
      return "gray";
  }
}

/** Progresso do objetivo = media (arredondada) dos progressos dos KRs, 0 se nao houver. */
export function objectiveProgress(keyResults: { progress: number }[]): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((acc, kr) => acc + kr.progress, 0);
  return Math.round(sum / keyResults.length);
}

/** Objetivos com KRs e responsavel, ordenados por nivel e depois criacao. */
export async function listObjectives() {
  assertDb();
  const objectives = await prisma.objective.findMany({
    orderBy: [{ level: "asc" }, { createdAt: "asc" }],
    include: {
      keyResults: { orderBy: { title: "asc" } },
      owner: true,
    },
  });

  return objectives.map((o) => ({
    ...o,
    progress: objectiveProgress(o.keyResults),
  }));
}

export type ObjectiveListItem = Awaited<ReturnType<typeof listObjectives>>[number];

/** Indicadores gerais do modulo de OKRs. */
export async function okrKpis() {
  assertDb();
  const objectives = await prisma.objective.findMany({
    include: { keyResults: { select: { progress: true } } },
  });

  const totalObjetivos = objectives.length;
  const progressos = objectives.map((o) => objectiveProgress(o.keyResults));
  const progressoMedio =
    totalObjetivos > 0
      ? Math.round(progressos.reduce((acc, p) => acc + p, 0) / totalObjetivos)
      : 0;
  const objetivosConcluidos = progressos.filter((p) => p === 100).length;

  return { totalObjetivos, progressoMedio, objetivosConcluidos };
}

/** Colaboradores disponiveis para serem responsaveis (id, nome). */
export async function listCollaboratorsForSelect() {
  assertDb();
  return prisma.collaborator.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type CollaboratorSelectItem = Awaited<
  ReturnType<typeof listCollaboratorsForSelect>
>[number];
