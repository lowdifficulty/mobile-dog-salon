export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/** Last 10 digits after normalizePhone — US numbers match across +1, (), spaces, and dashes. */
export function phoneLast10(phone: string): string {
  const digits = normalizePhone(phone);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** True when both values are the same US number, regardless of formatting. */
export function phonesMatch(a: string, b: string): boolean {
  const da = phoneLast10(a);
  const db = phoneLast10(b);
  return da.length === 10 && db.length === 10 && da === db;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phoneLast10(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
