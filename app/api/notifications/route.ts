import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/lib/session";
export async function GET() {
  const u = await currentSession();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.appState.findUnique({ where: { key: "tickets" } });
  const tickets = row ? JSON.parse(row.value) : [];
  const now = Date.now();
  const alerts = [] as Array<{ type: string; title: string; ticketId: string }>;
  for (const t of tickets) {
    const days = Math.floor(
      (now - new Date(`${t.receivedAt}T00:00:00`).getTime()) / 86400000,
    );
    if (!["Bisa Diambil", "Sudah Diambil"].includes(t.status) && days > 7)
      alerts.push({
        type: "SERVICE_OLD",
        title: `Servis ${days} hari`,
        ticketId: t.id,
      });
    const total = t.finalCost || t.estimate || 0;
    if (total > t.downPayment && t.paymentTermDays && days > t.paymentTermDays)
      alerts.push({
        type: "PAYMENT_DUE",
        title: "Pembayaran jatuh tempo",
        ticketId: t.id,
      });
    if (t.status === "Sudah Diambil" && t.warrantyDays && t.pickedUpAt) {
      const remain =
        t.warrantyDays -
        Math.floor(
          (now - new Date(`${t.pickedUpAt}T00:00:00`).getTime()) / 86400000,
        );
      if (remain > 0 && remain <= 3)
        alerts.push({
          type: "WARRANTY_END",
          title: `Garansi tersisa ${remain} hari`,
          ticketId: t.id,
        });
    }
  }
  return NextResponse.json({ alerts });
}
