import ServiceDesk from "./service-desk";
import QcDesk from "./qc-desk";
import { currentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await currentSession();
  // Interns (Magang) get only the QC checklist — a separate, much smaller
  // screen rather than the full app with menus hidden.
  if (session?.role === "INTERN") {
    const shop = await prisma.shopSettings.findUnique({ where: { id: "default" } });
    return <QcDesk userName={session.name} shopName={shop?.name || "FS COMP"} enabled={shop?.qcEnabled ?? true} />;
  }
  return <ServiceDesk />;
}
