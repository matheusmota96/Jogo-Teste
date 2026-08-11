import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  computeENPS,
  getSurvey,
  scoreCategory,
  SURVEY_STATUS_COLORS,
  SURVEY_STATUS_LABELS,
  SURVEY_TYPE_COLORS,
  SURVEY_TYPE_LABELS,
} from "@/lib/engagement";
import { RespondForm } from "./RespondForm";

export const dynamic = "force-dynamic";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  let survey;
  try {
    survey = await getSurvey(surveyId);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!survey) notFound();

  const isEnps = survey.type === "ENPS";
  const enps = isEnps
    ? computeENPS(survey.responses.map((r) => r.score))
    : null;

  return (
    <>
      <Link className="btn ghost" href="/engajamento" style={{ paddingLeft: 0 }}>
        ← Engajamento
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {survey.title}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            <span className={`pill ${SURVEY_TYPE_COLORS[survey.type]}`}>
              {SURVEY_TYPE_LABELS[survey.type]}
            </span>{" "}
            <span className={`pill ${SURVEY_STATUS_COLORS[survey.status]}`}>
              {SURVEY_STATUS_LABELS[survey.status]}
            </span>
          </p>
          {survey.question && (
            <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
              {survey.question}
            </p>
          )}
        </div>
        <RespondForm surveyId={survey.id} />
      </div>

      {enps && (
        <div className="grid cols-2" style={{ marginBottom: 24 }}>
          <div
            className="card stat"
            style={{ borderLeft: "4px solid var(--brand)" }}
          >
            <div className="stat-label">eNPS</div>
            <strong style={{ fontSize: 44 }}>{enps.enps}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {enps.total} {enps.total === 1 ? "resposta" : "respostas"}
            </div>
          </div>
          <div className="card">
            <div className="list-item">
              <span>
                <span className="pill green">Promotores</span>{" "}
                <span className="muted" style={{ fontSize: 12 }}>
                  (notas 9-10)
                </span>
              </span>
              <strong>{enps.promoters}</strong>
            </div>
            <div className="list-item">
              <span>
                <span className="pill amber">Neutros</span>{" "}
                <span className="muted" style={{ fontSize: 12 }}>
                  (notas 7-8)
                </span>
              </span>
              <strong>{enps.passives}</strong>
            </div>
            <div className="list-item">
              <span>
                <span className="pill red">Detratores</span>{" "}
                <span className="muted" style={{ fontSize: 12 }}>
                  (notas 0-6)
                </span>
              </span>
              <strong>{enps.detractors}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Respostas</h3>
        {survey.responses.length === 0 ? (
          <p className="muted">Nenhuma resposta registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nota</th>
                <th>Comentário</th>
                <th>Colaborador</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {survey.responses.map((r) => {
                const cat = scoreCategory(r.score);
                return (
                  <tr key={r.id}>
                    <td>
                      <span className={`pill ${cat.color}`}>{r.score}</span>
                    </td>
                    <td className="muted">{r.comment ?? "—"}</td>
                    <td className="muted">
                      {r.collaborator?.name ?? "Anônimo"}
                    </td>
                    <td className="muted">
                      {r.createdAt.toLocaleDateString("pt-BR")}
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
