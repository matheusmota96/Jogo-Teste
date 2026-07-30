import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listCourses } from "@/lib/lms";

export async function GET() {
  try {
    const courses = await listCourses();
    return NextResponse.json(courses);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao listar cursos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const category = body.category ? String(body.category).trim() : null;
    const description = body.description ? String(body.description).trim() : null;

    if (!title) {
      return NextResponse.json({ error: "Titulo e obrigatorio." }, { status: 400 });
    }

    const hoursRaw = Number(body.hours);
    const hours =
      Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.round(hoursRaw) : 1;

    const course = await prisma.course.create({
      data: { title, category, description, hours },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar curso." }, { status: 500 });
  }
}
