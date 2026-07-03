import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
export async function GET() {
  const u = await currentSession();
  if (!u || u.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({
    logs: await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { user: { select: { name: true, username: true } } },
    }),
  });
}
