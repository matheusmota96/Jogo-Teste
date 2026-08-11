import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "rh_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
const PUBLIC_PAGES = ["/login", "/signup"];

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Verifica o token de sessao (mesmo formato assinado em src/lib/auth.ts). */
async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(sig) as unknown as BufferSource,
      new TextEncoder().encode(`${userId}.${exp}`)
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidToken(token);

  // Rotas de autenticacao: sempre liberadas.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Demais rotas de API: exigem sessao, respondendo 401 (sem redirecionar).
  if (pathname.startsWith("/api")) {
    if (!valid) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Paginas publicas (login/cadastro): se ja logado, manda para a home.
  if (PUBLIC_PAGES.includes(pathname)) {
    if (valid) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Paginas protegidas.
  if (!valid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
