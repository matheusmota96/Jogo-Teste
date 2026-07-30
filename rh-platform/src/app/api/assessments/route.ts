import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DISC_GROUP_COUNT } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";
import type { DiscAnswer, DiscFactor } from "@/lib/disc/types";
import { DISC_FACTORS } from "@/lib/disc/types";

function isFactor(v: unknown): v is DiscFactor {
  return typeof v === "string" && (DISC_FACTORS as string[]).includes(v);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collaboratorId = String(body.collaboratorId ?? "");
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!collaboratorId) {
      return NextResponse.json({ error: "collaboratorId e obrigatorio." }, { status: 400 });
    }

    // Validacao das respostas.
    const answers: DiscAnswer[] = [];
    for (const a of rawAnswers) {
      if (!isFactor(a?.most) || !isFactor(a?.least) || a.most === a.least) {
        return NextResponse.json({ error: "Respostas invalidas." }, { status: 400 });
      }
      answers.push({ groupId: Number(a.groupId), most: a.most, least: a.least });
    }

    if (answers.length !== DISC_GROUP_COUNT) {
      return NextResponse.json(
        { error: `Responda todos os ${DISC_GROUP_COUNT} grupos.` },
        { status: 400 }
      );
    }

    const collaborator = await prisma.collaborator.findUnique({ where: { id: collaboratorId } });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
    }

    const result = scoreDisc(answers);

    const assessment = await prisma.assessment.create({
      data: {
        collaboratorId,
        type: "DISC",
        scoreD: result.scores.D,
        scoreI: result.scores.I,
        scoreS: result.scores.S,
        scoreC: result.scores.C,
        primary: result.primary,
        secondary: result.secondary,
        profileName: result.profileName,
        answers: answers as unknown as object,
      },
    });

    return NextResponse.json({ id: assessment.id, result }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar avaliacao." }, { status: 500 });
  }
}
