import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { PipelineStage } from "@prisma/client";

const VALID_STAGES: PipelineStage[] = [
  "INSCRITO",
  "TRIAGEM",
  "TESTE_COMPORTAMENTAL",
  "ENTREVISTA_RH",
  "ENTREVISTA_GESTOR",
  "CASE",
  "OFERTA",
  "CONTRATACAO",
  "REPROVADO",
];

function isStage(v: unknown): v is PipelineStage {
  return typeof v === "string" && (VALID_STAGES as string[]).includes(v);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const stage = body.stage;

    if (!isStage(stage)) {
      return NextResponse.json(
        { error: "Etapa do pipeline invalida." },
        { status: 400 }
      );
    }

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Candidatura nao encontrada." }, { status: 404 });
    }

    const application = await prisma.application.update({
      where: { id },
      data: { stage },
      include: { candidate: true },
    });

    return NextResponse.json(application);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar candidatura." }, { status: 500 });
  }
}
