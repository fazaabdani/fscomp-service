// Everything typed about a customer or a job is stored in capitals (the shop's
// convention, and what the old app's data already looked like). Phone numbers,
// staff names, passwords, message templates and similar settings are NOT passed
// through here.
const UNIT_ONLY = /^unit only$/i;

export const up = (v: unknown): string => String(v ?? "").toLocaleUpperCase("id-ID");

/** Uppercase, but keep the "Unit only" marker exactly as the app compares it. */
export const upAccessories = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return UNIT_ONLY.test(s) ? "Unit only" : up(s);
};

/** Free-text fields of a ticket that get uppercased on every write. */
export const TICKET_UPPER_FIELDS = ["customer", "device", "brand", "serial", "issue", "serviceAction", "notes", "address", "pickupBy"] as const;
