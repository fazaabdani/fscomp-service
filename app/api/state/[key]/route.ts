import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

const allowed = new Set(["tickets", "shop", "services", "staff", "customers"]);
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
  if (
    (key === "shop" || key === "staff") &&
    user.role !== "ADMIN"
  )
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah data ini" },
      { status: 403 },
    );
  const body = await request.json();
  const value = JSON.stringify(body.value);
  if (value.length > 5_000_000)
    return NextResponse.json({ error: "Data terlalu besar" }, { status: 413 });
  const row = await prisma.appState.upsert({
    where: { key },
    create: { key, value, version: 1 },
    update: { value, version: { increment: 1 } },
  });
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
