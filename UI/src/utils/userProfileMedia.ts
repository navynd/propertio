/** Default “no photo” asset from API — not a user-uploaded picture. */
export const isPlaceholderProfilePicture = (
  filename: string | null | undefined
): boolean => {
  if (!filename || !String(filename).trim()) return true;
  const lower = String(filename).trim().toLowerCase();
  if (lower.includes("profileless.png") || lower.includes("profiless.png")) {
    return true;
  }
  const base = lower.split(/[/\\?#]/).pop() ?? "";
  return base === "profileless.png" || base === "profiless.png";
};

/** User-uploaded photo (not the default profileless asset). */
export const hasUploadedProfilePicture = (
  filename: string | null | undefined
): boolean => !isPlaceholderProfilePicture(filename);

/** CDN/local URL for any profile filename, including `profileless.png`. */
export const buildUserProfilePictureUrl = (
  userImgBaseUrl: string | null | undefined,
  filename: string | null | undefined
): string | null => {
  if (!filename || !String(filename).trim()) return null;
  const raw = String(filename).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (userImgBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  if (raw.includes("/")) return `${base}/${raw.split("/").pop()}`;
  return `${base}/${encodeURIComponent(raw)}`;
};
