import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { clientIp } from "@/lib/audit";
import { up } from "@/lib/upper";

const FIELDS = new Set(["name", "category", "phone", "address", "rating"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah data pelanggan" },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (FIELDS.has(k)) data[k] = v;
  }
  if (typeof data.name === "string") data.name = up(data.name);
  if (typeof data.address === "string") data.address = up(data.address);
  if (typeof data.phone === "string") {
    const phone = data.phone.replace(/\D/g, "");
    if (phone.length < 9 || phone.length > 15)
      return NextResponse.json({ error: "Nomor telepon harus 9-15 digit" }, { status: 400 });
    data.phone = phone;
    data.phoneNormalized = normalizePhone(phone) || null;
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Tidak ada field yang diubah" }, { status: 400 });

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  let customer;
  try {
    customer = await prisma.customer.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Nomor telepon sudah terdaftar" }, { status: 409 });
    throw e;
  }
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      detail: Object.keys(data).join(","),
    },
  });
  return NextResponse.json({ customer });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat menghapus data pelanggan" },
      { status: 403 },
    );
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  // Ticket.phone is stored as typed at intake (not normalized), so an exact
  // match here previously missed a ticket recorded as "0812..." when the
  // customer's own phone was "62812..." (or vice versa) — silently letting
  // a customer with real service history get deleted.
  const targetNorm = existing.phoneNormalized || normalizePhone(existing.phone);
  // A customer without a usable number can't be linked to tickets by phone.
  const candidates = await prisma.ticket.findMany({
    where: { phone: { contains: existing.phone.replace(/\D/g, "").slice(-8) } },
    select: { id: true, phone: true },
  });
  const inUse = targetNorm ? candidates.find((t) => normalizePhone(t.phone) === targetNorm) : undefined;
  if (inUse)
    return NextResponse.json(
      { error: "Pelanggan masih punya riwayat servis, tidak bisa dihapus" },
      { status: 409 },
    );
  await prisma.customer.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      detail: existing.name,
    },
  });
  return NextResponse.json({ ok: true });
}
