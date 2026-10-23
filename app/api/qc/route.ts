import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { clientIp } from "@/lib/audit";

const RESULTS = new Set(["ok", "bad", "unsure", "na"]);
// A QC can only be (re)filled while the job is still being looked at.
const QC_OPEN = ["Belum Cek", "Sedang Tes", "Sedang Cek"];
const CLOSED = ["Sudah Diambil", "Dibatalkan"];

type Item = { id: string; group: string; label: string; result: string; note: string };

function cleanItems(raw: unknown): Item[] | string {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 60) return "Daftar cek tidak valid";
  const items: Item[] = [];
  for (const r of raw) {
    const id = String(r?.id ?? "").slice(0, 40);
    const label = String(r?.label ?? "").slice(0, 240);
    const group = String(r?.group ?? "").slice(0, 60);
    const result = String(r?.result ?? "");
    const note = String(r?.note ?? "").trim().slice(0, 300);
    if (!id || !label) return "Daftar cek tidak valid";
    if (!RESULTS.has(result)) return `Item "${label.slice(0, 40)}" belum dijawab`;
    if ((result === "bad" || result === "unsure") && !note)
      return `Beri catatan singkat untuk item "${label.slice(0, 40)}"`;
    items.push({ id, group, label, result, note });
  }
  return items;
}

/** Latest QC per job that is still open — enough for the technician's review
 * badge and the detail panel. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const open = await prisma.ticket.findMany({
    where: { status: { notIn: CLOSED } },
    select: { id: true },
  });
  const rows = await prisma.qcCheck.findMany({
    where: { ticketId: { in: open.map((t) => t.id) } },
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  const checks = [];
  for (const r of rows) {
    if (seen.has(r.ticketId)) continue;
    seen.add(r.ticketId);
    checks.push({ ...r, items: JSON.parse(r.items) });
  }
  return NextResponse.json({ checks });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ticketId = String(body?.ticketId ?? "");
  const checkedBy = String(body?.checkedBy ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const template = String(body?.template ?? "Umum").slice(0, 40);
  const summary = String(body?.summary ?? "").trim().slice(0, 600);
  if (!checkedBy) return NextResponse.json({ error: "Isi nama pengecek" }, { status: 400 });
  const items = cleanItems(body?.items);
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Servis tidak ditemukan" }, { status: 404 });
  const allowed = session.role === "INTERN" ? QC_OPEN : QC_OPEN.concat(["Menunggu Konfirmasi", "Sedang Dikerjakan", "Menunggu Sparepart", "Ditangani Mitra", "Bisa Diambil"]);
  if (CLOSED.includes(ticket.status) || !allowed.includes(ticket.status))
    return NextResponse.json({ error: "Servis ini sudah lewat tahap pengecekan" }, { status: 409 });

  const badCount = items.filter((i) => i.result === "bad").length;
  const unsureCount = items.filter((i) => i.result === "unsure").length;
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const check = await prisma.$transaction(async (tx) => {
    const created = await tx.qcCheck.create({
      data: {
        id: randomUUID(),
        ticketId,
        template,
        items: JSON.stringify(items),
        summary: summary || null,
        checkedBy,
        submittedBy: session.id,
        badCount,
        unsureCount,
      },
    });
    // First check moves the job from "Belum Cek" to "Sedang Cek".
    if (ticket.status === "Belum Cek")
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: "Sedang Cek", statusChangedAt: localDate, updatedAt: localDate, version: { increment: 1 } },
      });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        userId: session.id,
        ipAddress: clientIp(request),
        action: "CREATE",
        entity: "QcCheck",
        entityId: ticketId,
        detail: `${template} oleh ${checkedBy}: ${badCount} bermasalah, ${unsureCount} tidak yakin`,
      },
    });
    return created;
  });
  return NextResponse.json({ check: { ...check, items } });
}
