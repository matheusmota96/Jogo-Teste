import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RH Group B4You",
  description: "People Management Operating System do Grupo B4You",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
