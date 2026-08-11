"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  isPrincipal: boolean;
};

export function AdminUsers({ users, meId }: { users: AdminUserRow[]; meId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(id: string, role: "ADMIN" | "MEMBER") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      {error && <p className="auth-error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th style={{ textAlign: "right" }}>Acesso admin</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                {u.isPrincipal && (
                  <span className="pill blue" style={{ marginLeft: 8 }}>
                    Principal
                  </span>
                )}
                {u.id === meId && (
                  <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                    voce
                  </span>
                )}
              </td>
              <td className="muted">{u.email}</td>
              <td>
                <span className={`pill ${u.role === "ADMIN" ? "amber" : "gray"}`}>
                  {u.role === "ADMIN" ? "Admin" : "Membro"}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                {u.isPrincipal ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    fixo
                  </span>
                ) : u.role === "ADMIN" ? (
                  <button
                    className="btn secondary"
                    disabled={busy === u.id}
                    onClick={() => setRole(u.id, "MEMBER")}
                  >
                    Revogar admin
                  </button>
                ) : (
                  <button
                    className="btn"
                    disabled={busy === u.id}
                    onClick={() => setRole(u.id, "ADMIN")}
                  >
                    Tornar admin
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
