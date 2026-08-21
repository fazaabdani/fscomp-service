import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticket.findMany({
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b)
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  const customer = str(b.customer).trim();
  const phone = str(b.phone).replace(/\D/g, "");
  const device = str(b.device).trim();
  const brand = str(b.brand).trim();
  const issue = str(b.issue).trim();
  if (!customer || phone.length < 9 || phone.length > 15 || !device || !brand || !issue)
    return NextResponse.json(
      { error: "Data servis tidak lengkap atau nomor WhatsApp tidak valid" },
      { status: 400 },
    );

  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Server-assigned id: the previous client-side "tickets.length + 17"
  // scheme let two sessions compute the same id and silently overwrite
  // each other on sync. A DB-level unique check + short retry loop makes
  // that structurally impossible instead of merely unlikely.
  let ticket = null;
  for (let attempt = 0; attempt < 5 && !ticket; attempt++) {
    const seq = (Date.now() % 100000) + attempt;
    const id = `SRV-${datePart}-${String(seq).padStart(5, "0")}`;
    try {
      ticket = await prisma.ticket.create({
        data: {
          id,
          customer,
          phone,
          device,
          brand,
          serial: str(b.serial, "-").trim() || "-",
          issue,
          accessories: str(b.accessories, "Unit only").trim() || "Unit only",
          technician: str(b.technician),
          status: "Belum Cek",
          estimate: num(b.estimate),
          downPayment: num(b.downPayment),
          finalCost: 0,
          rating: 0,
          customerConfirmed: false,
          costConfirmed: false,
          category: str(b.category, "User"),
          address: str(b.address, "-"),
          paymentTermDays: num(b.paymentTermDays),
          receivedAt: localDate,
          updatedAt: localDate,
          statusChangedAt: localDate,
        },
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e; // not a unique-constraint collision
    }
  }
  if (!ticket)
    return NextResponse.json(
      { error: "Gagal membuat nomor servis, coba lagi" },
      { status: 500 },
    );

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.id,
      action: "CREATE",
      entity: "Ticket",
      entityId: ticket.id,
      detail: `${customer} / ${device}`,
    },
  });
  return NextResponse.json({ ticket });
}
