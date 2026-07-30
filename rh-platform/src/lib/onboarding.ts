import { OnboardingCategory, OnboardingStatus } from "@prisma/client";
import { isDbConfigured, prisma } from "@/lib/db";
import { DbUnavailableError } from "@/lib/collaborators";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Modelo de tarefa padrao para o plano dos primeiros 90 dias. */
export type DefaultOnboardingTask = {
  title: string;
  category: OnboardingCategory;
  dueDay: number;
};

/**
 * Checklist + plano dos primeiros 90 dias aplicado a cada novo colaborador.
 * dueDay distribui as tarefas ao longo dos 90 dias.
 */
export const DEFAULT_ONBOARDING_TASKS: DefaultOnboardingTask[] = [
  { title: "Entrega dos documentos admissionais", category: "DOCUMENTO", dueDay: 1 },
  { title: "Assinatura do contrato de trabalho", category: "ASSINATURA", dueDay: 2 },
  { title: "Setup de equipamentos, e-mail e acessos", category: "EQUIPAMENTO", dueDay: 3 },
  { title: "Boas-vindas e imersao na cultura da empresa", category: "INTEGRACAO", dueDay: 5 },
  { title: "Treinamento das ferramentas internas", category: "TREINAMENTO", dueDay: 10 },
  { title: "Apresentacao a equipe e principais stakeholders", category: "INTEGRACAO", dueDay: 15 },
  { title: "Assinatura das politicas internas e do codigo de conduta", category: "ASSINATURA", dueDay: 20 },
  { title: "Treinamento dos processos e rotinas da area", category: "TREINAMENTO", dueDay: 30 },
  { title: "Definicao das primeiras metas dos 90 dias", category: "META", dueDay: 30 },
  { title: "Check-in do gestor (30 dias)", category: "INTEGRACAO", dueDay: 45 },
  { title: "Check-in do gestor (60 dias)", category: "INTEGRACAO", dueDay: 60 },
  { title: "Avaliacao das metas e feedback dos 90 dias", category: "META", dueDay: 90 },
];

/** Rotulos legiveis (pt-BR) por categoria de tarefa. */
export const CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  DOCUMENTO: "Documentos",
  ASSINATURA: "Assinaturas",
  TREINAMENTO: "Treinamentos",
  INTEGRACAO: "Integracao",
  EQUIPAMENTO: "Equipamentos",
  META: "Metas dos 90 dias",
};

/** Cor da pill (classe CSS existente) por categoria. */
export const CATEGORY_PILL_COLORS: Record<OnboardingCategory, string> = {
  DOCUMENTO: "blue",
  ASSINATURA: "amber",
  TREINAMENTO: "green",
  INTEGRACAO: "gray",
  EQUIPAMENTO: "blue",
  META: "amber",
};

/** Rotulos legiveis (pt-BR) por status do plano. */
export const STATUS_LABELS: Record<OnboardingStatus, string> = {
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluido",
};

/** Cor da pill (classe CSS existente) por status do plano. */
export const STATUS_PILL_COLORS: Record<OnboardingStatus, string> = {
  IN_PROGRESS: "amber",
  COMPLETED: "green",
};

export type PlanListItem = {
  id: string;
  status: OnboardingStatus;
  startDate: Date;
  collaborator: { id: string; name: string; role: string | null };
  total: number;
  done: number;
  progress: number;
};

/** Lista todos os planos com colaborador e progresso (% de tarefas concluidas). */
export async function listPlans(): Promise<PlanListItem[]> {
  assertDb();
  const plans = await prisma.onboardingPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      collaborator: { select: { id: true, name: true, role: true } },
      tasks: { select: { done: true } },
    },
  });

  return plans.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.done).length;
    return {
      id: p.id,
      status: p.status,
      startDate: p.startDate,
      collaborator: p.collaborator,
      total,
      done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });
}

/** Retorna um plano com colaborador e tarefas ordenadas por dueDay asc. */
export async function getPlan(id: string) {
  assertDb();
  return prisma.onboardingPlan.findUnique({
    where: { id },
    include: {
      collaborator: { select: { id: true, name: true, role: true, department: true, email: true } },
      tasks: { orderBy: { dueDay: "asc" } },
    },
  });
}

export type CollaboratorSelectOption = { id: string; name: string };

/** id + nome dos colaboradores para popular o select do formulario de novo plano. */
export async function listCollaboratorsForSelect(): Promise<CollaboratorSelectOption[]> {
  assertDb();
  return prisma.collaborator.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
