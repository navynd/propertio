export type ProjectLatLng = { lat: number; lng: number };

const isValidLng = (n: number) => Number.isFinite(n) && Math.abs(n) <= 180;
const isValidLat = (n: number) => Number.isFinite(n) && Math.abs(n) <= 90;

const toPositionArray = (value: unknown): number[] | null => {
    if (Array.isArray(value)) {
        const nums = value.slice(0, 2).map((v) => Number(v));
        return nums.every((n) => Number.isFinite(n)) ? nums : null;
    }
    if (value && typeof value === "object") {
        const o = value as Record<string, unknown>;
        const a = Number(o[0] ?? o["0"]);
        const b = Number(o[1] ?? o["1"]);
        if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
    }
    return null;
};

/** GeoJSON Point / Position: [longitude, latitude] (auto-corrects common [lat, lng] swaps). */
const pairFromGeoJsonPosition = (arr: unknown): ProjectLatLng | null => {
    const position = toPositionArray(arr);
    if (!position || position.length < 2) return null;

    const first = position[0];
    const second = position[1];

    const asGeoJson = (): ProjectLatLng | null => {
        const lng = first;
        const lat = second;
        if (!isValidLng(lng) || !isValidLat(lat)) return null;
        return { lng, lat };
    };

    const asSwapped = (): ProjectLatLng | null => {
        const lng = second;
        const lat = first;
        if (!isValidLng(lng) || !isValidLat(lat)) return null;
        return { lng, lat };
    };

    const standard = asGeoJson();
    if (!standard) return asSwapped();

    const swapped = asSwapped();
    if (swapped && Math.abs(standard.lat) > Math.abs(standard.lng) && Math.abs(swapped.lat) <= Math.abs(swapped.lng)) {
        return swapped;
    }

    return standard;
};

const pairFromGeoJsonLike = (value: unknown): ProjectLatLng | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const coords = (value as { coordinates?: unknown }).coordinates;
    return pairFromGeoJsonPosition(coords);
};

const readFromLocationObject = (loc: Record<string, unknown> | null | undefined): ProjectLatLng | null => {
    if (!loc || typeof loc !== "object") return null;

    const fromPoint = pairFromGeoJsonLike(loc.coordinates);
    if (fromPoint) return fromPoint;

    if (Array.isArray(loc.coordinates)) {
        const fromArray = pairFromGeoJsonPosition(loc.coordinates);
        if (fromArray) return fromArray;
    }

    const geom = loc.geometry as Record<string, unknown> | undefined;
    if (geom) {
        const fromGeometry = pairFromGeoJsonLike(geom);
        if (fromGeometry) return fromGeometry;
        const fromGeomCoords = pairFromGeoJsonPosition(geom.coordinates);
        if (fromGeomCoords) return fromGeomCoords;
    }

    const flatLat = Number((loc as { latitude?: unknown }).latitude);
    const flatLng = Number((loc as { longitude?: unknown }).longitude);
    if (isValidLat(flatLat) && isValidLng(flatLng)) return { lat: flatLat, lng: flatLng };

    return null;
};

/**
 * Reads map coordinates from location payloads the API may return:
 * GeoJSON Point `{ type, coordinates: [lng, lat] }`, nested `projectLocation`, or flat lat/lng.
 */
/** Reads lat/lng from agent/developer project detail payloads (`projectLocation`, `location`, or root `coordinates`). */
export const getMapCoordinatesFromProject = (
    project: Record<string, unknown> | null | undefined
): ProjectLatLng | null => {
    if (!project || typeof project !== "object") return null;

    const projectLocation = project.projectLocation as Record<string, unknown> | undefined;
    const location = project.location as Record<string, unknown> | undefined;

    return (
        readProjectLocationLatLng(projectLocation, project) ??
        readProjectLocationLatLng(location, project) ??
        readProjectLocationLatLng(undefined, project)
    );
};

export const readProjectLocationLatLng = (
    location: Record<string, unknown> | null | undefined,
    project: Record<string, unknown> | null | undefined
): ProjectLatLng | null => {
    const fromLocation = readFromLocationObject(location);
    if (fromLocation) return fromLocation;

    const proj = project && typeof project === "object" ? project : null;
    if (!proj) return null;

    const fromProjectLocation = readFromLocationObject(
        proj.projectLocation as Record<string, unknown> | undefined
    );
    if (fromProjectLocation) return fromProjectLocation;

    const fromProjectCoords = pairFromGeoJsonLike(proj.coordinates);
    if (fromProjectCoords) return fromProjectCoords;

    if (Array.isArray(proj.coordinates)) {
        const fromArray = pairFromGeoJsonPosition(proj.coordinates);
        if (fromArray) return fromArray;
    }

    const flatLat = Number((proj as { latitude?: unknown }).latitude);
    const flatLng = Number((proj as { longitude?: unknown }).longitude);
    if (isValidLat(flatLat) && isValidLng(flatLng)) return { lat: flatLat, lng: flatLng };

    return null;
};

/** OSM embed bbox = min_lon,min_lat,max_lon,max_lat; marker = lat,lon */
export const toMapEmbedSrc = (lat: number, lng: number) => {
    const delta = 0.02;
    const left = lng - delta;
    const right = lng + delta;
    const bottom = lat - delta;
    const top = lat + delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
};
