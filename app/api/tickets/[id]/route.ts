import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Ticket, Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { pushPaymentToDashboard } from "@/lib/dashboard-sync";

const FIELDS = new Set([
  "customer", "phone", "device", "brand", "serial", "issue", "accessories",
  "technician", "status", "estimate", "downPayment", "finalCost",
  "receivedAt", "receivedTime", "updatedAt", "statusChangedAt", "rating",
  "customerConfirmed", "costConfirmed", "category", "address", "condition",
  "serviceAction", "paymentMethod", "paymentTermDays", "warrantyDays",
  "pickedUpAt", "pickedUpTime", "handledAt", "handledTime", "notes",
  "partCost", "pickupBy", "handedBy",
]);

// Fields that represent money, day counts, or a rating — must never go
// negative regardless of who or what constructs the request body.
const NON_NEGATIVE_NUMBER_FIELDS = new Set([
  "estimate", "downPayment", "finalCost", "partCost",
  "warrantyDays", "paymentTermDays", "rating",
]);

const VALID_STATUSES = new Set([
  "Belum Cek", "Sedang Tes", "Sedang Cek", "Menunggu Konfirmasi",
  "Sedang Dikerjakan", "Menunggu Sparepart", "Ditangani Mitra",
  "Bisa Diambil", "Sudah Diambil", "Baru",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (FIELDS.has(k)) data[k] = v;
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Tidak ada field yang diubah" }, { status: 400 });

  for (const f of Array.from(NON_NEGATIVE_NUMBER_FIELDS)) {
    const v = data[f];
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0))
      return NextResponse.json({ error: `${f} harus angka >= 0` }, { status: 400 });
  }
  if (data.status !== undefined && !VALID_STATUSES.has(data.status as string))
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const expectVersion = typeof body.expectedVersion === "number";
  const paymentNote = typeof body.paymentNote === "string" ? body.paymentNote : null;

  let ticket: Ticket | null = null;
  let payment: Payment | null = null;
  let conflict = false;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id } });
    if (!existing) return;
    if (expectVersion && existing.version !== body.expectedVersion) {
      conflict = true;
      ticket = existing;
      return;
    }

    const updated = await tx.ticket.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });

    // A downPayment change is folded into the same transaction as the
    // ticket update so the ledger can never diverge from what the ticket
    // shows — previously these were two independent requests fired from
    // the client, and a failed/lost second request left them out of sync.
    // The delta is computed from `existing` (the row just read inside this
    // transaction), not whatever the client last saw, so concurrent edits
    // always reconcile to the truth instead of compounding a stale delta.
    if (typeof data.downPayment === "number" && data.downPayment !== existing.downPayment) {
      const delta = data.downPayment - existing.downPayment;
      payment = await tx.payment.create({
        data: {
          id: randomUUID(),
          ticketId: id,
          amount: delta,
          method: (data.paymentMethod as string) || existing.paymentMethod || "Tunai",
          note: paymentNote || (delta > 0 ? `DP tiket ${id} diperbarui` : `Koreksi turun DP — tiket ${id}`),
          createdBy: session.id,
        },
      });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: session.id,
          action: "CREATE",
          entity: "Payment",
          entityId: payment.id,
          detail: `${id}: ${delta}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        userId: session.id,
        action: "UPDATE",
        entity: "Ticket",
        entityId: id,
        detail: Object.keys(data).join(","),
      },
    });
    ticket = updated;
  });

  if (!ticket)
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  if (conflict)
    return NextResponse.json({ error: "CONFLICT", ticket }, { status: 409 });
  if (payment) pushPaymentToDashboard(payment);
  return NextResponse.json({ ticket });
}
