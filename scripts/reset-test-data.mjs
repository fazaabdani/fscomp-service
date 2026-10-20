// Wipes transactional TEST data before real go-live: tickets, customers,
// payments, WhatsApp chat log, notifications and the audit log. Keeps
// accounts, shop profile, service catalogue and app state.
//
//   docker compose exec -T fs-service node scripts/reset-test-data.mjs          # dry run (counts only)
//   docker compose exec -T fs-service node scripts/reset-test-data.mjs --yes    # backup, then delete
//
// A full backup is always taken first (see scripts/backup.mjs) and the script
// aborts if that backup fails. NOTE: payments already pushed to the Owner
// dashboard (DASHBOARD_INGEST_URL) are NOT removed from there.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const confirmed = process.argv.includes("--yes");
const prisma = new PrismaClient({
  ...(process.env.BACKUP_SOURCE
    ? { datasources: { db: { url: `file:${path.resolve(process.env.BACKUP_SOURCE)}` } } }
    : {}),
});

const counts = async () => ({
  tickets: await prisma.ticket.count(),
  customers: await prisma.customer.count(),
  payments: await prisma.payment.count(),
  chatLogs: await prisma.chatLog.count(),
  notifications: await prisma.notification.count(),
  auditLogs: await prisma.auditLog.count(),
  users: await prisma.user.count(),
  services: await prisma.serviceItem.count(),
});

console.log("Data saat ini:", await counts());
if (!confirmed) {
  console.log("\nDry run — tidak ada yang dihapus. Jalankan lagi dengan --yes untuk menghapus data uji.");
  await prisma.$disconnect();
  process.exit(0);
}

const backup = spawnSync(
  process.execPath,
  [path.join(path.dirname(fileURLToPath(import.meta.url)), "backup.mjs")],
  { stdio: "inherit" },
);
if (backup.status !== 0) {
  console.error("Backup gagal — penghapusan DIBATALKAN.");
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.$transaction([
  prisma.payment.deleteMany(),
  prisma.chatLog.deleteMany(),
  prisma.notification.deleteMany(),
  prisma.ticket.deleteMany(),
  prisma.customer.deleteMany(),
  prisma.auditLog.deleteMany(),
  prisma.auditLog.create({
    data: {
      id: randomUUID(),
      action: "DELETE",
      entity: "TestData",
      detail: "reset data uji sebelum go-live (tiket, pelanggan, pembayaran, chat, audit)",
    },
  }),
]);
console.log("Setelah reset:", await counts());
await prisma.$disconnect();
