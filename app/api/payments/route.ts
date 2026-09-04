import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { pushPaymentToDashboard } from "@/lib/dashboard-sync";
import { clientIp } from "@/lib/audit";
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
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  // Negative amounts are allowed: a DP correction (technician lowers an
  // over-entered DP) needs a matching reversal so the ledger sum stays
  // equal to the ticket's actual current DP, not just monotonically grow.
  if (!b.ticketId || !Number.isInteger(b.amount) || b.amount === 0)
    return NextResponse.json(
      { error: "Pembayaran tidak valid" },
      { status: 400 },
    );
  const idempotencyKey = typeof b.idempotencyKey === "string" && b.idempotencyKey ? b.idempotencyKey : null;
  if (idempotencyKey) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return NextResponse.json({ payment: existing });
  }

  let payment;
  try {
    // Direct entries update Ticket.downPayment in the same transaction as
    // the Payment row — this was the one remaining path that could create
    // a Payment without touching the ticket, letting the ledger drift from
    // Ticket.downPayment exactly like the bug the ticket routes already
    // closed.
    payment = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: b.ticketId } });
      if (!ticket) throw new Error("TICKET_NOT_FOUND");
      const nextDownPayment = ticket.downPayment + b.amount;
      if (nextDownPayment < 0) throw new Error("NEGATIVE_BALANCE");
      await tx.ticket.update({
        where: { id: b.ticketId },
        data: { downPayment: nextDownPayment, version: { increment: 1 } },
      });
      const p = await tx.payment.create({
        data: {
          id: randomUUID(),
          ticketId: b.ticketId,
          amount: b.amount,
          method: b.method || "Tunai",
          note: b.note || null,
          createdBy: u.id,
          idempotencyKey,
        },
      });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: u.id,
          ipAddress: clientIp(request),
          action: "CREATE",
          entity: "Payment",
          entityId: p.id,
          detail: `${b.ticketId}: ${b.amount}`,
        },
      });
      return p;
    });
  } catch (e) {
    if ((e as Error).message === "TICKET_NOT_FOUND")
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    if ((e as Error).message === "NEGATIVE_BALANCE")
      return NextResponse.json(
        { error: "Koreksi melebihi DP yang tercatat pada tiket" },
        { status: 400 },
      );
    throw e;
  }

  pushPaymentToDashboard(payment);
  return NextResponse.json({ payment });
}
