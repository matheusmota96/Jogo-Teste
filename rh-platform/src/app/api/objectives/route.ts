import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listObjectives, OKR_LEVEL_ORDER } from "@/lib/okr";
import type { OkrLevel } from "@prisma/client";

export async function GET() {
  try {
    const objectives = await listObjectives();
    return NextResponse.json(objectives);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar objetivos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const cycle = String(body.cycle ?? "").trim();
    const levelRaw = String(body.level ?? "COMPANY").trim();
    const area = body.area ? String(body.area).trim() : null;
    const ownerId = body.ownerId ? String(body.ownerId).trim() : null;

    if (!title || !cycle) {
      return NextResponse.json(
        { error: "Titulo e ciclo sao obrigatorios." },
        { status: 400 }
      );
    }

    if (!OKR_LEVEL_ORDER.includes(levelRaw as OkrLevel)) {
      return NextResponse.json({ error: "Nivel invalido." }, { status: 400 });
    }
    const level = levelRaw as OkrLevel;

    const krTitles: string[] = Array.isArray(body.keyResults)
      ? body.keyResults.map((t: unknown) => String(t ?? "").trim()).filter(Boolean)
      : [];

    const objective = await prisma.objective.create({
      data: {
        title,
        cycle,
        level,
        area,
        ownerId,
        keyResults: {
          create: krTitles.map((krTitle) => ({ title: krTitle, progress: 0 })),
        },
      },
      include: { keyResults: true, owner: true },
    });

    return NextResponse.json(objective, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar objetivo." }, { status: 500 });
  }
}
