import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";
import { useJsApiLoader } from "@react-google-maps/api";

type GoogleMapsLoaderContextValue = {
  isLoaded: boolean;
  loadError: Error | undefined;
  googleMapsApiKey: string | undefined;
};

const GoogleMapsLoaderContext =
  createContext<GoogleMapsLoaderContextValue | null>(null);

export function GoogleMapsLoaderProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "global-google-maps",
    googleMapsApiKey: googleMapsApiKey ?? "",
    language: "en",
    region: "US",
  });

  return (
    <GoogleMapsLoaderContext.Provider
      value={{ isLoaded, loadError, googleMapsApiKey }}
    >
      {children}
    </GoogleMapsLoaderContext.Provider>
  );
}

export function useGoogleMapsLoader() {
  const context = useContext(GoogleMapsLoaderContext);

  if (!context) {
    throw new Error(
      "useGoogleMapsLoader must be used within a GoogleMapsLoaderProvider"
    );
  }

  return context;
}


