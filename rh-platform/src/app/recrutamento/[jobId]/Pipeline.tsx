"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Constantes locais (nao importar do lib para nao trazer o Prisma ao bundle client).
const STAGE_ORDER = [
  "INSCRITO",
  "TRIAGEM",
  "TESTE_COMPORTAMENTAL",
  "ENTREVISTA_RH",
  "ENTREVISTA_GESTOR",
  "CASE",
  "OFERTA",
  "CONTRATACAO",
] as const;

type Stage = (typeof STAGE_ORDER)[number] | "REPROVADO";

const STAGE_LABELS: Record<Stage, string> = {
  INSCRITO: "Inscrito",
  TRIAGEM: "Triagem",
  TESTE_COMPORTAMENTAL: "Teste Comportamental",
  ENTREVISTA_RH: "Entrevista RH",
  ENTREVISTA_GESTOR: "Entrevista Gestor",
  CASE: "Case",
  OFERTA: "Oferta",
  CONTRATACAO: "Contratacao",
  REPROVADO: "Reprovado",
};

const DISC_COLORS: Record<string, string> = {
  D: "#e5484d",
  I: "#f5a623",
  S: "#30a46c",
  C: "#3b82f6",
};

export type PipelineApplication = {
  id: string;
  stage: Stage;
  score: number | null;
  discPrimary: string | null;
  candidateName: string;
  candidateEmail: string;
};

export function Pipeline({
  applications,
}: {
  applications: PipelineApplication[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function move(id: string, stage: Stage) {
    setBusy(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const columns: Stage[] = [...STAGE_ORDER, "REPROVADO"];

  return (
    <div className="kanban">
      {columns.map((stage) => {
        const cards = applications.filter((a) => a.stage === stage);
        const idx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
        return (
          <div className="kanban-col" key={stage}>
            <h4>
              <span>{STAGE_LABELS[stage]}</span>
              <span>{cards.length}</span>
            </h4>
            {cards.map((a) => {
              const isReproved = a.stage === "REPROVADO";
              const prev = idx > 0 ? STAGE_ORDER[idx - 1] : null;
              const next =
                idx >= 0 && idx < STAGE_ORDER.length - 1
                  ? STAGE_ORDER[idx + 1]
                  : null;
              const disabled = busy === a.id;
              return (
                <div className="kanban-card" key={a.id}>
                  <strong>{a.candidateName}</strong>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {a.candidateEmail}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      margin: "6px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    {a.score !== null && (
                      <span className="pill gray">Score {a.score}</span>
                    )}
                    {a.discPrimary && (
                      <span
                        className="badge"
                        style={{
                          background: DISC_COLORS[a.discPrimary] ?? "#888",
                        }}
                      >
                        {a.discPrimary}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {isReproved ? (
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", fontSize: 12 }}
                        disabled={disabled}
                        onClick={() => move(a.id, "INSCRITO")}
                      >
                        Reativar
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn ghost"
                          style={{ padding: "2px 8px", fontSize: 12 }}
                          disabled={disabled || !prev}
                          onClick={() => prev && move(a.id, prev)}
                          title="Etapa anterior"
                        >
                          ←
                        </button>
                        <button
                          className="btn ghost"
                          style={{ padding: "2px 8px", fontSize: 12 }}
                          disabled={disabled || !next}
                          onClick={() => next && move(a.id, next)}
                          title="Proxima etapa"
                        >
                          →
                        </button>
                        <button
                          className="btn ghost"
                          style={{ padding: "2px 8px", fontSize: 12, color: "var(--d)" }}
                          disabled={disabled}
                          onClick={() => move(a.id, "REPROVADO")}
                        >
                          Reprovar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
