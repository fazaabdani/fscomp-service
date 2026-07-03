import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
export async function GET(request: Request) {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticketId = new URL(request.url).searchParams.get("ticketId");
  return NextResponse.json({
    chats: await prisma.chatLog.findMany({
      where: ticketId ? { ticketId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  });
}
export async function POST(request: Request) {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json();
  if (!b.ticketId || !b.phone || !b.message)
    return NextResponse.json(
      { error: "Data chat tidak valid" },
      { status: 400 },
    );
  const chat = await prisma.chatLog.create({
    data: {
      id: randomUUID(),
      ticketId: b.ticketId,
      phone: b.phone,
      template: b.template || "CUSTOM",
      message: String(b.message).slice(0, 4000),
      createdBy: u.id,
    },
  });
  return NextResponse.json({ chat });
}
