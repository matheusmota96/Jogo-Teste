import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  getPlan,
  STATUS_LABELS,
  STATUS_PILL_COLORS,
} from "@/lib/onboarding";
import { Checklist } from "./Checklist";

export const dynamic = "force-dynamic";

export default async function OnboardingPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let plan;
  try {
    plan = await getPlan(id);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!plan) notFound();

  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.done).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <>
      <Link className="btn ghost" href="/onboarding" style={{ paddingLeft: 0 }}>
        ← Onboarding
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {plan.collaborator.name}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Plano dos primeiros 90 dias ·{" "}
            {plan.collaborator.role ?? "Sem cargo"}
            {plan.collaborator.department ? ` · ${plan.collaborator.department}` : ""}
          </p>
        </div>
        <span className={`pill ${STATUS_PILL_COLORS[plan.status]}`}>
          {STATUS_LABELS[plan.status]}
        </span>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="stat">{plan.startDate.toLocaleDateString("pt-BR")}</div>
          <div className="stat-label">Inicio</div>
        </div>
        <div className="card">
          <div className="stat">
            {done}/{total}
          </div>
          <div className="stat-label">Tarefas concluidas</div>
        </div>
        <div className="card">
          <div className="stat">{progress}%</div>
          <div className="stat-label">Progresso</div>
        </div>
      </div>

      <Checklist
        tasks={plan.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          dueDay: t.dueDay,
          done: t.done,
        }))}
      />
    </>
  );
}
