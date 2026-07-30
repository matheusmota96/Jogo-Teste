import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const done = Boolean(body.done);

    const task = await prisma.onboardingTask.update({
      where: { id },
      data: { done },
    });

    // Toque extra: se todas as tarefas do plano estiverem concluidas, marca o
    // plano como COMPLETED; caso contrario, garante IN_PROGRESS.
    try {
      const remaining = await prisma.onboardingTask.count({
        where: { planId: task.planId, done: false },
      });
      await prisma.onboardingPlan.update({
        where: { id: task.planId },
        data: { status: remaining === 0 ? "COMPLETED" : "IN_PROGRESS" },
      });
    } catch (statusErr) {
      console.error(statusErr);
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar tarefa." }, { status: 500 });
  }
}
