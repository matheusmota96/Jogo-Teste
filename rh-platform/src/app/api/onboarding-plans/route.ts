import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_ONBOARDING_TASKS, listPlans } from "@/lib/onboarding";

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json(plans);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar planos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collaboratorId = String(body.collaboratorId ?? "").trim();

    if (!collaboratorId) {
      return NextResponse.json(
        { error: "Selecione um colaborador." },
        { status: 400 }
      );
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });
    if (!collaborator) {
      return NextResponse.json(
        { error: "Colaborador nao encontrado." },
        { status: 404 }
      );
    }

    const parsedStart = body.startDate ? new Date(String(body.startDate)) : null;
    const startDate =
      parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : undefined;

    const plan = await prisma.onboardingPlan.create({
      data: {
        collaboratorId,
        ...(startDate ? { startDate } : {}),
        tasks: {
          create: DEFAULT_ONBOARDING_TASKS.map((t) => ({
            title: t.title,
            category: t.category,
            dueDay: t.dueDay,
          })),
        },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar plano." }, { status: 500 });
  }
}
