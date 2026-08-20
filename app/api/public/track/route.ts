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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim();
  const phone = params.get("phone")?.trim();
  if (!id && !phone)
    return NextResponse.json(
      { error: "Nomor servis atau nomor WhatsApp wajib diisi" },
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
