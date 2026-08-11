import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isPrincipalAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const role = String(body.role ?? "");
    if (role !== "ADMIN" && role !== "MEMBER") {
      return NextResponse.json({ error: "Papel invalido." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    // O admin principal nao pode ser rebaixado.
    if (isPrincipalAdmin(target.email) && role !== "ADMIN") {
      return NextResponse.json(
        { error: "O admin principal nao pode ser rebaixado." },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar usuario." }, { status: 500 });
  }
}
