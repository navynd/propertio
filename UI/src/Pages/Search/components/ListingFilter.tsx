import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Slider,
  Checkbox,
  Divider,
  IconButton,
} from "@mui/material";
import { SearchIcon, FilterRemovalIcon, VerifiedBadgeIcon, DownArrowIconBlack, CheckmarkIcon, ModalCloseIcon, ThreeDotIcon, ReportFlagIcon, ShareIcon } from "../../../Components/parts/icon";
import "../../../assets/styles/SearchListing.scss";
import {
  getListingFilterMasterData,
  type AmenityMaster,
  type FurnishedStatusMaster,
  type ListingSearchCityMaster,
  type ListingTypeMaster,
  type NamedValueMaster,
  type PropertyTypeMaster,
} from "../../../services/apiService";

type BedsBathOption = {
  label: string;
  value: number;
};

const isBedroomRelatedChip = (filterLabel: string) => {
  const t = filterLabel.trim();
  return /^\d+\s+bedroom$/i.test(t) || t.toLowerCase() === "studio";
};

const AED_PER_MILLION = 1_000_000;

/**
 * Price range UI stores values in "millions AED" (e.g. 43 -> 43,000,000 AED).
 * The text boxes should show the full AED number for user clarity.
 */
function priceRangeInternalToAed(value: number): number {
  // If value is already a large AED amount, keep it.
  return value > 10_000 ? value : value * AED_PER_MILLION;
}

function priceRangeAedToInternal(aed: number): number {
  // If internal looks like full AED already, keep as-is.
  // Otherwise convert AED -> millions AED.
  return aed > 10_000 ? aed / AED_PER_MILLION : aed;
}

type FilterVisibilityKey =
  | "search"
  | "appliedFilters"
  | "verifiedProperties"
  | "postHandover"
  | "dldStatus"
  | "propertyFor"
  | "locations"
  | "priceRange"
  | "propertyType"
  | "bedrooms"
  | "bathrooms"
  | "deliveryDate"
  | "postedBy"
  | "furnishing"
  | "amenities"
  | "propertySize"
  | "virtualViewings"
  | "nearbySearch";

interface ListingFilterProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  appliedFilters?: string[];
  onFiltersChange?: (filters: string[]) => void;
  bedrooms?: number;
  onBedroomsChange?: (value: number) => void;
  bathrooms?: number;
  onBathroomsChange?: (value: number) => void;
  furnishing?: string;
  onFurnishingChange?: (value: string) => void;
  amenities?: string[];
  onAmenitiesChange?: (values: string[]) => void;
  nearbySearchEnabled?: boolean;
  onNearbySearchEnabledChange?: (checked: boolean) => void;
  onlyCommercialProperties?: boolean;
  onOnlyCommercialPropertiesChange?: (checked: boolean) => void;
  category?: string;
  onCategoryChange?: (value: string) => void;
  verifiedProperties?: boolean;
  onVerifiedChange?: (checked: boolean) => void;
  postHandover?: boolean;
  onPostHandoverChange?: (checked: boolean) => void;
  dldStatus?: boolean;
  onDldStatusChange?: (checked: boolean) => void;
  propertyFor?: string[];
  onPropertyForChange?: (values: string[]) => void;
  priceRange?: [number, number];
  onPriceRangeChange?: (range: [number, number]) => void;
  /** When set, controls Posted by (API `postedBy` value); use with `onPostedByChange`. */
  postedBy?: string;
  onPostedByChange?: (value: string) => void;
  /** When set, controls min sqft; use with `onMinSqftChange`. */
  minSqft?: number | null;
  onMinSqftChange?: (value: number | null) => void;
  /** When set, controls max sqft; use with `onMaxSqftChange`. */
  maxSqft?: number | null;
  onMaxSqftChange?: (value: number | null) => void;
  propertyTypes?: string[];
  onPropertyTypesChange?: (types: string[]) => void;
  hiddenFilters?: FilterVisibilityKey[];
  /** Called after Clear all (chips + local resets); parent can sync URL/API (e.g. clearAll search payload). */
  onFiltersCleared?: () => void;
  /** When true, do not auto-select the first listing type (e.g. new-project search has no listing-type filter). */
  skipListingTypeDefault?: boolean;
  /** Master `value` for delivery date; use with `onSelectedDeliveryDateChange` for project search API. */
  selectedDeliveryDate?: string;
  onSelectedDeliveryDateChange?: (value: string) => void;
  /** From `propertylocations` or `projectlocations` master; single-select maps to API `location` ObjectId. */
  listingSearchCities?: ListingSearchCityMaster[];
  selectedListingLocationId?: string | null;
  onListingLocationIdChange?: (id: string | null) => void;
}

