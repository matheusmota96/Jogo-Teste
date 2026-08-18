import { DbNotice } from "@/components/DbNotice";
import { listCollaborators, DbUnavailableError } from "@/lib/collaborators";
import { AddCollaboratorForm } from "./AddCollaboratorForm";
import { CollaboratorsTable } from "./CollaboratorsTable";

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
            Cadastro mestre e DNA Comportamental de cada pessoa · {collaborators.length} pessoas
          </p>
        </div>
        <AddCollaboratorForm />
      </div>

      {collaborators.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Nenhum colaborador cadastrado ainda.</p>
        </div>
      ) : (
        <CollaboratorsTable collaborators={collaborators} />
      )}
    </>
  );
}
