import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jobId = String(body.jobId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;

    let score: number | null = null;
    if (body.score !== undefined && body.score !== null && body.score !== "") {
      const parsed = Number(body.score);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        return NextResponse.json(
          { error: "Score deve ser um numero entre 0 e 100." },
          { status: 400 }
        );
      }
      score = Math.round(parsed);
    }

    let discPrimary: string | null = null;
    if (body.discPrimary) {
      const d = String(body.discPrimary).trim().toUpperCase();
      if (!["D", "I", "S", "C"].includes(d)) {
        return NextResponse.json(
          { error: "Perfil DISC invalido." },
          { status: 400 }
        );
      }
      discPrimary = d;
    }

    if (!jobId || !name || !email) {
      return NextResponse.json(
        { error: "Vaga, nome e e-mail sao obrigatorios." },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Vaga nao encontrada." }, { status: 404 });
    }

    const candidate = await prisma.candidate.create({
      data: { name, email, phone },
    });

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: candidate.id,
        stage: "INSCRITO",
        score,
        discPrimary,
      },
      include: { candidate: true },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar candidatura." }, { status: 500 });
  }
}
