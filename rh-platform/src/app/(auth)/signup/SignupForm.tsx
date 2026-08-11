"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", accessCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Nao foi possivel criar a conta.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Nome</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoComplete="name"
          required
        />
      </div>
      <div className="field">
        <label>E-mail</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label>Senha</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="field">
        <label>Palavra-passe de acesso</label>
        <input
          type="password"
          value={form.accessCode}
          onChange={(e) => setForm({ ...form, accessCode: e.target.value })}
          placeholder="Codigo fornecido pela empresa"
          required
        />
      </div>
      {error && <p className="auth-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <p className="auth-alt">
        Ja tem conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
