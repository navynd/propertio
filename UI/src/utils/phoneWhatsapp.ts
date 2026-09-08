/** Human-friendly dial string (digits with optional leading +). */
export function normalizePhoneForDial(phone: unknown): string {
  if (typeof phone !== "string") return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const keepPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return keepPlus ? `+${digits}` : digits;
}

/** wa.me expects country code + number without '+' or separators. */
export function normalizePhoneForWhatsapp(phone: unknown): string {
  const dial = normalizePhoneForDial(phone);
  return dial.replace(/^\+/, "");
}

/** E.164-style dial code for API `phoneCode`, e.g. +971 */
export function normalizeDialCode(code: unknown): string {
  if (code == null) return "";
  const digits = `${code}`.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function dialCodesMatch(a: unknown, b: unknown): boolean {
  const left = normalizeDialCode(a).replace(/^\+/, "");
  const right = normalizeDialCode(b).replace(/^\+/, "");
  return Boolean(left && right && left === right);
}

/** Local digits for profile/mobile inputs (without country dial code). */
export function extractLocalPhoneDigits(
  phoneNumberWithoutCode: unknown,
  phoneNumber: unknown,
  phoneCode: unknown
): string {
  const local = String(phoneNumberWithoutCode ?? "")
    .trim()
    .replace(/\D/g, "");
  if (local) return local;

  const full = String(phoneNumber ?? "").trim();
  const dial = normalizeDialCode(phoneCode);
  if (full && dial && full.startsWith(dial)) {
    return full.slice(dial.length).replace(/\D/g, "");
  }
  return full.replace(/\D/g, "");
}
