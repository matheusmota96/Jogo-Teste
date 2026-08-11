import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import {
  listPositions,
  DbUnavailableError,
  SENIORITY_LABELS,
} from "@/lib/positions";
import { NewPositionForm } from "./NewPositionForm";

export const dynamic = "force-dynamic";

type PositionRow = Awaited<ReturnType<typeof listPositions>>[number];

function formatSalary(min: number | null, max: number | null): string {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (min != null && max != null) return `R$ ${fmt(min)}–${fmt(max)}`;
  if (min != null) return `A partir de R$ ${fmt(min)}`;
  if (max != null) return `Ate R$ ${fmt(max)}`;
  return "-";
}

function OrgNode({
  node,
  childrenMap,
  level,
}: {
  node: PositionRow;
  childrenMap: Map<string, PositionRow[]>;
  level: number;
}) {
  const kids = childrenMap.get(node.id) ?? [];
  return (
    <>
      <div
        className="list-item"
        style={{ paddingLeft: 12 + level * 24 }}
      >
        <div>
          <Link href={`/cargos/${node.id}`}>
            <strong>{node.title}</strong>
          </Link>
          <span className="muted" style={{ fontSize: 12 }}>
            {" "}
            · {SENIORITY_LABELS[node.seniority]}
          </span>
        </div>
        <span className="pill gray">{node.department}</span>
      </div>
      {kids.map((child) => (
        <OrgNode
          key={child.id}
          node={child}
          childrenMap={childrenMap}
          level={level + 1}
        />
      ))}
    </>
  );
}

export default async function PositionsPage() {
  let positions: PositionRow[];
  try {
    positions = await listPositions();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Cargos</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const childrenMap = new Map<string, PositionRow[]>();
  for (const p of positions) {
    if (p.parentId) {
      const arr = childrenMap.get(p.parentId) ?? [];
      arr.push(p);
      childrenMap.set(p.parentId, arr);
    }
  }
  const roots = positions.filter((p) => p.parentId === null);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Cargos</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Engenharia de Cargos: estrutura organizacional e perfil ideal
          </p>
        </div>
        <NewPositionForm />
      </div>

      <div className="card">
        {positions.length === 0 ? (
          <p className="muted">Nenhum cargo cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Departamento</th>
                <th>Senioridade</th>
                <th>Faixa salarial</th>
                <th>Competencias</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/cargos/${p.id}`}>
                      <strong>{p.title}</strong>
                    </Link>
                  </td>
                  <td className="muted">{p.department}</td>
                  <td className="muted">{SENIORITY_LABELS[p.seniority]}</td>
                  <td className="muted">{formatSalary(p.salaryMin, p.salaryMax)}</td>
                  <td>
                    <span className="pill blue">{p.competencies.length}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost" href={`/cargos/${p.id}`}>
                      Ver cargo
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-head">
          <h3 style={{ margin: 0 }}>Organograma</h3>
        </div>
        {roots.length === 0 ? (
          <p className="muted">Nenhum cargo de topo definido.</p>
        ) : (
          <div>
            {roots.map((root) => (
              <OrgNode
                key={root.id}
                node={root}
                childrenMap={childrenMap}
                level={0}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
