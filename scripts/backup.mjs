import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Consistent online snapshot via SQLite `VACUUM INTO` — a raw file copy can
// capture a half-written page if a write lands mid-copy, and would miss
// anything still sitting in a journal. Retention is by calendar day (newest
// snapshot of each of the last 30 days, plus every snapshot from today), so a
// burst of manual/pre-deploy backups can no longer push older days out.
const source = path.resolve(process.env.BACKUP_SOURCE || "prisma/data/fs-service.db");
const dir = path.resolve(process.env.BACKUP_DIR || "backups");
const KEEP_DAYS = 30;
const KEEP_TODAY = 20;

await mkdir(dir, { recursive: true });
// Must exist already: opening a missing path through Prisma would create an
// empty database and "back up" nothing.
await stat(source);

const stamp = new Date().toISOString().replaceAll(":", "-").replace("T", "_").slice(0, 23); // keep milliseconds: VACUUM INTO refuses to overwrite
const target = path.join(dir, `fs-service_${stamp}.db`);

const prisma = new PrismaClient({ datasources: { db: { url: `file:${source}` } } });
try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
} catch (e) {
  console.error("Backup GAGAL:", (e.meta && e.meta.message) || e.message);
  process.exitCode = 1;
  process.exit();
} finally {
  await prisma.$disconnect();
}

const day = (name) => name.slice("fs-service_".length, "fs-service_".length + 10);
const names = (await readdir(dir)).filter((x) => /^fs-service_.*\.db$/.test(x)).sort().reverse();
const today = day(path.basename(target));
const keep = new Set();
const seenDays = new Set();
let todayCount = 0;
for (const name of names) {
  const d = day(name);
  if (d === today) {
    if (todayCount++ < KEEP_TODAY) keep.add(name);
    continue;
  }
  if (!seenDays.has(d) && seenDays.size < KEEP_DAYS) {
    seenDays.add(d);
    keep.add(name);
  }
}
for (const name of names) if (!keep.has(name)) await unlink(path.join(dir, name));

console.log(`Backup dibuat: ${target}`);
