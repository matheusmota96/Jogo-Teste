import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { DbUnavailableError } from "@/lib/collaborators";
import { getPeopleAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  let data;
  try {
    data = await getPeopleAnalytics();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">People Analytics</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const maxDept = Math.max(1, ...data.byDepartment.map((d) => d.count));
  const maxDisc = Math.max(1, ...data.byDiscPrimary.map((d) => d.count));

  return (
    <>
      <h1 className="page-title">People Analytics</h1>
      <p className="page-subtitle">
        Camada executiva · indicadores consolidados de todos os modulos
      </p>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat">{data.headcount}</div>
          <div className="stat-label">Headcount ativo</div>
        </div>
        <div className="card">
          <div className="stat">{data.turnover}%</div>
          <div className="stat-label">Turnover</div>
        </div>
        <div className="card">
          <div className="stat">{data.discCoverage}%</div>
          <div className="stat-label">Cobertura DISC</div>
        </div>
        <div className="card">
          <div className="stat">
            {data.performanceAvg != null ? data.performanceAvg.toFixed(1) : "-"}
            <span style={{ fontSize: 16, color: "var(--muted)" }}>/5</span>
          </div>
          <div className="stat-label">Performance media</div>
        </div>
        <div className="card">
          <div className="stat" style={{ color: data.enps >= 0 ? "var(--s)" : "var(--d)" }}>
            {data.enps}
          </div>
          <div className="stat-label">eNPS geral</div>
        </div>
        <div className="card">
          <div className="stat" style={{ color: data.riscoDesligamento > 0 ? "var(--d)" : undefined }}>
            {data.riscoDesligamento}
          </div>
          <div className="stat-label">Em risco de desligamento</div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat">{data.vagasAbertas}</div>
          <div className="stat-label">Vagas abertas (ATS)</div>
        </div>
        <div className="card">
          <div className="stat">{data.onboardingEmAndamento}</div>
          <div className="stat-label">Onboardings em andamento</div>
        </div>
        <div className="card">
          <div className="stat">{data.pdisConcluidos}</div>
          <div className="stat-label">PDIs concluidos</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Headcount por area</h3>
          {data.byDepartment.length === 0 ? (
            <p className="muted">Sem dados.</p>
          ) : (
            <div className="disc-bars">
              {data.byDepartment.map((d) => (
                <div className="disc-row" key={d.department}>
                  <div className="disc-factor-name">{d.department}</div>
                  <div className="disc-track">
                    <div
                      className="disc-fill"
                      style={{ width: `${(d.count / maxDept) * 100}%`, background: "var(--brand)" }}
                    />
                  </div>
                  <div className="disc-val">{d.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Distribuicao comportamental</h3>
          <div className="disc-bars">
            {data.byDiscPrimary.map((d) => (
              <div className="disc-row" key={d.factor}>
                <div className="disc-factor-name">
                  <DiscBadge primary={d.factor} />
                </div>
                <div className="disc-track">
                  <div
                    className="disc-fill"
                    style={{ width: `${(d.count / maxDisc) * 100}%`, background: "var(--brand)" }}
                  />
                </div>
                <div className="disc-val">{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
