import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword, isPrincipalAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar usuarios." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role === "ADMIN" ? "ADMIN" : "MEMBER";

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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Ja existe um usuario com esse e-mail." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: isPrincipalAdmin(email) ? "ADMIN" : role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar acesso." }, { status: 500 });
  }
}
