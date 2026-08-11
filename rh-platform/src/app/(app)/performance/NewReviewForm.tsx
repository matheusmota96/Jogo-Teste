"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollaboratorOption } from "@/lib/performance";

const REVIEW_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "AUTO", label: "Autoavaliação" },
  { value: "NINETY", label: "90°" },
  { value: "ONE_EIGHTY", label: "180°" },
  { value: "THREE_SIXTY", label: "360°" },
];

const COMPETENCIES = ["Comunicação", "Execução", "Colaboração"] as const;

export function NewReviewForm({ collaborators }: { collaborators: CollaboratorOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    collaboratorId: "",
    reviewerId: "",
    type: "THREE_SIXTY",
    cycle: "",
    overallScore: "",
    potentialScore: "",
    notes: "",
  });
  const [ratings, setRatings] = useState<Record<string, string>>({
    Comunicação: "",
    Execução: "",
    Colaboração: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ratings: COMPETENCIES.map((name) => ({
            competencyName: name,
            score: ratings[name],
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({
        collaboratorId: "",
        reviewerId: "",
        type: "THREE_SIXTY",
        cycle: "",
        overallScore: "",
        potentialScore: "",
        notes: "",
      });
      setRatings({ Comunicação: "", Execução: "", Colaboração: "" });
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
        + Nova avaliação
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <div className="grid cols-2">
        <div className="field">
          <label>Colaborador *</label>
          <select
            value={form.collaboratorId}
            onChange={(e) => setForm({ ...form, collaboratorId: e.target.value })}
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
          <label>Avaliador</label>
          <select
            value={form.reviewerId}
            onChange={(e) => setForm({ ...form, reviewerId: e.target.value })}
          >
            <option value="">Nenhum</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {REVIEW_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ciclo *</label>
          <input
            value={form.cycle}
            onChange={(e) => setForm({ ...form, cycle: e.target.value })}
            placeholder="ex: 2026-S1"
            required
          />
        </div>
        <div className="field">
          <label>Nota geral (1-5)</label>
          <input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={form.overallScore}
            onChange={(e) => setForm({ ...form, overallScore: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Potencial (1-5)</label>
          <input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={form.potentialScore}
            onChange={(e) => setForm({ ...form, potentialScore: e.target.value })}
          />
        </div>
      </div>

      <div className="section-head">
        <h3>Competências (1-5)</h3>
      </div>
      <div className="grid cols-3">
        {COMPETENCIES.map((name) => (
          <div className="field" key={name}>
            <label>{name}</label>
            <input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={ratings[name]}
              onChange={(e) => setRatings({ ...ratings, [name]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="field">
        <label>Observações</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>

      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar avaliação"}
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
