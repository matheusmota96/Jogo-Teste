import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collaboratorId = String(body.collaboratorId ?? "");
    const objective = String(body.objective ?? "").trim();

    if (!collaboratorId) {
      return NextResponse.json({ error: "collaboratorId e obrigatorio." }, { status: 400 });
    }
    if (!objective) {
      return NextResponse.json({ error: "O objetivo e obrigatorio." }, { status: 400 });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
    }

    const rawActions: unknown[] = Array.isArray(body.actions) ? body.actions : [];
    const actions: Prisma.PdiActionCreateWithoutPdiInput[] = [];
    for (const a of rawActions) {
      const title =
        typeof a === "string"
          ? a.trim()
          : String((a as { title?: unknown })?.title ?? "").trim();
      if (!title) continue;
      actions.push({ title });
    }

    const pdi = await prisma.pdi.create({
      data: {
        collaboratorId,
        objective,
        actions: actions.length > 0 ? { create: actions } : undefined,
      },
    });

    return NextResponse.json({ id: pdi.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar PDI." }, { status: 500 });
  }
}
