"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  { value: "CAFE_DA_MANHA", label: "Cafe da manha" },
  { value: "CONFRATERNIZACAO", label: "Confraternizacao" },
  { value: "EVENTO", label: "Evento" },
];

export function AddCompanyEventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", title: "", type: "EVENTO" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/company-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({ date: "", title: "", type: "EVENTO" });
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
        + Evento B4you
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ minWidth: 320 }}>
      <div className="field">
        <label>Data *</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
      <div className="field">
        <label>Titulo *</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="field">
        <label>Tipo</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="auth-error">{error}</p>}
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
