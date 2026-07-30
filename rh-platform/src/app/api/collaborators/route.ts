import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role ? String(body.role).trim() : null;
    const department = body.department ? String(body.department).trim() : null;

    if (!name || !email) {
      return NextResponse.json({ error: "Nome e e-mail sao obrigatorios." }, { status: 400 });
    }

    const existing = await prisma.collaborator.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Ja existe um colaborador com esse e-mail." }, { status: 409 });
    }

    const collaborator = await prisma.collaborator.create({
      data: { name, email, role, department },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar colaborador." }, { status: 500 });
  }
}
