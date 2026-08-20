export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("62") ? digits : `62${digits.replace(/^0/, "")}`;
};
