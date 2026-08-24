import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const VALID_TYPES = [
  "ADMISSAO",
  "PROMOCAO",
  "AJUSTE_SALARIAL",
  "MUDANCA_CARGO",
  "TREINAMENTO",
  "ADVERTENCIA",
  "FERIAS",
  "OUTRO",
] as const;

type EventType = (typeof VALID_TYPES)[number];

export async function POST(request: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem registrar eventos." }, { status: 403 });
    }

    const body = await request.json();
    const collaboratorId = String(body.collaboratorId ?? "");
    const type = String(body.type ?? "");
    const description = String(body.description ?? "").trim();
    const salaryValue =
      body.salaryValue != null && body.salaryValue !== ""
        ? Number(body.salaryValue)
        : null;

    if (!collaboratorId || !description) {
      return NextResponse.json(
        { error: "Colaborador e descricao sao obrigatorios." },
        { status: 400 }
      );
    }
    if (!VALID_TYPES.includes(type as EventType)) {
      return NextResponse.json({ error: "Tipo de evento invalido." }, { status: 400 });
    }

    const event = await prisma.employmentEvent.create({
      data: {
        collaboratorId,
        type: type as EventType,
        description,
        salaryValue: salaryValue != null && !Number.isNaN(salaryValue) ? salaryValue : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar evento." }, { status: 500 });
  }
}
