import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { DiscBars } from "@/components/DiscBars";
import { getCollaborator, DbUnavailableError } from "@/lib/collaborators";
import { getSessionUser } from "@/lib/auth";
import { PROFILE_ARCHETYPES } from "@/lib/disc/score";
import type { DiscFactor } from "@/lib/disc/types";
import { prisma } from "@/lib/db";
import { AddEventForm } from "./AddEventForm";
import { CollaboratorActions } from "./CollaboratorActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  ON_LEAVE: "Afastado",
  TERMINATED: "Desligado",
};

const EVENT_LABELS: Record<string, string> = {
  ADMISSAO: "Admissao",
  PROMOCAO: "Promocao",
  AJUSTE_SALARIAL: "Ajuste salarial",
  MUDANCA_CARGO: "Mudanca de cargo",
  TREINAMENTO: "Treinamento",
  ADVERTENCIA: "Advertencia",
  FERIAS: "Ferias",
  OUTRO: "Outro",
};

function money(v: number | null) {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CollaboratorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let collaborator;
  let companies: { id: string; name: string }[] = [];
  let managers: { id: string; name: string }[] = [];
  try {
    collaborator = await getCollaborator(id);
    [companies, managers] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.collaborator.findMany({
        where: { id: { not: id }, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
  } catch (err) {
    if (err instanceof DbUnavailableError) return <DbNotice />;
    throw err;
  }

  if (!collaborator) notFound();

  const me = await getSessionUser();
  const isAdmin = me?.role === "ADMIN";

  const latest = collaborator.assessments[0];
  const archetype = latest ? PROFILE_ARCHETYPES[latest.primary as DiscFactor] : null;
  const activeOnboarding = collaborator.onboardingPlans[0];

  return (
    <>
      <Link className="btn ghost" href="/colaboradores" style={{ paddingLeft: 0 }}>
        ← Colaboradores
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {collaborator.name}{" "}
            <span className={`pill ${collaborator.status === "ACTIVE" ? "green" : "gray"}`}>
              {STATUS_LABELS[collaborator.status] ?? collaborator.status}
            </span>
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {collaborator.position?.title ?? collaborator.role ?? "Sem cargo"}
            {collaborator.department ? ` · ${collaborator.department}` : ""}
            {collaborator.status === "TERMINATED" && collaborator.terminationDate
              ? ` · Desligado em ${collaborator.terminationDate.toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </div>
      </div>

      {isAdmin && (
      <CollaboratorActions
        collaborator={{
          id: collaborator.id,
          name: collaborator.name,
          role: collaborator.role ?? "",
          department: collaborator.department ?? "",
          salary: collaborator.salary != null ? String(collaborator.salary) : "",
          admissionDate: collaborator.admissionDate
            ? collaborator.admissionDate.toISOString().slice(0, 10)
            : "",
          birthDate: collaborator.birthDate
            ? collaborator.birthDate.toISOString().slice(0, 10)
            : "",
          managerId: collaborator.managerId ?? "",
          status: collaborator.status,
          companyIds: collaborator.companies.map((c) => c.id),
        }}
        companies={companies}
        managers={managers}
      />
      )}

      {/* Dados cadastrais */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Dados</h3>
        <div className="grid cols-3">
          <div>
            <div className="stat-label">Cargo</div>
            <div>
              {collaborator.position ? (
                <Link href={`/cargos/${collaborator.position.id}`}>
                  {collaborator.position.title}
                </Link>
              ) : (
                collaborator.role ?? "-"
              )}
            </div>
          </div>
          <div>
            <div className="stat-label">Gestor</div>
            <div>
              {collaborator.manager ? (
                <Link href={`/colaboradores/${collaborator.manager.id}`}>
                  {collaborator.manager.name}
                </Link>
              ) : (
                "-"
              )}
            </div>
          </div>
          <div>
            <div className="stat-label">Salario</div>
            <div>{money(collaborator.salary)}</div>
          </div>
          <div>
            <div className="stat-label">Admissao</div>
            <div>
              {collaborator.admissionDate
                ? collaborator.admissionDate.toLocaleDateString("pt-BR")
                : "-"}
            </div>
          </div>
          <div>
            <div className="stat-label">Empresa</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {collaborator.companies.length > 0 ? (
                collaborator.companies.map((c) => (
                  <span key={c.id} className="pill blue">
                    {c.name}
                  </span>
                ))
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
          <div>
            <div className="stat-label">Departamento</div>
            <div>{collaborator.department ?? "-"}</div>
          </div>
          <div>
            <div className="stat-label">Nascimento</div>
            <div>
              {collaborator.birthDate
                ? collaborator.birthDate.toLocaleDateString("pt-BR")
                : "-"}
            </div>
          </div>
          <div>
            <div className="stat-label">Liderados</div>
            <div>{collaborator.reports.length}</div>
          </div>
        </div>
      </div>

      {/* DNA Comportamental */}
      {latest && (
        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>DNA Comportamental</h3>
              <DiscBadge primary={latest.primary} label={latest.profileName} />
            </div>
            <DiscBars
              scores={{ D: latest.scoreD, I: latest.scoreI, S: latest.scoreS, C: latest.scoreC }}
            />
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{archetype?.name}</h3>
            <p style={{ fontSize: 14 }}>{archetype?.description}</p>
          </div>
        </div>
      )}

      {/* Onboarding ativo */}
      {activeOnboarding && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Onboarding</h3>
            <Link className="btn ghost" href={`/onboarding/${activeOnboarding.id}`}>
              Abrir plano
            </Link>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {activeOnboarding.tasks.filter((t) => t.done).length}/
            {activeOnboarding.tasks.length} tarefas concluidas
          </p>
        </div>
      )}

      <div className="grid cols-2">
        {/* Performance */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Performance recente</h3>
          {collaborator.reviews.length === 0 ? (
            <p className="muted">Sem avaliacoes.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Nota</th>
                  <th>Potencial</th>
                </tr>
              </thead>
              <tbody>
                {collaborator.reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.cycle}</td>
                    <td>{r.overallScore != null ? `${r.overallScore.toFixed(1)}/5` : "-"}</td>
                    <td>{r.potentialScore != null ? `${r.potentialScore.toFixed(1)}/5` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PDI */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>PDI</h3>
          {collaborator.pdis.length === 0 ? (
            <p className="muted">Sem PDI.</p>
          ) : (
            collaborator.pdis.map((p) => (
              <div key={p.id} className="list-item">
                <span>{p.objective}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {p.actions.filter((a) => a.done).length}/{p.actions.length} acoes
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Treinamentos (LMS) */}
      {collaborator.enrollments.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Treinamentos (LMS)</h3>
          {collaborator.enrollments.map((e) => (
            <div key={e.id} className="list-item">
              <span>{e.course.title}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {e.completedAt ? "Concluido" : `${e.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Historico */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Historico</h3>
          {isAdmin && <AddEventForm collaboratorId={collaborator.id} />}
        </div>
        {collaborator.events.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nenhum evento registrado.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descricao</th>
                <th>Salario</th>
              </tr>
            </thead>
            <tbody>
              {collaborator.events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.date.toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className="pill blue">{EVENT_LABELS[ev.type] ?? ev.type}</span>
                  </td>
                  <td>{ev.description}</td>
                  <td>{money(ev.salaryValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Historico de testes DISC */}
      {collaborator.assessments.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Historico de testes comportamentais</h3>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Perfil</th>
                <th>D</th>
                <th>I</th>
                <th>S</th>
                <th>C</th>
              </tr>
            </thead>
            <tbody>
              {collaborator.assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.createdAt.toLocaleDateString("pt-BR")}</td>
                  <td>
                    <DiscBadge primary={a.primary} label={a.profileName} />
                  </td>
                  <td>{a.scoreD}</td>
                  <td>{a.scoreI}</td>
                  <td>{a.scoreS}</td>
                  <td>{a.scoreC}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
