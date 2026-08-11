import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo height={30} tone="light" />
          <small>HRIS orientado a dados</small>
        </div>

        <Link className="nav-link" href="/">
          Visao geral
        </Link>

        <div className="nav-section">Ciclo de gestao</div>
        <Link className="nav-link" href="/colaboradores">
          1 · Mapeamento (DISC)
        </Link>
        <Link className="nav-link" href="/cargos">
          2 · Engenharia de Cargos
        </Link>
        <Link className="nav-link" href="/recrutamento">
          3 · Recrutamento (ATS)
        </Link>
        <Link className="nav-link" href="/onboarding">
          4 · Onboarding
        </Link>
        <Link className="nav-link" href="/colaboradores">
          5 · Employee Hub
        </Link>
        <Link className="nav-link" href="/performance">
          6 · Performance & PDI
        </Link>
        <Link className="nav-link" href="/engajamento">
          7 · Retencao & Engajamento
        </Link>
        <Link className="nav-link" href="/analytics">
          8 · People Analytics
        </Link>

        <div className="nav-section">Estrategico</div>
        <Link className="nav-link" href="/okrs">
          Metas (OKRs)
        </Link>
        <Link className="nav-link" href="/nine-box">
          Sucessao (Nine Box)
        </Link>
        <Link className="nav-link" href="/lms">
          LMS (Treinamentos)
        </Link>

        <div className="nav-section">Ferramentas</div>
        <Link className="nav-link" href="/profiler">
          Aplicar Profiler
        </Link>
        <Link className="nav-link" href="/comparar">
          Comparar perfis
        </Link>

        {user.role === "ADMIN" && (
          <>
            <div className="nav-section">Administracao</div>
            <Link className="nav-link" href="/admin/usuarios">
              Usuarios & acessos
            </Link>
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
