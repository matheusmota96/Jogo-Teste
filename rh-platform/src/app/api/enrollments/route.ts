import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = String(body.courseId ?? "").trim();
    const collaboratorId = String(body.collaboratorId ?? "").trim();

    if (!courseId || !collaboratorId) {
      return NextResponse.json(
        { error: "Curso e colaborador sao obrigatorios." },
        { status: 400 }
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: { courseId_collaboratorId: { courseId, collaboratorId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Colaborador ja matriculado neste curso." },
        { status: 409 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: { courseId, collaboratorId },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao matricular." }, { status: 500 });
  }
}
