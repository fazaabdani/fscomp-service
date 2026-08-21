import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { makePasswordHash, generateTempPassword } from "@/lib/password";

const ROLES = new Set(["ADMIN", "TECHNICIAN"]);

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat membuat akun" },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const username = String(body?.username || "")
    .trim()
    .toLowerCase();
  const role = String(body?.role || "TECHNICIAN").toUpperCase();
  if (!name || !username || !/^[a-z0-9._-]{3,32}$/.test(username))
    return NextResponse.json(
      { error: "Nama dan username wajib diisi (username 3-32 karakter, huruf/angka)" },
      { status: 400 },
    );
  if (!ROLES.has(role))
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing)
    return NextResponse.json(
      { error: "Username sudah dipakai" },
      { status: 409 },
    );
  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name,
      username,
      role,
      passwordHash: makePasswordHash(tempPassword),
    },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: session.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      detail: `username=${username} role=${role}`,
    },
  });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active,
    },
    tempPassword,
  });
}
