import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { getJob } from "@/lib/recruitment";
import { Pipeline, type PipelineApplication } from "./Pipeline";
import { AddCandidateForm } from "./AddCandidateForm";

export const dynamic = "force-dynamic";

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "green" },
  PAUSED: { label: "Pausada", color: "amber" },
  CLOSED: { label: "Encerrada", color: "gray" },
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  let job;
  try {
    job = await getJob(jobId);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!job) notFound();

  const st = JOB_STATUS[job.status] ?? { label: job.status, color: "gray" };

  const applications: PipelineApplication[] = job.applications.map((a) => ({
    id: a.id,
    stage: a.stage,
    score: a.score,
    discPrimary: a.discPrimary,
    candidateName: a.candidate.name,
    candidateEmail: a.candidate.email,
  }));

  return (
    <>
      <Link className="btn ghost" href="/recrutamento" style={{ paddingLeft: 0 }}>
        ← Vagas
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {job.title}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {job.position.title} · {job.position.department}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <span className={`pill ${st.color}`}>{st.label}</span>
      </div>

      <AddCandidateForm jobId={job.id} />

      <div className="section-head" style={{ marginTop: 24 }}>
        <h3>Pipeline ({job.applications.length} candidatos)</h3>
      </div>
      <Pipeline applications={applications} />
    </>
  );
}
