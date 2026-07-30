import { isDbConfigured, prisma } from "./db";
import { DbUnavailableError } from "./collaborators";

function assertDb() {
  if (!isDbConfigured) {
    throw new DbUnavailableError(
      "DATABASE_URL nao configurada. Copie .env.example para .env e rode as migracoes."
    );
  }
}

/** Cursos com contagem de matriculas, progresso medio e conclusoes. */
export async function listCourses() {
  assertDb();
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: { select: { progress: true, completedAt: true } },
    },
  });

  return courses.map((c) => {
    const total = c.enrollments.length;
    const progressoMedio =
      total > 0
        ? Math.round(
            c.enrollments.reduce((acc, e) => acc + e.progress, 0) / total
          )
        : 0;
    const conclusoes = c.enrollments.filter((e) => e.completedAt !== null).length;

    return {
      id: c.id,
      title: c.title,
      category: c.category,
      hours: c.hours,
      description: c.description,
      createdAt: c.createdAt,
      matriculas: c._count.enrollments,
      progressoMedio,
      conclusoes,
    };
  });
}

export type CourseListItem = Awaited<ReturnType<typeof listCourses>>[number];

/** Curso com matriculas (incluindo colaborador). */
export async function getCourse(id: string) {
  assertDb();
  return prisma.course.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "asc" },
        include: { collaborator: true },
      },
    },
  });
}

export type CourseWithEnrollments = NonNullable<
  Awaited<ReturnType<typeof getCourse>>
>;

/** Indicadores gerais do modulo de LMS. */
export async function lmsKpis() {
  assertDb();
  const [totalCursos, totalMatriculas, concluidas] = await Promise.all([
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { completedAt: { not: null } } }),
  ]);

  const conclusaoMedia =
    totalMatriculas > 0
      ? Math.round((concluidas / totalMatriculas) * 100)
      : 0;

  return { totalCursos, totalMatriculas, conclusaoMedia };
}

/** Colaboradores disponiveis para matricula (id, nome). */
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
