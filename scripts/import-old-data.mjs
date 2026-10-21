// One-off import of the old app's database (exports of 21 Okt 2026, converted to
// import_data.json by the migration tooling) in place of the test data.
//
//   node scripts/import-old-data.mjs /path/import_data.json          # dry run: counts only
//   node scripts/import-old-data.mjs /path/import_data.json --yes    # backup, wipe test data, import
//
// Replaces: tickets, customers, payments, chat log, notifications, audit log.
// Keeps:    user accounts, shop profile, service catalogue, app state.
// A full backup is taken first; if it fails nothing is touched.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2];
const confirmed = process.argv.includes("--yes");
if (!file) {
  console.error("Pemakaian: node scripts/import-old-data.mjs <import_data.json> [--yes]");
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, "utf8"));
const prisma = new PrismaClient({
  ...(process.env.BACKUP_SOURCE ? { datasources: { db: { url: `file:${path.resolve(process.env.BACKUP_SOURCE)}` } } } : {}),
});

// ---- sanity checks on the input before touching anything
const problems = [];
const ids = new Set();
for (const t of data.tickets) {
  if (ids.has(t.id)) problems.push(`id ganda: ${t.id}`);
  ids.add(t.id);
  if (!t.receivedAt) problems.push(`tanggal terima kosong: ${t.id}`);
}
const norms = new Set();
for (const c of data.customers) {
  if (c.phoneNormalized) {
    if (norms.has(c.phoneNormalized)) problems.push(`nomor pelanggan ganda: ${c.phoneNormalized}`);
    norms.add(c.phoneNormalized);
  }
}
for (const p of data.payments) if (!ids.has(p.ticketId)) problems.push(`pembayaran tanpa tiket: ${p.ticketId}`);
const sumPay = new Map();
for (const p of data.payments) sumPay.set(p.ticketId, (sumPay.get(p.ticketId) || 0) + p.amount);
for (const t of data.tickets) if ((sumPay.get(t.id) || 0) !== t.downPayment) problems.push(`ledger != DP: ${t.id}`);
if (problems.length) {
  console.error("Data impor bermasalah:\n - " + problems.slice(0, 20).join("\n - "));
  process.exit(1);
}

const now = async () => ({
  tickets: await prisma.ticket.count(),
  customers: await prisma.customer.count(),
  payments: await prisma.payment.count(),
  chatLogs: await prisma.chatLog.count(),
  notifications: await prisma.notification.count(),
  auditLogs: await prisma.auditLog.count(),
  users: await prisma.user.count(),
  services: await prisma.serviceItem.count(),
});
console.log("Data saat ini  :", await now());
console.log("Akan diimpor   :", { tickets: data.tickets.length, customers: data.customers.length, payments: data.payments.length });
if (!confirmed) {
  console.log("\nDry run — tidak ada yang diubah. Tambahkan --yes untuk menjalankan.");
  await prisma.$disconnect();
  process.exit(0);
}

const backup = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), "backup.mjs")], { stdio: "inherit" });
if (backup.status !== 0) {
  console.error("Backup gagal — impor DIBATALKAN.");
  await prisma.$disconnect();
  process.exit(1);
}

const at = (d, t) => new Date(`${d}T${t && /^\d{1,2}:\d{2}$/.test(t) ? t.padStart(5, "0") : "00:00"}:00+07:00`);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

await prisma.$transaction(
  async (tx) => {
    await tx.payment.deleteMany();
    await tx.chatLog.deleteMany();
    await tx.notification.deleteMany();
    await tx.ticket.deleteMany();
    await tx.customer.deleteMany();
    await tx.auditLog.deleteMany();

    for (const part of chunk(data.customers, 250)) {
      await tx.customer.createMany({
        data: part.map((c) => ({
          id: `C-${randomUUID()}`,
          name: c.name,
          category: c.category,
          phone: c.phone,
          phoneNormalized: c.phoneNormalized,
          address: c.address,
          rating: 0,
          createdAt: c.createdAt,
        })),
      });
    }
    for (const part of chunk(data.tickets, 250)) {
      await tx.ticket.createMany({
        data: part.map((t) => ({
          id: t.id,
          customer: t.customer,
          phone: t.phone,
          device: t.device,
          brand: t.brand || "",
          serial: t.serial,
          issue: t.issue,
          accessories: t.accessories,
          technician: t.technician || "",
          receivedBy: t.receivedBy || null,
          status: t.status,
          estimate: t.estimate,
          downPayment: t.downPayment,
          finalCost: t.finalCost,
          receivedAt: t.receivedAt,
          receivedTime: t.receivedTime || null,
          updatedAt: t.statusChangedAt || t.receivedAt,
          statusChangedAt: t.statusChangedAt || t.receivedAt,
          customerConfirmed: t.customerConfirmed,
          costConfirmed: t.costConfirmed,
          category: t.category,
          address: t.address,
          condition: t.condition,
          serviceAction: t.serviceAction,
          paymentMethod: t.paymentMethod,
          paymentTermDays: t.paymentTermDays || 0,
          warrantyDays: t.warrantyDays,
          pickedUpAt: t.pickedUpAt,
          pickedUpTime: t.pickedUpTime,
          handledAt: t.handledAt,
          handledTime: t.handledTime,
          partCost: t.partCost,
          createdAt: at(t.receivedAt, t.receivedTime),
        })),
      });
    }
    for (const part of chunk(data.payments, 250)) {
      await tx.payment.createMany({
        data: part.map((p) => ({
          id: randomUUID(),
          ticketId: p.ticketId,
          amount: p.amount,
          method: p.method,
          note: "Impor data aplikasi lama",
          createdBy: "import",
          createdAt: at(p.at[0], p.at[1]),
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "CREATE",
        entity: "Import",
        detail: `impor data aplikasi lama: ${data.tickets.length} servis, ${data.customers.length} pelanggan, ${data.payments.length} pembayaran (data uji dihapus)`,
      },
    });
  },
  { timeout: 300000, maxWait: 60000 },
);

const after = await now();
console.log("Setelah impor  :", after);
const ok =
  after.tickets === data.tickets.length && after.customers === data.customers.length && after.payments === data.payments.length;
console.log(ok ? "OK — jumlah data cocok." : "PERINGATAN — jumlah tidak cocok!");
await prisma.$disconnect();
process.exit(ok ? 0 : 2);
