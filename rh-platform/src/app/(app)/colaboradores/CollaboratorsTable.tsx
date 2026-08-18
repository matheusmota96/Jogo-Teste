"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DiscBadge } from "@/components/DiscBadge";
import type { CollaboratorWithLatest } from "@/lib/collaborators";

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CollaboratorsTable({
  collaborators,
}: {
  collaborators: CollaboratorWithLatest[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return collaborators;
    return collaborators.filter((c) => {
      const hay = norm(
        [c.name, c.role ?? "", c.department ?? "", c.companies.join(" ")].join(" ")
      );
      return hay.includes(nq);
    });
  }, [q, collaborators]);

  return (
    <>
      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Pesquisar por nome, empresa ou departamento..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          {filtered.length} de {collaborators.length}
        </span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Nenhum colaborador encontrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Empresa</th>
                <th>Perfil DISC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/colaboradores/${c.id}`}>
                      <strong>{c.name}</strong>
                    </Link>
                    {c.status === "TERMINATED" && (
                      <span className="pill red" style={{ marginLeft: 8 }}>Desligado</span>
                    )}
                    {c.status === "ON_LEAVE" && (
                      <span className="pill amber" style={{ marginLeft: 8 }}>Afastado</span>
                    )}
                  </td>
                  <td className="muted">{c.role ?? "-"}</td>
                  <td className="muted">{c.department ?? "-"}</td>
                  <td>
                    {c.companies.length > 0 ? (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.companies.map((name) => (
                          <span key={name} className="pill blue">{name}</span>
                        ))}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    {c.latest ? (
                      <DiscBadge primary={c.latest.primary} label={c.latest.profileName} />
                    ) : (
                      <span className="muted">Não mapeado</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost" href={`/profiler/${c.id}`}>
                      Aplicar teste
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
