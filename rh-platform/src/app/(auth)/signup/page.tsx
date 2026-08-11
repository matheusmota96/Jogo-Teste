import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Criar conta · B4you RH" };

export default function SignupPage() {
  return (
    <div className="auth-card">
      <div className="auth-logo">
        <Logo height={40} tone="dark" />
      </div>
      <h1 className="auth-title">Criar conta</h1>
      <p className="auth-subtitle">
        O cadastro exige a palavra-passe de acesso fornecida pela empresa.
      </p>
      <SignupForm />
    </div>
  );
}
