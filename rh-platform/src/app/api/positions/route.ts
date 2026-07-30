import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  listPositions,
  SENIORITY_VALUES,
  CONTRACT_TYPE_VALUES,
} from "@/lib/positions";
import type { Seniority, ContractType } from "@prisma/client";

export async function GET() {
  try {
    const positions = await listPositions();
    return NextResponse.json(positions, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar cargos." }, { status: 500 });
  }
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const department = String(body.department ?? "").trim();

    if (!title || !department) {
      return NextResponse.json(
        { error: "Titulo e departamento sao obrigatorios." },
        { status: 400 }
      );
    }

    const seniority: Seniority = SENIORITY_VALUES.includes(body.seniority)
      ? (body.seniority as Seniority)
      : "ANALISTA_PL";

    const contractType: ContractType = CONTRACT_TYPE_VALUES.includes(
      body.contractType
    )
      ? (body.contractType as ContractType)
      : "CLT";

    const workSchedule = body.workSchedule
      ? String(body.workSchedule).trim()
      : null;
    const mission = body.mission ? String(body.mission).trim() : null;
    const salaryMin = coerceNumber(body.salaryMin);
    const salaryMax = coerceNumber(body.salaryMax);

    const position = await prisma.position.create({
      data: {
        title,
        department,
        seniority,
        contractType,
        workSchedule,
        mission,
        salaryMin,
        salaryMax,
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar cargo." }, { status: 500 });
  }
}
