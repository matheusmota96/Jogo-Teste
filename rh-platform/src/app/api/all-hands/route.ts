import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rows = await prisma.allHands.findMany({ orderBy: { date: "asc" } });
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
    const title = body.title ? String(body.title).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!dateStr) {
      return NextResponse.json({ error: "Data e obrigatoria." }, { status: 400 });
    }
    // Interpreta "YYYY-MM-DD" como meia-noite UTC.
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Data invalida." }, { status: 400 });
    }

    const created = await prisma.allHands.create({ data: { date, title, notes } });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar." }, { status: 500 });
  }
}
