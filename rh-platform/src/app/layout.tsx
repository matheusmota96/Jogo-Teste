import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RH B4you · Plataforma",
  description: "Plataforma completa de gestao de pessoas orientada a dados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
