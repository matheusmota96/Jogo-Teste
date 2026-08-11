import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { DiscBars } from "@/components/DiscBars";
import {
  getPosition,
  positionFit,
  DbUnavailableError,
  SENIORITY_LABELS,
  CONTRACT_TYPE_LABELS,
} from "@/lib/positions";

export const dynamic = "force-dynamic";

function TextList({ label, value }: { label: string; value: string | null }) {
  const items = (value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-head">
        <h4 style={{ margin: "0 0 8px" }}>{label}</h4>
      </div>
      {items.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nao informado.
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fitPill(fit: number): string {
  if (fit >= 80) return "pill green";
  if (fit >= 60) return "pill amber";
  return "pill red";
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let position;
  try {
    position = await getPosition(id);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!position) notFound();

  const ideal = {
    D: position.idealD,
    I: position.idealI,
    S: position.idealS,
    C: position.idealC,
  };

  const salary =
    position.salaryMin != null || position.salaryMax != null
      ? `R$ ${(position.salaryMin ?? 0).toLocaleString("pt-BR")} – R$ ${(
          position.salaryMax ?? 0
        ).toLocaleString("pt-BR")}`
      : "Nao informado";

  return (
    <>
      <Link className="btn ghost" href="/cargos" style={{ paddingLeft: 0 }}>
        ← Cargos
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {position.title}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {position.department} · {SENIORITY_LABELS[position.seniority]} ·{" "}
            {CONTRACT_TYPE_LABELS[position.contractType]}
            {position.parent ? ` · Reporta a ${position.parent.title}` : ""}
          </p>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div className="stat">
          <div className="stat-label">Faixa salarial</div>
          <strong>{salary}</strong>
        </div>
        <div className="stat">
          <div className="stat-label">Jornada</div>
          <strong>{position.workSchedule ?? "-"}</strong>
        </div>
        <div className="stat">
          <div className="stat-label">Colaboradores</div>
          <strong>{position.collaborators.length}</strong>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Descricao do cargo</h3>
          <TextList label="Missao" value={position.mission} />
          <TextList label="Responsabilidades" value={position.responsibilities} />
          <TextList label="Entregas" value={position.deliverables} />
          <TextList label="Requisitos" value={position.requirements} />
          <TextList label="Beneficios" value={position.benefits} />
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Perfil comportamental ideal</h3>
            <DiscBars scores={ideal} />
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Roda de Competencias</h3>
            {position.competencies.length === 0 ? (
              <p className="muted">Nenhuma competencia mapeada.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Competencia</th>
                    <th>Tipo</th>
                    <th>Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {position.competencies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>
                        <span
                          className={`pill ${
                            c.kind === "TECNICA" ? "blue" : "amber"
                          }`}
                        >
                          {c.kind === "TECNICA" ? "Tecnica" : "Comportamental"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="meter"
                          style={{ minWidth: 120, display: "inline-block" }}
                        >
                          <div style={{ width: `${c.weight * 10}%` }} />
                        </div>
                        <span className="muted" style={{ marginLeft: 8 }}>
                          {c.weight}/10
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Fit dos colaboradores neste cargo</h3>
        {position.collaborators.length === 0 ? (
          <p className="muted">Nenhum colaborador alocado neste cargo.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Perfil DISC</th>
                <th>Fit ao cargo</th>
              </tr>
            </thead>
            <tbody>
              {position.collaborators.map((col) => {
                const a = col.assessments[0];
                const fit = a
                  ? positionFit(ideal, {
                      D: a.scoreD,
                      I: a.scoreI,
                      S: a.scoreS,
                      C: a.scoreC,
                    })
                  : null;
                return (
                  <tr key={col.id}>
                    <td>
                      <Link href={`/colaboradores/${col.id}`}>
                        <strong>{col.name}</strong>
                      </Link>
                    </td>
                    <td>
                      {a ? (
                        <DiscBadge primary={a.primary} label={a.profileName} />
                      ) : (
                        <span className="muted">Nao mapeado</span>
                      )}
                    </td>
                    <td>
                      {fit != null ? (
                        <span className={fitPill(fit)}>{fit}%</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
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
