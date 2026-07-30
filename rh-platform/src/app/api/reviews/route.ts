import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listReviews } from "@/lib/performance";
import type { Prisma, ReviewType, ReviewStatus } from "@prisma/client";

const REVIEW_TYPES: ReviewType[] = ["AUTO", "NINETY", "ONE_EIGHTY", "THREE_SIXTY"];
const REVIEW_STATUSES: ReviewStatus[] = ["DRAFT", "IN_PROGRESS", "COMPLETED"];

function coerceScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

type RawRating = { competencyName?: unknown; score?: unknown };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collaboratorId = String(body.collaboratorId ?? "");
    const cycle = String(body.cycle ?? "").trim();

    if (!collaboratorId) {
      return NextResponse.json({ error: "collaboratorId e obrigatorio." }, { status: 400 });
    }
    if (!cycle) {
      return NextResponse.json({ error: "O ciclo e obrigatorio." }, { status: 400 });
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
    }

    const reviewerIdRaw = body.reviewerId ? String(body.reviewerId) : "";
    const reviewerId = reviewerIdRaw || null;

    const type: ReviewType = REVIEW_TYPES.includes(body.type)
      ? body.type
      : "THREE_SIXTY";
    const status: ReviewStatus = REVIEW_STATUSES.includes(body.status)
      ? body.status
      : "COMPLETED";

    const rawRatings: RawRating[] = Array.isArray(body.ratings) ? body.ratings : [];
    const ratings: Prisma.CompetencyRatingCreateWithoutReviewInput[] = [];
    for (const r of rawRatings) {
      const name = String(r?.competencyName ?? "").trim();
      const score = coerceScore(r?.score);
      if (!name || score === null) continue;
      ratings.push({ competencyName: name, score });
    }

    const notes = body.notes ? String(body.notes).trim() || null : null;

    const review = await prisma.performanceReview.create({
      data: {
        collaboratorId,
        reviewerId,
        type,
        cycle,
        status,
        overallScore: coerceScore(body.overallScore),
        potentialScore: coerceScore(body.potentialScore),
        notes,
        ratings: ratings.length > 0 ? { create: ratings } : undefined,
      },
    });

    return NextResponse.json({ id: review.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar avaliacao." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reviews = await listReviews();
    return NextResponse.json(reviews);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar avaliacoes." }, { status: 500 });
  }
}
