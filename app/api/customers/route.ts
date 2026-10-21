import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { isShopLocked } from "@/lib/shop-lock";
import { clientIp } from "@/lib/audit";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && (await isShopLocked()))
    return NextResponse.json(
      { error: "Toko sedang dikunci Admin — perubahan data ditunda sementara" },
      { status: 423 },
    );
  const b = await request.json().catch(() => null);
  if (!b)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").replace(/\D/g, "");
  if (!name || phone.length < 9 || phone.length > 15)
    return NextResponse.json(
      { error: "Nama wajib diisi, nomor telepon harus 9-15 digit" },
      { status: 400 },
    );
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  // Relies on the phoneNormalized unique constraint (P2002) rather than a
  // check-then-create — "0812..." and "62812..." are the same real number
  // but different raw strings, so a findFirst on the raw column missed
  // them, and even a normalized check-then-create has a race between two
  // concurrent requests for the same new customer.
  let customer;
  try {
    customer = await prisma.customer.create({
      data: {
        id: `C-${crypto.randomUUID()}`,
        name,
        category: String(b.category || "User"),
        phone,
        phoneNormalized: normalizePhone(phone) || null,
        address: String(b.address || "-").trim() || "-",
        rating: Number.isFinite(b.rating) ? Math.round(b.rating) : 0,
        createdAt: typeof b.createdAt === "string" ? b.createdAt : localDate,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "Nomor telepon sudah terdaftar" },
        { status: 409 },
      );
    throw e;
  }
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      detail: `${name} / ${phone}`,
    },
  });
  return NextResponse.json({ customer });
}
