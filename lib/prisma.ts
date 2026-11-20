import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { isValidSlug } from "./tenant-host";

// Two modes, chosen by TENANT_MODE:
//   single (default) - one shop, one database (DATABASE_URL). Behaves exactly as before.
//   multi            - one SQLite file per shop (data/tenants/<slug>.db) inside a single app process.
//                      Every `prisma.xxx` call is routed to the database of the shop that the
//                      request belongs to; middleware decides the shop from the Host header and
//                      passes it on in a header that clients can never set themselves.
export const MULTI_TENANT = process.env.TENANT_MODE === "multi";
export const TENANT_HEADER = "x-tenant-slug";

type G = { prisma?: PrismaClient; tenantClients?: Map<string, PrismaClient>; masterClient?: PrismaClient };
const g = globalThis as unknown as G;

export const tenantDataDir = () => path.resolve(process.env.TENANT_DATA_DIR || "data/tenants");
export const masterDbPath = () => path.resolve(process.env.MASTER_DB || "data/master.db");

// Bound the number of open shop databases; the least recently used one is closed first.
const MAX_OPEN = Number(process.env.TENANT_MAX_OPEN || 300);

function open(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

/** The platform's own database (shop list, domains, super-admins). Multi mode only. */
export function masterClient(): PrismaClient {
  if (!g.masterClient) g.masterClient = open(`file:${masterDbPath()}`);
  return g.masterClient;
}

/** The database of one shop. The slug is validated, so it can never point outside the data directory. */
export function tenantClient(slug: string): PrismaClient {
  if (!isValidSlug(slug)) throw new Error("Nama toko tidak valid");
  const cache = (g.tenantClients ??= new Map());
  const hit = cache.get(slug);
  if (hit) {
    cache.delete(slug); // refresh recency
    cache.set(slug, hit);
    return hit;
  }
  const client = open(`file:${path.join(tenantDataDir(), `${slug}.db`)}`);
  cache.set(slug, client);
  if (cache.size > MAX_OPEN) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest) {
      const evicted = cache.get(oldest);
      cache.delete(oldest);
      void evicted?.$disconnect();
    }
  }
  return client;
}

/** Slug of the shop the current request belongs to (set by middleware), or null. */
export async function currentTenantSlug(): Promise<string | null> {
  if (!MULTI_TENANT) return null;
  try {
    return (await headers()).get(TENANT_HEADER);
  } catch {
    return null;
  }
}

async function currentClient(): Promise<PrismaClient> {
  const slug = await currentTenantSlug();
  if (!slug) throw new Error("Permintaan ini tidak terhubung ke toko mana pun");
  return tenantClient(slug);
}

// `prisma.ticket.findMany(...)` etc. become async lookups of the current shop's client. Only the
// callback form of $transaction is used in this codebase (the array form needs real Prisma
// promises from one client), and a unit test guards that.
type Fn = (...args: unknown[]) => Promise<unknown>;
const modelProxy = (model: string) =>
  new Proxy({} as Record<string, Fn>, {
    get: (_t, method) => (typeof method === "string"
      ? (...args: unknown[]) => currentClient().then((c) => ((c as unknown as Record<string, Record<string, Fn>>)[model][method])(...args))
      : undefined),
  });

const routed = new Proxy({} as Record<string, unknown>, {
  get(_t, prop) {
    if (typeof prop !== "string" || prop === "then") return undefined;
    if (prop.startsWith("$"))
      return (...args: unknown[]) => currentClient().then((c) => ((c as unknown as Record<string, Fn>)[prop])(...args));
    return modelProxy(prop);
  },
});

const single = g.prisma ?? new PrismaClient();
if (!MULTI_TENANT && process.env.NODE_ENV !== "production") g.prisma = single;

/** Use exactly like a PrismaClient. In multi mode it is routed to the current request's shop. */
export const prisma = (MULTI_TENANT ? routed : single) as unknown as PrismaClient;

/** For code that already knows the shop (middleware, scripts): the shop's client, or the single database. */
export function clientFor(slug: string | null): PrismaClient {
  return MULTI_TENANT && slug ? tenantClient(slug) : single;
}
