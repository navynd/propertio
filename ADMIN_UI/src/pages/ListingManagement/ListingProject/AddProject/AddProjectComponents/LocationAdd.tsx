import { useEffect, useRef, useState } from "react";
import { Autocomplete, GoogleMap } from "@react-google-maps/api";
import { MarkerIcon, SearchIcon } from "../../../../../assets/icons";
import { getGoogleMapsApiKey, useGoogleMapsLoader } from "../../../../../hooks/useGoogleMapsLoader";
import { useToast } from "../../../../../context/ToastContext";
import { createToastNotify } from "../../../../../utils/toastNotify";

export type LocationFormValue = {
    zone: string;
    city: string;
    latitude: string;
    longitude: string;
    searchLocation: string;
    formattedAddress: string;
    placeId: string;
};

type LocationAddProps = {
    value: LocationFormValue;
    onChange: (value: LocationFormValue) => void;
    projectAddress: string;
    projectAddressPlaceId: string;
};

type PlaceResult = {
    formatted_address?: string;
    place_id?: string;
    name?: string;
    address_components?: Array<{ long_name?: string; types?: string[] }>;
    geometry?: { location?: { lat: () => number; lng: () => number } };
};

type GeocoderResult = {
    formatted_address?: string;
    place_id?: string;
    address_components?: Array<{ long_name?: string; types?: string[] }>;
    geometry?: { location?: { lat: () => number; lng: () => number } };
};

type AutocompleteInstance = {
    getPlace: () => PlaceResult;
};

const defaultCenter = { lat: 25.2048, lng: 55.2708 };

const pickZoneFromComponents = (components?: Array<{ long_name?: string; types?: string[] }>) => {
    if (!components?.length) return "";
    const preferredTypes = [
        "sublocality_level_1",
        "sublocality",
        "neighborhood",
        "locality",
        "administrative_area_level_2",
        "administrative_area_level_1",
    ];
    for (const type of preferredTypes) {
        const matched = components.find((component) => component.types?.includes(type));
        if (matched?.long_name) return matched.long_name;
    }
    return "";
};

const pickCityFromComponents = (components?: Array<{ long_name?: string; types?: string[] }>) => {
    if (!components?.length) return "";
    const preferredTypes = ["locality", "administrative_area_level_2", "administrative_area_level_1"];
    for (const type of preferredTypes) {
        const matched = components.find((component) => component.types?.includes(type));
        if (matched?.long_name) return matched.long_name;
    }
    return "";
};

