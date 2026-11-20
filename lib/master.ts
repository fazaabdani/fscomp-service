import { masterClient } from "./prisma";
import { classifyHost, normalizeHost } from "./tenant-host";

// Resolves "which shop is this request for?" from the Host header, against the master database.
// Results (including "not found") are cached for a short time so a request costs no extra query.
export type TenantInfo = { id: string; slug: string; name: string; status: string };
export type Resolution =
  | { ok: true; tenant: TenantInfo }
  | { ok: false; reason: "platform" | "unknown" | "suspended"; tenant?: TenantInfo };

const TTL_MS = Number(process.env.TENANT_CACHE_TTL_MS || 30_000);
const cache = new Map<string, { at: number; res: Resolution }>();

export const platformDomain = () => normalizeHost(process.env.PLATFORM_DOMAIN || "");

const toInfo = (t: { id: string; slug: string; name: string; status: string }): TenantInfo => ({
  id: t.id, slug: t.slug, name: t.name, status: t.status,
});

function judge(t: TenantInfo): Resolution {
  // A closed or suspended shop keeps its data but cannot be used until reactivated.
  return t.status === "SUSPENDED" || t.status === "CLOSED"
    ? { ok: false, reason: "suspended", tenant: t }
    : { ok: true, tenant: t };
}

export async function resolveTenant(hostHeader: string | null | undefined): Promise<Resolution> {
  const host = normalizeHost(hostHeader);
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.res;

  const kind = classifyHost(hostHeader, platformDomain());
  let res: Resolution = { ok: false, reason: "unknown" };
  if (kind.kind === "platform") {
    res = { ok: false, reason: "platform" };
  } else if (kind.kind === "tenant-subdomain") {
    const t = await masterClient().tenant.findUnique({ where: { slug: kind.slug } });
    if (t) res = judge(toInfo(t));
  } else if (kind.kind === "custom") {
    const d = await masterClient().tenantDomain.findUnique({ where: { host: kind.host }, include: { tenant: true } });
    if (d) res = judge(toInfo(d.tenant));
  }
  cache.set(host, { at: Date.now(), res });
  if (cache.size > 5000) cache.clear();
  return res;
}

/** Forget cached answers (after a shop is suspended/activated through the control panel). */
export function clearTenantCache() {
  cache.clear();
}
