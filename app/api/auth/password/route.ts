import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { makePasswordHash, verifyPassword } from "@/lib/password";
import { isRateLimited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";

// Self-service password change. Admin "Reset Password" only ever produces a
// random temp password, so without this endpoint nobody (including the
// Admin) could ever set a password of their own choosing.
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // scrypt verify is CPU-heavy and this is a password-guessing surface for
  // anyone holding a hijacked session, so cap attempts per user.
  if (isRateLimited("password", session.id, 60_000, 5))
    return NextResponse.json(
      { error: "Terlalu banyak percobaan, coba lagi sebentar lagi" },
      { status: 429 },
    );
  const body = await request.json().catch(() => null);
  const current = body?.current;
  const next = body?.next;
  if (typeof current !== "string" || typeof next !== "string")
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  if (next.length < 8 || next.length > 128)
    return NextResponse.json(
      { error: "Password baru minimal 8 karakter" },
      { status: 400 },
    );
  if (next === current)
    return NextResponse.json(
      { error: "Password baru harus berbeda dari yang lama" },
      { status: 400 },
    );
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !verifyPassword(current, user.passwordHash))
    return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: makePasswordHash(next) },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      ipAddress: clientIp(request),
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      detail: "password diganti sendiri",
    },
  });
  return NextResponse.json({ ok: true });
}
