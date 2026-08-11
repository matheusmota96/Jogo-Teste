import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B4you · Plataforma RH",
  description: "Plataforma completa de gestao de pessoas orientada a dados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
