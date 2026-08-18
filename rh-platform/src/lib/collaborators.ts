import { isDbConfigured, prisma } from "./db";
import type { DiscScore } from "./disc/types";

export type CollaboratorWithLatest = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  status: string;
  companies: string[];
  latest: {
    id: string;
    scores: DiscScore;
    primary: string;
    secondary: string;
    profileName: string;
    createdAt: Date;
  } | null;
};

export class DbUnavailableError extends Error {}

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Lista colaboradores com o assessment DISC mais recente de cada um. */
export async function listCollaborators(): Promise<CollaboratorWithLatest[]> {
  assertDb();
  const rows = await prisma.collaborator.findMany({
    orderBy: { name: "asc" },
    include: {
      assessments: { orderBy: { createdAt: "desc" }, take: 1 },
      companies: { select: { name: true } },
    },
  });

  return rows.map((c) => {
    const a = c.assessments[0];
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      department: c.department,
      status: c.status,
      companies: c.companies.map((x) => x.name),
      latest: a
        ? {
            id: a.id,
            scores: { D: a.scoreD, I: a.scoreI, S: a.scoreS, C: a.scoreC },
            primary: a.primary,
            secondary: a.secondary,
            profileName: a.profileName,
            createdAt: a.createdAt,
          }
        : null,
    };
  });
}

/**
 * Employee Hub: cadastro mestre do colaborador agregando dados de todos os
 * modulos (DISC, cargo, gestor, historico, performance, PDI, onboarding, LMS).
 */
export async function getCollaborator(id: string) {
  assertDb();
  return prisma.collaborator.findUnique({
    where: { id },
    include: {
      assessments: { orderBy: { createdAt: "desc" } },
      companies: { select: { id: true, name: true } },
      position: true,
      manager: { select: { id: true, name: true } },
      reports: { select: { id: true, name: true } },
      events: { orderBy: { date: "desc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { ratings: true },
      },
      pdis: { orderBy: { createdAt: "desc" }, include: { actions: true } },
      enrollments: { include: { course: true }, orderBy: { createdAt: "desc" } },
      onboardingPlans: {
        orderBy: { createdAt: "desc" },
        include: { tasks: true },
      },
    },
  });
}
