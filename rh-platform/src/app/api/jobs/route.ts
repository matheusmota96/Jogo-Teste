import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listJobs } from "@/lib/recruitment";

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json(jobs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar vagas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const positionId = String(body.positionId ?? "").trim();
    const location = body.location ? String(body.location).trim() : null;

    if (!positionId) {
      return NextResponse.json(
        { error: "Selecione um cargo para abrir a vaga." },
        { status: 400 }
      );
    }

    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
      return NextResponse.json({ error: "Cargo nao encontrado." }, { status: 404 });
    }

    const job = await prisma.job.create({
      data: {
        positionId: position.id,
        title: position.title,
        location,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar vaga." }, { status: 500 });
  }
}
