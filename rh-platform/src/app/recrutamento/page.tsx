import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  listJobs,
  listPositionsForSelect,
  recruitmentKpis,
} from "@/lib/recruitment";
import { NewJobForm } from "./NewJobForm";

export const dynamic = "force-dynamic";

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "green" },
  PAUSED: { label: "Pausada", color: "amber" },
  CLOSED: { label: "Encerrada", color: "gray" },
};

export default async function RecruitmentPage() {
  let jobs, kpis, positions;
  try {
    [jobs, kpis, positions] = await Promise.all([
      listJobs(),
      recruitmentKpis(),
      listPositionsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Recrutamento e Selecao</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Recrutamento e Selecao</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Vagas abertas e pipeline de candidatos (ATS)
          </p>
        </div>
        <NewJobForm positions={positions} />
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat">{kpis.vagasAbertas}</div>
          <div className="stat-label">Vagas abertas</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.totalCandidatos}</div>
          <div className="stat-label">Candidatos</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.contratacoes}</div>
          <div className="stat-label">Contratacoes</div>
        </div>
        <div className="card">
          <div className="stat">{kpis.taxaConversao}%</div>
          <div className="stat-label">Taxa de conversao</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Vagas</h3>
        {jobs.length === 0 ? (
          <p className="muted">Nenhuma vaga aberta ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Area / Departamento</th>
                <th>Status</th>
                <th>Candidatos</th>
                <th>Aberta em</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const st = JOB_STATUS[job.status] ?? {
                  label: job.status,
                  color: "gray",
                };
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/recrutamento/${job.id}`}>
                        <strong>{job.title}</strong>
                      </Link>
                      {job.location && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {job.location}
                        </div>
                      )}
                    </td>
                    <td className="muted">{job.position.department}</td>
                    <td>
                      <span className={`pill ${st.color}`}>{st.label}</span>
                    </td>
                    <td>{job._count.applications}</td>
                    <td className="muted">
                      {job.openedAt.toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
