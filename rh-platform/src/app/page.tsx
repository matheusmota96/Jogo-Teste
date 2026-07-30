import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { listCollaborators, DbUnavailableError } from "@/lib/collaborators";
import { DISC_FACTORS } from "@/lib/disc/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let collaborators;
  try {
    collaborators = await listCollaborators();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Visao geral</h1>
          <p className="page-subtitle">Modulo 1 · Mapeamento Comportamental</p>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const total = collaborators.length;
  const mapped = collaborators.filter((c) => c.latest).length;
  const coverage = total ? Math.round((mapped / total) * 100) : 0;

  // Distribuicao por fator primario.
  const distribution = DISC_FACTORS.map((f) => ({
    factor: f,
    count: collaborators.filter((c) => c.latest?.primary === f).length,
  }));

  return (
    <>
      <div className="row-between">
        <div>
          <h1 className="page-title">Visao geral</h1>
          <p className="page-subtitle">
            Plataforma de RH · do mapeamento comportamental ao People Analytics
          </p>
        </div>
        <Link className="btn" href="/analytics">
          People Analytics →
        </Link>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat">{total}</div>
          <div className="stat-label">Colaboradores</div>
        </div>
        <div className="card">
          <div className="stat">{mapped}</div>
          <div className="stat-label">Com DNA Comportamental</div>
        </div>
        <div className="card">
          <div className="stat">{coverage}%</div>
          <div className="stat-label">Cobertura do mapeamento</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Distribuicao por perfil primario</h3>
        <div className="disc-bars">
          {distribution.map((d) => {
            const pct = mapped ? Math.round((d.count / mapped) * 100) : 0;
            return (
              <div className="disc-row" key={d.factor}>
                <div className="disc-factor-name">
                  <DiscBadge primary={d.factor} />
                </div>
                <div className="disc-track">
                  <div
                    className="disc-fill"
                    style={{
                      width: `${pct}%`,
                      background: "var(--brand)",
                    }}
                  />
                </div>
                <div className="disc-val">{d.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Colaboradores recentes</h3>
          <Link className="btn ghost" href="/colaboradores">
            Ver todos
          </Link>
        </div>
        {total === 0 ? (
          <p className="muted">
            Nenhum colaborador ainda. Rode <code>npm run db:seed</code> ou cadastre em
            &quot;Colaboradores&quot;.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Perfil</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.slice(0, 5).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/colaboradores/${c.id}`}>{c.name}</Link>
                  </td>
                  <td className="muted">{c.role ?? "-"}</td>
                  <td>
                    {c.latest ? (
                      <DiscBadge primary={c.latest.primary} label={c.latest.profileName} />
                    ) : (
                      <span className="muted">Nao mapeado</span>
                    )}
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
