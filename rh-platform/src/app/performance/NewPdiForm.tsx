"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollaboratorOption } from "@/lib/performance";

export function NewPdiForm({ collaborators }: { collaborators: CollaboratorOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [collaboratorId, setCollaboratorId] = useState("");
  const [objective, setObjective] = useState("");
  const [actions, setActions] = useState<string[]>(["", "", ""]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pdi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId,
          objective,
          actions: actions.map((title) => ({ title })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setCollaboratorId("");
      setObjective("");
      setActions(["", "", ""]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Novo PDI
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <div className="grid cols-2">
        <div className="field">
          <label>Colaborador *</label>
          <select
            value={collaboratorId}
            onChange={(e) => setCollaboratorId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Objetivo *</label>
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="ex: Desenvolver liderança de equipe"
            required
          />
        </div>
      </div>

      <div className="section-head">
        <h3>Ações</h3>
      </div>
      <div className="grid cols-3">
        {actions.map((value, i) => (
          <div className="field" key={i}>
            <label>Ação {i + 1}</label>
            <input
              value={value}
              onChange={(e) => {
                const next = [...actions];
                next[i] = e.target.value;
                setActions(next);
              }}
            />
          </div>
        ))}
      </div>

      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar PDI"}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
