import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

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
  const dup = await prisma.customer.findFirst({ where: { phone } });
  if (dup)
    return NextResponse.json(
      { error: "Nomor telepon sudah terdaftar" },
      { status: 409 },
    );
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const customer = await prisma.customer.create({
    data: {
      id: `C-${crypto.randomUUID()}`,
      name,
      category: String(b.category || "User"),
      phone,
      address: String(b.address || "-").trim() || "-",
      rating: Number.isFinite(b.rating) ? Math.round(b.rating) : 0,
      createdAt: typeof b.createdAt === "string" ? b.createdAt : localDate,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      detail: `${name} / ${phone}`,
    },
  });
  return NextResponse.json({ customer });
}
