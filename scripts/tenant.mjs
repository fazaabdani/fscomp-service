#!/usr/bin/env node
// Platform control from the command line (multi-shop mode). Usage:
//   node scripts/tenant.mjs init
//   node scripts/tenant.mjs create <slug> "<Nama Toko>" <adminUser> [--domain host] [--plan tahunan] [--trial-days 30]
//        (the admin password is read from the TENANT_ADMIN_PASSWORD environment variable, never from argv)
//   node scripts/tenant.mjs import <slug> "<Nama Toko>" <path/to/existing.db> [--domain host] [--status ACTIVE]
//   node scripts/tenant.mjs list
//   node scripts/tenant.mjs suspend|activate <slug>
//   node scripts/tenant.mjs domain <slug> <host>
//   node scripts/tenant.mjs migrate            (apply schema changes to every shop database, safely)
//   node scripts/tenant.mjs backup             (consistent copy of master + every shop database)
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import path from "node:path";

const require = createRequire(path.resolve("package.json"));
const { PrismaClient } = require("@prisma/client");

const dataDir = path.resolve(process.env.TENANT_DATA_DIR || "data/tenants");
const masterDb = path.resolve(process.env.MASTER_DB || "data/master.db");
const templateDb = path.join(path.dirname(dataDir), "template-tenant.db");
const backupDir = path.resolve(process.env.BACKUP_DIR || "backups/tenants");

// Keep in sync with lib/tenant-host.ts (the server re-checks every slug).
const RESERVED = new Set(["www", "panel", "admin", "api", "app", "mail", "smtp", "imap", "ftp", "ns1", "ns2", "status", "docs", "help", "support", "billing", "login", "daftar", "register", "static", "cdn", "assets", "demo", "test", "staging", "dev", "root", "platform"]);
const validSlug = (s) => /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(s) && !s.includes("--") && !RESERVED.has(s);

const client = (file) => new PrismaClient({ datasources: { db: { url: `file:${file}` } } });
const hash = (pw) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
};
const prismaBin = () => path.resolve("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const push = (file) =>
  execFileSync(prismaBin(), ["db", "push", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: `file:${file}` },
    stdio: "pipe",
    shell: process.platform === "win32",
  });

