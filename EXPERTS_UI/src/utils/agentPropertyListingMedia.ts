import type { AgentSupportedUrlsMasterData } from "../services/agentService";
import { API_BASE_URL } from "../services/apiClient";

export function getApiOrigin(): string {
    return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function defaultPropertyImageBase(): string {
    return `${getApiOrigin()}/uploads/img/property/`.replace(/\/?$/, "/");
}

export function defaultPropertyVideoBase(): string {
    return `${getApiOrigin()}/uploads/vid/property/`.replace(/\/?$/, "/");
}

/** Read `propertyUrl` (img / vid / doc) from one supported-url row. */
function readPropertyUrlRow(obj: unknown): { img: string | null; vid: string | null } | null {
    if (!obj || typeof obj !== "object") return null;
    const propertyUrl = (obj as { propertyUrl?: unknown }).propertyUrl;
    if (!propertyUrl || typeof propertyUrl !== "object") return null;
    const pu = propertyUrl as { img?: unknown; vid?: unknown };
    const img = typeof pu.img === "string" && pu.img.trim() ? pu.img.trim() : null;
    const vid = typeof pu.vid === "string" && pu.vid.trim() ? pu.vid.trim() : null;
    if (!img && !vid) return null;
    return { img, vid };
}

/**
 * Image + video CDN bases from `GET /master-data?type=supportedurls` (`propertyUrl.img` / `propertyUrl.vid`).
 */
export function extractPropertyMediaBasesFromSupportedUrls(
    data: AgentSupportedUrlsMasterData | null
): { imageBase: string | null; videoBase: string | null } {
    let imageBase: string | null = null;
    let videoBase: string | null = null;

    const merge = (obj: unknown) => {
        const row = readPropertyUrlRow(obj);
        if (!row) return;
        if (!imageBase && row.img) imageBase = row.img;
        if (!videoBase && row.vid) videoBase = row.vid;
    };

    const candidates: unknown[] = [data?.supportedUrls, data?.supportedurls, data?.items];
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            for (const item of candidate) merge(item);
            continue;
        }
        merge(candidate);
    }

    return { imageBase, videoBase };
}

export function resolvePropertyImageUrl(
    filename: string | undefined | null,
    imageBaseUrl: string | null | undefined
): string {
    if (!filename?.trim()) return "";
    const f = filename.trim();
    if (/^https?:\/\//i.test(f)) return f;
    const base = (imageBaseUrl || defaultPropertyImageBase()).replace(/\/?$/, "/");
    return `${base}${f.replace(/^\//, "")}`;
}

/** `videoTour` is usually a filename; may already be a full URL. Uses master `propertyUrl.vid` when provided. */
export function resolvePropertyVideoUrl(
    videoTour: string | null | undefined,
    videoBaseUrl?: string | null
): string | null {
    if (!videoTour?.trim()) return null;
    const v = videoTour.trim();
    if (/^https?:\/\//i.test(v)) return v;
    const base = (videoBaseUrl || defaultPropertyVideoBase()).replace(/\/?$/, "/");
    const name = v.includes("/") ? (v.split("/").pop() ?? v) : v;
    return `${base}${name.replace(/^\//, "")}`;
}
