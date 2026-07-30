import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const toCollaboratorId = String(body.toCollaboratorId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const fromCollaboratorId = body.fromCollaboratorId
      ? String(body.fromCollaboratorId).trim()
      : null;
    const badge = body.badge ? String(body.badge).trim() : null;

    if (!toCollaboratorId) {
      return NextResponse.json(
        { error: "Selecione quem será reconhecido." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json({ error: "A mensagem é obrigatória." }, { status: 400 });
    }

    const to = await prisma.collaborator.findUnique({
      where: { id: toCollaboratorId },
    });
    if (!to) {
      return NextResponse.json(
        { error: "Colaborador reconhecido não encontrado." },
        { status: 404 }
      );
    }

    if (fromCollaboratorId) {
      const from = await prisma.collaborator.findUnique({
        where: { id: fromCollaboratorId },
      });
      if (!from) {
        return NextResponse.json(
          { error: "Colaborador de origem não encontrado." },
          { status: 404 }
        );
      }
    }

    const recognition = await prisma.recognition.create({
      data: {
        toCollaboratorId,
        message,
        fromCollaboratorId: fromCollaboratorId ?? undefined,
        badge,
      },
    });

    return NextResponse.json(recognition, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar reconhecimento." }, { status: 500 });
  }
}
