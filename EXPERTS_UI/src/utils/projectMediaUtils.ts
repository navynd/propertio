/** API may return a filename string or `{ url }` per media entry. */
export function resolveMediaRef(entry: unknown): string | undefined {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
    if (entry && typeof entry === "object") {
        const url = (entry as { url?: unknown; image?: unknown }).url ?? (entry as { image?: unknown }).image;
        if (typeof url === "string" && url.trim()) return url.trim();
    }
    return undefined;
}
