import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma RH (HRIS)",
  description: "Plataforma completa de gestao de pessoas orientada a dados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              Plataforma RH
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
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
