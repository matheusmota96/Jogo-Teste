import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { listCollaborators, DbUnavailableError } from "@/lib/collaborators";
import { DISC_GROUP_COUNT } from "@/lib/disc/questions";

export const dynamic = "force-dynamic";

export default async function ProfilerStartPage() {
  let collaborators;
  try {
    collaborators = await listCollaborators();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Aplicar Profiler</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  return (
    <>
      <h1 className="page-title">Aplicar Profiler DISC</h1>
      <p className="page-subtitle">
        Selecione o colaborador que vai responder ao teste ({DISC_GROUP_COUNT} grupos de
        escolha forcada).
      </p>

      <div className="card">
        {collaborators.length === 0 ? (
          <p className="muted">
            Cadastre um colaborador primeiro em <Link href="/colaboradores">Colaboradores</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Perfil atual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="muted">{c.role ?? "-"}</td>
                  <td>
                    {c.latest ? (
                      <DiscBadge primary={c.latest.primary} label={c.latest.profileName} />
                    ) : (
                      <span className="muted">Nao mapeado</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/profiler/${c.id}`}>
                      Iniciar teste
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