const flag = (args, name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const die = (msg) => {
  console.error("GAGAL:", msg);
  process.exit(1);
};

const [cmd, ...args] = process.argv.slice(2);

async function init() {
  mkdirSync(dataDir, { recursive: true });
  push(masterDb);
  if (existsSync(templateDb)) unlinkSync(templateDb);
  push(templateDb);
  console.log("OK: database induk dan templat toko siap.\n  induk :", masterDb, "\n  templat:", templateDb);
}

async function create() {
  const [slug, name, adminUser] = args;
  if (!slug || !name || !adminUser) die('pemakaian: create <slug> "<Nama Toko>" <adminUser>');
  if (!validSlug(slug)) die("slug tidak valid (3-30 huruf kecil/angka/strip, bukan nama yang dicadangkan)");
  const pw = process.env.TENANT_ADMIN_PASSWORD;
  if (!pw || pw.length < 8) die("isi TENANT_ADMIN_PASSWORD (minimal 8 karakter) di lingkungan perintah");
  if (!existsSync(templateDb)) die("jalankan dulu: node scripts/tenant.mjs init");
  const file = path.join(dataDir, `${slug}.db`);
  if (existsSync(file)) die(`berkas database ${slug} sudah ada`);
  const master = client(masterDb);
  try {
    if (await master.tenant.findUnique({ where: { slug } })) die("slug sudah dipakai");
    const trialDays = Number(flag(args, "trial-days", "30"));
    const host = flag(args, "domain", "");
    copyFileSync(templateDb, file);
    const db = client(file);
    try {
      await db.user.create({ data: { id: randomUUID(), name: "Administrator", username: adminUser, passwordHash: hash(pw), role: "ADMIN" } });
      await db.shopSettings.create({ data: { id: "default", name, phone: "", whatsapp: "", address: "", description: "", terms: "", bank: "", instagram: "", tiktok: "" } });
    } finally {
      await db.$disconnect();
    }
    const t = await master.tenant.create({
      data: {
        slug, name, status: "TRIAL", plan: flag(args, "plan", "tahunan"),
        trialEndsAt: new Date(Date.now() + trialDays * 86400000),
        ...(host ? { domains: { create: { host: host.toLowerCase(), isPrimary: true } } } : {}),
      },
    });
    console.log(`OK: toko "${name}" (${slug}) dibuat, uji coba ${trialDays} hari. Admin: ${adminUser}. id=${t.id}`);
  } finally {
    await master.$disconnect();
  }
}

async function importDb() {
  const [slug, name, src] = args;
  if (!slug || !name || !src) die('pemakaian: import <slug> "<Nama Toko>" <berkas.db>');
  if (!validSlug(slug)) die("slug tidak valid");
  if (!existsSync(src)) die("berkas sumber tidak ada");
  const file = path.join(dataDir, `${slug}.db`);
  if (existsSync(file)) die(`berkas database ${slug} sudah ada`);
  mkdirSync(dataDir, { recursive: true });
  copyFileSync(src, file);
  push(file); // brings an older database up to the current schema (adds tables, never drops data)
  const master = client(masterDb);
  try {
    const host = flag(args, "domain", "");
    await master.tenant.create({
      data: {
        slug, name, status: flag(args, "status", "ACTIVE"),
        ...(host ? { domains: { create: { host: host.toLowerCase(), isPrimary: true } } } : {}),
      },
    });
    console.log(`OK: database ${src} diimpor sebagai toko ${slug}.`);
  } finally {
    await master.$disconnect();
  }
}

async function list() {
  const master = client(masterDb);
  try {
    const rows = await master.tenant.findMany({ include: { domains: true }, orderBy: { createdAt: "asc" } });
    for (const t of rows)
      console.log(`${t.slug.padEnd(20)} ${t.status.padEnd(10)} ${t.plan.padEnd(8)} uji-coba-s/d:${t.trialEndsAt?.toISOString().slice(0, 10) ?? "-"} lunas-s/d:${t.paidUntil?.toISOString().slice(0, 10) ?? "-"} domain:${t.domains.map((d) => d.host).join(",") || "-"}  "${t.name}"`);
    console.log(`(${rows.length} toko)`);
  } finally {
    await master.$disconnect();
  }
}

async function setStatus(status) {
  const [slug] = args;
  if (!slug) die("pemakaian: suspend|activate <slug>");
  const master = client(masterDb);
  try {
    const r = await master.tenant.updateMany({ where: { slug }, data: { status } });
    if (!r.count) die("toko tidak ditemukan");
    console.log(`OK: ${slug} -> ${status} (berlaku paling lambat 30 detik, atau saat aplikasi dimulai ulang)`);
  } finally {
    await master.$disconnect();
  }
}

async function domain() {
  const [slug, host] = args;
  if (!slug || !host) die("pemakaian: domain <slug> <host>");
  const master = client(masterDb);
  try {
    const t = await master.tenant.findUnique({ where: { slug } });
    if (!t) die("toko tidak ditemukan");
    await master.tenantDomain.create({ data: { host: host.toLowerCase(), tenantId: t.id } });
    console.log(`OK: ${host} -> ${slug}`);
  } finally {
    await master.$disconnect();
  }
}

async function migrate() {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".db"));
  let ok = 0;
  const failed = [];
  for (const f of files) {
    try {
      push(path.join(dataDir, f));
      ok++;
    } catch (e) {
      failed.push(`${f}: ${String(e.stderr || e.message).split("\n").slice(-3).join(" ").slice(0, 200)}`);
    }
  }
  push(masterDb);
  console.log(`Migrasi: ${ok}/${files.length} database toko diperbarui.`);
  for (const f of failed) console.log("  GAGAL", f);
  if (failed.length) process.exit(1);
}

async function backup() {
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  const targets = [["_master", masterDb], ...readdirSync(dataDir).filter((f) => f.endsWith(".db")).map((f) => [f.slice(0, -3), path.join(dataDir, f)])];
  let n = 0;
  for (const [name, file] of targets) {
    const out = path.join(backupDir, `${name}_${stamp}.db`);
    const db = client(file);
    try {
      // Consistent online snapshot (a raw copy can catch a half-written page).
      await db.$executeRawUnsafe(`VACUUM INTO '${out.replaceAll("'", "''")}'`);
      n++;
    } finally {
      await db.$disconnect();
    }
  }
  // Keep the newest 14 snapshots per shop.
  const byShop = {};
  for (const f of readdirSync(backupDir).filter((x) => x.endsWith(".db")).sort().reverse()) {
    const key = f.replace(/_\d{4}-.*$/, "");
    (byShop[key] ||= []).push(f);
  }
  for (const list of Object.values(byShop)) for (const f of list.slice(14)) unlinkSync(path.join(backupDir, f));
  console.log(`Backup: ${n} database disalin ke ${backupDir}`);
}

const table = { init, create, import: importDb, list, suspend: () => setStatus("SUSPENDED"), activate: () => setStatus("ACTIVE"), domain, migrate, backup };
if (!table[cmd]) die(`perintah tidak dikenal. Pilihan: ${Object.keys(table).join(", ")}`);
await table[cmd]();
