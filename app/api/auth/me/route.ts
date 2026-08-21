import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: session.id,
      name: session.name,
      username: session.username,
      role: session.role,
    },
  });
}
