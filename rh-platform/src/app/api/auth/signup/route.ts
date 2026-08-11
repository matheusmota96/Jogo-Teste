import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SIGNUP_ACCESS_CODE,
  createSessionToken,
  hashPassword,
  isPrincipalAdmin,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const accessCode = String(body.accessCode ?? "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha sao obrigatorios." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter ao menos 6 caracteres." },
        { status: 400 }
      );
    }
    // Palavra-passe de acesso exigida para criar conta.
    if (accessCode !== SIGNUP_ACCESS_CODE) {
      return NextResponse.json(
        { error: "Palavra-passe de acesso incorreta." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ja existe uma conta com esse e-mail." },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: isPrincipalAdmin(email) ? "ADMIN" : "MEMBER",
      },
      select: { id: true, name: true, email: true },
    });

    const session = createSessionToken(user.id);
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, session.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAgeSeconds,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
