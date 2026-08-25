"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  isAdmin: boolean;
  positionId: string | null;
  positionTitle: string | null;
  role: string;
  department: string;
  salary: number | null;
  admissionDate: string; // yyyy-mm-dd | ""
  birthDate: string; // yyyy-mm-dd | ""
  managerId: string;
  managerName: string | null;
  reportsCount: number;
  currentCompanies: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  name: string;
};

function money(v: number | null): string {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function br(d: string): string {
  return d ? d.split("-").reverse().join("/") : "-";
}

export function DadosCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: props.name,
    role: props.role,
    department: props.department,
    salary: props.salary != null ? String(props.salary) : "",
    admissionDate: props.admissionDate,
    birthDate: props.birthDate,
    managerId: props.managerId,
    companyIds: props.currentCompanies.map((c) => c.id),
  });

  function toggleCompany(cid: string) {
    setForm((f) => ({
      ...f,
      companyIds: f.companyIds.includes(cid)
        ? f.companyIds.filter((x) => x !== cid)
        : [...f.companyIds, cid],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/collaborators/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form className="card" style={{ marginBottom: 16 }} onSubmit={save}>
        <h3 style={{ marginTop: 0 }}>Editar dados</h3>
        <div className="grid cols-3">
          <div className="field">
            <label>Nome *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Cargo</label>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="field">
            <label>Departamento</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="field">
            <label>Salário / Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Gestor</label>
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">Sem gestor</option>
              {props.managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data de admissão</label>
            <input
              type="date"
              value={form.admissionDate}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Data de nascimento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Empresa(s)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {props.companies.map((co) => (
              <label key={co.id} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, cursor: "pointer" }}>
                <input type="checkbox" checked={form.companyIds.includes(co.id)} onChange={() => toggleCompany(co.id)} />
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
          <button className="btn secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Dados</h3>
        {props.isAdmin && (
          <button className="btn ghost" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
      </div>
      <div className="grid cols-3">
        <div>
          <div className="stat-label">Cargo</div>
          <div>
            {props.positionId && props.positionTitle ? (
              <Link href={`/cargos/${props.positionId}`}>{props.positionTitle}</Link>
            ) : (
              props.role || "-"
            )}
          </div>
        </div>
        <div>
          <div className="stat-label">Gestor</div>
          <div>
            {props.managerId && props.managerName ? (
              <Link href={`/colaboradores/${props.managerId}`}>{props.managerName}</Link>
            ) : (
              "-"
            )}
          </div>
        </div>
        <div>
          <div className="stat-label">Salário</div>
          <div>{money(props.salary)}</div>
        </div>
        <div>
          <div className="stat-label">Admissão</div>
          <div>{br(props.admissionDate)}</div>
        </div>
        <div>
          <div className="stat-label">Empresa</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {props.currentCompanies.length > 0 ? (
              props.currentCompanies.map((c) => (
                <span key={c.id} className="pill blue">{c.name}</span>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        </div>
        <div>
          <div className="stat-label">Departamento</div>
          <div>{props.department || "-"}</div>
        </div>
        <div>
          <div className="stat-label">Nascimento</div>
          <div>{br(props.birthDate)}</div>
        </div>
        <div>
          <div className="stat-label">Liderados</div>
          <div>{props.reportsCount}</div>
        </div>
      </div>
    </div>
  );
}
