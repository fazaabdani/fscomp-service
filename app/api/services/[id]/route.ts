import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

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
      { error: "Hanya Admin yang dapat mengubah data ini" },
      { status: 403 },
    );
  const existing = await prisma.serviceItem.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jasa servis tidak ditemukan" }, { status: 404 });
  await prisma.serviceItem.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "DELETE",
      entity: "ServiceItem",
      entityId: id,
      detail: existing.name,
    },
  });
  return NextResponse.json({ ok: true });
}
