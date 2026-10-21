/** Canonical 62… form of a phone number, or "" when there is no usable number
 * (blank, "0", "-"). Callers must treat "" as "no number" — never as a key that
 * different people can share. */
export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return "";
  return digits.startsWith("62") ? digits : `62${digits.replace(/^0/, "")}`;
};
