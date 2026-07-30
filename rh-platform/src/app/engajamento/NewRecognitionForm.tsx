"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CollaboratorOption = { id: string; name: string };

export function NewRecognitionForm({
  collaborators,
}: {
  collaborators: CollaboratorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    toCollaboratorId: "",
    fromCollaboratorId: "",
    message: "",
    badge: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recognitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({
        toCollaboratorId: "",
        fromCollaboratorId: "",
        message: "",
        badge: "",
      });
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
        + Novo reconhecimento
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <div className="grid cols-2">
        <div className="field">
          <label>Para *</label>
          <select
            value={form.toCollaboratorId}
            onChange={(e) =>
              setForm({ ...form, toCollaboratorId: e.target.value })
            }
            required
          >
            <option value="">Selecione um colaborador</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>De</label>
          <select
            value={form.fromCollaboratorId}
            onChange={(e) =>
              setForm({ ...form, fromCollaboratorId: e.target.value })
            }
          >
            <option value="">Anônimo / empresa</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Mensagem *</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Badge</label>
        <input
          value={form.badge}
          onChange={(e) => setForm({ ...form, badge: e.target.value })}
          placeholder="Ex.: Espírito de equipe"
        />
      </div>
      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
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
