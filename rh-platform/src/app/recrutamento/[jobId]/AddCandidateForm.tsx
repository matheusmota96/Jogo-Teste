"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddCandidateForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    score: "",
    discPrimary: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          score: form.score === "" ? null : Number(form.score),
          discPrimary: form.discPrimary || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setForm({ name: "", email: "", phone: "", score: "", discPrimary: "" });
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
        + Adicionar candidato
      </button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 4 }}>
      <div className="grid cols-2">
        <div className="field">
          <label>Nome *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>E-mail *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Telefone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Score de aderencia (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Perfil DISC</label>
          <select
            value={form.discPrimary}
            onChange={(e) => setForm({ ...form, discPrimary: e.target.value })}
          >
            <option value="">Nao informado</option>
            <option value="D">D · Dominante</option>
            <option value="I">I · Influente</option>
            <option value="S">S · Estavel</option>
            <option value="C">C · Conforme</option>
          </select>
        </div>
      </div>
      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Adicionar"}
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
