import { useMemo } from "react";
import { PayMapGoogleMap } from "../PayMapGoogleMap/PayMapGoogleMap";
import { getMapCoordinatesFromProject, toMapEmbedSrc } from "../../utils/projectLocationUtils";

type ProjectLocationMapProps = {
    latitude?: number | null;
    longitude?: number | null;
    /** When set, lat/lng are resolved from `projectLocation` / GeoJSON on the project payload. */
    project?: Record<string, unknown> | null;
    title?: string;
    className?: string;
    mapMinHeight?: string;
};

const ProjectLocationMap = ({
    latitude,
    longitude,
    project,
    title = "Map location",
    className = "",
    mapMinHeight = "min-h-[240px] lg:min-h-[320px]",
}: ProjectLocationMapProps) => {
    const resolved = useMemo(() => {
        const fromProject = getMapCoordinatesFromProject(project);
        if (fromProject) return fromProject;

        if (
            typeof latitude === "number" &&
            typeof longitude === "number" &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            Math.abs(latitude) <= 90 &&
            Math.abs(longitude) <= 180
        ) {
            return { lat: latitude, lng: longitude };
        }
        return null;
    }, [project, latitude, longitude]);

    const mapLat = resolved?.lat ?? null;
    const mapLng = resolved?.lng ?? null;

    const hasValidCoords =
        typeof mapLat === "number" &&
        typeof mapLng === "number" &&
        Number.isFinite(mapLat) &&
        Number.isFinite(mapLng) &&
        Math.abs(mapLat) <= 90 &&
        Math.abs(mapLng) <= 180;

    const mapSrc =
        hasValidCoords && mapLat != null && mapLng != null
            ? toMapEmbedSrc(mapLat, mapLng)
            : null;
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
    const useGoogleMap = hasValidCoords && Boolean(googleMapsApiKey.trim());

    return (
        <section className={`rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col ${className}`}>
            <h2 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-4 shrink-0">{title}</h2>
            <div className={`relative flex-1 ${mapMinHeight} rounded-[15px] overflow-hidden bg-[#E8E8E8]`}>
                {hasValidCoords && useGoogleMap ? (
                    <div className={`absolute inset-0 ${mapMinHeight}`}>
                        <PayMapGoogleMap latitude={mapLat} longitude={mapLng} />
                    </div>
                ) : hasValidCoords && mapSrc ? (
                    <iframe
                        title={title}
                        src={mapSrc}
                        className="absolute inset-0 h-full w-full border-0"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] font-[Regular] text-[#707070]">
                        Location is not available
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProjectLocationMap;
