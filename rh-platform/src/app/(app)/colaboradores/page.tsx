import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { listCollaborators, DbUnavailableError } from "@/lib/collaborators";
import { AddCollaboratorForm } from "./AddCollaboratorForm";

export const dynamic = "force-dynamic";

export default async function CollaboratorsPage() {
  let collaborators;
  try {
    collaborators = await listCollaborators();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Colaboradores</h1>
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
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Cadastro mestre e DNA Comportamental de cada pessoa
          </p>
        </div>
        <AddCollaboratorForm />
      </div>

      <div className="card">
        {collaborators.length === 0 ? (
          <p className="muted">Nenhum colaborador cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Empresa</th>
                <th>Perfil DISC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/colaboradores/${c.id}`}>
                      <strong>{c.name}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.email}
                    </div>
                  </td>
                  <td className="muted">{c.role ?? "-"}</td>
                  <td className="muted">{c.department ?? "-"}</td>
                  <td>
                    {c.companies.length > 0 ? (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {c.companies.map((name) => (
                          <span key={name} className="pill blue">
                            {name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    {c.latest ? (
                      <DiscBadge primary={c.latest.primary} label={c.latest.profileName} />
                    ) : (
                      <span className="muted">Nao mapeado</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn ghost" href={`/profiler/${c.id}`}>
                      Aplicar teste
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
