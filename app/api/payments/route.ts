import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { pushPaymentToDashboard } from "@/lib/dashboard-sync";
export async function GET(request: Request) {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (u.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat melihat riwayat pembayaran" },
      { status: 403 },
    );
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
  // Routine DP entries go through POST/PATCH /api/tickets, which create the
  // matching Payment row in the same transaction as the ticket change — see
  // those routes. This endpoint is now only for direct/manual ledger entries
  // outside a ticket's normal flow, so it's restricted to Admin.
  if (u.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mencatat pembayaran langsung" },
      { status: 403 },
    );
  const b = await request.json();
  // Negative amounts are allowed: a DP correction (technician lowers an
  // over-entered DP) needs a matching reversal so the ledger sum stays
  // equal to the ticket's actual current DP, not just monotonically grow.
  if (!b.ticketId || !Number.isInteger(b.amount) || b.amount === 0)
    return NextResponse.json(
      { error: "Pembayaran tidak valid" },
      { status: 400 },
    );
  const ticket = await prisma.ticket.findUnique({ where: { id: b.ticketId } });
  if (!ticket)
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
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
  pushPaymentToDashboard(p);

  return NextResponse.json({ payment: p });
}
