"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CollaboratorOption = { id: string; name: string };

export function NewObjectiveForm({
  collaborators,
}: {
  collaborators: CollaboratorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    level: "COMPANY",
    area: "",
    ownerId: "",
    cycle: "",
    kr1: "",
    kr2: "",
    kr3: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          level: form.level,
          area: form.area || null,
          ownerId: form.ownerId || null,
          cycle: form.cycle,
          keyResults: [form.kr1, form.kr2, form.kr3],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({
        title: "",
        level: "COMPANY",
        area: "",
        ownerId: "",
        cycle: "",
        kr1: "",
        kr2: "",
        kr3: "",
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
        + Novo objetivo
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <div className="grid cols-2">
        <div className="field">
          <label>Titulo *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Nivel</label>
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            <option value="COMPANY">Empresa</option>
            <option value="AREA">Área</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
        <div className="field">
          <label>Área</label>
          <input
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Responsavel</label>
          <select
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
          >
            <option value="">Sem responsavel</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ciclo *</label>
          <input
            placeholder="2026-Q3"
            value={form.cycle}
            onChange={(e) => setForm({ ...form, cycle: e.target.value })}
            required
          />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 8px" }}>
          Resultados-chave (opcionais)
        </p>
        <div className="field">
          <input
            placeholder="Resultado-chave 1"
            value={form.kr1}
            onChange={(e) => setForm({ ...form, kr1: e.target.value })}
          />
        </div>
        <div className="field">
          <input
            placeholder="Resultado-chave 2"
            value={form.kr2}
            onChange={(e) => setForm({ ...form, kr2: e.target.value })}
          />
        </div>
        <div className="field">
          <input
            placeholder="Resultado-chave 3"
            value={form.kr3}
            onChange={(e) => setForm({ ...form, kr3: e.target.value })}
          />
        </div>
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
