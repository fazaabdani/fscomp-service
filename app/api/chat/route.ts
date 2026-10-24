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
  const b = await request.json().catch(() => null);
  if (!b || !b.ticketId || !b.phone || !b.message)
    return NextResponse.json(
      { error: "Data chat tidak valid" },
      { status: 400 },
    );
  const ticket = await prisma.ticket.findUnique({ where: { id: b.ticketId } });
  if (!ticket)
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  const template = String(b.template || "CUSTOM").toUpperCase().slice(0, 24);
  // SKIP_* stands in for a required message; only an Admin may use it.
  if (template.startsWith("SKIP_") && u.role !== "ADMIN")
    return NextResponse.json({ error: "Hanya Admin yang dapat melewati chat wajib" }, { status: 403 });
  const chat = await prisma.chatLog.create({
    data: {
      id: randomUUID(),
      ticketId: b.ticketId,
      phone: b.phone,
      template,
      message: String(b.message).slice(0, 4000),
      createdBy: u.id,
    },
  });
  return NextResponse.json({ chat });
}
