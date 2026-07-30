import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { getCollaborator, DbUnavailableError } from "@/lib/collaborators";
import { DISC_GROUPS } from "@/lib/disc/questions";
import { ProfilerTest } from "./ProfilerTest";

export const dynamic = "force-dynamic";

export default async function ProfilerTestPage({
  params,
}: {
  params: Promise<{ collaboratorId: string }>;
}) {
  const { collaboratorId } = await params;

  let collaborator;
  try {
    collaborator = await getCollaborator(collaboratorId);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!collaborator) notFound();

  return (
    <ProfilerTest
      collaboratorId={collaborator.id}
      collaboratorName={collaborator.name}
      groups={DISC_GROUPS}
    />
  );
}
