"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SENIORITY_VALUES,
  SENIORITY_LABELS,
  CONTRACT_TYPE_VALUES,
  CONTRACT_TYPE_LABELS,
} from "@/lib/positions";

export function NewPositionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    seniority: "ANALISTA_PL",
    contractType: "CLT",
    salaryMin: "",
    salaryMax: "",
    workSchedule: "",
    mission: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({
        title: "",
        department: "",
        seniority: "ANALISTA_PL",
        contractType: "CLT",
        salaryMin: "",
        salaryMax: "",
        workSchedule: "",
        mission: "",
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
        + Novo cargo
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
          <label>Departamento *</label>
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Senioridade</label>
          <select
            value={form.seniority}
            onChange={(e) => setForm({ ...form, seniority: e.target.value })}
          >
            {SENIORITY_VALUES.map((s) => (
              <option key={s} value={s}>
                {SENIORITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Tipo de contrato</label>
          <select
            value={form.contractType}
            onChange={(e) => setForm({ ...form, contractType: e.target.value })}
          >
            {CONTRACT_TYPE_VALUES.map((c) => (
              <option key={c} value={c}>
                {CONTRACT_TYPE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Salario minimo (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salaryMin}
            onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Salario maximo (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salaryMax}
            onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Jornada de trabalho</label>
          <input
            value={form.workSchedule}
            onChange={(e) => setForm({ ...form, workSchedule: e.target.value })}
            placeholder="Ex: 40h semanais, hibrido"
          />
        </div>
      </div>
      <div className="field">
        <label>Missao do cargo</label>
        <textarea
          rows={3}
          value={form.mission}
          onChange={(e) => setForm({ ...form, mission: e.target.value })}
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
