import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const services = await prisma.serviceItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah data ini" },
      { status: 403 },
    );
  const b = await request.json().catch(() => null);
  const name = String(b?.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "Nama jasa servis wajib diisi" }, { status: 400 });
  const service = await prisma.serviceItem.create({
    data: {
      id: `JS-${crypto.randomUUID()}`,
      name,
      partCost: Number.isFinite(b.partCost) ? Math.round(b.partCost) : 0,
      shopPrice: Number.isFinite(b.shopPrice) ? Math.round(b.shopPrice) : 0,
      userPrice: Number.isFinite(b.userPrice) ? Math.round(b.userPrice) : 0,
      warrantyDays: Number.isFinite(b.warrantyDays) ? Math.round(b.warrantyDays) : 0,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "CREATE",
      entity: "ServiceItem",
      entityId: service.id,
      detail: name,
    },
  });
  return NextResponse.json({ service });
}
