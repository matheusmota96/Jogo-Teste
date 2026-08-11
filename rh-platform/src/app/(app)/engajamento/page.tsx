import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  engagementKpis,
  listCollaboratorsForSelect,
  listRecognitions,
  listSurveys,
  SURVEY_STATUS_COLORS,
  SURVEY_STATUS_LABELS,
  SURVEY_TYPE_COLORS,
  SURVEY_TYPE_LABELS,
} from "@/lib/engagement";
import { NewRecognitionForm } from "./NewRecognitionForm";
import { NewSurveyForm } from "./NewSurveyForm";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  let surveys, kpis, recognitions, collaborators;
  try {
    [surveys, kpis, recognitions, collaborators] = await Promise.all([
      listSurveys(),
      engagementKpis(),
      listRecognitions(),
      listCollaboratorsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Retenção e Engajamento</h1>
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
          <h1 className="page-title">Retenção e Engajamento</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Pesquisas, eNPS e reconhecimento entre pessoas
          </p>
        </div>
        <NewSurveyForm />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div
          className="card stat"
          style={{ borderLeft: "4px solid var(--brand)" }}
        >
          <div className="stat-label">eNPS geral</div>
          <strong style={{ fontSize: 36 }}>{kpis.enpsGeral.enps}</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            {kpis.enpsGeral.promoters} promotores · {kpis.enpsGeral.passives}{" "}
            neutros · {kpis.enpsGeral.detractors} detratores
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">Pesquisas ativas</div>
          <strong style={{ fontSize: 28 }}>{kpis.pesquisasAtivas}</strong>
        </div>
        <div className="card stat">
          <div className="stat-label">Reconhecimentos</div>
          <strong style={{ fontSize: 28 }}>{kpis.totalReconhecimentos}</strong>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pesquisas</h3>
        {surveys.length === 0 ? (
          <p className="muted">Nenhuma pesquisa criada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Participação</th>
                <th>eNPS</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/engajamento/${s.id}`}>
                      <strong>{s.title}</strong>
                    </Link>
                    {s.question && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {s.question}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${SURVEY_TYPE_COLORS[s.type]}`}>
                      {SURVEY_TYPE_LABELS[s.type]}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${SURVEY_STATUS_COLORS[s.status]}`}>
                      {SURVEY_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td>
                    {s.participacao}{" "}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {s.participacao === 1 ? "resposta" : "respostas"}
                    </span>
                  </td>
                  <td>
                    {s.enps !== null ? (
                      <strong>{s.enps}</strong>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-head">
        <h3>Mural de Reconhecimentos</h3>
        <NewRecognitionForm collaborators={collaborators} />
      </div>

      <div className="card">
        {recognitions.length === 0 ? (
          <p className="muted">Nenhum reconhecimento registrado ainda.</p>
        ) : (
          recognitions.map((r) => (
            <div key={r.id} className="list-item">
              <div>
                <div style={{ fontSize: 14 }}>
                  <strong>{r.from?.name ?? "Empresa"}</strong>
                  <span className="muted"> → </span>
                  <strong>{r.to.name}</strong>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {r.message}
                </div>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {r.badge && <span className="pill blue">{r.badge}</span>}
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {r.createdAt.toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
