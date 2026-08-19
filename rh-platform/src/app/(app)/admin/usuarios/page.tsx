import { redirect } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { getSessionUser, isPrincipalAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminUsers, type AdminUserRow } from "./AdminUsers";
import { NewUserForm } from "./NewUserForm";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN") redirect("/");

  let users: AdminUserRow[];
  try {
    const rows = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    });
    users = rows.map((u) => ({
      ...u,
      isPrincipal: isPrincipalAdmin(u.email),
    }));
  } catch (err) {
    if (err instanceof DbUnavailableError) return <DbNotice />;
    throw err;
  }

  const admins = users.filter((u) => u.role === "ADMIN").length;

  return (
    <>
      <h1 className="page-title">Usuários & acessos</h1>
      <p className="page-subtitle">
        Gerencie quem tem acesso à plataforma. {admins} admin(s) de {users.length}{" "}
        usuário(s).
      </p>
      <div style={{ marginBottom: 20 }}>
        <NewUserForm />
      </div>
      <AdminUsers users={users} meId={me.id} />
    </>
  );
}
