// Pure helpers (no database, no Next imports) that decide which shop a request belongs to.
// Kept separate so they can be unit-tested and used from middleware and scripts alike.

/** Subdomains that must never become a shop: they are platform addresses or easy to abuse. */
export const RESERVED_SLUGS = new Set([
  "www", "panel", "admin", "api", "app", "mail", "smtp", "imap", "ftp", "ns1", "ns2",
  "status", "docs", "help", "support", "billing", "login", "daftar", "register", "static",
  "cdn", "assets", "demo", "test", "staging", "dev", "root", "platform",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Shop slug: 3-30 chars, lowercase letters/digits/hyphens, not starting or ending with a hyphen. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !slug.includes("--") && !RESERVED_SLUGS.has(slug);
}

/** "Foo.Servisku.ID:3000" -> "foo.servisku.id" */
export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export type HostKind =
  | { kind: "tenant-subdomain"; slug: string }
  | { kind: "platform"; host: string } // apex or panel of the platform itself
  | { kind: "custom"; host: string } // anything else: must be found in the domain table
  | { kind: "unknown" };

/**
 * Classify a host against the platform base domain (e.g. "servisku.id").
 *   toko.servisku.id   -> tenant-subdomain "toko"
 *   servisku.id / panel.servisku.id -> platform
 *   servis.fscomp.id   -> custom (looked up in the TenantDomain table)
 * Only ONE label in front of the base domain counts as a shop ("a.b.servisku.id" is unknown).
 */
export function classifyHost(hostHeader: string | null | undefined, baseDomain: string): HostKind {
  const host = normalizeHost(hostHeader);
  const base = normalizeHost(baseDomain);
  if (!host) return { kind: "unknown" };
  if (base && host === base) return { kind: "platform", host };
  if (base && host.endsWith(`.${base}`)) {
    const label = host.slice(0, -(base.length + 1));
    if (label.includes(".")) return { kind: "unknown" };
    if (label === "panel" || label === "www") return { kind: "platform", host };
    return isValidSlug(label) ? { kind: "tenant-subdomain", slug: label } : { kind: "unknown" };
  }
  return { kind: "custom", host };
}
