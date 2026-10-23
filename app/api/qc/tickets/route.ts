import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
import { qcEnabled } from "@/lib/qc-enabled";

/** The intern's work list: jobs still at the checking stage, with no money
 * fields and no phone number — interns only need to see the unit and the
 * complaint. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await qcEnabled())) return NextResponse.json({ enabled: false, tickets: [] });
  const tickets = await prisma.ticket.findMany({
    where: { status: { in: ["Belum Cek", "Sedang Tes", "Sedang Cek"] } },
    orderBy: [{ receivedAt: "asc" }, { receivedTime: "asc" }],
    select: {
      id: true,
      customer: true,
      device: true,
      deviceType: true,
      brand: true,
      serial: true,
      issue: true,
      accessories: true,
      status: true,
      receivedAt: true,
      receivedTime: true,
    },
  });
  const rows = await prisma.qcCheck.findMany({
    where: { ticketId: { in: tickets.map((t) => t.id) } },
    orderBy: { createdAt: "desc" },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.ticketId)) latest.set(r.ticketId, r);
  return NextResponse.json({
    enabled: true,
    tickets: tickets.map((t) => {
      const q = latest.get(t.id);
      return {
        ...t,
        qc: q
          ? {
              id: q.id,
              template: q.template,
              items: JSON.parse(q.items),
              summary: q.summary,
              checkedBy: q.checkedBy,
              badCount: q.badCount,
              unsureCount: q.unsureCount,
              reviewedBy: q.reviewedBy,
              reviewedAt: q.reviewedAt,
              createdAt: q.createdAt,
            }
          : null,
      };
    }),
  });
}
