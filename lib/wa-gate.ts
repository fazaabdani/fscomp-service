import { normalizePhone } from "./phone";

// The customer must be told before a job moves on: "siap diambil" when it is
// finished and "sudah diambil" at pickup. Opening the WhatsApp link logs a
// ChatLog row with the kind as its template; an Admin can log SKIP_<kind> with
// a reason instead. (Opening the link cannot prove the message was sent, but it
// removes the "forgot entirely" failure that kept happening.)
export const WA_GATE: Record<string, "READY" | "PICKED"> = {
  "Bisa Diambil": "READY",
  "Sudah Diambil": "PICKED",
};

export const WA_GATE_LABEL: Record<string, string> = {
  RECEIVED: "konfirmasi servis diterima",
  READY: "kabar siap diambil (servis selesai, tidak bisa, atau dibatalkan)",
  PICKED: "ucapan terima kasih setelah diambil",
};

/** A job whose WhatsApp number is unusable can't be messaged — nothing to enforce. */
export const canMessage = (phone: string | null | undefined) => normalizePhone(phone || "") !== "";

/** Jobs received from this date on must have had the "received" chat sent. */
export const WA_RECEIVED_FROM = "2026-10-24";
