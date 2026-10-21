import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { finalPrice } from "@/lib/ticket-money";

const daysSince = (dateStr: string, now: number) =>
  Math.floor((now - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000);

export async function GET() {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticket.findMany();
  const now = Date.now();
  const alerts = [] as Array<{
    type: string;
    title: string;
    ticketId: string;
    customer: string;
    device: string;
  }>;
  for (const t of tickets) {
    const days = daysSince(t.receivedAt, now);
    const base = { ticketId: t.id, customer: t.customer, device: t.device };
    if (!["Bisa Diambil", "Sudah Diambil", "Dibatalkan"].includes(t.status) && days > 7)
      alerts.push({ ...base, type: "SERVICE_OLD", title: `Servis ${days} hari, belum siap` });

    // The most common real headache for a repair shop: a finished job the
    // customer never came back for. This used to be silently excluded from
    // SERVICE_OLD once status reached "Bisa Diambil".
    if (t.status === "Bisa Diambil") {
      const readyDays = daysSince(t.statusChangedAt || t.receivedAt, now);
      if (readyDays > 7)
        alerts.push({ ...base, type: "READY_NOT_PICKED_UP", title: `Sudah siap ${readyDays} hari, belum diambil` });
    }

    // Staff sent a cost estimate and is waiting on the customer's go-ahead —
    // easy to forget to follow up on if it drags.
    if (t.status === "Menunggu Konfirmasi") {
      const waitingDays = daysSince(t.statusChangedAt || t.receivedAt, now);
      if (waitingDays > 2)
        alerts.push({ ...base, type: "WAITING_CONFIRMATION_STUCK", title: `Menunggu konfirmasi ${waitingDays} hari` });
    }

    // Same helper the print/payment gates use — a plain `finalCost ||
    // estimate` falls back to the estimate for a genuinely free (Rp0),
    // already-confirmed job, producing a false "payment due" alert.
    // Money is only owed once the work is done (an open job's estimate is a
    // forecast). Term = what was chosen at intake, else 7 days — a job handed
    // over with a balance and no term used to never raise an alert at all.
    const total = finalPrice(t);
    const isDone = t.status === "Bisa Diambil" || t.status === "Sudah Diambil";
    const term = t.paymentTermDays || 7;
    if (isDone && total > t.downPayment && days > term)
      alerts.push({
        ...base,
        type: "PAYMENT_DUE",
        title: `Sisa Rp ${(total - t.downPayment).toLocaleString("id-ID")}, lewat tempo ${days - term} hari`,
      });

    if (t.status === "Sudah Diambil" && t.warrantyDays && t.pickedUpAt) {
      const remain = t.warrantyDays - daysSince(t.pickedUpAt, now);
      if (remain > 0 && remain <= 3)
        alerts.push({ ...base, type: "WARRANTY_END", title: `Garansi tersisa ${remain} hari` });
    }
  }
  // Most actionable first: money owed, then customers to chase, then
  // finished-but-uncollected, then warranties, then general age. Within a
  // type the numbers in the title (days/amount) are already the signal, so a
  // stable order by type is enough.
  const rank: Record<string, number> = {
    PAYMENT_DUE: 0,
    WAITING_CONFIRMATION_STUCK: 1,
    READY_NOT_PICKED_UP: 2,
    WARRANTY_END: 3,
    SERVICE_OLD: 4,
  };
  alerts.sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));
  return NextResponse.json({ alerts });
}
