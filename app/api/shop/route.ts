import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { clientIp } from "@/lib/audit";

const FIELDS = new Set([
  "name", "phone", "whatsapp", "address", "description", "terms", "bank", "lockEnabled",
  "instagram", "tiktok", "qcEnabled",
  "waSalutation", "waClosing", "waReceived", "waCost", "waCostOptions", "waReady", "waPickedUp", "waFollowUp", "reviewUrl",
]);

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shop = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ shop });
}

export async function PATCH(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah data ini" },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (FIELDS.has(k)) data[k] = v;
  }
  if ("reviewUrl" in data) {
    const u = String(data.reviewUrl ?? "").trim();
    // Printed as a QR on every nota, so it must be a real web link.
    if (u && !/^https?:\/\/\S+$/i.test(u))
      return NextResponse.json({ error: "Link ulasan harus diawali http:// atau https://" }, { status: 400 });
    data.reviewUrl = u;
  }
  const shop = await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: "",
      phone: "",
      whatsapp: "",
      address: "",
      description: "",
      terms: "",
      bank: "",
      ...data,
    },
    update: { ...data, version: { increment: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "UPDATE",
      entity: "ShopSettings",
      entityId: "default",
      detail: Object.keys(data).join(","),
    },
  });
  return NextResponse.json({ shop });
}
