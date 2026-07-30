import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { DiscBars } from "@/components/DiscBars";
import { getCollaborator, DbUnavailableError } from "@/lib/collaborators";
import { PROFILE_ARCHETYPES } from "@/lib/disc/score";
import type { DiscFactor } from "@/lib/disc/types";

export const dynamic = "force-dynamic";

export default async function CollaboratorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let collaborator;
  try {
    collaborator = await getCollaborator(id);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!collaborator) notFound();

  const latest = collaborator.assessments[0];
  const archetype = latest ? PROFILE_ARCHETYPES[latest.primary as DiscFactor] : null;

  return (
    <>
      <Link className="btn ghost" href="/colaboradores" style={{ paddingLeft: 0 }}>
        ← Colaboradores
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {collaborator.name}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {collaborator.role ?? "Sem cargo"}
            {collaborator.department ? ` · ${collaborator.department}` : ""} · {collaborator.email}
          </p>
        </div>
        <Link className="btn" href={`/profiler/${collaborator.id}`}>
          Aplicar novo teste
        </Link>
      </div>

      {!latest ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sem DNA Comportamental</h3>
          <p className="muted">
            Este colaborador ainda nao realizou o Profiler DISC.
          </p>
          <Link className="btn" href={`/profiler/${collaborator.id}`}>
            Aplicar Profiler agora
          </Link>
        </div>
      ) : (
        <div className="grid cols-2">
          <div className="card">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>DNA Comportamental</h3>
              <DiscBadge primary={latest.primary} label={latest.profileName} />
            </div>
            <DiscBars
              scores={{
                D: latest.scoreD,
                I: latest.scoreI,
                S: latest.scoreS,
                C: latest.scoreC,
              }}
            />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              {archetype?.name}{" "}
              <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>
                (perfil {latest.primary}
                {latest.secondary})
              </span>
            </h3>
            <p style={{ fontSize: 14 }}>{archetype?.description}</p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
              Fator dominante <strong>{latest.primary}</strong>, secundario{" "}
              <strong>{latest.secondary}</strong>. Este DNA alimenta os modulos de
              Engenharia de Cargos (fit ao cargo), ATS (score de aderencia) e Performance.
            </p>
          </div>
        </div>
      )}

      {collaborator.assessments.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Historico de testes</h3>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
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
                  <td>{a.type}</td>
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
