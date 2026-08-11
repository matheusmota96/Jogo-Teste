"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EVENT_TYPES: Array<{ value: string; label: string }> = [
  { value: "PROMOCAO", label: "Promocao" },
  { value: "AJUSTE_SALARIAL", label: "Ajuste salarial" },
  { value: "MUDANCA_CARGO", label: "Mudanca de cargo" },
  { value: "TREINAMENTO", label: "Treinamento" },
  { value: "ADMISSAO", label: "Admissao" },
  { value: "FERIAS", label: "Ferias" },
  { value: "ADVERTENCIA", label: "Advertencia" },
  { value: "OUTRO", label: "Outro" },
];

export function AddEventForm({ collaboratorId }: { collaboratorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "PROMOCAO", description: "", salaryValue: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employment-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorId, ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({ type: "PROMOCAO", description: "", salaryValue: "" });
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
      <button className="btn ghost" onClick={() => setOpen(true)}>
        + Registrar evento
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="field">
        <label>Tipo</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Descricao *</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Novo salario (opcional)</label>
        <input
          type="number"
          step="0.01"
          value={form.salaryValue}
          onChange={(e) => setForm({ ...form, salaryValue: e.target.value })}
        />
      </div>
      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
