import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyHost, isValidSlug, normalizeHost } from "./tenant-host";

describe("isValidSlug", () => {
  it("accepts ordinary shop names", () => {
    for (const s of ["fscomp", "toko-jaya", "servis88", "abc", "a1b"]) expect(isValidSlug(s)).toBe(true);
  });
  it("rejects unsafe, reserved or malformed names", () => {
    for (const s of ["", "ab", "-abc", "abc-", "a--b", "AbC", "a_b", "a.b", "../x", "a/b", "panel", "www", "admin", "api", "x".repeat(31)])
      expect(isValidSlug(s)).toBe(false);
  });
});

describe("normalizeHost", () => {
  it("lowercases and drops the port and trailing dot", () => {
    expect(normalizeHost("Toko.Servisku.ID:3000")).toBe("toko.servisku.id");
    expect(normalizeHost("servisku.id.")).toBe("servisku.id");
    expect(normalizeHost(null)).toBe("");
  });
});

describe("classifyHost", () => {
  const base = "servisku.id";
  it("maps one label in front of the platform domain to a shop", () => {
    expect(classifyHost("toko-jaya.servisku.id", base)).toEqual({ kind: "tenant-subdomain", slug: "toko-jaya" });
    expect(classifyHost("TOKO-JAYA.servisku.id:443", base)).toEqual({ kind: "tenant-subdomain", slug: "toko-jaya" });
  });
  it("treats the apex and panel as the platform itself", () => {
    expect(classifyHost("servisku.id", base).kind).toBe("platform");
    expect(classifyHost("panel.servisku.id", base).kind).toBe("platform");
    expect(classifyHost("www.servisku.id", base).kind).toBe("platform");
  });
  it("sends other domains to the custom-domain lookup", () => {
    expect(classifyHost("servis.fscomp.id", base)).toEqual({ kind: "custom", host: "servis.fscomp.id" });
  });
  it("rejects nested or invalid labels so they cannot impersonate a shop", () => {
    expect(classifyHost("a.b.servisku.id", base).kind).toBe("unknown");
    expect(classifyHost("a_b.servisku.id", base).kind).toBe("unknown");
    expect(classifyHost("evilservisku.id", base).kind).toBe("custom"); // not a subdomain: only matches the domain table
    expect(classifyHost("", base).kind).toBe("unknown");
  });
});

// The per-shop routing in lib/prisma.ts cannot carry the array form of $transaction (it needs real
// Prisma promises from a single client). Fail loudly if someone introduces it.
describe("multi-shop routing guard", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? (f === "node_modules" || f === ".next" ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });
  it("never uses prisma.$transaction([...])", () => {
    const offenders = ["app", "lib"].flatMap(walk).filter((f) => !f.endsWith(".test.ts") && /\$transaction\(\s*\[/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
