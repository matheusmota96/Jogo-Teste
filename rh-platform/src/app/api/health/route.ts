import { NextResponse } from "next/server";
import { isDbConfigured, prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Health-check publico: confirma que o app subiu e alcanca o banco.
// Nao expoe dados sensiveis (apenas status de conexao).
export async function GET() {
  if (!isDbConfigured) {
    return NextResponse.json({ ok: false, db: "not-configured" });
  }
  try {
    await prisma.company.count();
    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 500 });
  }
}