const LocationAdd = ({ value, onChange, projectAddress, projectAddressPlaceId }: LocationAddProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const googleMapsApiKey = getGoogleMapsApiKey();
    const { isLoaded: isGoogleMapsLoaded } = useGoogleMapsLoader();
    const [searchAutocomplete, setSearchAutocomplete] = useState<AutocompleteInstance | null>(null);
    const mapRef = useRef<any>(null);
    const lastProjectAddressKeyRef = useRef<string>("");
    const latestValueRef = useRef(value);
    const lastReverseGeocodeKeyRef = useRef("");
    const shownLocationErrorsRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        latestValueRef.current = value;
    }, [value]);

    const showLocationKeyToast = (status: string) => {
        const key = `geocode-${status}`;
        if (shownLocationErrorsRef.current[key]) return;
        shownLocationErrorsRef.current[key] = true;
        toast.error(
            "Google Maps key/API issue",
            `Location geocoding failed (${status}). Check API key restrictions and ensure Geocoding API is enabled in Google Cloud Console.`
        );
    };

    useEffect(() => {
        if (googleMapsApiKey) return;
        const key = "missing-maps-key";
        if (shownLocationErrorsRef.current[key]) return;
        shownLocationErrorsRef.current[key] = true;
        toast.error(
            "Google Maps key missing",
            "Set `VITE_GOOGLE_MAPS_API_KEY` to use location search, zone detection, and map pinning."
        );
    }, [googleMapsApiKey]);

    const mapCenter =
        Number.isFinite(Number.parseFloat(value.latitude)) && Number.isFinite(Number.parseFloat(value.longitude))
            ? { lat: Number.parseFloat(value.latitude), lng: Number.parseFloat(value.longitude) }
            : defaultCenter;

    const updateFromGeocoderResult = (result?: GeocoderResult) => {
        const location = result?.geometry?.location;
        if (!location) return;
        const lat = location.lat();
        const lng = location.lng();
        const currentValue = latestValueRef.current;
        const zone = pickZoneFromComponents(result?.address_components) || currentValue.zone;
        const city = pickCityFromComponents(result?.address_components) || currentValue.city;
        onChange({
            ...currentValue,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            zone,
            city,
            formattedAddress: result?.formatted_address || currentValue.formattedAddress,
            placeId: result?.place_id || currentValue.placeId,
            searchLocation: result?.formatted_address || currentValue.searchLocation,
        });
    };

    const reverseGeocodeLatLng = (lat: number, lng: number) => {
        const geocoder = (window as any).google?.maps ? new (window as any).google.maps.Geocoder() : null;
        if (!geocoder) return;
        const formattedLat = lat.toFixed(6);
        const formattedLng = lng.toFixed(6);
        const reverseKey = `${formattedLat},${formattedLng}`;
        if (reverseKey === lastReverseGeocodeKeyRef.current) return;
        lastReverseGeocodeKeyRef.current = reverseKey;
        geocoder.geocode({ location: { lat, lng } }, (results: GeocoderResult[], status: string) => {
            const currentValue = latestValueRef.current;
            const first = results?.[0];
            if (status !== "OK") {
                showLocationKeyToast(status);
            }
            const zone = pickZoneFromComponents(first?.address_components) || currentValue.zone;
            const city = pickCityFromComponents(first?.address_components) || currentValue.city;
            onChange({
                ...currentValue,
                latitude: formattedLat,
                longitude: formattedLng,
                zone,
                city,
                formattedAddress: status === "OK" && first?.formatted_address ? first.formatted_address : currentValue.formattedAddress,
                placeId: status === "OK" && first?.place_id ? first.place_id : currentValue.placeId,
                searchLocation: status === "OK" && first?.formatted_address
                    ? first.formatted_address
                    : currentValue.searchLocation || `${formattedLat}, ${formattedLng}`,
            });
        });
    };

    useEffect(() => {
        if (!isGoogleMapsLoaded) return;
        const normalizedAddress = projectAddress.trim();
        const key = `${projectAddressPlaceId || ""}::${normalizedAddress}`;
        if ((!projectAddressPlaceId && !normalizedAddress) || key === lastProjectAddressKeyRef.current) return;

        const geocoder = (window as any).google?.maps ? new (window as any).google.maps.Geocoder() : null;
        if (!geocoder) return;

        lastProjectAddressKeyRef.current = key;
        if (projectAddressPlaceId) {
            geocoder.geocode({ placeId: projectAddressPlaceId }, (results: GeocoderResult[], status: string) => {
                if (status !== "OK") {
                    showLocationKeyToast(status);
                    return;
                }
                updateFromGeocoderResult(results?.[0]);
            });
            return;
        }

        geocoder.geocode({ address: normalizedAddress }, (results: GeocoderResult[], status: string) => {
            if (status !== "OK") {
                showLocationKeyToast(status);
                return;
            }
            updateFromGeocoderResult(results?.[0]);
        });
    }, [isGoogleMapsLoaded, projectAddress, projectAddressPlaceId]);

    return (
        <div className="flex flex-col gap-[12px]">
            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Location</h3>
                <div>
                    <div className="md:col-span-2">
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Zone location <span className="text-[#EA3934]">*</span>
                        </label>
                        <input
                            type="text"
                            value={value.zone}
                            readOnly
                            placeholder="Zone will auto-fill based on selected location"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F8F8F8] px-[12px] text-[13px] text-[#222] focus:outline-none"
                        />
                    </div>
                    {/* <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Latitude / Longitude</label>
                        <input
                            type="text"
                            value={
                                value.latitude && value.longitude
                                    ? `${value.latitude}, ${value.longitude}`
                                    : ""
                            }
                            readOnly
                            placeholder="Drag map or search place"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F8F8F8] px-[12px] text-[13px] text-[#222] focus:outline-none"
                        />
                    </div> */}
                </div>
            </div>

            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
                <h4 className="text-[20px] font-[Bold] text-[#222] text-center md:mb-[30px] mb-[16px]">Pin location on map</h4>

                <div className="max-w-[360px] mx-auto md:mb-[20px] mb-[16px]">
                    <div className="h-[36px] rounded-full bg-[#F5F5F5] px-[12px] flex items-center gap-[8px]">
                        <SearchIcon width={14} height={14} />
                        {googleMapsApiKey && isGoogleMapsLoaded ? (
                            <Autocomplete
                                onLoad={(instance) => setSearchAutocomplete(instance as unknown as AutocompleteInstance)}
                                onPlaceChanged={() => {
                                    const place = searchAutocomplete?.getPlace();
                                    const location = place?.geometry?.location;
                                    if (!location) return;
                                    const lat = location.lat();
                                    const lng = location.lng();
                                    const zone = pickZoneFromComponents(place?.address_components) || value.zone;
                                    const city = pickCityFromComponents(place?.address_components) || value.city;
                                    onChange({
                                        ...value,
                                        latitude: lat.toFixed(6),
                                        longitude: lng.toFixed(6),
                                        zone,
                                        city,
                                        formattedAddress: place?.formatted_address || place?.name || value.formattedAddress,
                                        placeId: place?.place_id || value.placeId,
                                        searchLocation: place?.formatted_address || place?.name || value.searchLocation,
                                    });
                                }}
                                options={{
                                    fields: [
                                        "formatted_address",
                                        "name",
                                        "place_id",
                                        "geometry",
                                        "address_components",
                                    ],
                                    types: ["geocode"],
                                }}
                                className="w-full"
                            >
                                <input
                                    type="text"
                                    value={value.searchLocation}
                                    onChange={(e) =>
                                        onChange({ ...value, searchLocation: e.target.value })
                                    }
                                    placeholder="Search location"
                                    className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[12px] placeholder:font-[Regular] focus:outline-none"
                                />
                            </Autocomplete>
                        ) : (
                            <input
                                type="text"
                                value={value.searchLocation}
                                onChange={(e) =>
                                    onChange({ ...value, searchLocation: e.target.value })
                                }
                                placeholder="Search location"
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[12px] placeholder:font-[Regular] focus:outline-none"
                            />
                        )}
                    </div>
                </div>

                <p className="text-center text-[12px] text-[#707070] mb-[18px]">
                    Drag map, click on map, or search place to update latitude, longitude and zone.
                </p>

                <div className="relative rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-[#EEF2F7] min-h-[360px] xl:w-[760px] lg:w-[550px] md:w-[550px] w-full mx-auto overflow-hidden">
                    {googleMapsApiKey && isGoogleMapsLoaded ? (
                        <>
                            <GoogleMap
                                mapContainerStyle={{ width: "100%", height: "360px" }}
                                center={mapCenter}
                                zoom={14}
                                options={{
                                    streetViewControl: false,
                                    fullscreenControl: false,
                                    mapTypeControl: false,
                                }}
                                onLoad={(map) => {
                                    mapRef.current = map;
                                }}
                                onDragEnd={() => {
                                    const center = mapRef.current?.getCenter?.();
                                    const lat = center?.lat?.();
                                    const lng = center?.lng?.();
                                    if (typeof lat === "number" && typeof lng === "number") {
                                        reverseGeocodeLatLng(lat, lng);
                                    }
                                }}
                                onIdle={() => {
                                    const center = mapRef.current?.getCenter?.();
                                    const lat = center?.lat?.();
                                    const lng = center?.lng?.();
                                    if (typeof lat === "number" && typeof lng === "number") {
                                        reverseGeocodeLatLng(lat, lng);
                                    }
                                }}
                                onClick={(event) => {
                                    const lat = event.latLng?.lat?.();
                                    const lng = event.latLng?.lng?.();
                                    if (typeof lat === "number" && typeof lng === "number") {
                                        reverseGeocodeLatLng(lat, lng);
                                    }
                                }}
                            >
                                {/* Marker icon stays centered while user moves map. */}
                            </GoogleMap>
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <MarkerIcon width={31} height={41} />
                            </div>
                        </>
                    ) : (
                        <div className="h-[360px] w-full flex items-center justify-center text-[13px] text-[#707070]">
                            Add `VITE_GOOGLE_MAPS_API_KEY` to enable map location picker.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationAdd;
