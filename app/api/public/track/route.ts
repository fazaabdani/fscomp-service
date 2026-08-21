import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { isRateLimited, clientKey } from "@/lib/rate-limit";

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

// This endpoint is unauthenticated and otherwise guessable (ticket IDs are
// date + a small sequence number), so without a cap a script can enumerate
// every real customer's service history.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;

export async function GET(request: Request) {
  if (isRateLimited("track", clientKey(request), WINDOW_MS, MAX_REQUESTS))
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
  if (id) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket)
      return NextResponse.json(
        { error: "Nomor servis tidak ditemukan" },
        { status: 404 },
      );
    return NextResponse.json({ tickets: [toSafeTicket(ticket)] });
  }

  // Phone isn't normalized in storage (entered as typed at intake), so an
  // exact WHERE match would miss "0812..." vs "62812..." variants — pull a
  // bounded candidate set by raw digits, then normalize-compare in memory.
  const digits = phone!.replace(/\D/g, "");
  const target = normalizePhone(phone!);
  const candidates = await prisma.ticket.findMany({
    where: { phone: { contains: digits.slice(-8) } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const matches = candidates
    .filter((t) => normalizePhone(t.phone) === target)
    .slice(0, 20)
    .map(toSafeTicket);
  if (!matches.length)
    return NextResponse.json(
      { error: "Tidak ada servis dengan nomor WhatsApp tersebut" },
      { status: 404 },
    );
  return NextResponse.json({ tickets: matches });
}
