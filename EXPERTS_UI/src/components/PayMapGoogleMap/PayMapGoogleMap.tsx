import { GoogleMap, Marker } from "@react-google-maps/api";
import { useMemo } from "react";
import { useGoogleMapsLoader } from "../../hooks/useGoogleMapsLoader";

/** Same artwork as `MarkerIcon` (icons.tsx), encoded for `google.maps.Marker` icon URL. */
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 31 41" fill="none"><path d="M24.5623 30.2245C26.6153 27.2765 28.4086 24.188 29.5899 20.7727C31.1746 16.1942 30.9107 11.7732 28.4607 7.54692C25.3477 2.17658 19.0738 -0.816168 12.9542 0.194895C8.3246 0.960111 4.72415 3.35686 2.25184 7.34684C0.378712 10.3694 -0.330096 13.6814 0.141379 17.2223C0.461726 19.6286 1.29931 21.87 2.34869 24.04C4.00896 27.4744 6.15348 30.5981 8.52149 33.5749C10.5457 36.1206 12.7009 38.5493 15.054 40.7981C15.2137 40.7981 15.3722 40.7981 15.5319 40.7981C15.6649 40.6736 15.8022 40.5523 15.9321 40.4246C19.1004 37.2722 22.0059 33.8942 24.5623 30.2245ZM15.3233 22.3159C11.4429 22.3191 8.2799 19.1795 8.2831 15.3268C8.28629 11.4092 11.4291 8.28659 15.3605 8.29617C19.1866 8.30575 22.3081 11.4741 22.3018 15.3438C22.2975 19.1624 19.144 22.3127 15.3233 22.3159Z" fill="#D4A373"/><ellipse cx="15.2935" cy="15.1138" rx="10.7661" ry="10.7661" fill="white"/><path d="M15.2902 7.69141C18.0001 7.69141 20.2009 9.90586 20.2009 12.6398C20.2009 13.0669 20.1462 13.4804 20.0471 13.8768C19.9344 14.3143 19.7635 14.7312 19.5448 15.1139C19.3295 15.4898 19.0663 15.835 18.7622 16.1391C17.8737 17.0345 16.6468 17.5881 15.2936 17.5881V17.5232C15.2457 16.1118 14.6409 14.844 13.6977 13.9349C12.8296 13.0977 11.6677 12.5646 10.3896 12.5031C10.4238 11.1908 10.9672 10.0084 11.8249 9.14037C12.7066 8.24502 13.9335 7.69141 15.2902 7.69141ZM10.3828 22.5365C13.0928 22.5365 15.2936 20.322 15.2936 17.5881H10.3828V22.5365Z" fill="#D4A373"/></svg>`;

export type PayMapGoogleMapProps = {
    latitude: number;
    longitude: number;
};

export function PayMapGoogleMap({ latitude, longitude }: PayMapGoogleMapProps) {
    const { isLoaded, loadError } = useGoogleMapsLoader();

    const markerIcon = useMemo((): google.maps.Icon | undefined => {
        if (!isLoaded || typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) {
            return undefined;
        }
        const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MARKER_SVG)}`;
        return {
            url,
            scaledSize: new google.maps.Size(36, 48),
            anchor: new google.maps.Point(18, 46),
        };
    }, [isLoaded]);

    if (loadError) {
        return (
            <div className="flex h-full min-h-[240px] items-center justify-center p-4 text-center text-[13px] font-[Regular] text-[#707070]">
                Map could not be loaded.
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex h-full min-h-[240px] items-center justify-center p-4 text-center text-[13px] font-[Regular] text-[#707070]">
                Loading map…
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%", minHeight: 240 }}
            center={{ lat: latitude, lng: longitude }}
            zoom={15}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
            }}
        >
            <Marker position={{ lat: latitude, lng: longitude }} icon={markerIcon} />
        </GoogleMap>
    );
}
