import { prisma } from "@/lib/prisma";

/** QC is on unless an Admin switched it off in Profil Toko. */
export async function qcEnabled(): Promise<boolean> {
  const shop = await prisma.shopSettings.findUnique({
    where: { id: "default" },
    select: { qcEnabled: true },
  });
  return shop?.qcEnabled ?? true;
}
