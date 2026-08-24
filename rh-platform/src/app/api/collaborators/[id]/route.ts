import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function parseUtcDate(value: unknown): Date | null {
  const s = String(value ?? "");
  if (!s) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    if (me.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar colaboradores." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const action = String(body.action ?? "");

    const collaborator = await prisma.collaborator.findUnique({ where: { id } });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
    }

    if (action === "update") {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
      }
      const salaryNum =
        body.salary !== "" && body.salary != null ? Number(body.salary) : null;

      const data: Prisma.CollaboratorUpdateInput = {
        name,
        role: body.role ? String(body.role).trim() : null,
        department: body.department ? String(body.department).trim() : null,
        salary: salaryNum != null && !Number.isNaN(salaryNum) ? salaryNum : null,
        admissionDate: parseUtcDate(body.admissionDate),
        birthDate: parseUtcDate(body.birthDate),
      };

      if (Array.isArray(body.companyIds)) {
        data.companies = { set: body.companyIds.map((cid: unknown) => ({ id: String(cid) })) };
      }

      if ("managerId" in body) {
        const managerId = body.managerId ? String(body.managerId) : null;
        data.manager =
          managerId && managerId !== id ? { connect: { id: managerId } } : { disconnect: true };
      }

      const updated = await prisma.collaborator.update({
        where: { id },
        data,
        select: { id: true, name: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "terminate") {
      const dateStr = String(body.terminationDate ?? "");
      const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Data invalida." }, { status: 400 });
      }
      const reason = body.reason ? String(body.reason).trim() : null;

      const updated = await prisma.collaborator.update({
        where: { id },
        data: {
          status: "TERMINATED",
          terminationDate: date,
          events: {
            create: {
              type: "DESLIGAMENTO",
              description: reason ? `Desligamento — ${reason}` : "Desligamento",
              date,
            },
          },
        },
        select: { id: true, status: true, terminationDate: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "leave") {
      const updated = await prisma.collaborator.update({
        where: { id },
        data: { status: "ON_LEAVE" },
        select: { id: true, status: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "reactivate") {
      const updated = await prisma.collaborator.update({
        where: { id },
        data: { status: "ACTIVE", terminationDate: null },
        select: { id: true, status: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar colaborador." }, { status: 500 });
  }
}
