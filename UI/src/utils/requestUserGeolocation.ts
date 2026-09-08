/** Browser geolocation for `/properties/search` and `/projects/search` `nearLat` / `nearLng`. */

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 60_000,
};

export function requestUserGeolocation(
  options?: PositionOptions
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      reject,
      options ?? DEFAULT_OPTIONS
    );
  });
}

export const DEFAULT_NEARBY_RADIUS_KM = 5;
