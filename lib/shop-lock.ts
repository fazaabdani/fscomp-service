import { prisma } from "@/lib/prisma";

/** "Gembok Toko" — an Admin-only toggle meant to block staff (non-Admin)
 * writes while the shop is closed. Until now the switch only changed what
 * ShopSettings.lockEnabled stored; nothing ever read it back. */
export async function isShopLocked(): Promise<boolean> {
  const shop = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return shop?.lockEnabled ?? false;
}
