// One-time migration: move tickets/customers/services/shop out of the
// AppState JSON-blob rows into their own real tables (see prisma/schema.prisma).
// Safe to re-run: it upserts by id, and skips a table entirely if its
// AppState source key is missing. Does NOT delete the AppState rows —
// leave them in place until the new tables are confirmed working, then
// clean up separately.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const num = (v, fallback = 0) => (typeof v === "number" && !Number.isNaN(v) ? Math.round(v) : fallback);
const numOrNull = (v) => (typeof v === "number" && !Number.isNaN(v) ? Math.round(v) : null);
const str = (v, fallback = "") => (typeof v === "string" ? v : fallback);
const strOrNull = (v) => (typeof v === "string" ? v : null);
const bool = (v, fallback = false) => (typeof v === "boolean" ? v : fallback);

async function migrateTickets() {
  const row = await prisma.appState.findUnique({ where: { key: "tickets" } });
  if (!row) return console.log("no 'tickets' AppState row, skipping");
  const list = JSON.parse(row.value);
  let ok = 0, failed = 0;
  for (const t of list) {
    try {
      await prisma.ticket.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          customer: str(t.customer),
          phone: str(t.phone),
          device: str(t.device),
          brand: str(t.brand),
          serial: str(t.serial, "-"),
          issue: str(t.issue),
          accessories: str(t.accessories, "Unit only"),
          technician: str(t.technician),
          status: str(t.status),
          estimate: num(t.estimate),
          downPayment: num(t.downPayment),
          finalCost: numOrNull(t.finalCost),
          receivedAt: str(t.receivedAt),
          receivedTime: strOrNull(t.receivedTime),
          updatedAt: str(t.updatedAt, t.receivedAt),
          statusChangedAt: strOrNull(t.statusChangedAt),
          rating: numOrNull(t.rating),
          customerConfirmed: bool(t.customerConfirmed),
          costConfirmed: bool(t.costConfirmed),
          category: strOrNull(t.category),
          address: strOrNull(t.address),
          condition: strOrNull(t.condition),
          serviceAction: strOrNull(t.serviceAction),
          paymentMethod: strOrNull(t.paymentMethod),
          paymentTermDays: numOrNull(t.paymentTermDays),
          warrantyDays: numOrNull(t.warrantyDays),
          pickedUpAt: strOrNull(t.pickedUpAt),
          pickedUpTime: strOrNull(t.pickedUpTime),
          handledAt: strOrNull(t.handledAt),
          handledTime: strOrNull(t.handledTime),
          notes: strOrNull(t.notes),
          partCost: numOrNull(t.partCost),
          pickupBy: strOrNull(t.pickupBy),
          handedBy: strOrNull(t.handedBy),
        },
        update: {},
      });
      ok++;
    } catch (e) {
      failed++;
      console.error(`ticket ${t.id} failed:`, e.message);
    }
  }
  console.log(`tickets: ${ok} migrated, ${failed} failed, ${list.length} total in source`);
}

async function migrateCustomers() {
  const row = await prisma.appState.findUnique({ where: { key: "customers" } });
  if (!row) return console.log("no 'customers' AppState row, skipping");
  const list = JSON.parse(row.value);
  let ok = 0, failed = 0;
  for (const c of list) {
    try {
      await prisma.customer.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: str(c.name),
          category: str(c.category, "User"),
          phone: str(c.phone),
          address: str(c.address, "-"),
          rating: num(c.rating),
          createdAt: str(c.createdAt),
        },
        update: {},
      });
      ok++;
    } catch (e) {
      failed++;
      console.error(`customer ${c.id} failed:`, e.message);
    }
  }
  console.log(`customers: ${ok} migrated, ${failed} failed, ${list.length} total in source`);
}

async function migrateServices() {
  const row = await prisma.appState.findUnique({ where: { key: "services" } });
  if (!row) return console.log("no 'services' AppState row, skipping");
  const list = JSON.parse(row.value);
  let ok = 0, failed = 0;
  for (const s of list) {
    try {
      await prisma.serviceItem.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          name: str(s.name),
          partCost: num(s.partCost),
          shopPrice: num(s.shopPrice),
          userPrice: num(s.userPrice),
          warrantyDays: num(s.warrantyDays),
        },
        update: {},
      });
      ok++;
    } catch (e) {
      failed++;
      console.error(`service ${s.id} failed:`, e.message);
    }
  }
  console.log(`services: ${ok} migrated, ${failed} failed, ${list.length} total in source`);
}

async function migrateShop() {
  const row = await prisma.appState.findUnique({ where: { key: "shop" } });
  if (!row) return console.log("no 'shop' AppState row, skipping");
  const s = JSON.parse(row.value);
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: str(s.name),
      phone: str(s.phone),
      whatsapp: str(s.whatsapp),
      address: str(s.address),
      description: str(s.description),
      terms: str(s.terms),
      bank: str(s.bank),
      lockEnabled: bool(s.lockEnabled),
    },
    update: {},
  });
  console.log("shop: migrated");
}

await migrateTickets();
await migrateCustomers();
await migrateServices();
await migrateShop();
await prisma.$disconnect();
