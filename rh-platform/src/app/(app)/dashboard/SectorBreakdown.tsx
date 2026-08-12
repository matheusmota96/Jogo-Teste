"use client";

import Link from "next/link";
import { useState } from "react";
import type { Sector } from "@/lib/dashboard";
import { formatBRL } from "@/lib/dashboard";

export function SectorBreakdown({ sectors }: { sectors: Sector[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (sectors.length === 0) {
    return <p className="muted">Nenhum colaborador ativo para os filtros selecionados.</p>;
  }

  const maxPct = Math.max(...sectors.map((s) => s.pctHeadcount), 1);

  return (
    <div className="sector-table">
      <div className="sector-head">
        <span>Setor</span>
        <span className="num">Pessoas</span>
        <span className="num">% Headcount</span>
        <span className="num">Custo mensal</span>
        <span className="num">% Custo</span>
        <span className="num">Custo medio</span>
      </div>

      {sectors.map((s) => {
        const isOpen = open === s.department;
        return (
          <div key={s.department} className={`sector-block ${isOpen ? "open" : ""}`}>
            <button className="sector-row" onClick={() => setOpen(isOpen ? null : s.department)}>
              <span className="sector-name">
                <span className={`caret ${isOpen ? "down" : ""}`}>›</span>
                {s.department}
              </span>
              <span className="num">{s.people}</span>
              <span className="num">
                <span className="mini-bar">
                  <span style={{ width: `${(s.pctHeadcount / maxPct) * 100}%` }} />
                </span>
                {s.pctHeadcount.toFixed(1)}%
              </span>
              <span className="num strong">{formatBRL(s.cost)}</span>
              <span className="num">{s.pctCost.toFixed(1)}%</span>
              <span className="num">{formatBRL(s.avgCost)}</span>
            </button>

            {isOpen && (
              <div className="sector-detail">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Cargo</th>
                      <th>Gestor</th>
                      <th>Admissao</th>
                      <th style={{ textAlign: "right" }}>Salario/Custo</th>
                      <th style={{ textAlign: "right" }}>Tempo de empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link href={`/colaboradores/${m.id}`}>{m.name}</Link>
                        </td>
                        <td className="muted">{m.role ?? "-"}</td>
                        <td className="muted">{m.manager ?? "-"}</td>
                        <td className="muted">
                          {m.admissionDate ? m.admissionDate.toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {m.salary != null ? formatBRL(m.salary) : "-"}
                        </td>
                        <td style={{ textAlign: "right" }} className="muted">
                          {m.tenure}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
