import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  formatBRL,
  getDashboardData,
  getFilterOptions,
  type DashboardData,
  type Period,
} from "@/lib/dashboard";
import { DashboardFilters } from "./DashboardFilters";
import { SectorBreakdown } from "./SectorBreakdown";
import { PeopleReveal } from "./PeopleReveal";

export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["mes", "3m", "6m", "12m", "ano"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; company?: string; dept?: string; manager?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = VALID_PERIODS.includes(sp.period as Period) ? (sp.period as Period) : "mes";
  const filters = {
    period,
    companyId: sp.company || undefined,
    department: sp.dept || undefined,
    managerId: sp.manager || undefined,
  };

  let data: DashboardData;
  let options;
  try {
    [data, options] = await Promise.all([getDashboardData(filters), getFilterOptions()]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Dashboard</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const { cards } = data;

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Visao executiva das pessoas da empresa</p>

      <DashboardFilters options={options} />

      {/* LINHA 1 — VISAO GERAL */}
      <div className="dash-cards">
        <StatCard label="Colaboradores" value={String(cards.headcount)}
          delta={cards.headcountDelta != null && cards.headcountDelta !== 0
            ? { n: cards.headcountDelta, suffix: "no mes" } : null} />
        <StatCard label="Custo mensal com pessoal" value={formatBRL(cards.monthlyCost)} />
        <StatCard label="Admissoes no periodo" value={String(cards.admissions)} />
        <StatCard label="Desligamentos no periodo" value={String(cards.terminations)} />
        <StatCard label="Turnover" value={`${cards.turnover.toFixed(1)}%`} />
        <StatCard label="Performance media"
          value={cards.avgPerformance != null ? `${cards.avgPerformance.toFixed(1)}/5` : "—"} />
      </div>

      {/* LINHA 2 — ESTRUTURA */}
      <div className="section-head">
        <h3>Pessoas e custo por setor</h3>
        <span className="muted" style={{ fontSize: 13 }}>
          {data.totals.people} pessoas · {formatBRL(data.totals.cost)}/mes
        </span>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <SectorBreakdown sectors={data.sectors} />
      </div>

      {/* LINHA 3 — EVOLUCAO */}
      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Headcount × Custo mensal</h3>
          {data.hasHistory ? (
            <EvolutionChart data={data.evolution} />
          ) : (
            <EmptyHistory />
          )}
        </div>
        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Admissoes × Desligamentos</h3>
            <span className="muted" style={{ fontSize: 13 }}>
              liquido {cards.netGrowth >= 0 ? "+" : ""}
              {cards.netGrowth}
            </span>
          </div>
          {data.hasHistory ? (
            <HiresExitsChart data={data.hiresVsExits} />
          ) : (
            <EmptyHistory />
          )}
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <div>
              <div className="stat-label">Admissoes</div>
              <div className="stat" style={{ fontSize: 22, color: "var(--s)" }}>{cards.admissions}</div>
              <PeopleReveal label="Admissoes" people={data.admissionsList} />
            </div>
            <div>
              <div className="stat-label">Desligamentos</div>
              <div className="stat" style={{ fontSize: 22, color: "var(--d)" }}>{cards.terminations}</div>
              <PeopleReveal label="Desligamentos" people={data.terminationsList} />
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 4 — PESSOAS */}
      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Distribuicao por setor</h3>
          <div className="disc-bars">
            {data.distribution.map((d) => {
              const max = Math.max(...data.distribution.map((x) => x.count), 1);
              return (
                <div className="disc-row" key={d.department}>
                  <div className="disc-factor-name">{d.department}</div>
                  <div className="disc-track">
                    <div className="disc-fill" style={{ width: `${(d.count / max) * 100}%`, background: "var(--brand)" }} />
                  </div>
                  <div className="disc-val">{d.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Performance por setor</h3>
          {data.hasPerformance ? (
            <>
              <div className="perf-tiles">
                <PerfTile n={data.performance.high} label="Alta" color="var(--s)" />
                <PerfTile n={data.performance.expected} label="Esperado" color="var(--brand)" />
                <PerfTile n={data.performance.below} label="Abaixo" color="var(--d)" />
                <PerfTile n={data.performance.pending} label="Pendentes" color="var(--muted)" />
              </div>
              <div className="disc-bars" style={{ marginTop: 8 }}>
                {data.performance.bySector.filter((s) => s.avg != null).map((s) => (
                  <div className="disc-row" key={s.department}>
                    <div className="disc-factor-name">{s.department}</div>
                    <div className="disc-track">
                      <div className="disc-fill" style={{ width: `${((s.avg ?? 0) / 5) * 100}%`, background: "var(--brand)" }} />
                    </div>
                    <div className="disc-val">{s.avg?.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="perf-tiles">
                <PerfTile n={data.performance.pending} label="Sem avaliacao" color="var(--muted)" />
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                Nenhuma avaliacao concluida ainda. A performance aparece conforme as
                avaliacoes forem registradas no modulo Performance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LINHA 5 — GESTAO */}
      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Atencao do RH</h3>
          {data.alerts.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nenhum alerta no momento.</p>
          ) : (
            <div className="alerts">
              {data.alerts.map((a, i) => (
                <div key={i} className={`alert-item ${a.level}`}>
                  <span className="alert-dot" />
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Proximos aniversariantes</h3>
          {data.birthdays.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma data de nascimento cadastrada.
            </p>
          ) : (
            data.birthdays.map((b) => (
              <div key={b.id} className="birthday-item">
                <span className="birthday-day">{b.dateLabel}</span>
                <span className="birthday-info">
                  <Link href={`/colaboradores/${b.id}`}>{b.name}</Link>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {b.department ?? "-"} · faz {b.turningAge} anos
                  </span>
                </span>
                <span className={`pill ${b.daysUntil === 0 ? "green" : "gray"}`}>
                  {whenLabel(b.daysUntil)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function whenLabel(days: number): string {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanha";
  return `em ${days} dias`;
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: { n: number; suffix: string } | null;
}) {
  return (
    <div className="card dash-card">
      <div className="stat-label">{label}</div>
      <div className="stat">{value}</div>
      {delta && (
        <div className={`delta ${delta.n >= 0 ? "up" : "down"}`}>
          {delta.n >= 0 ? "↑" : "↓"} {Math.abs(delta.n)} {delta.suffix}
        </div>
      )}
    </div>
  );
}

function PerfTile({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="perf-tile">
      <div className="perf-n" style={{ color }}>{n}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="empty-chart">
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Sem historico suficiente. Esta visao e gerada automaticamente conforme as
        <strong> datas de admissao e desligamento</strong> forem registradas nas fichas.
      </p>
    </div>
  );
}

// ----- Graficos (SVG, sem bibliotecas) -----

function EvolutionChart({ data }: { data: DashboardData["evolution"] }) {
  const W = 620, H = 220, padL = 8, padR = 8, padT = 14, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxHead = Math.max(...data.map((d) => d.headcount), 1);
  const maxCost = Math.max(...data.map((d) => d.cost), 1);
  const n = data.length;
  const step = innerW / n;
  const barW = Math.min(38, step * 0.5);

  const costPts = data.map((d, i) => {
    const x = padL + step * i + step / 2;
    const y = padT + innerH - (d.cost / maxCost) * innerH;
    return `${x},${y}`;
  });

  return (
    <div>
      <div className="chart-legend">
        <span><i className="sw" style={{ background: "var(--brand)" }} /> Headcount</span>
        <span><i className="sw line" style={{ background: "var(--ink)" }} /> Custo mensal</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420 }} role="img">
          {data.map((d, i) => {
            const x = padL + step * i + (step - barW) / 2;
            const h = (d.headcount / maxHead) * innerH;
            const y = padT + innerH - h;
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barW} height={h} rx={4} fill="var(--brand)" opacity={0.85} />
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="var(--muted)">
                  {d.headcount}
                </text>
                <text x={padL + step * i + step / 2} y={H - 9} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
                  {d.label}
                </text>
              </g>
            );
          })}
          <polyline points={costPts.join(" ")} fill="none" stroke="var(--ink)" strokeWidth="2" />
          {data.map((d, i) => {
            const x = padL + step * i + step / 2;
            const y = padT + innerH - (d.cost / maxCost) * innerH;
            return <circle key={d.label} cx={x} cy={y} r="3" fill="var(--ink)" />;
          })}
        </svg>
      </div>
    </div>
  );
}

function HiresExitsChart({ data }: { data: DashboardData["hiresVsExits"] }) {
  const W = 620, H = 200, padL = 8, padR = 8, padT = 12, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...data.flatMap((d) => [d.hires, d.exits]), 1);
  const n = data.length;
  const step = innerW / n;
  const bw = Math.min(14, step * 0.28);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420 }} role="img">
        {data.map((d, i) => {
          const cx = padL + step * i + step / 2;
          const hh = (d.hires / max) * innerH;
          const eh = (d.exits / max) * innerH;
          return (
            <g key={d.label}>
              <rect x={cx - bw - 2} y={padT + innerH - hh} width={bw} height={hh} rx={3} fill="var(--s)" />
              <rect x={cx + 2} y={padT + innerH - eh} width={bw} height={eh} rx={3} fill="var(--d)" />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
