import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Read-only export for the dashboard's one-time/on-demand backfill sync —
 * separate from the human /api/payments (session-only). Same shared-secret
 * pattern as the push-on-create call in app/api/payments/route.ts. */
export async function GET(request: NextRequest) {
  const configuredToken = process.env.OWNER_INGEST_TOKEN;
  const requestToken = request.headers.get("x-api-key");
  if (!configuredToken || !requestToken || requestToken !== configuredToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? Math.min(365, Math.max(1, parseInt(daysParam, 10) || 90)) : 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return NextResponse.json({ payments });
}
