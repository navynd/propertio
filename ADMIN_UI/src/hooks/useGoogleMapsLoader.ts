import { useJsApiLoader } from "@react-google-maps/api";

/** Single loader id for all admin Google Maps / Places usage (must not vary per component). */
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
