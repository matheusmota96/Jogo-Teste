"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function randomPassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function NewUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao criar acesso.");
      }
      setCreated({ email: form.email, password: form.password });
      setForm({ name: "", email: "", password: "", role: "MEMBER" });
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
        + Novo acesso
      </button>
    );
  }

  if (created) {
    return (
      <div className="card" style={{ marginBottom: 20, borderColor: "#d9efe4" }}>
        <h3 style={{ marginTop: 0 }}>Acesso criado ✓</h3>
        <p style={{ fontSize: 14 }}>
          Compartilhe estas credenciais com a pessoa (a senha não será exibida novamente):
        </p>
        <div className="list-item">
          <span className="muted">E-mail</span>
          <strong>{created.email}</strong>
        </div>
        <div className="list-item">
          <span className="muted">Senha</span>
          <strong style={{ fontFamily: "monospace" }}>{created.password}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={() => setCreated(null)}>
            Criar outro acesso
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              setCreated(null);
              setOpen(false);
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Novo acesso</h3>
      <div className="grid cols-2">
        <div className="field">
          <label>Nome *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
          <label>Senha *</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
              style={{ flex: 1 }}
            />
            <button
              className="btn secondary"
              type="button"
              onClick={() => setForm({ ...form, password: randomPassword() })}
            >
              Gerar
            </button>
          </div>
        </div>
        <div className="field">
          <label>Papel</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Criando..." : "Criar acesso"}
        </button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
