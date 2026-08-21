import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Ticket, Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { pushPaymentToDashboard } from "@/lib/dashboard-sync";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticket.findMany({
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  const customer = str(b.customer).trim();
  const phone = str(b.phone).replace(/\D/g, "");
  const device = str(b.device).trim();
  const brand = str(b.brand).trim();
  const issue = str(b.issue).trim();
  if (!customer || phone.length < 9 || phone.length > 15 || !device || !brand || !issue)
    return NextResponse.json(
      { error: "Data servis tidak lengkap atau nomor WhatsApp tidak valid" },
      { status: 400 },
    );

  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const downPayment = num(b.downPayment);

  // Server-assigned id: the previous client-side "tickets.length + 17"
  // scheme let two sessions compute the same id and silently overwrite
  // each other on sync. A DB-level unique check + short retry loop makes
  // that structurally impossible instead of merely unlikely.
  //
  // The ticket and its opening DP payment are created in one transaction
  // so they can never diverge — previously the client created the ticket,
  // then fired a separate unawaited payment request, and a failed/lost
  // second request left the ledger short of the ticket's recorded DP.
  let result: { ticket: Ticket; payment: Payment | null } | null = null;
  for (let attempt = 0; attempt < 5 && !result; attempt++) {
    const seq = (Date.now() % 100000) + attempt;
    const id = `SRV-${datePart}-${String(seq).padStart(5, "0")}`;
    try {
      result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            id,
            customer,
            phone,
            device,
            brand,
            serial: str(b.serial, "-").trim() || "-",
            issue,
            accessories: str(b.accessories, "Unit only").trim() || "Unit only",
            technician: str(b.technician),
            status: "Belum Cek",
            estimate: num(b.estimate),
            downPayment,
            finalCost: 0,
            rating: 0,
            customerConfirmed: false,
            costConfirmed: false,
            category: str(b.category, "User"),
            address: str(b.address, "-"),
            paymentTermDays: num(b.paymentTermDays),
            receivedAt: localDate,
            updatedAt: localDate,
            statusChangedAt: localDate,
          },
        });
        const payment =
          downPayment > 0
            ? await tx.payment.create({
                data: {
                  id: randomUUID(),
                  ticketId: ticket.id,
                  amount: downPayment,
                  method: "Tunai",
                  note: `DP awal saat servis ${ticket.id} diterima`,
                  createdBy: session.id,
                },
              })
            : null;
        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            userId: session.id,
            action: "CREATE",
            entity: "Ticket",
            entityId: ticket.id,
            detail: `${customer} / ${device}`,
          },
        });
        if (payment) {
          await tx.auditLog.create({
            data: {
              id: randomUUID(),
              userId: session.id,
              action: "CREATE",
              entity: "Payment",
              entityId: payment.id,
              detail: `${ticket.id}: ${downPayment}`,
            },
          });
        }
        return { ticket, payment };
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e; // not a unique-constraint collision
    }
  }
  if (!result)
    return NextResponse.json(
      { error: "Gagal membuat nomor servis, coba lagi" },
      { status: 500 },
    );

  if (result.payment) pushPaymentToDashboard(result.payment);
  return NextResponse.json({ ticket: result.ticket });
}
