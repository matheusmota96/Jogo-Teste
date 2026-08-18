"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TerminateCollaborator({
  collaboratorId,
  status,
}: {
  collaboratorId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ terminationDate: today, reason: "" });

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
        throw new Error(data.error ?? "Erro ao atualizar.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "TERMINATED") {
    return (
      <button
        className="btn secondary"
        disabled={saving}
        onClick={() => {
          if (confirm("Reativar este colaborador?")) patch({ action: "reactivate" });
        }}
      >
        {saving ? "..." : "Reativar colaborador"}
      </button>
    );
  }

  if (!open) {
    return (
      <button className="btn secondary" onClick={() => setOpen(true)}>
        Desligar colaborador
      </button>
    );
  }

  return (
    <form
      className="card"
      style={{ marginTop: 12, borderColor: "#f7dede" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm("Confirmar o desligamento deste colaborador?")) {
          patch({ action: "terminate", ...form });
        }
      }}
    >
      <h3 style={{ marginTop: 0 }}>Desligar colaborador</h3>
      <div className="field">
        <label>Data de desligamento</label>
        <input
          type="date"
          value={form.terminationDate}
          onChange={(e) => setForm({ ...form, terminationDate: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Motivo (opcional)</label>
        <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
        <button className="btn secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
