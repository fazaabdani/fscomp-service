import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

const FIELDS = new Set([
  "customer", "phone", "device", "brand", "serial", "issue", "accessories",
  "technician", "status", "estimate", "downPayment", "finalCost",
  "receivedAt", "receivedTime", "updatedAt", "statusChangedAt", "rating",
  "customerConfirmed", "costConfirmed", "category", "address", "condition",
  "serviceAction", "paymentMethod", "paymentTermDays", "warrantyDays",
  "pickedUpAt", "pickedUpTime", "handledAt", "handledTime", "notes",
  "partCost", "pickupBy", "handedBy",
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

  const expectVersion = typeof body.expectedVersion === "number";
  if (expectVersion) {
    const result = await prisma.ticket.updateMany({
      where: { id, version: body.expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const latest = await prisma.ticket.findUnique({ where: { id } });
      if (!latest)
        return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
      return NextResponse.json(
        { error: "CONFLICT", ticket: latest },
        { status: 409 },
      );
    }
  } else {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    await prisma.ticket.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "UPDATE",
      entity: "Ticket",
      entityId: id,
      detail: Object.keys(data).join(","),
    },
  });
  return NextResponse.json({ ticket });
}
