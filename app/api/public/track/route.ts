import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

function toSafeTicket(t: Record<string, unknown>) {
  return {
    id: t.id,
    device: t.device,
    status: t.status,
    receivedAt: t.receivedAt,
    updatedAt: t.updatedAt,
    serviceAction: t.serviceAction,
    estimate: t.costConfirmed ? t.estimate : undefined,
    downPayment: t.downPayment,
    warrantyDays: t.warrantyDays,
  };
}

// In-memory sliding-window limiter: this endpoint is unauthenticated and
// otherwise guessable (ticket IDs are date + a small sequence number), so
// without a cap a script can enumerate every real customer's service
// history. Single-instance deployment only (matches the SQLite constraint
// already documented for this app) — a multi-instance deploy would need a
// shared store instead.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    Array.from(hits.entries()).forEach(([k, times]) => {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    });
  }
  return recent.length > MAX_REQUESTS;
}

function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function GET(request: Request) {
  if (isRateLimited(clientKey(request)))
    return NextResponse.json(
      { error: "Terlalu banyak percobaan, coba lagi sebentar lagi" },
      { status: 429 },
    );

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim();
  const phone = params.get("phone")?.trim();
  if (!id && !phone)
    return NextResponse.json(
      { error: "Nomor servis atau nomor WhatsApp wajib diisi" },
      { status: 400 },
    );
  if (phone && phone.replace(/\D/g, "").length < 8)
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid" },
      { status: 400 },
    );
  const row = await prisma.appState.findUnique({ where: { key: "tickets" } });
  if (!row)
    return NextResponse.json(
      { error: "Data servis belum tersedia" },
      { status: 404 },
    );
  const tickets = JSON.parse(row.value) as Array<Record<string, unknown>>;

  if (id) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket)
      return NextResponse.json(
        { error: "Nomor servis tidak ditemukan" },
        { status: 404 },
      );
    return NextResponse.json({ tickets: [toSafeTicket(ticket)] });
  }

  const target = normalizePhone(phone!);
  const matches = tickets
    .filter((t) => normalizePhone(String(t.phone || "")) === target)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 20)
    .map(toSafeTicket);
  if (!matches.length)
    return NextResponse.json(
      { error: "Tidak ada servis dengan nomor WhatsApp tersebut" },
      { status: 404 },
    );
  return NextResponse.json({ tickets: matches });
}
