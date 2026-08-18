import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action ?? "");

    const collaborator = await prisma.collaborator.findUnique({ where: { id } });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
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
