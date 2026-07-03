import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
export async function GET(request: Request) {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticketId = new URL(request.url).searchParams.get("ticketId");
  return NextResponse.json({
    payments: await prisma.payment.findMany({
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
  if (!b.ticketId || !Number.isInteger(b.amount) || b.amount <= 0)
    return NextResponse.json(
      { error: "Pembayaran tidak valid" },
      { status: 400 },
    );
  const p = await prisma.payment.create({
    data: {
      id: randomUUID(),
      ticketId: b.ticketId,
      amount: b.amount,
      method: b.method || "Tunai",
      note: b.note || null,
      createdBy: u.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: u.id,
      action: "CREATE",
      entity: "Payment",
      entityId: p.id,
      detail: `${b.ticketId}: ${b.amount}`,
    },
  });
  return NextResponse.json({ payment: p });
}
