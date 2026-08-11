import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "rh_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/** Segredo de assinatura da sessao. Defina AUTH_SECRET em producao. */
export const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";

/**
 * Palavra-passe exigida para criar conta. Configuravel por env; o valor
 * padrao e o codigo de acesso combinado.
 */
export const SIGNUP_ACCESS_CODE = process.env.SIGNUP_ACCESS_CODE ?? "B4YOU2026@";

/** Admin principal — sempre ADMIN, responsavel por liberar acessos admin. */
export const PRINCIPAL_ADMIN_EMAIL = (
  process.env.PRINCIPAL_ADMIN_EMAIL ?? "b4you.rh@gmail.com"
).toLowerCase();

export function isPrincipalAdmin(email: string): boolean {
  return email.trim().toLowerCase() === PRINCIPAL_ADMIN_EMAIL;
}

// ---- Senhas (scrypt) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");
  return derived.length === hashBuffer.length && timingSafeEqual(derived, hashBuffer);
}

// ---- Token de sessao assinado (HMAC-SHA256) ----
// Formato: `${userId}.${expMs}.${hexSignature}` — verificavel tambem no
// middleware (edge, via Web Crypto).

function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

export function createSessionToken(userId: string): { value: string; maxAgeSeconds: number } {
  const exp = Date.now() + SESSION_MAX_AGE_MS;
  const payload = `${userId}.${exp}`;
  return {
    value: `${payload}.${sign(payload)}`,
    maxAgeSeconds: Math.floor(SESSION_MAX_AGE_MS / 1000),
  };
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  if (Number(exp) < Date.now()) return null;

  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
};

/** Le a sessao do cookie, valida a assinatura e carrega o usuario. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch {
    return null;
  }
}
