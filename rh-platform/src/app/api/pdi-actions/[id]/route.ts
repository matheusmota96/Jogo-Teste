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

    const action = await prisma.pdiAction.update({
      where: { id },
      data: { done },
    });

    return NextResponse.json({ id: action.id, done: action.done });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar acao." }, { status: 500 });
  }
}
