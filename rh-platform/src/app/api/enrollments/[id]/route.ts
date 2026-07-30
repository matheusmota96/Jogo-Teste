import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const raw = Number(body.progress);
    if (Number.isNaN(raw)) {
      return NextResponse.json({ error: "Progresso invalido." }, { status: 400 });
    }
    const progress = Math.max(0, Math.min(100, Math.round(raw)));

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        progress,
        completedAt: progress === 100 ? new Date() : null,
      },
    });

    return NextResponse.json(enrollment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar matricula." }, { status: 500 });
  }
}
