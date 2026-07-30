import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma RH - Mapeamento Comportamental",
  description: "Modulo 1: Profiler DISC e DNA Comportamental",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              Plataforma RH
              <small>Mapeamento Comportamental</small>
            </div>
            <div className="nav-section">Modulo ativo</div>
            <Link className="nav-link" href="/">
              Visao geral
            </Link>
            <Link className="nav-link" href="/colaboradores">
              Colaboradores
            </Link>
            <Link className="nav-link" href="/profiler">
              Aplicar Profiler
            </Link>
            <Link className="nav-link" href="/comparar">
              Comparar perfis
            </Link>

            <div className="nav-section">Roadmap</div>
            <span className="nav-link" style={{ opacity: 0.45 }}>
              Engenharia de Cargos
            </span>
            <span className="nav-link" style={{ opacity: 0.45 }}>
              Recrutamento (ATS)
            </span>
            <span className="nav-link" style={{ opacity: 0.45 }}>
              Performance & PDI
            </span>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
