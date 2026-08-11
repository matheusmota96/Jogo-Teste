"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CollaboratorOption = { id: string; name: string };

export function EnrollForm({
  courseId,
  collaborators,
}: {
  courseId: string;
  collaborators: CollaboratorOption[];
}) {
  const router = useRouter();
  const [collaboratorId, setCollaboratorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!collaboratorId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, collaboratorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao matricular.");
      }
      setCollaboratorId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Colaborador</label>
          <select
            value={collaboratorId}
            onChange={(e) => setCollaboratorId(e.target.value)}
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
        <button className="btn" type="submit" disabled={saving || !collaboratorId}>
          {saving ? "Matriculando..." : "Matricular"}
        </button>
      </div>
      {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}
    </form>
  );
}
