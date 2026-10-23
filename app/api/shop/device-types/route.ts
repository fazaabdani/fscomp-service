import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { clientIp } from "@/lib/audit";

const DEFAULT_DEVICE_TYPES = ["Laptop", "Komputer / PC", "Monitor", "Printer", "Lainnya"];

const parse = (raw: string | null | undefined) =>
  (raw ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

async function load() {
  const shop = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return { exists: !!shop, types: shop ? parse(shop.deviceTypes) : DEFAULT_DEVICE_TYPES };
}

async function save(types: string[]) {
  const deviceTypes = types.join("\n");
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: { id: "default", name: "", phone: "", whatsapp: "", address: "", description: "", terms: "", bank: "", deviceTypes },
    update: { deviceTypes, version: { increment: 1 } },
  });
}

// Anyone signed in can add a kind of item while taking in a job; only an Admin
// can remove one (Profil Toko).
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "Nama jenis barang wajib diisi" }, { status: 400 });
  const { types } = await load();
  // Same name in a different case is the same kind — reuse the stored spelling.
  const existing = types.find((t) => t.toLowerCase() === name.toLowerCase());
  if (!existing) {
    types.push(name);
    await save(types);
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.id,
        ipAddress: clientIp(request),
        action: "CREATE",
        entity: "DeviceType",
        entityId: name,
        detail: name,
      },
    });
  }
  return NextResponse.json({ deviceTypes: types, name: existing ?? name });
}

export async function DELETE(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Hanya Admin yang dapat menghapus jenis barang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const { types } = await load();
  const next = types.filter((t) => t !== name);
  if (next.length === types.length)
    return NextResponse.json({ error: "Jenis barang tidak ditemukan" }, { status: 404 });
  if (next.length === 0)
    return NextResponse.json({ error: "Minimal harus ada satu jenis barang" }, { status: 400 });
  await save(next);
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      ipAddress: clientIp(request),
      action: "DELETE",
      entity: "DeviceType",
      entityId: name,
      detail: name,
    },
  });
  // Jobs already saved with this kind keep it; only the picker list changes.
  return NextResponse.json({ deviceTypes: next });
}