function ListingFilter({
  searchQuery: externalSearchQuery,
  onSearchChange,
  appliedFilters: externalAppliedFilters,
  onFiltersChange,
  bedrooms: externalBedrooms,
  onBedroomsChange,
  bathrooms: externalBathrooms,
  onBathroomsChange,
  furnishing: externalFurnishing,
  onFurnishingChange,
  amenities: externalAmenities,
  onAmenitiesChange,
  nearbySearchEnabled: externalNearbySearchEnabled,
  onNearbySearchEnabledChange,
  onlyCommercialProperties: externalOnlyCommercialProperties,
  onOnlyCommercialPropertiesChange,
  category: externalCategory,
  onCategoryChange,
  verifiedProperties: externalVerifiedProperties,
  onVerifiedChange,
  postHandover: externalPostHandover,
  onPostHandoverChange,
  dldStatus: externalDldStatus,
  onDldStatusChange,
  propertyFor: externalPropertyFor,
  onPropertyForChange,
  priceRange: externalPriceRange,
  onPriceRangeChange,
  postedBy: externalPostedBy,
  onPostedByChange,
  minSqft: externalMinSqft,
  onMinSqftChange,
  maxSqft: externalMaxSqft,
  onMaxSqftChange,
  propertyTypes: externalPropertyTypes,
  onPropertyTypesChange,
  hiddenFilters,
  onFiltersCleared,
  skipListingTypeDefault,
  selectedDeliveryDate: externalSelectedDeliveryDate,
  onSelectedDeliveryDateChange,
  listingSearchCities,
  selectedListingLocationId,
  onListingLocationIdChange,
}: ListingFilterProps) {
  // Internal state if not controlled
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>("");
  const [internalAppliedFilters, setInternalAppliedFilters] = useState<string[]>([]);
  const [internalVerifiedProperties, setInternalVerifiedProperties] = useState<boolean>(false);
  const [internalPostHandover, setInternalPostHandover] = useState<boolean>(false);
  const [internalDldStatus, setInternalDldStatus] = useState<boolean>(false);
  const [internalPropertyFor, setInternalPropertyFor] = useState<string[]>([]);
  const [internalPriceRange, setInternalPriceRange] = useState<[number, number]>([3, 30]);
  // const [priceRangeBounds, setPriceRangeBounds] = useState<[number, number]>([0, 0]); // keep for later enable
  const [internalPropertyTypes, setInternalPropertyTypes] = useState<string[]>([]);
  const [internalPostedBy, setInternalPostedBy] = useState<string>("");
  const [internalFurnishing, setInternalFurnishing] = useState<string>("");
  const [internalAmenities, setInternalAmenities] = useState<string[]>([]);
  const [internalVirtualViewings, setInternalVirtualViewings] = useState<string>("");
  const [internalLocations, setInternalLocations] = useState<string[]>([]);
  const [internalDeliveryDate, setInternalDeliveryDate] = useState<string>("");
  const [deliveryDateOptions, setDeliveryDateOptions] = useState<
    NamedValueMaster[]
  >([]);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [isMinAreaDropdownOpen, setIsMinAreaDropdownOpen] = useState<boolean>(false);
  const [maxArea, setMaxArea] = useState<number | null>(null);
  const [isMaxAreaDropdownOpen, setIsMaxAreaDropdownOpen] = useState<boolean>(false);
  const [showMorePropertyTypes, setShowMorePropertyTypes] = useState<boolean>(false);
  const [showMorePostedBy, setShowMorePostedBy] = useState<boolean>(false);
  const [showMoreFurnishing, setShowMoreFurnishing] = useState<boolean>(false);
  const [showMoreAmenities, setShowMoreAmenities] = useState<boolean>(false);
  const [showMoreVirtualViewings, setShowMoreVirtualViewings] = useState<boolean>(false);
  const [internalBedrooms, setInternalBedrooms] = useState<number>(0);
  const [internalBathrooms, setInternalBathrooms] = useState<number>(0);
  const [internalPropertySize, setInternalPropertySize] = useState<[number, number]>([0, 0]);
  const [expandedSections, setExpandedSections] = useState<{
    propertyFor: boolean;
    priceRange: boolean;
    propertyType: boolean;
    bedrooms: boolean;
    bathrooms: boolean;
    postedBy: boolean;
    furnishing: boolean;
    amenities: boolean;
    propertySize: boolean;
    virtualViewings: boolean;
    locations: boolean;
    deliveryDate: boolean;
  }>({
    propertyFor: false,
    priceRange: false,
    propertyType: false,
    bedrooms: false,
    bathrooms: false,
    postedBy: false,
    furnishing: false,
    amenities: false,
    propertySize: false,
    virtualViewings: false,
    locations: false,
    deliveryDate: false,
  });

  // Use external props if provided, otherwise use internal state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const appliedFilters = externalAppliedFilters !== undefined ? externalAppliedFilters : internalAppliedFilters;
  const appliedFiltersRef = useRef<string[]>(appliedFilters);
  appliedFiltersRef.current = appliedFilters;

  const bedrooms = externalBedrooms !== undefined ? externalBedrooms : internalBedrooms;
  const bathrooms = externalBathrooms !== undefined ? externalBathrooms : internalBathrooms;
  const furnishing = externalFurnishing !== undefined ? externalFurnishing : internalFurnishing;
  const amenities = externalAmenities !== undefined ? externalAmenities : internalAmenities;
  const verifiedProperties = externalVerifiedProperties !== undefined ? externalVerifiedProperties : internalVerifiedProperties;
  const postHandover = externalPostHandover !== undefined ? externalPostHandover : internalPostHandover;
  const dldStatus = externalDldStatus !== undefined ? externalDldStatus : internalDldStatus;
  const propertyFor = externalPropertyFor !== undefined ? externalPropertyFor : internalPropertyFor;
  const priceRange = externalPriceRange !== undefined ? externalPriceRange : internalPriceRange;
  const propertyTypes = externalPropertyTypes !== undefined ? externalPropertyTypes : internalPropertyTypes;
  const postedByValue =
    externalPostedBy !== undefined ? externalPostedBy : internalPostedBy;
  const minAreaEffective =
    externalMinSqft !== undefined ? externalMinSqft : minArea;
  const maxAreaEffective =
    externalMaxSqft !== undefined ? externalMaxSqft : maxArea;
  const deliveryDateEffective =
    externalSelectedDeliveryDate !== undefined
      ? externalSelectedDeliveryDate
      : internalDeliveryDate;

  const setBedroomsValue = (value: number) => {
    if (onBedroomsChange) onBedroomsChange(value);
    else setInternalBedrooms(value);
  };
  const setBathroomsValue = (value: number) => {
    if (onBathroomsChange) onBathroomsChange(value);
    else setInternalBathrooms(value);
  };
  const setFurnishingValue = (value: string) => {
    if (onFurnishingChange) onFurnishingChange(value);
    else setInternalFurnishing(value);
  };
  const setAmenitiesValue = (values: string[]) => {
    if (onAmenitiesChange) onAmenitiesChange(values);
    else setInternalAmenities(values);
  };

  useEffect(() => {
    let mounted = true;

    const loadMasterFilters = async () => {
      try {
        const resp = await getListingFilterMasterData();
        if (!mounted) return;

        const listingTypes = (resp.data.listingTypes ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        const propertyTypesMaster = (resp.data.propertyTypes ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        const postedBy = (resp.data.postedBy ?? []).filter(
          (item) => !!item?.value?.trim() && !!item?.name?.trim()
        );
        const furnishedStatus = (resp.data.furnishedStatus ?? []).filter(
          (item) => !!item?.value?.trim() && !!item?.name?.trim()
        );
        const amenities = (resp.data.amenities ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        const areaSizes = (resp.data.sqftAreaSizes ?? [])
          .map((item) => Number(item?.value))
          .filter((num) => !Number.isNaN(num));
        const virtualViewings = (resp.data.virtualViewingTypes ?? []).filter(
          (item) => !!item?.value?.trim() && !!item?.name?.trim()
        );
        const deliveryDates = (resp.data.deliveryDates ?? []).filter(
          (item) => !!item?.value?.trim() && !!item?.name?.trim()
        );
        // Price range master-data binding disabled for now (kept for later enable):
        // const priceValues = (resp.data.priceRange ?? [])
        //   .map((item) => Number(item?.value))
        //   .filter((num) => !Number.isNaN(num));

        setPropertyForOptions(listingTypes);
        setPropertyTypeOptions(propertyTypesMaster);
        setPostedByOptions(postedBy);
        setFurnishingOptions(furnishedStatus);
        setAmenitiesOptions(amenities);
        setPropertySizeOptions(areaSizes);
        setVirtualViewingOptions(virtualViewings);
        setDeliveryDateOptions(deliveryDates);
        // if (priceValues.length > 1) {
        //   const minValue = priceValues[0];
        //   const maxValue = priceValues[priceValues.length - 1];
        //   setPriceRangeBounds([minValue, maxValue]);
        //   if (!externalPriceRange) {
        //     setInternalPriceRange([minValue, maxValue]);
        //   }
        // }

        // Only listing type may be defaulted (see effect below). No other master-data defaults.
      } catch {
        // Keep options empty on API failure.
      }
    };

    loadMasterFilters();
    return () => {
      mounted = false;
    };
  }, []);

  const setAppliedFiltersState = (
    newFilters: string[] | ((prev: string[]) => string[])
  ) => {
    if (onFiltersChange) {
      const next =
        typeof newFilters === "function"
          ? newFilters(appliedFiltersRef.current)
          : newFilters;
      onFiltersChange(next);
    } else if (typeof newFilters === "function") {
      setInternalAppliedFilters(newFilters);
    } else {
      setInternalAppliedFilters(newFilters);
    }
  };

  const buildPropertySizeChipLabel = (
    nextMin: number | null,
    nextMax: number | null
  ): string | null => {
    if (nextMin != null && nextMax != null) {
      return `Property size: ${nextMin} – ${nextMax} sqft`;
    }
    if (nextMin != null) {
      return `Property size: from ${nextMin} sqft`;
    }
    if (nextMax != null) {
      return `Property size: up to ${nextMax} sqft`;
    }
    return null;
  };

  const updatePropertySizeAppliedChips = (
    nextMin: number | null,
    nextMax: number | null
  ) => {
    const chip = buildPropertySizeChipLabel(nextMin, nextMax);
    setAppliedFiltersState((prev) => {
      const base = prev.filter(
        (f) => !f.trim().toLowerCase().startsWith("property size:")
      );
      return chip ? [...base, chip] : base;
    });
  };

  const updateAppliedFilters = (label: string, checked: boolean) => {
    setAppliedFiltersState(
      checked
        ? appliedFilters.includes(label)
          ? appliedFilters
          : [...appliedFilters, label]
        : appliedFilters.filter((f) => f !== label)
    );
  };

  /* Nearby location chip — not in current listing filter design; re-enable when design adds it.
  const handleNearbySearchChipClick = () => {
    const next = !nearbySearchEnabled;
    if (onNearbySearchEnabledChange) {
      onNearbySearchEnabledChange(next);
    } else {
      setInternalNearbySearch(next);
    }
    updateAppliedFilters("Search near by", next);
  };
  */

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearchQuery(value);
    }
  };

  const handleFilterRemove = (index: number) => {
    const label = appliedFilters[index];
    const newFilters = appliedFilters.filter((_, i) => i !== index);
    const removingNumericBedroom = /^\d+\s+bedroom$/i.test(label.trim());
    const removingStudioChip = label.trim().toLowerCase() === "studio";

    // Sync back to individual filter states
    const listingTypeMatch = propertyForOptions.find((o) => o.name === label);
    if (listingTypeMatch) {
      // "Property for" is required. Do not allow clearing it from chips.
      return;
    }

    const propertyTypeMatch = propertyTypeOptions.find((o) => o.name === label);
    if (propertyTypeMatch) {
      const newTypes: string[] = [];
      if (onPropertyTypesChange) {
        onPropertyTypesChange(newTypes);
      } else {
        setInternalPropertyTypes(newTypes);
      }
    }

    if (postedByOptions.some((o) => o.name === label)) {
      if (onPostedByChange) {
        onPostedByChange("");
      } else {
        setInternalPostedBy("");
      }
    }

    if (label.trim().toLowerCase().startsWith("property size:")) {
      if (onMinSqftChange) {
        onMinSqftChange(null);
      } else {
        setMinArea(null);
      }
      if (onMaxSqftChange) {
        onMaxSqftChange(null);
      } else {
        setMaxArea(null);
      }
    }

    if (furnishingOptions.some((o) => o.name === label)) {
      setFurnishingValue("");
    }

    const amenityMatch =
      amenitiesOptions.find((o) => o.name === label) ||
      amenitiesOptions.find((o) => o._id === label);
    if (amenityMatch?._id) {
      setAmenitiesValue(amenities.filter((v) => v !== amenityMatch._id));
    }

    if (removingNumericBedroom || removingStudioChip) {
      setBedroomsValue(0);
    }

    if (/^\d+\s+bathroom$/i.test(label.trim())) {
      setBathroomsValue(0);
    }

    if (virtualViewingOptions.some((o) => o.name === label)) {
      setInternalVirtualViewings("");
    }

    const masterLocationNames =
      listingSearchCities?.map((c) => c.displayName) ?? [];
    if (masterLocationNames.includes(label) && onListingLocationIdChange) {
      onListingLocationIdChange(null);
    }

    if (internalLocations.includes(label)) {
      setInternalLocations((prev) => prev.filter((v) => v !== label));
    }

    if (deliveryDateOptions.some((o) => o.name === label)) {
      if (onSelectedDeliveryDateChange) {
        onSelectedDeliveryDateChange("");
      } else {
        setInternalDeliveryDate("");
      }
    }

    if (label === "Verified properties") {
      if (onVerifiedChange) {
        onVerifiedChange(false);
      } else {
        setInternalVerifiedProperties(false);
      }
    }

    if (label.trim() === "Search near by") {
      onNearbySearchEnabledChange?.(false);
    }

    if (label === "Post-handover") {
      if (onPostHandoverChange) {
        onPostHandoverChange(false);
      } else {
        setInternalPostHandover(false);
      }
    }

    if (label === "DLD Registered") {
      if (onDldStatusChange) {
        onDldStatusChange(false);
      } else {
        setInternalDldStatus(false);
      }
    }

    let filtersToApply = newFilters;
    if (
      removingNumericBedroom &&
      !filtersToApply.some((f) => f.trim().toLowerCase() === "studio")
    ) {
      filtersToApply = [...filtersToApply, "Studio"];
    }
    setAppliedFiltersState(filtersToApply);
  };

  const setSingleAppliedFilter = (allLabels: string[], nextLabel: string | null) => {
    setAppliedFiltersState([
      ...appliedFilters.filter((f) => !allLabels.includes(f)),
      ...(nextLabel ? [nextLabel] : []),
    ]);
  };

  const handleClearAll = () => {
    // Clear applied filters
    setAppliedFiltersState(requiredPropertyForLabel ? [requiredPropertyForLabel] : []);

    if (onSearchChange) {
      onSearchChange("");
    } else {
      setInternalSearchQuery("");
    }

    if (onNearbySearchEnabledChange) {
      onNearbySearchEnabledChange(false);
    }

    if (onOnlyCommercialPropertiesChange) {
      onOnlyCommercialPropertiesChange(false);
    }

    if (onCategoryChange) {
      onCategoryChange("All");
    }

    // Reset switches / checkboxes
    if (onVerifiedChange) {
      onVerifiedChange(false);
    } else {
      setInternalVerifiedProperties(false);
    }

    if (onPostHandoverChange) {
      onPostHandoverChange(false);
    } else {
      setInternalPostHandover(false);
    }

    if (onDldStatusChange) {
      onDldStatusChange(false);
    } else {
      setInternalDldStatus(false);
    }

    // "Property for" is required. Do not clear it.

    if (onPriceRangeChange) {
      onPriceRangeChange([3,30]);
      // onPriceRangeChange(priceRangeBounds);
    } else {
      setInternalPriceRange([3,30]);
      // setInternalPriceRange(priceRangeBounds);
    }

    if (onPropertyTypesChange) {
      onPropertyTypesChange([]);
    } else {
      setInternalPropertyTypes([]);
    }

    if (onPostedByChange) {
      onPostedByChange("");
    } else {
      setInternalPostedBy("");
    }

    if (onMinSqftChange) {
      onMinSqftChange(null);
    } else {
      setMinArea(null);
    }
    if (onMaxSqftChange) {
      onMaxSqftChange(null);
    } else {
      setMaxArea(null);
    }

    onListingLocationIdChange?.(null);

    setFurnishingValue("");
    setAmenitiesValue([]);
    setInternalVirtualViewings("");
    setInternalLocations([]);
    setBedroomsValue(0);
    setBathroomsValue(0);
    if (onSelectedDeliveryDateChange) {
      onSelectedDeliveryDateChange("");
    } else {
      setInternalDeliveryDate("");
    }
    onFiltersCleared?.();
  };

  const handleVerifiedChange = (checked: boolean) => {
    if (onVerifiedChange) {
      onVerifiedChange(checked);
    } else {
      setInternalVerifiedProperties(checked);
    }
    updateAppliedFilters("Verified properties", checked);
  };

  const handlePostHandoverChange = (checked: boolean) => {
    if (onPostHandoverChange) {
      onPostHandoverChange(checked);
    } else {
      setInternalPostHandover(checked);
    }
    updateAppliedFilters("Post-handover", checked);
  };

  const handleDldStatusChange = (checked: boolean) => {
    if (onDldStatusChange) {
      onDldStatusChange(checked);
    } else {
      setInternalDldStatus(checked);
    }
    updateAppliedFilters("DLD Registered", checked);
  };

  const handlePropertyForChange = (
    value: string,
    checked: boolean,
    label: string
  ) => {
    const setPropertyForValues = (newValues: string[]) => {
      if (onPropertyForChange) {
        onPropertyForChange(newValues);
      } else {
        setInternalPropertyFor(newValues);
      }
    };
    // Listing type is required: cannot clear the only selection (uncheck).
    if (
      !checked &&
      propertyFor.length === 1 &&
      propertyFor[0] === value
    ) {
      return;
    }
    const newValues = checked ? [value] : [];
    setPropertyForValues(newValues);
    setAppliedFiltersState([
      ...appliedFilters.filter((f) => !propertyForOptions.some((o) => o.name === f)),
      ...(checked ? [label] : []),
    ]);
  };

  const handlePriceRangeChange = (_event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    if (onPriceRangeChange) {
      onPriceRangeChange(range);
    } else {
      setInternalPriceRange(range);
    }
  };

  const handlePriceInputChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const newRange: [number, number] = [...priceRange] as [number, number];
    newRange[index] = numValue;
    if (onPriceRangeChange) {
      onPriceRangeChange(newRange);
    } else {
      setInternalPriceRange(newRange);
    }
  };

  const clampPriceRangeInternal = (nextInternal: number): number => {
    const minInternal = priceRange[0];
    const maxInternal = priceRange[1];
    if (minInternal <= maxInternal) {
      return Math.min(Math.max(nextInternal, minInternal), maxInternal);
    }
    // Safety: swap if range is inverted for any reason.
    return Math.min(Math.max(nextInternal, maxInternal), minInternal);
  };

  const handlePropertyTypeChange = (id: string, checked: boolean, label: string) => {
    const newTypes = checked ? [id] : [];
    if (onPropertyTypesChange) {
      onPropertyTypesChange(newTypes);
    } else {
      setInternalPropertyTypes(newTypes);
    }
    setAppliedFiltersState([
      ...appliedFilters.filter((f) => !propertyTypeOptions.some((o) => o.name === f)),
      ...(checked ? [label] : []),
    ]);
  };

  const handleLocationChange = (value: string, checked: boolean) => {
    handleArrayFilterChange(internalLocations, setInternalLocations, value, checked);
  };

  const useMasterListingLocations =
    (listingSearchCities?.length ?? 0) > 0 && !!onListingLocationIdChange;

  const handleListingSearchCityToggle = (
    city: ListingSearchCityMaster,
    checked: boolean
  ) => {
    if (!onListingLocationIdChange || !listingSearchCities?.length) return;
    const names = listingSearchCities.map((c) => c.displayName);
    if (checked) {
      onListingLocationIdChange(city._id);
      setAppliedFiltersState((prev) => [
        ...prev.filter((f) => !names.includes(f)),
        city.displayName,
      ]);
    } else {
      onListingLocationIdChange(null);
      setAppliedFiltersState((prev) => prev.filter((f) => f !== city.displayName));
    }
  };

  const handleArrayFilterChange = (
    currentValues: string[],
    setValues: (values: string[]) => void,
    value: string,
    checked: boolean
  ) => {
    let newValues: string[];
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter((v) => v !== value);
    }
    setValues(newValues);
    updateAppliedFilters(value, checked);
  };

  const handleBedroomChange = (value: number) => {
    let newFilters = appliedFilters.filter((f) => !isBedroomRelatedChip(f));

    if (value !== 0) {
      newFilters = [...newFilters, `${value} bedroom`];
    } else {
      newFilters = [...newFilters, "Studio"];
    }

    setAppliedFiltersState(newFilters);
    setBedroomsValue(value);
  };

  const handleBathroomChange = (value: number) => {
    // Remove old bathroom filter if exists
    const oldBathroomFilter = appliedFilters.find((f) => f.includes("bathroom"));
    let newFilters = oldBathroomFilter
      ? appliedFilters.filter((f) => f !== oldBathroomFilter)
      : appliedFilters;

    // Add new bathroom filter if value exists
    if (value) {
      const bathroomLabel = `${value} bathroom`;
      newFilters = [...newFilters, bathroomLabel];
    }

    setAppliedFiltersState(newFilters);
    setBathroomsValue(value);
  };

  const handleDeliveryDateChange = (option: NamedValueMaster) => {
    const deliveryNames = deliveryDateOptions.map((o) => o.name);
    const newFilters = appliedFilters.filter((f) => !deliveryNames.includes(f));
    setAppliedFiltersState([...newFilters, option.name]);
    if (onSelectedDeliveryDateChange) {
      onSelectedDeliveryDateChange(option.value);
    } else {
      setInternalDeliveryDate(option.value);
    }
  };

  const handleAccordionChange = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const [propertyForOptions, setPropertyForOptions] = useState<
    ListingTypeMaster[]
  >([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<
    PropertyTypeMaster[]
  >([]);

  const requiredPropertyForLabel =
    propertyFor.length > 0
      ? propertyForOptions.find((o) => o._id === propertyFor[0])?.name ?? null
      : null;

  useEffect(() => {
    if (skipListingTypeDefault) return;
    if (propertyFor.length > 0 || propertyForOptions.length === 0) return;
    const first = propertyForOptions[0];
    if (!first?._id?.trim() || !first?.name?.trim()) return;

    if (onPropertyForChange) {
      onPropertyForChange([first._id]);
    } else {
      setInternalPropertyFor([first._id]);
    }

    const listingNames = propertyForOptions.map((o) => o.name);
    setAppliedFiltersState((prev) => {
      const withoutListing = prev.filter((f) => !listingNames.includes(f));
      return [...withoutListing, first.name];
    });
    // setAppliedFiltersState is recreated each render; omitting avoids infinite loops once listing type is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyForOptions, propertyFor.length, onPropertyForChange, skipListingTypeDefault]);

  useEffect(() => {
    if (propertyForOptions.length === 0) return;

    const hasBedroomSelection =
      bedrooms > 0 || appliedFilters.some(isBedroomRelatedChip);
    const hasBathroomSelection =
      bathrooms > 0 ||
      appliedFilters.some((f) => /^\d+\s+bathroom$/i.test(f.trim()));

    setExpandedSections((prev) => ({
      ...prev,
      propertyFor: propertyFor.length > 0,
      propertyType: propertyTypes.length > 0,
      bedrooms: hasBedroomSelection,
      bathrooms: hasBathroomSelection,
      postedBy: !!postedByValue,
      furnishing: !!furnishing,
      amenities: amenities.length > 0,
      propertySize:
        minAreaEffective !== null || maxAreaEffective !== null,
      virtualViewings: !!internalVirtualViewings,
      locations: useMasterListingLocations
        ? !!selectedListingLocationId
        : internalLocations.length > 0,
      deliveryDate: !!deliveryDateEffective,
    }));
  }, [
    propertyForOptions.length,
    appliedFilters,
    propertyFor,
    propertyTypes,
    bedrooms,
    bathrooms,
    furnishing,
    amenities,
    postedByValue,
    internalVirtualViewings,
    minAreaEffective,
    maxAreaEffective,
    internalLocations,
    deliveryDateEffective,
    useMasterListingLocations,
    selectedListingLocationId,
  ]);

  const locationOptions = [
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
  ];

  const visiblePropertyTypes = showMorePropertyTypes
    ? propertyTypeOptions
    : propertyTypeOptions.slice(0, 4);

  const [postedByOptions, setPostedByOptions] = useState<NamedValueMaster[]>(
    []
  );

  const [furnishingOptions, setFurnishingOptions] = useState<
    FurnishedStatusMaster[]
  >([]);

  const [amenitiesOptions, setAmenitiesOptions] = useState<AmenityMaster[]>([]);

  const visibleAmenities = showMoreAmenities
    ? amenitiesOptions
    : amenitiesOptions.slice(0, 4);

  const visiblePostedBy = showMorePostedBy
    ? postedByOptions
    : postedByOptions.slice(0, 4);

  const visibleFurnishing = showMoreFurnishing
    ? furnishingOptions
    : furnishingOptions.slice(0, 4);

  const [virtualViewingOptions, setVirtualViewingOptions] = useState<
    NamedValueMaster[]
  >([]);

  const [propertySizeOptions, setPropertySizeOptions] = useState<number[]>([]);

  const bedroomOptions: BedsBathOption[] = [
    { label: "Studio", value: 0 },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "7", value: 7 },
  ];
  const bathroomOptions: BedsBathOption[] = [
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "7", value: 7 },
  ];

  const visibleVirtualViewings = showMoreVirtualViewings
    ? virtualViewingOptions
    : virtualViewingOptions.slice(0, 4);

  const hiddenFiltersSet = new Set(hiddenFilters ?? []);
  const isHidden = (key: FilterVisibilityKey) => hiddenFiltersSet.has(key);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const minAreaRef = useRef<HTMLDivElement | null>(null);
  const maxAreaRef = useRef<HTMLDivElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClose = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideMin = minAreaRef.current?.contains(target);
      const isInsideMax = maxAreaRef.current?.contains(target);

      if (!isInsideMin && !isInsideMax) {
        setIsMinAreaDropdownOpen(false);
        setIsMaxAreaDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  {/*Outside click to dropdown close*/ }

  return (
    <Box className="pf-search-listing__filters">
      {!isHidden("search") && (
        <TextField
          fullWidth
          placeholder="Search here"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pf-search-listing__search-input"
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="pf-search-listing__search-icon" />
              </InputAdornment>
            ),
          }}
        />
      )}

      {/* Applied Filters Section */}
      {!isHidden("appliedFilters") && appliedFilters.length > 0 && (
        <Box className="pf-search-listing__applied-filters">
          <Box className="pf-search-listing__applied-filters-header">
            <Typography variant="h6" className="pf-search-listing__applied-filters-title">
              Applied filters
            </Typography>
            <Button
              className="pf-search-listing__clear-all-btn"
              onClick={handleClearAll}
            >
              Clear all
            </Button>
          </Box>
          <Box className="pf-search-listing__filter-chips">
            {appliedFilters.map((filter, index) => (
              <Chip
                key={index}
                label={filter}
                onDelete={
                  requiredPropertyForLabel && filter === requiredPropertyForLabel
                    ? undefined
                    : () => handleFilterRemove(index)
                }
                deleteIcon={
                  <span style={{ display: "inline-flex" }}>
                    <FilterRemovalIcon width={16} height={16} />
                  </span>
                }
                className="pf-search-listing__filter-chip"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Verified Properties Section */}
      {!isHidden("verifiedProperties") && (
        <>
          <Box className="pf-search-listing__verified-section">
            <Box className="pf-search-listing__verified-main">
              <Typography variant="h6" className="pf-search-listing__verified-title">
                Verified properties
              </Typography>
              <Box className="pf-search-listing__verified-content-wrapper">
                <Box className="pf-search-listing__verified-content">
                  <Box className="pf-search-listing__verified-badge">
                    <VerifiedBadgeIcon width={12} height={12} />
                    <Typography variant="caption" className="pf-search-listing__verified-text">
                      VERIFIED
                    </Typography>
                  </Box>
                  <Typography variant="body2" className="pf-search-listing__verified-by">
                    by estatehub
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Switch
              checked={verifiedProperties}
              onChange={(e) => handleVerifiedChange(e.target.checked)}
              className="pf-search-listing__verified-switch"
            />
          </Box>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Nearby location — not in current design; restore when spec includes it in sidebar.
      {!isHidden("nearbySearch") &&
        (onNearbySearchEnabledChange !== undefined ||
          externalNearbySearchEnabled !== undefined) && (
        <>
          <Box className="pf-search-listing__verified-section">
            <Typography variant="h6" className="pf-search-listing__verified-title">
              Location
            </Typography>
            <button
              type="button"
              className={`pf-searchChip pf-searchChip--filter pf-searchChip--nearby${nearbySearchEnabled ? " pf-searchChip--active" : ""
                }`}
              onClick={handleNearbySearchChipClick}
              aria-pressed={nearbySearchEnabled}
            >
              <BoldLocationIcon width={14} height={14} stroke="#222222" />
              <span className="pf-searchChip__value">Search near by</span>
            </button>
          </Box>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}
      */}

      {/* Post-handover Section */}
      {!isHidden("postHandover") && (
        <>
          <Box className="pf-search-listing__verified-section">
            <Box className="pf-search-listing__verified-main">
              <Typography variant="h6" className="pf-search-listing__verified-title">
                Projects with post-handover payments
              </Typography>
            </Box>
            <Switch
              checked={postHandover}
              onChange={(e) => handlePostHandoverChange(e.target.checked)}
              className="pf-search-listing__verified-switch"
            />
          </Box>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* DLD Status Section */}
      {!isHidden("dldStatus") && (
        <>
          <Box className="pf-search-listing__verified-section">
            <Box className="pf-search-listing__verified-main">
              <Typography variant="h6" className="pf-search-listing__verified-title">
                DLD status
              </Typography>
              <Box className="pf-search-listing__verified-content-wrapper">
                <Box className="pf-search-listing__verified-content">
                  <Typography variant="body2" className="pf-search-listing__verified-by">
                    DLD registered projects
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Switch
              checked={dldStatus}
              onChange={(e) => handleDldStatusChange(e.target.checked)}
              className="pf-search-listing__verified-switch"
            />
          </Box>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Property for Section */}
      {!isHidden("propertyFor") && (
        <>
          <Accordion
            expanded={expandedSections.propertyFor}
            onChange={() => handleAccordionChange("propertyFor")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.propertyFor ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Property for
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__property-for-options">
                {propertyForOptions.map((option) => (
                  <FormControlLabel
                    key={option._id || option.id || option.slug || option.name}
                    value={option._id || option.id || ""}
                    control={
                      <Checkbox
                        checked={propertyFor.includes(option._id || option.id || "")}
                        onChange={(e) =>
                          handlePropertyForChange(
                            (option._id || option.id || "") as string,
                            e.target.checked,
                            option.name
                          )
                        }
                        className="pf-search-listing__checkbox"
                        icon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              border: "1px solid rgba(34, 34, 34, 0.20)",
                            }}
                          />
                        }
                        checkedIcon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              backgroundColor: "#222222",
                              border: "1px solid #222222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckmarkIcon width={13} height={13} />
                          </Box>
                        }
                      />
                    }
                    label={option.name}
                    className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

        {/* Property Type Section */}
        {!isHidden("propertyType") && (
        <>
          <Accordion
            expanded={expandedSections.propertyType}
            onChange={() => handleAccordionChange("propertyType")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.propertyType ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Property type
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__property-types">
                {visiblePropertyTypes.map((type) => (
                  <FormControlLabel
                    key={type._id || type.id || type.slug || type.name}
                    control={
                      <Checkbox
                        checked={propertyTypes.includes(type._id || type.id || "")}
                        onChange={(e) =>
                          handlePropertyTypeChange(
                            (type._id || type.id || "") as string,
                            e.target.checked,
                            type.name
                          )
                        }
                        className="pf-search-listing__checkbox"
                        icon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              border: "1px solid rgba(34, 34, 34, 0.20)",
                            }}
                          />
                        }
                        checkedIcon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              backgroundColor: "#222222",
                              border: "1px solid #222222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckmarkIcon width={13} height={13} />
                          </Box>
                        }
                      />
                    }
                    label={type.name}
                    className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                  />
                ))}
                {propertyTypeOptions.length > 4 && (
                  <Button
                    className="pf-search-listing__show-more-btn"
                    onClick={() => setShowMorePropertyTypes(!showMorePropertyTypes)}
                  >
                    {showMorePropertyTypes ? "Show less" : "Show more"}
                    <DownArrowIconBlack
                      width={10}
                      height={6}
                      className={`pf-search-listing__show-more-icon ${showMorePropertyTypes ? "pf-search-listing__show-more-icon--expanded" : ""
                        }`}
                    />
                  </Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}


      {/* Price Range Section */}
      {!isHidden("priceRange") && (
        <>
          <Accordion
            expanded={expandedSections.priceRange}
            onChange={() => handleAccordionChange("priceRange")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.priceRange ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Price range
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__price-range">
                <Slider
                  value={priceRange}
                  onChange={handlePriceRangeChange}
                  // Slider uses the internal "millions AED" representation.
                  // `priceRange` is always [minInternal, maxInternal].
                  min={priceRange[0]}
                  max={priceRange[1]}
                  // Slider is in internal "millions AED" units. Use a larger step so it doesn't feel stuck.
                  // Example: internal step 0.5 => 0.5M AED => 500,000 AED.
                  step={0.5}
                  valueLabelDisplay="off"
                  className="pf-search-listing__price-slider"
                />
                <Box className="pf-search-listing__price-inputs">
                  <TextField
                    value={priceRangeInternalToAed(priceRange[0])}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim() === "") return;
                      const aed = parseInt(raw);
                      if (!Number.isFinite(aed)) return;
                      const nextInternal = priceRangeAedToInternal(aed);
                      const nextRange: [number, number] = [...priceRange] as [
                        number,
                        number,
                      ];
                      nextRange[0] = clampPriceRangeInternal(nextInternal);
                      onPriceRangeChange?.(nextRange);
                    }}
                    className="pf-search-listing__price-input"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">AED</InputAdornment>,
                    }}
                  />
                  <Typography variant="body2" className="pf-search-listing__price-to">
                    to
                  </Typography>
                  <TextField
                    value={priceRangeInternalToAed(priceRange[1])}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim() === "") return;
                      const aed = parseInt(raw);
                      if (!Number.isFinite(aed)) return;
                      const nextInternal = priceRangeAedToInternal(aed);
                      const nextRange: [number, number] = [...priceRange] as [
                        number,
                        number,
                      ];
                      nextRange[1] = clampPriceRangeInternal(nextInternal);
                      onPriceRangeChange?.(nextRange);
                    }}
                    className="pf-search-listing__price-input"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">AED</InputAdornment>,
                    }}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Bedrooms Section */}
      {!isHidden("bedrooms") && (
        <>
          <Accordion
            expanded={expandedSections.bedrooms}
            onChange={() => handleAccordionChange("bedrooms")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.bedrooms ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Bedrooms
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__bedroom-buttons">
                {bedroomOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={bedrooms === option.value ? "contained" : "outlined"}
                    onClick={() => handleBedroomChange(option.value)}
                    className={`pf-search-listing__bedroom-btn ${bedrooms === option.value ? "pf-search-listing__bedroom-btn--active" : ""
                      }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Bathrooms Section */}
      {!isHidden("bathrooms") && (
        <>
          <Accordion
            expanded={expandedSections.bathrooms}
            onChange={() => handleAccordionChange("bathrooms")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.bathrooms ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Bathrooms
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__bathroom-buttons">
                {bathroomOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={bathrooms === option.value ? "contained" : "outlined"}
                    onClick={() => handleBathroomChange(option.value)}
                    className={`pf-search-listing__bathroom-btn ${bathrooms === option.value ? "pf-search-listing__bathroom-btn--active" : ""
                      }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

       {/* Locations Section */}
       {!isHidden("locations") && (
        <>
          <Accordion
            expanded={expandedSections.locations}
            onChange={() => handleAccordionChange("locations")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.locations ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Locations
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__location-options">
                {useMasterListingLocations
                  ? listingSearchCities!.map((city) => (
                      <FormControlLabel
                        key={city._id}
                        control={
                          <Checkbox
                            checked={selectedListingLocationId === city._id}
                            onChange={(e) =>
                              handleListingSearchCityToggle(city, e.target.checked)
                            }
                            className="pf-search-listing__checkbox"
                            icon={
                              <Box
                                sx={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: "5px",
                                  border: "1px solid rgba(34, 34, 34, 0.20)",
                                }}
                              />
                            }
                            checkedIcon={
                              <Box
                                sx={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: "5px",
                                  backgroundColor: "#222222",
                                  border: "1px solid #222222",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <CheckmarkIcon width={13} height={13} />
                              </Box>
                            }
                          />
                        }
                        label={city.displayName}
                        className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                      />
                    ))
                  : locationOptions.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={internalLocations.includes(option)}
                            onChange={(e) =>
                              handleLocationChange(option, e.target.checked)
                            }
                            className="pf-search-listing__checkbox"
                            icon={
                              <Box
                                sx={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: "5px",
                                  border: "1px solid rgba(34, 34, 34, 0.20)",
                                }}
                              />
                            }
                            checkedIcon={
                              <Box
                                sx={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: "5px",
                                  backgroundColor: "#222222",
                                  border: "1px solid #222222",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <CheckmarkIcon width={13} height={13} />
                              </Box>
                            }
                          />
                        }
                        label={option}
                        className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                      />
                    ))}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Delivery Date Section */}
      {!isHidden("deliveryDate") && (
        <>
          <Accordion
            expanded={expandedSections.deliveryDate}
            onChange={() => handleAccordionChange("deliveryDate")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.deliveryDate ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Delivery date
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__bedroom-buttons">
                {deliveryDateOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      deliveryDateEffective === option.value
                        ? "contained"
                        : "outlined"
                    }
                    onClick={() => handleDeliveryDateChange(option)}
                    className={`pf-search-listing__bedroom-btn ${deliveryDateEffective === option.value ? "pf-search-listing__bedroom-btn--active" : ""
                      }`}
                  >
                    {option.name}
                  </Button>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Posted by Section */}
      {!isHidden("postedBy") && (
        <>
          <Accordion
            expanded={expandedSections.postedBy}
            onChange={() => handleAccordionChange("postedBy")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.postedBy ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Posted by
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__posted-by-options">
                {visiblePostedBy.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={postedByValue === option.value}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = checked ? option.value : "";
                          if (onPostedByChange) {
                            onPostedByChange(next);
                          } else {
                            setInternalPostedBy(next);
                          }
                          setSingleAppliedFilter(
                            postedByOptions.map((o) => o.name),
                            checked ? option.name : null
                          );
                        }}
                        className="pf-search-listing__checkbox"
                        icon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              border: "1px solid rgba(34, 34, 34, 0.20)",
                            }}
                          />
                        }
                        checkedIcon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              backgroundColor: "#222222",
                              border: "1px solid #222222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckmarkIcon width={13} height={13} />
                          </Box>
                        }
                      />
                    }
                    label={option.name}
                    className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                  />
                ))}
                {postedByOptions.length > 4 && (
                  <Button
                    className="pf-search-listing__show-more-btn"
                    onClick={() => setShowMorePostedBy(!showMorePostedBy)}
                  >
                    {showMorePostedBy ? "Show less" : "Show more"}
                    <DownArrowIconBlack
                      width={10}
                      height={6}
                      className={`pf-search-listing__show-more-icon ${showMorePostedBy
                        ? "pf-search-listing__show-more-icon--expanded"
                        : ""
                        }`}
                    />
                  </Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Furnishing Section */}
      {!isHidden("furnishing") && (
        <>
          <Accordion
            expanded={expandedSections.furnishing}
            onChange={() => handleAccordionChange("furnishing")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.furnishing ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Furnishing
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__furnishing-options">
                {visibleFurnishing.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={furnishing === option.value}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFurnishingValue(checked ? option.value : "");
                          setSingleAppliedFilter(
                            furnishingOptions.map((o) => o.name),
                            checked ? option.name : null
                          );
                        }}
                        className="pf-search-listing__checkbox"
                        icon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              border: "1px solid rgba(34, 34, 34, 0.20)",
                            }}
                          />
                        }
                        checkedIcon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              backgroundColor: "#222222",
                              border: "1px solid #222222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckmarkIcon width={13} height={13} />
                          </Box>
                        }
                      />
                    }
                    label={option.name}
                    className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                  />
                ))}
                {furnishingOptions.length > 4 && (
                  <Button
                    className="pf-search-listing__show-more-btn"
                    onClick={() => setShowMoreFurnishing(!showMoreFurnishing)}
                  >
                    {showMoreFurnishing ? "Show less" : "Show more"}
                    <DownArrowIconBlack
                      width={10}
                      height={6}
                      className={`pf-search-listing__show-more-icon ${showMoreFurnishing
                        ? "pf-search-listing__show-more-icon--expanded"
                        : ""
                        }`}
                    />
                  </Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Amenities Section */}
      {!isHidden("amenities") && (
        <>
          <Accordion
            expanded={expandedSections.amenities}
            onChange={() => handleAccordionChange("amenities")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.amenities ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Amenities
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <Box className="pf-search-listing__amenities-options">
                {visibleAmenities.map((option) => (
                  <FormControlLabel
                    key={option._id}
                    control={
                      <Checkbox
                        checked={amenities.includes(option._id as string)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const id = option._id as string;
                          setAmenitiesValue(
                            checked ? [...amenities, id] : amenities.filter((v) => v !== id)
                          );
                          updateAppliedFilters(option.name, checked);
                        }}
                        className="pf-search-listing__checkbox"
                        icon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              border: "1px solid rgba(34, 34, 34, 0.20)",
                            }}
                          />
                        }
                        checkedIcon={
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "5px",
                              backgroundColor: "#222222",
                              border: "1px solid #222222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckmarkIcon width={13} height={13} />
                          </Box>
                        }
                      />
                    }
                    label={option.name}
                    className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                  />
                ))}
                {amenitiesOptions.length > 4 && (
                  <Button
                    className="pf-search-listing__show-more-btn"
                    onClick={() => setShowMoreAmenities(!showMoreAmenities)}
                  >
                    {showMoreAmenities ? "Show less" : "Show more"}
                    <DownArrowIconBlack
                      width={10}
                      height={6}
                      className={`pf-search-listing__show-more-icon ${showMoreAmenities
                        ? "pf-search-listing__show-more-icon--expanded"
                        : ""
                        }`}
                    />
                  </Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Property Size Section */}
      {!isHidden("propertySize") && (
        <>
          <Accordion
            expanded={expandedSections.propertySize}
            onChange={() => handleAccordionChange("propertySize")}
            className="pf-search-listing__filter-accordion"
          >
            <AccordionSummary
              expandIcon={
                <DownArrowIconBlack
                  width={10}
                  height={6}
                  className={`pf-search-listing__accordion-icon ${expandedSections.propertySize ? "pf-search-listing__accordion-icon--expanded" : ""
                    }`}
                />
              }
              className="pf-search-listing__accordion-summary"
            >
              <Typography variant="h6" className="pf-search-listing__accordion-title">
                Property size (sqft)
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="pf-search-listing__accordion-details">
              <div className='pf-search-listing-property-size-input'>
                <div
                  className='pf-search-listing-property-size-input-item-container'
                  ref={minAreaRef}
                >
                  <div
                    className='pf-search-listing-property-size-input-item'
                    onClick={() =>
                      setIsMinAreaDropdownOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setIsMaxAreaDropdownOpen(false);
                        }
                        return next;
                      })
                    }
                  >
                    <p className='pf-search-listing-property-size-input-item-label'>
                      {minAreaEffective !== null ? minAreaEffective : "Min.Area"}
                    </p>
                    <DownArrowIconBlack width={20} height={8} />
                      {isMinAreaDropdownOpen && (
                      <ul className="pf-search-listing-property-size-dropdown-list">
                        {propertySizeOptions.map((value) => (
                          <li
                            key={value}
                            className="pf-search-listing-property-size-dropdown-list-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (onMinSqftChange) {
                                onMinSqftChange(value);
                              } else {
                                setMinArea(value);
                              }
                              setIsMinAreaDropdownOpen(false);
                              updatePropertySizeAppliedChips(
                                value,
                                maxAreaEffective
                              );
                            }}
                          >
                            {value}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>
                <div>
                  <p className='pf-search-listing-property-size-input-item-label'>to</p>
                </div>
                <div
                  className='pf-search-listing-property-size-input-item-container'
                  ref={maxAreaRef}
                >
                  <div
                    className='pf-search-listing-property-size-input-item'
                    onClick={() =>
                      setIsMaxAreaDropdownOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setIsMinAreaDropdownOpen(false);
                        }
                        return next;
                      })
                    }
                  >
                    <p className='pf-search-listing-property-size-input-item-label'>
                      {maxAreaEffective !== null ? maxAreaEffective : "Max.Area"}
                    </p>
                    <DownArrowIconBlack width={20} height={8} />
                    {isMaxAreaDropdownOpen && (
                      <ul className="pf-search-listing-property-size-dropdown-list">
                        {propertySizeOptions.map((value) => (
                          <li
                            key={value}
                            className="pf-search-listing-property-size-dropdown-list-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (onMaxSqftChange) {
                                onMaxSqftChange(value);
                              } else {
                                setMaxArea(value);
                              }
                              setIsMaxAreaDropdownOpen(false);
                              updatePropertySizeAppliedChips(
                                minAreaEffective,
                                value
                              );
                            }}
                          >
                            {value}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>
              </div>
            </AccordionDetails>
          </Accordion>
          <Divider className="pf-search-listing__filter-divider" />
        </>
      )}

      {/* Virtual Viewings Section */}
      {!isHidden("virtualViewings") && (
        <Accordion
          expanded={expandedSections.virtualViewings}
          onChange={() => handleAccordionChange("virtualViewings")}
          className="pf-search-listing__filter-accordion"
        >
          <AccordionSummary
            expandIcon={
              <DownArrowIconBlack
                width={10}
                height={6}
                className={`pf-search-listing__accordion-icon ${expandedSections.virtualViewings ? "pf-search-listing__accordion-icon--expanded" : ""
                  }`}
              />
            }
            className="pf-search-listing__accordion-summary"
          >
            <Typography variant="h6" className="pf-search-listing__accordion-title">
              Virtual Viewings
            </Typography>
          </AccordionSummary>
          <AccordionDetails className="pf-search-listing__accordion-details">
            <Box className="pf-search-listing__virtual-viewings-options">
              {visibleVirtualViewings.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={internalVirtualViewings === option.value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInternalVirtualViewings(checked ? option.value : "");
                        setSingleAppliedFilter(
                          virtualViewingOptions.map((o) => o.name),
                          checked ? option.name : null
                        );
                      }}
                      className="pf-search-listing__checkbox"
                      icon={
                        <Box
                          sx={{
                            width: 15,
                            height: 15,
                            borderRadius: "5px",
                            border: "1px solid rgba(34, 34, 34, 0.20)",
                          }}
                        />
                      }
                      checkedIcon={
                        <Box
                          sx={{
                            width: 15,
                            height: 15,
                            borderRadius: "5px",
                            backgroundColor: "#222222",
                            border: "1px solid #222222",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CheckmarkIcon width={13} height={13} />
                        </Box>
                      }
                    />
                  }
                  label={option.name}
                  className="pf-search-listing__checkbox-label pf-search-listing__checkbox-label--right"
                />
              ))}
              {virtualViewingOptions.length > 4 && (
                <Button
                  className="pf-search-listing__show-more-btn"
                  onClick={() =>
                    setShowMoreVirtualViewings(!showMoreVirtualViewings)
                  }
                >
                  {showMoreVirtualViewings ? "Show less" : "Show more"}
                  <DownArrowIconBlack
                    width={10}
                    height={6}
                    className={`pf-search-listing__show-more-icon ${showMoreVirtualViewings
                      ? "pf-search-listing__show-more-icon--expanded"
                      : ""
                      }`}
                  />
                </Button>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

export default ListingFilter;

