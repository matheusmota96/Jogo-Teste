"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CollaboratorActions({
  collaboratorId,
  status,
}: {
  collaboratorId: string;
  status: string;
}) {
  const router = useRouter();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [term, setTerm] = useState({ terminationDate: today, reason: "" });

  const isTerminated = status === "TERMINATED";

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setTerminateOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!isTerminated && (
          <Link className="btn secondary" href={`/profiler/${collaboratorId}`}>
            Aplicar novo teste
          </Link>
        )}

        {status === "ACTIVE" && (
          <button
            className="btn secondary"
            disabled={saving}
            onClick={() => {
              if (confirm("Marcar este colaborador como afastado?")) patch({ action: "leave" });
            }}
          >
            Marcar como afastado
          </button>
        )}

        {status === "ON_LEAVE" && (
          <button
            className="btn secondary"
            disabled={saving}
            onClick={() => {
              if (confirm("Retornar este colaborador para ativo?")) patch({ action: "reactivate" });
            }}
          >
            Voltar para ativo
          </button>
        )}

        {isTerminated ? (
          <button
            className="btn secondary"
            disabled={saving}
            onClick={() => {
              if (confirm("Reativar este colaborador?")) patch({ action: "reactivate" });
            }}
          >
            Reativar colaborador
          </button>
        ) : (
          <button
            className="btn secondary"
            onClick={() => setTerminateOpen((v) => !v)}
          >
            Desligar colaborador
          </button>
        )}
      </div>

      {terminateOpen && !isTerminated && (
        <form
          className="card"
          style={{ marginTop: 12, borderColor: "#f7dede" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (confirm("Confirmar o desligamento deste colaborador?")) {
              patch({ action: "terminate", ...term });
            }
          }}
        >
          <h3 style={{ marginTop: 0 }}>Informar desligamento</h3>
          <div className="grid cols-2">
            <div className="field">
              <label>Data de desligamento</label>
              <input
                type="date"
                value={term.terminationDate}
                onChange={(e) => setTerm({ ...term, terminationDate: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Motivo (opcional)</label>
              <input value={term.reason} onChange={(e) => setTerm({ ...term, reason: e.target.value })} />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              type="submit"
              disabled={saving}
              style={{ background: "var(--d)", borderColor: "var(--d)" }}
            >
              {saving ? "Processando..." : "Confirmar desligamento"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setTerminateOpen(false)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && !terminateOpen && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
