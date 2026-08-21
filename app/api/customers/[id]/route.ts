import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

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
  if (typeof data.phone === "string") {
    const phone = data.phone.replace(/\D/g, "");
    if (phone.length < 9 || phone.length > 15)
      return NextResponse.json({ error: "Nomor telepon harus 9-15 digit" }, { status: 400 });
    const dup = await prisma.customer.findFirst({ where: { phone, NOT: { id } } });
    if (dup)
      return NextResponse.json({ error: "Nomor telepon sudah terdaftar" }, { status: 409 });
    data.phone = phone;
  }
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Tidak ada field yang diubah" }, { status: 400 });

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  const customer = await prisma.customer.update({
    where: { id },
    data: { ...data, version: { increment: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      detail: Object.keys(data).join(","),
    },
  });
  return NextResponse.json({ customer });
}

export async function DELETE(
  _request: Request,
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
  const inUse = await prisma.ticket.findFirst({ where: { phone: existing.phone } });
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
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      detail: existing.name,
    },
  });
  return NextResponse.json({ ok: true });
}
