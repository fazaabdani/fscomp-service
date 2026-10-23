import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { clientIp } from "@/lib/audit";
import { isShopLocked } from "@/lib/shop-lock";

// A technician (or Admin) marks an intern's QC as reviewed.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "INTERN")
    return NextResponse.json({ error: "Hanya teknisi atau Admin yang dapat meninjau QC" }, { status: 403 });
  if (session.role !== "ADMIN" && (await isShopLocked()))
    return NextResponse.json(
      { error: "Toko sedang dikunci Admin — perubahan data ditunda sementara" },
      { status: 423 },
    );
  const existing = await prisma.qcCheck.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "QC tidak ditemukan" }, { status: 404 });
  const check = await prisma.qcCheck.update({
    where: { id },
    data: { reviewedBy: session.name, reviewedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "UPDATE",
      entity: "QcCheck",
      entityId: existing.ticketId,
      detail: "ditinjau",
    },
  });
  return NextResponse.json({ check: { ...check, items: JSON.parse(check.items) } });
}
