import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  listReviews,
  listPdis,
  performanceKpis,
  listCollaboratorsForSelect,
  REVIEW_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  PDI_STATUS_LABELS,
  PDI_STATUS_COLORS,
} from "@/lib/performance";
import { NewReviewForm } from "./NewReviewForm";
import { NewPdiForm } from "./NewPdiForm";
import { PdiActions } from "./PdiActions";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  let kpis, reviews, pdis, collaborators;
  try {
    [kpis, reviews, pdis, collaborators] = await Promise.all([
      performanceKpis(),
      listReviews(),
      listPdis(),
      listCollaboratorsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Performance e Desenvolvimento</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Performance e Desenvolvimento</h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Avaliações de desempenho, Nine Box e Planos de Desenvolvimento Individual
        </p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="stat">{kpis.notaMedia !== null ? kpis.notaMedia.toFixed(1) : "-"}</div>
          <div className="stat-label">Nota média (concluídas)</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.totalAvaliacoes}</div>
          <div className="stat-label">Total de avaliações</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.highPerformers}</div>
          <div className="stat-label">High performers (nota ≥ 4)</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.lowPerformers}</div>
          <div className="stat-label">Low performers (nota ≤ 2)</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.pdisEmAndamento}</div>
          <div className="stat-label">PDIs em andamento</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.pdisConcluidos}</div>
          <div className="stat-label">PDIs concluídos</div>
        </div>
      </div>

      <div className="section-head">
        <h3>Avaliações de desempenho</h3>
        <NewReviewForm collaborators={collaborators} />
      </div>

      <div className="card">
        {reviews.length === 0 ? (
          <p className="muted">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Ciclo</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.collaborator.name}</strong>
                    {r.reviewer && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        por {r.reviewer.name}
                      </div>
                    )}
                  </td>
                  <td className="muted">{r.cycle}</td>
                  <td className="muted">{REVIEW_TYPE_LABELS[r.type]}</td>
                  <td>
                    <span className={`pill ${REVIEW_STATUS_COLORS[r.status]}`}>
                      {REVIEW_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td>{r.overallScore !== null ? `${r.overallScore}/5` : "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost" href={`/performance/${r.id}`}>
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-head">
        <h3>Planos de Desenvolvimento Individual</h3>
        <NewPdiForm collaborators={collaborators} />
      </div>

      {pdis.length === 0 ? (
        <div className="card">
          <p className="muted">Nenhum PDI cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid cols-2">
          {pdis.map((p) => (
            <div className="card" key={p.id}>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div>
                  <strong>{p.collaborator.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {p.objective}
                  </div>
                </div>
                <span className={`pill ${PDI_STATUS_COLORS[p.status]}`}>
                  {PDI_STATUS_LABELS[p.status]}
                </span>
              </div>
              <PdiActions actions={p.actions} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
