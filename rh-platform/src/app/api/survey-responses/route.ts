import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const surveyId = String(body.surveyId ?? "").trim();
    const scoreRaw = body.score;
    const collaboratorId = body.collaboratorId
      ? String(body.collaboratorId).trim()
      : null;
    const comment = body.comment ? String(body.comment).trim() : null;

    if (!surveyId) {
      return NextResponse.json({ error: "Pesquisa não informada." }, { status: 400 });
    }

    const score = Number(scoreRaw);
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      return NextResponse.json(
        { error: "A nota deve ser um inteiro de 0 a 10." },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
    }

    if (collaboratorId) {
      const collaborator = await prisma.collaborator.findUnique({
        where: { id: collaboratorId },
      });
      if (!collaborator) {
        return NextResponse.json(
          { error: "Colaborador não encontrado." },
          { status: 404 }
        );
      }
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        score,
        collaboratorId: collaboratorId ?? undefined,
        comment,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar resposta." }, { status: 500 });
  }
}
