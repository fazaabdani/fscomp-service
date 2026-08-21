import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

const allowed = new Set(["tickets", "shop", "services", "customers"]);
export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const user = await currentSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowed.has(key))
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 });
  const row = await prisma.appState.findUnique({ where: { key } });
  return NextResponse.json(
    row
      ? { value: JSON.parse(row.value), version: row.version }
      : { value: null, version: 0 },
  );
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const user = await currentSession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowed.has(key))
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 });
  // tickets/customers stay open to any authenticated staff — receiving a
  // service and auto-creating a customer record is a core Teknisi/Pegawai
  // workflow (see submitTicket). shop/services (pricing catalog) are
  // Admin-only per the permissions promised in the Akun panel.
  if (
    (key === "shop" || key === "services") &&
    user.role !== "ADMIN"
  )
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah data ini" },
      { status: 403 },
    );
  let body: { value?: unknown; expectedVersion?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  if (body.value === undefined)
    return NextResponse.json({ error: "Field value wajib diisi" }, { status: 400 });
  const value = JSON.stringify(body.value);
  if (value.length > 5_000_000)
    return NextResponse.json({ error: "Data terlalu besar" }, { status: 413 });
  const existing = await prisma.appState.findUnique({ where: { key } });
  const expectVersion = typeof body.expectedVersion === "number";
  let row: { version: number };
  if (!existing) {
    row = await prisma.appState.create({ data: { key, value, version: 1 } });
  } else if (!expectVersion) {
    row = await prisma.appState.update({
      where: { key },
      data: { value, version: { increment: 1 } },
    });
  } else {
    // Atomic conditional update: only succeeds if no one else has written
    // since the client's last read, preventing silent lost updates.
    const result = await prisma.appState.updateMany({
      where: { key, version: body.expectedVersion },
      data: { value, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const latest = await prisma.appState.findUnique({ where: { key } });
      return NextResponse.json(
        {
          error: "CONFLICT",
          value: latest ? JSON.parse(latest.value) : null,
          version: latest?.version ?? 0,
        },
        { status: 409 },
      );
    }
    row = (await prisma.appState.findUnique({ where: { key } }))!;
  }
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      action: "UPDATE",
      entity: "AppState",
      entityId: key,
      detail: `version ${row.version}`,
    },
  });
  return NextResponse.json({ ok: true, version: row.version });
}
