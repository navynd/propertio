import { MarkerIcon, SearchIcon } from "../../../../assets/icons";
import { useEffect, useRef, useState } from "react";
import { Autocomplete, GoogleMap } from "@react-google-maps/api";
import { getGoogleMapsApiKey, useGoogleMapsLoader } from "../../../../hooks/useGoogleMapsLoader";

type PropertyLocationProps = {
    zone: string;
    city: string;
    fullAddress: string;
    onZoneChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onFullAddressChange: (value: string) => void;
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

const PropertyLocation = ({
    zone,
    city,
    fullAddress,
    onZoneChange,
    onCityChange,
    onFullAddressChange,
}: PropertyLocationProps) => {
    const googleMapsApiKey = getGoogleMapsApiKey();
    const { isLoaded } = useGoogleMapsLoader();

    const [searchAutocomplete, setSearchAutocomplete] = useState<AutocompleteInstance | null>(null);
    const [searchLocation, setSearchLocation] = useState(fullAddress || `${zone}, ${city}`.trim() || "");
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        const address = fullAddress?.trim();
        if (address) setSearchLocation(address);
    }, [fullAddress]);

    const applyGeocoderResult = (result?: GeocoderResult) => {
        if (!result) return;
        const nextZone = pickZoneFromComponents(result.address_components) || zone;
        const nextCity = pickCityFromComponents(result.address_components) || city;
        if (nextZone) onZoneChange(nextZone);
        if (nextCity) onCityChange(nextCity);
        if (result.formatted_address) {
            onFullAddressChange(result.formatted_address);
            setSearchLocation(result.formatted_address);
        }
        const loc = result.geometry?.location;
        if (loc) setMapCenter({ lat: loc.lat(), lng: loc.lng() });
    };

    const reverseGeocode = (lat: number, lng: number) => {
        if (!(window as any).google?.maps) return;
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: GeocoderResult[]) => {
            applyGeocoderResult(results?.[0]);
        });
    };

    const geocodeAddress = (address: string) => {
        if (!(window as any).google?.maps || !address.trim()) return;
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address }, (results: GeocoderResult[]) => {
            applyGeocoderResult(results?.[0]);
        });
    };

    return (
        <div className="flex flex-col gap-[12px]">
            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[20px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Location</h3>
                <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                    Zone location <span className="text-[#EA3934]">*</span>
                </label>
                <input
                    type="text"
                    value={zone}
                    readOnly
                    placeholder="Zone will auto-fill based on selected location"
                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F8F8F8] px-[12px] text-[13px] text-[#222] focus:outline-none"
                />
            </div>

            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[20px] p-[16px]">
                <h4 className="text-[20px] font-[Bold] text-[#222] text-center md:mb-[30px] mb-[16px]">
                    Pin location on map
                </h4>

                <div className="max-w-[360px] mx-auto md:mb-[20px] mb-[16px]">
                    <div className="h-[36px] rounded-full bg-[#F5F5F5] px-[12px] flex items-center gap-[8px]">
                        <SearchIcon width={14} height={14} />
                        {googleMapsApiKey && isLoaded ? (
                            <Autocomplete
                                onLoad={(instance) => setSearchAutocomplete(instance as unknown as AutocompleteInstance)}
                                onPlaceChanged={() => {
                                    const place = searchAutocomplete?.getPlace();
                                    const location = place?.geometry?.location;
                                    if (!location) return;
                                    const lat = location.lat();
                                    const lng = location.lng();
                                    const nextZone = pickZoneFromComponents(place?.address_components) || zone;
                                    const nextCity = pickCityFromComponents(place?.address_components) || city;
                                    onZoneChange(nextZone);
                                    onCityChange(nextCity);
                                    const formattedAddress =
                                        place?.formatted_address || place?.name || searchLocation;
                                    onFullAddressChange(formattedAddress);
                                    setSearchLocation(formattedAddress);
                                    setMapCenter({ lat, lng });
                                }}
                                options={{
                                    fields: ["formatted_address", "name", "geometry", "address_components"],
                                    types: ["geocode"],
                                }}
                                className="w-full"
                            >
                                <input
                                    type="text"
                                    value={searchLocation}
                                    onChange={(e) => {
                                        setSearchLocation(e.target.value);
                                        onFullAddressChange(e.target.value);
                                    }}
                                    onBlur={() => geocodeAddress(searchLocation)}
                                    placeholder="Search location"
                                    className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[12px] placeholder:font-[Regular] focus:outline-none"
                                />
                            </Autocomplete>
                        ) : (
                            <input
                                type="text"
                                value={searchLocation}
                                onChange={(e) => {
                                    setSearchLocation(e.target.value);
                                    onFullAddressChange(e.target.value);
                                }}
                                onBlur={() => geocodeAddress(searchLocation)}
                                placeholder="Search location"
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[12px] placeholder:font-[Regular] focus:outline-none"
                            />
                        )}
                    </div>
                </div>

                <div className="relative rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-[#EEF2F7] min-h-[360px] xl:w-[760px] lg:w-[550px] md:w-[550px] w-full mx-auto overflow-hidden">
                    {googleMapsApiKey && isLoaded ? (
                        <>
                            <GoogleMap
                                mapContainerStyle={{ width: "100%", height: "360px" }}
                                center={mapCenter}
                                zoom={14}
                                options={{ streetViewControl: false, fullscreenControl: false, mapTypeControl: false }}
                                onLoad={(map) => {
                                    mapRef.current = map;
                                }}
                                onDragEnd={() => {
                                    const center = mapRef.current?.getCenter?.();
                                    const lat = center?.lat?.();
                                    const lng = center?.lng?.();
                                    if (typeof lat === "number" && typeof lng === "number") {
                                        reverseGeocode(lat, lng);
                                    }
                                }}
                                onClick={(event) => {
                                    const lat = event.latLng?.lat?.();
                                    const lng = event.latLng?.lng?.();
                                    if (typeof lat === "number" && typeof lng === "number") {
                                        reverseGeocode(lat, lng);
                                    }
                                }}
                            />
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

export default PropertyLocation;
