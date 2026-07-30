import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { listCourses, lmsKpis } from "@/lib/lms";
import { NewCourseForm } from "./NewCourseForm";

export const dynamic = "force-dynamic";

export default async function LmsPage() {
  let courses, kpis;
  try {
    [courses, kpis] = await Promise.all([listCourses(), lmsKpis()]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Treinamentos (LMS)</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Treinamentos (LMS)</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Catalogo de cursos e progresso das matriculas
          </p>
        </div>
        <NewCourseForm />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div className="card stat">
          <div className="stat-label">Cursos</div>
          <strong style={{ fontSize: 28 }}>{kpis.totalCursos}</strong>
        </div>
        <div className="card stat">
          <div className="stat-label">Matriculas</div>
          <strong style={{ fontSize: 28 }}>{kpis.totalMatriculas}</strong>
        </div>
        <div className="card stat">
          <div className="stat-label">Conclusao media</div>
          <strong style={{ fontSize: 28 }}>{kpis.conclusaoMedia}%</strong>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <p className="muted">Nenhum curso cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/lms/${c.id}`}
              className="card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="row-between" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{c.title}</h3>
                {c.category && <span className="pill blue">{c.category}</span>}
              </div>
              <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
                {c.hours}h · {c.matriculas} matriculado(s)
              </p>

              <div className="row-between" style={{ marginBottom: 4 }}>
                <span className="stat-label">Conclusao media</span>
                <strong style={{ fontSize: 14 }}>{c.progressoMedio}%</strong>
              </div>
              <div className="meter">
                <div style={{ width: `${c.progressoMedio}%` }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
