import { NextResponse } from "next/server";
import { SurveyType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listSurveys } from "@/lib/engagement";

const VALID_TYPES = Object.values(SurveyType);

export async function GET() {
  try {
    const surveys = await listSurveys();
    return NextResponse.json(surveys);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar pesquisas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "").trim();
    const question = body.question ? String(body.question).trim() : null;

    if (!title) {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type as SurveyType)) {
      return NextResponse.json({ error: "Tipo de pesquisa inválido." }, { status: 400 });
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        type: type as SurveyType,
        question,
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar pesquisa." }, { status: 500 });
  }
}
