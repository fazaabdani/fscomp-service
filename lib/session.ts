import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  exp: number;
};
const secret = () => {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET belum diset (minimal 16 karakter). Set env var ini sebelum menjalankan di production.",
    );
  }
  return "development-only-secret";
};
const encode = (v: string) => Buffer.from(v).toString("base64url");
export function signSession(user: Omit<SessionUser, "exp">) {
  const payload = encode(
    JSON.stringify({ ...user, exp: Date.now() + 8 * 60 * 60 * 1000 }),
  );
  const sig = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}
export function verifySession(token?: string | null): SessionUser | null {
  try {
    if (!token) return null;
    const [payload, sig] = token.split(".");
    const expected = createHmac("sha256", secret())
      .update(payload)
      .digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as SessionUser;
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
export async function currentSession() {
  const store = await cookies();
  const claimed = verifySession(store.get("fs_session")?.value);
  if (!claimed) return null;
  // The signed cookie is stateless and can't be revoked on its own, so
  // deactivating a user or changing their role wouldn't take effect until
  // the 8h cookie expired. Re-check the DB on every request to close that
  // gap — cheap enough at this app's scale (single-instance SQLite).
  const user = await prisma.user.findUnique({ where: { id: claimed.id } });
  if (!user || !user.active) return null;
  return { ...claimed, role: user.role, name: user.name };
}
