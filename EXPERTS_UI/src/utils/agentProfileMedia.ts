import type { AgentSupportedUrlsMasterData } from "../services/agentService";

export const extractAgentImageBase = (data: AgentSupportedUrlsMasterData | null, defaultOrigin: string): string => {
    const fallback = `${defaultOrigin}/uploads/img/agents/`;
    if (!data) return fallback.replace(/\/?$/, "/");
    const source =
        (data.supportedUrls as Record<string, unknown>) ||
        (data.supportedurls as Record<string, unknown>) ||
        {};
    const agentUrl =
        (source.agentUrl as Record<string, unknown>) ||
        (source.agenturl as Record<string, unknown>) ||
        {};
    return String(agentUrl.img || fallback).replace(/\/?$/, "/");
};

/** Default “no photo” asset from API — not a user-uploaded picture. */
export const isPlaceholderProfilePicture = (filename: string | null | undefined): boolean => {
    if (!filename || !String(filename).trim()) return true;
    const lower = String(filename).trim().toLowerCase();
    if (lower.includes("profileless.png") || lower.includes("profiless.png")) return true;
    const base = lower.split(/[/\\?#]/).pop() ?? "";
    return base === "profileless.png" || base === "profiless.png";
};

/** CDN/local URL for any profile filename, including `profileless.png`. */
export const buildProfilePictureUrl = (base: string, filename: string | null | undefined): string | null => {
    if (!filename || !String(filename).trim()) return null;
    const f = String(filename).trim();
    if (/^https?:\/\//i.test(f)) return f;
    return `${base}${f.replace(/^\//, "")}`;
};

/** User-uploaded photo (not the default profileless asset). */
export const hasUploadedProfilePicture = (filename: string | null | undefined): boolean =>
    !isPlaceholderProfilePicture(filename);
