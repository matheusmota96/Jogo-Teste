import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLink } from "@/components/NavLink";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo height={30} tone="light" />
          <small>Group B4You · People Ops</small>
        </div>

        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/">Visão geral</NavLink>

        <div className="nav-section">Ciclo de gestão</div>
        <NavLink href="/colaboradores">1 · Mapeamento (DISC)</NavLink>
        <NavLink href="/cargos">2 · Engenharia de Cargos</NavLink>
        <NavLink href="/recrutamento">3 · Recrutamento (ATS)</NavLink>
        <NavLink href="/onboarding">4 · Onboarding</NavLink>
        <NavLink href="/performance">5 · Performance & PDI</NavLink>
        <NavLink href="/engajamento">6 · Retenção & Engajamento</NavLink>
        <NavLink href="/analytics">7 · People Analytics</NavLink>

        <div className="nav-section">Estratégico</div>
        <NavLink href="/okrs">Metas (OKRs)</NavLink>
        <NavLink href="/nine-box">Sucessão (Nine Box)</NavLink>
        <NavLink href="/lms">LMS (Treinamentos)</NavLink>

        <div className="nav-section">Ferramentas</div>
        <NavLink href="/calendario">Calendário</NavLink>
        <NavLink href="/all-hands">All Hands</NavLink>
        <NavLink href="/profiler">Aplicar Profiler</NavLink>
        <NavLink href="/comparar">Comparar perfis</NavLink>

        {user.role === "ADMIN" && (
          <>
            <div className="nav-section">Administração</div>
            <NavLink href="/admin/usuarios">Usuários & acessos</NavLink>
          </>
        )}

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className={`pill ${user.role === "ADMIN" ? "amber" : "gray"}`}>
              {user.role === "ADMIN" ? "Admin" : "Membro"}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
