import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TYPES = ["CAFE_DA_MANHA", "CONFRATERNIZACAO", "EVENTO"] as const;
type EventType = (typeof TYPES)[number];

export async function GET() {
  try {
    const rows = await prisma.companyEvent.findMany({ orderBy: { date: "asc" } });
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dateStr = String(body.date ?? "");
    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "EVENTO");
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!dateStr || !title) {
      return NextResponse.json({ error: "Data e titulo sao obrigatorios." }, { status: 400 });
    }
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Data invalida." }, { status: 400 });
    }
    if (!TYPES.includes(type as EventType)) {
      return NextResponse.json({ error: "Tipo invalido." }, { status: 400 });
    }

    const created = await prisma.companyEvent.create({
      data: { date, title, type: type as EventType, notes },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar." }, { status: 500 });
  }
}
