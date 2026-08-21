import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { makePasswordHash, generateTempPassword } from "@/lib/password";

const ROLES = new Set(["ADMIN", "TECHNICIAN"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengubah akun" },
      { status: 403 },
    );
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.role === "string") {
    const role = body.role.toUpperCase();
    if (!ROLES.has(role))
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    if (role !== "ADMIN" && target.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (adminCount <= 1)
        return NextResponse.json(
          { error: "Tidak bisa mengubah role Admin terakhir" },
          { status: 400 },
        );
    }
    data.role = role;
  }
  if (typeof body.active === "boolean") {
    if (!body.active && target.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (adminCount <= 1)
        return NextResponse.json(
          { error: "Tidak bisa menonaktifkan Admin terakhir" },
          { status: 400 },
        );
    }
    data.active = body.active;
  }

  let tempPassword: string | undefined;
  if (body.resetPassword) {
    tempPassword = generateTempPassword();
    data.passwordHash = makePasswordHash(tempPassword);
  }

  const updated = await prisma.user.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: session.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      detail: JSON.stringify({ ...data, passwordHash: data.passwordHash ? "(reset)" : undefined }),
    },
  });
  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      role: updated.role,
      active: updated.active,
    },
    tempPassword,
  });
}
