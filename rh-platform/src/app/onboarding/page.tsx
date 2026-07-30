import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  listPlans,
  listCollaboratorsForSelect,
  STATUS_LABELS,
  STATUS_PILL_COLORS,
} from "@/lib/onboarding";
import { NewPlanForm } from "./NewPlanForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let plans;
  let collaborators;
  try {
    [plans, collaborators] = await Promise.all([
      listPlans(),
      listCollaboratorsForSelect(),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Onboarding</h1>
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
          <h1 className="page-title">Onboarding</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Checklist e plano dos primeiros 90 dias de cada nova pessoa
          </p>
        </div>
        <NewPlanForm collaborators={collaborators} />
      </div>

      <div className="card">
        {plans.length === 0 ? (
          <p className="muted">Nenhum plano de onboarding criado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Inicio</th>
                <th>Status</th>
                <th>Progresso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/onboarding/${p.id}`}>
                      <strong>{p.collaborator.name}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.collaborator.role ?? "-"}
                    </div>
                  </td>
                  <td className="muted">
                    {p.startDate.toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <span className={`pill ${STATUS_PILL_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <div className="meter" style={{ marginBottom: 4 }}>
                      <div style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {p.done}/{p.total} tarefas · {p.progress}%
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost" href={`/onboarding/${p.id}`}>
                      Ver plano
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
