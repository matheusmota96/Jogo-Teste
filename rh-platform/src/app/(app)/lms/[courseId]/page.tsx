import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { getCourse, listCollaboratorsForSelect } from "@/lib/lms";
import { EnrollForm } from "./EnrollForm";
import { EnrollProgress } from "./EnrollProgress";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  let course, collaborators;
  try {
    [course, collaborators] = await Promise.all([
      getCourse(courseId),
      listCollaboratorsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!course) notFound();

  return (
    <>
      <Link className="btn ghost" href="/lms" style={{ paddingLeft: 0 }}>
        ← Treinamentos
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {course.title}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {course.category ? `${course.category} · ` : ""}
            {course.hours}h · {course.enrollments.length} matriculado(s)
          </p>
        </div>
      </div>

      {course.description && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 14 }}>{course.description}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Matricular colaborador</h3>
        <EnrollForm courseId={course.id} collaborators={collaborators} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Matriculas</h3>
        {course.enrollments.length === 0 ? (
          <p className="muted">Nenhum colaborador matriculado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Progresso</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Atualizar</th>
              </tr>
            </thead>
            <tbody>
              {course.enrollments.map((e) => {
                const concluido = e.completedAt !== null;
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.collaborator.name}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {e.collaborator.email}
                      </div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div className="meter">
                        <div style={{ width: `${e.progress}%` }} />
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {e.progress}%
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${concluido ? "green" : "amber"}`}>
                        {concluido ? "Concluido" : "Em andamento"}
                      </span>
                    </td>
                    <td>
                      <EnrollProgress enrollment={{ id: e.id, progress: e.progress }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
