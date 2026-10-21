import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
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
