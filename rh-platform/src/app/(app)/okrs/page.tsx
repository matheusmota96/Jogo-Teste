import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  listObjectives,
  okrKpis,
  listCollaboratorsForSelect,
  OKR_LEVEL_ORDER,
  OKR_LEVEL_LABELS,
  levelColor,
  type ObjectiveListItem,
} from "@/lib/okr";
import { NewObjectiveForm } from "./NewObjectiveForm";
import { KrProgress } from "./KrProgress";

export const dynamic = "force-dynamic";

export default async function OkrsPage() {
  let objectives, kpis, collaborators;
  try {
    [objectives, kpis, collaborators] = await Promise.all([
      listObjectives(),
      okrKpis(),
      listCollaboratorsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Gestao de Metas (OKRs)</h1>
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
          <h1 className="page-title">Gestao de Metas (OKRs)</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Objetivos e resultados-chave por nivel e ciclo
          </p>
        </div>
        <NewObjectiveForm collaborators={collaborators} />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div className="card stat">
          <div className="stat-label">Objetivos</div>
          <strong style={{ fontSize: 28 }}>{kpis.totalObjetivos}</strong>
        </div>
        <div className="card stat">
          <div className="stat-label">Progresso medio</div>
          <strong style={{ fontSize: 28 }}>{kpis.progressoMedio}%</strong>
        </div>
        <div className="card stat">
          <div className="stat-label">Objetivos concluidos</div>
          <strong style={{ fontSize: 28 }}>{kpis.objetivosConcluidos}</strong>
        </div>
      </div>

      {objectives.length === 0 ? (
        <div className="card">
          <p className="muted">Nenhum objetivo cadastrado ainda.</p>
        </div>
      ) : (
        OKR_LEVEL_ORDER.map((level) => {
          const group = objectives.filter((o) => o.level === level);
          if (group.length === 0) return null;
          return (
            <section key={level}>
              <div className="section-head">
                <h3>
                  {OKR_LEVEL_LABELS[level]}{" "}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>
                    ({group.length})
                  </span>
                </h3>
              </div>
              <div className="grid cols-2">
                {group.map((o) => (
                  <ObjectiveCard key={o.id} objective={o} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

function ObjectiveCard({ objective }: { objective: ObjectiveListItem }) {
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{objective.title}</h3>
        <span className={`pill ${levelColor(objective.level)}`}>
          {OKR_LEVEL_LABELS[objective.level]}
        </span>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        {objective.owner?.name ?? "Sem responsavel"}
        {objective.area ? ` · ${objective.area}` : ""} · Ciclo {objective.cycle}
      </p>

      <div className="row-between" style={{ marginBottom: 4 }}>
        <span className="stat-label">Progresso geral</span>
        <strong style={{ fontSize: 14 }}>{objective.progress}%</strong>
      </div>
      <div className="meter">
        <div style={{ width: `${objective.progress}%` }} />
      </div>

      <div style={{ marginTop: 12 }}>
        {objective.keyResults.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Sem resultados-chave.
          </p>
        ) : (
          objective.keyResults.map((kr) => <KrProgress key={kr.id} kr={kr} />)
        )}
      </div>
    </div>
  );
}
