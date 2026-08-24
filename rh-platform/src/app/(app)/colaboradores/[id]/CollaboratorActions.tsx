"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Values = {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: string;
  admissionDate: string;
  birthDate: string;
  managerId: string;
  status: string;
  companyIds: string[];
};

export function CollaboratorActions({
  collaborator,
  companies,
  managers,
}: {
  collaborator: Values;
  companies: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "edit" | "terminate">(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [edit, setEdit] = useState({
    name: collaborator.name,
    role: collaborator.role,
    department: collaborator.department,
    salary: collaborator.salary,
    admissionDate: collaborator.admissionDate,
    birthDate: collaborator.birthDate,
    managerId: collaborator.managerId,
    companyIds: collaborator.companyIds,
  });
  const today = new Date().toISOString().slice(0, 10);
  const [term, setTerm] = useState({ terminationDate: today, reason: "" });

  const isTerminated = collaborator.status === "TERMINATED";

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/collaborators/${collaborator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setMode(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCompany(cid: string) {
    setEdit((e) => ({
      ...e,
      companyIds: e.companyIds.includes(cid)
        ? e.companyIds.filter((x) => x !== cid)
        : [...e.companyIds, cid],
    }));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn"
          onClick={() => setMode(mode === "edit" ? null : "edit")}
        >
          Editar dados
        </button>
        {!isTerminated && (
          <Link className="btn secondary" href={`/profiler/${collaborator.id}`}>
            Aplicar novo teste
          </Link>
        )}
        {isTerminated ? (
          <button
            className="btn secondary"
            disabled={saving}
            onClick={() => {
              if (confirm("Reativar este colaborador?")) patch({ action: "reactivate" });
            }}
          >
            Reativar colaborador
          </button>
        ) : (
          <button
            className="btn secondary"
            onClick={() => setMode(mode === "terminate" ? null : "terminate")}
          >
            Desligar colaborador
          </button>
        )}
      </div>

      {mode === "edit" && (
        <form
          className="card"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            patch({ action: "update", ...edit });
          }}
        >
          <h3 style={{ marginTop: 0 }}>Editar dados</h3>
          <div className="grid cols-2">
            <div className="field">
              <label>Nome *</label>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Cargo</label>
              <input value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} />
            </div>
            <div className="field">
              <label>Departamento</label>
              <input value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} />
            </div>
            <div className="field">
              <label>Salário / Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={edit.salary}
                onChange={(e) => setEdit({ ...edit, salary: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Data de admissão</label>
              <input
                type="date"
                value={edit.admissionDate}
                onChange={(e) => setEdit({ ...edit, admissionDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Data de nascimento</label>
              <input
                type="date"
                value={edit.birthDate}
                onChange={(e) => setEdit({ ...edit, birthDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Gestor</label>
              <select
                value={edit.managerId}
                onChange={(e) => setEdit({ ...edit, managerId: e.target.value })}
              >
                <option value="">Sem gestor</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Empresa(s)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {companies.map((co) => (
                <label
                  key={co.id}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={edit.companyIds.includes(co.id)}
                    onChange={() => toggleCompany(co.id)}
                  />
                  {co.name}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setMode(null)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === "terminate" && (
        <form
          className="card"
          style={{ marginTop: 12, borderColor: "#f7dede" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (confirm("Confirmar o desligamento deste colaborador?")) {
              patch({ action: "terminate", ...term });
            }
          }}
        >
          <h3 style={{ marginTop: 0 }}>Informar desligamento</h3>
          <div className="grid cols-2">
            <div className="field">
              <label>Data de desligamento</label>
              <input
                type="date"
                value={term.terminationDate}
                onChange={(e) => setTerm({ ...term, terminationDate: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Motivo (opcional)</label>
              <input value={term.reason} onChange={(e) => setTerm({ ...term, reason: e.target.value })} />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              type="submit"
              disabled={saving}
              style={{ background: "var(--d)", borderColor: "var(--d)" }}
            >
              {saving ? "Processando..." : "Confirmar desligamento"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setMode(null)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
