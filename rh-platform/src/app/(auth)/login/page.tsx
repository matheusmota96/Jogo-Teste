import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar · RH B4you" };

export default function LoginPage() {
  return (
    <div className="auth-card">
      <div className="auth-logo">
        <Logo height={40} tone="dark" />
      </div>
      <h1 className="auth-title">Entrar na plataforma</h1>
      <p className="auth-subtitle">Acesse sua conta B4you RH.</p>
      <LoginForm />
    </div>
  );
}
