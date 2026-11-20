import { NextResponse } from "next/server";
import { MULTI_TENANT, masterClient, prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Multi-shop mode has no "current shop" here (health checks come from the server itself).
    await (MULTI_TENANT ? masterClient() : prisma).$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        build: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
        time: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "error", database: "disconnected" }, { status: 503 });
  }
}
