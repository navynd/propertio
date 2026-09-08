import { useJsApiLoader } from "@react-google-maps/api";

/** Single loader id/options for the whole app — @react-google-maps/api allows only one. */
export const GOOGLE_MAPS_LOADER_ID = "pf-google-places-script";

export const GOOGLE_MAPS_LOADER_LIBRARIES: ("places")[] = ["places"];

export const getGoogleMapsApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export function useGoogleMapsLoader() {
    return useJsApiLoader({
        id: GOOGLE_MAPS_LOADER_ID,
        googleMapsApiKey: getGoogleMapsApiKey() || "missing-key",
        libraries: GOOGLE_MAPS_LOADER_LIBRARIES,
    });
}
