// Service numbers come in two spellings: the current "SRV-260820-104141" and
// the old app's "#260820104141" (same YYMMDD + HHMMSS digits). Customers still
// hold old printouts, and old exports/labels use the "#" form, so anything that
// looks up a ticket by number should accept both.
const NEW_FORM = /SRV-\d{6}-\d+/i;
const OLD_FORM = /#?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))((?:[01]\d|2[0-3])[0-5]\d[0-5]\d)(?!\d)/;

/** Canonical id ("SRV-YYMMDD-HHMMSS") found inside a scanned/pasted/typed text, or null. */
export function extractServiceCode(text: string): string | null {
  const modern = text.match(NEW_FORM);
  if (modern) return modern[0].toUpperCase();
  const old = text.match(OLD_FORM);
  return old ? `SRV-${old[1]}-${old[2]}` : null;
}

/** Old-app display form ("#260820104141") for ids that follow the 6+6 digit scheme. */
export function oldStyleNumber(id: string): string {
  const m = id.match(/^SRV-(\d{6})-(\d{6})$/);
  return m ? `#${m[1]}${m[2]}` : id;
}
