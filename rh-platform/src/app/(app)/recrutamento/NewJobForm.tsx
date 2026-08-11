"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PositionOption = { id: string; title: string; department: string };

export function NewJobForm({ positions }: { positions: PositionOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ positionId: "", location: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({ positionId: "", location: "" });
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
        + Abrir vaga
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20, minWidth: 320 }}>
      <div className="field">
        <label>Cargo *</label>
        <select
          value={form.positionId}
          onChange={(e) => setForm({ ...form, positionId: e.target.value })}
          required
        >
          <option value="">Selecione um cargo</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} · {p.department}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Localizacao</label>
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Ex: Remoto, Sao Paulo/SP"
        />
      </div>
      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Abrir vaga"}
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
