import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Drawer,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import PFContainer from "../../Components/container/PFContainer";
import {
  BellIcon,
  BoldLocationIcon,
  DownArrowIconBlack,
  ModalCloseIcon,
  SearchFilterIcon,
} from "../../Components/parts/icon";
import BannerCarousel from "../../Components/carousel/BannerCarousel";
import { usePageBanners } from "../../hooks/usePageBanners";
import PropertyListingCard, {
  PropertyListingCardSkeleton,
  PROPERTY_LISTING_PAGE_SIZE,
  PROPERTY_LISTING_SKELETON_COUNT,
  resolveListingTransactionForProperty,
} from "./components/PropertyListingCard";
import type { PropertyListingCardData } from "./components/PropertyListingCard";
import PFPagination from "../../Components/pagination/PFPagination";
import ListingFilter from "./components/ListingFilter";
import CreateAlertModal from "./components/CreateAlertModal";
import "../../assets/styles/SearchListing.scss";
import searchListing01 from "../../assets/img/searchlisting01.png";
import searchListing02 from "../../assets/img/searchlisting02.png";
import searchListing03 from "../../assets/img/searchlisting03.png";
import companyLogo1 from "../../assets/img/company_logos/1.png";
import companyLogo2 from "../../assets/img/company_logos/2.png";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import {
  postPropertySearch,
  getPropertySearchListingMasterData,
  getListingSearchCityMasterData,
  getListingTypesMasterData,
  getListingFilterMasterData,
  getSupportedUrlsMasterData,
  getAlertFrequenciesMasterData,
  createSearchAlert,
  type CreateSearchAlertRequestBody,
  type PropertySearchApiProperty,
  type ListingSearchCityMaster,
  type ListingTypeMaster,
  type PropertySearchRequestBody,
  type NamedValueMaster,
} from "../../services/apiService";
import {
  requestUserGeolocation,
  DEFAULT_NEARBY_RADIUS_KM,
} from "../../utils/requestUserGeolocation";

/** Same rule as Home / Header: identify new-projects listing type from master. */
function isNewProjectsListingType(
  listing: ListingTypeMaster | null | undefined
): boolean {
  if (!listing) return false;
  const slug = (listing.slug ?? "").toLowerCase().trim();
  if (
    slug === "new-projects" ||
    slug === "new_projects" ||
    /^new[-_]projects?$/.test(slug)
  ) {
    return true;
  }
  const name = (listing.name ?? "").toLowerCase();
  return name.includes("new project");
}

/** Filter UI uses millions AED for values ≤ 10_000; larger values are sent as full AED. */
function listingPriceFilterToApiAed(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  return value <= 10_000 ? value * 1_000_000 : value;
}

type SupportedUrlMap = Record<string, unknown>;

function resolveSupportedUrlPath(
  url: unknown,
  baseImg?: string | null
): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = typeof baseImg === "string" ? baseImg.trim() : "";
  if (!base) return trimmed;

  const baseNormalized = base.replace(/\/$/, "");
  const pathNormalized = trimmed.replace(/^\//, "");
  return `${baseNormalized}/${pathNormalized}`;
}

function mapPropertySearchApiToCardData(
  property: PropertySearchApiProperty,
  propertyImageBaseUrl?: string | null,
  agentImageBaseUrl?: string | null,
  developerLogoBaseUrl?: string | null,
  agencyLogoBaseUrl?: string | null,
  pageListingTransaction: "rent" | "sale" = "sale"
): PropertyListingCardData {
  const images = property.images ?? [];
  const primaryImageUrlRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const primaryImageUrl = resolveSupportedUrlPath(
    primaryImageUrlRaw,
    propertyImageBaseUrl
  );

  const locationText =
    property.location?.fullAddress ??
    [
      property.location?.building,
      property.location?.zone,
      property.location?.city,
    ]
      .filter((v): v is string => !!v && v.trim().length > 0)
      .join(", ");

  const listedDaysAgo = property.publishedAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(property.publishedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const badges = {
    verified: Boolean(property.isVerified),
    superAgent: Boolean(property.isSuperagentListing),
    propertyType: property.propertyType?.name ?? undefined,
  };
  const hasBadges =
    !!badges.verified || !!badges.superAgent || !!badges.propertyType;
  const agentLanguagesLabel = Array.isArray(property.agent?.languages)
    ? property.agent.languages
        .map((lang) => String(lang?.name ?? lang?.nativeName ?? "").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    id: property._id ?? property.title ?? `${property.price ?? ""}-${Math.random()}`,
    listingTypeId: (() => {
      const id = String(property.listingType?._id ?? "").trim();
      return id || undefined;
    })(),
    image: primaryImageUrl || companyLogo1,
    position: (() => {
      const coords = property.location?.coordinates?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return undefined;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") return undefined;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
      return { lat, lng };
    })(),
    agencyLogo: (() => {
      const resolved = resolveSupportedUrlPath(
        property.agency?.profilePicture as unknown,
        agencyLogoBaseUrl
      );
      return resolved || undefined;
    })(),
    developerLogo: (() => {
      const resolved = resolveSupportedUrlPath(
        property.developer?.logo as unknown,
        developerLogoBaseUrl
      );
      return resolved || undefined;
    })(),
    badges: hasBadges ? badges : undefined,
    photoCount:
      typeof property.imagesCount === "number" && property.imagesCount > 0
        ? property.imagesCount
        : images.length || undefined,
    title: property.title ?? "",
    location: locationText || "",
    beds: property.bedrooms ?? 0,
    baths: property.bathrooms ?? 0,
    sqft: property.area?.sqft ?? 0,
    price: property.price ?? 0,
    currency: property.currency ?? "AED",
    listingTransaction: resolveListingTransactionForProperty(
      property,
      pageListingTransaction
    ),
    rentPricing: property.rentPricing ?? null,
    isSaved: Boolean(property.isSaved),
    propertyReference:
      (typeof property.referenceId === "string" && property.referenceId.trim()) ||
      (typeof property._id === "string" && property._id.trim()) ||
      undefined,
    agent: {
      name: property.agent?.fullName ?? "",
      image: (() => {
        const resolved = resolveSupportedUrlPath(
          property.agent?.profilePicture as unknown,
          agentImageBaseUrl
        );
        return resolved || (property.agent?.profilePicture as string) || companyLogo2;
      })(),
      listedDaysAgo,
      email: property.agent?.email ?? undefined,
      phoneNumber: property.agent?.phoneNumber ?? undefined,
      languagesLabel: agentLanguagesLabel || undefined,
      brokerLicenseNumber: property.agent?.brokerLicenseNumber ?? undefined,
    },
  };
}

function buildPropertySearchRequest(params: {
  listingTypeId: string | undefined;
  propertyTypeIds: string[];
  bedrooms: number;
  bathrooms: number;
  searchQuery: string;
  furnishing: string;
  amenities: string[];
  verifiedOnly: boolean;
  onlyCommercial: boolean;
  viewTypeTab: string;
  sortBy: string;
  page: number;
  limit: number;
  appliedFilters: string[];
  priceRange: [number, number];
  /** When false, omit priceMin/priceMax so the API applies no price filter (default UI is [3, 30] millions). */
  priceFilterActive: boolean;
  postedBy: string;
  minSqft: number | null;
  maxSqft: number | null;
  /** ListingSearchCity ObjectId from `propertylocations` master. */
  listingLocationId: string | null;
  nearbySearchEnabled: boolean;
  nearSearchCoords: { lat: number; lng: number } | null;
  forceClearAll?: boolean;
}): PropertySearchRequestBody | null {
  if (!params.listingTypeId) return null;
  if (params.forceClearAll) {
    return {
      listingType: params.listingTypeId,
      clearAll: true,
      page: params.page,
      limit: params.limit,
    };
  }
  const body: PropertySearchRequestBody = {
    listingType: params.listingTypeId,
    page: params.page,
    limit: params.limit,
  };
  const q = params.searchQuery.trim();
  if (q) body.keyword = q;
  const locId = params.listingLocationId?.trim();
  if (locId) body.location = locId;
  if (params.propertyTypeIds.length === 1) {
    body.propertyType = params.propertyTypeIds[0];
  } else if (params.propertyTypeIds.length > 1) {
    body.propertyType = params.propertyTypeIds;
  }
  if (params.appliedFilters.some((f) => f.trim().toLowerCase() === "studio")) {
    body.bedrooms = "0";
  } else if (params.bedrooms > 0) {
    body.bedrooms = String(params.bedrooms);
  }
  if (params.bathrooms > 0) body.bathrooms = String(params.bathrooms);
  if (params.furnishing.trim()) body.furnished = params.furnishing.trim();
  if (params.amenities.length === 1) body.amenities = params.amenities[0];
  else if (params.amenities.length > 1) body.amenities = params.amenities;
  if (params.verifiedOnly) body.isVerified = "true";
  if (params.onlyCommercial) body.isCommercial = true;
  if (params.viewTypeTab === "Off-plan") body.completionStatus = "off-plan";
  else if (params.viewTypeTab === "Ready") body.completionStatus = "ready";
  if (params.sortBy.trim()) body.sortBy = params.sortBy.trim();

  if (params.priceFilterActive) {
    const [prMin, prMax] = params.priceRange;
    if (prMin > 0) body.priceMin = listingPriceFilterToApiAed(prMin);
    if (prMax > 0) body.priceMax = listingPriceFilterToApiAed(prMax);
  }
  if (params.minSqft != null) body.areaMin = params.minSqft;
  if (params.maxSqft != null) body.areaMax = params.maxSqft;
  const pb = params.postedBy.trim();
  if (pb) body.postedBy = pb;

  if (
    params.nearbySearchEnabled &&
    params.nearSearchCoords &&
    Number.isFinite(params.nearSearchCoords.lat) &&
    Number.isFinite(params.nearSearchCoords.lng)
  ) {
    body.nearLat = params.nearSearchCoords.lat;
    body.nearLng = params.nearSearchCoords.lng;
    body.nearRadiusKm = DEFAULT_NEARBY_RADIUS_KM;
  }

  return body;
}

/** Search box (`keyword`): wait after typing stops before hitting search API. */
const PROPERTY_SEARCH_LOCATION_DEBOUNCE_MS = 450;

function SearchListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as {
    appliedFilters?: string[];
    propertyFor?: string[];
    propertyTypes?: string[];
    bedrooms?: number;
    bathrooms?: number;
    furnishing?: string;
    amenities?: string[];
    nearbySearchEnabled?: boolean;
    onlyCommercialProperties?: boolean;
    category?: string;
    /** From home / header; sent as API `keyword`. */
    keyword?: string;
    listingLocationId?: string | null;
    /** Optional coords when navigating from search (avoids second geolocation prompt). */
    nearSearch?: { lat: number; lng: number; radiusKm?: number };
    sortByApiValue?: string;
    viewType?: string;
    priceRange?: [number, number];
    priceFilterActive?: boolean;
    verifiedProperties?: boolean;
    postedByFilter?: string;
    minSqft?: number | null;
    maxSqft?: number | null;
  };
  const [sortByApiValue, setSortByApiValue] = useState<string>("");
  const [sortByPropertyOptions, setSortByPropertyOptions] = useState<
    NamedValueMaster[]
  >([]);
  const sendClearAllNextRef = useRef(false);
  /** Bumps on Clear all so the search effect runs even when other deps are unchanged (ref alone does not retrigger effects). */
  const [clearAllSearchNonce, setClearAllSearchNonce] = useState(0);
  const [viewType, setViewType] = useState<string>("Any");
  const initialKeyword = (locationState.keyword ?? "").trim();
  const [searchQuery, setSearchQuery] = useState<string>(initialKeyword);
  const [debouncedSearchQuery, setDebouncedSearchQuery] =
    useState<string>(initialKeyword);
  const [verifiedProperties, setVerifiedProperties] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [appliedFilters, setAppliedFilters] = useState<string[]>(
    locationState.appliedFilters ?? []
  );
  const [propertyFor, setPropertyFor] = useState<string[]>(
    locationState.propertyFor ?? []
  );
  const [selectedPropertyTypeIds, setSelectedPropertyTypeIds] = useState<string[]>(
    locationState.propertyTypes ?? []
  );
  const [bedrooms, setBedrooms] = useState<number>(locationState.bedrooms ?? 0);
  const [bathrooms, setBathrooms] = useState<number>(locationState.bathrooms ?? 0);
  const [furnishing, setFurnishing] = useState<string>(locationState.furnishing ?? "");
  const [amenities, setAmenities] = useState<string[]>(locationState.amenities ?? []);
  const [nearbySearchEnabled, setNearbySearchEnabled] = useState<boolean>(
    locationState.nearbySearchEnabled ?? false
  );
  const [nearSearchCoords, setNearSearchCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(() => {
    const ns = locationState.nearSearch;
    if (
      ns &&
      typeof ns.lat === "number" &&
      typeof ns.lng === "number" &&
      Number.isFinite(ns.lat) &&
      Number.isFinite(ns.lng)
    ) {
      return { lat: ns.lat, lng: ns.lng };
    }
    return null;
  });
  const [onlyCommercialProperties, setOnlyCommercialProperties] = useState<boolean>(
    locationState.onlyCommercialProperties ?? false
  );
  const [category, setCategory] = useState<string>(locationState.category ?? "All");
  const [priceRange, setPriceRange] = useState<[number, number]>([3, 30]);
  const [priceRangeBounds, setPriceRangeBounds] = useState<[number, number] | null>(
    null
  );
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [postedByFilter, setPostedByFilter] = useState<string>("");
  const [minSqft, setMinSqft] = useState<number | null>(null);
  const [maxSqft, setMaxSqft] = useState<number | null>(null);
  const [propertyListingCities, setPropertyListingCities] = useState<
    ListingSearchCityMaster[]
  >([]);
  const [listingLocationId, setListingLocationId] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] =
    useState<boolean>(false);
  const [listingTypeOptions, setListingTypeOptions] = useState<
    ListingTypeMaster[]
  >([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalPropertiesCount, setTotalPropertiesCount] = useState<number>(0);
  const [isPropertySearchLoading, setIsPropertySearchLoading] =
    useState<boolean>(false);
  const [hasLoadedPropertiesOnce, setHasLoadedPropertiesOnce] =
    useState<boolean>(false);
  const propertySearchRequestIdRef = useRef(0);
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(
    null
  );
  const [apiProperties, setApiProperties] = useState<PropertySearchApiProperty[]>(
    []
  );
  const [alertFrequencyOptions, setAlertFrequencyOptions] = useState<
    NamedValueMaster[]
  >([]);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const propertyImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.propertyUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const agentImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.agentUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const developerLogoBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.developerUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const agencyLogoBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.agencyUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const shouldShowSkeleton =
    (isPropertySearchLoading &&
      (!hasLoadedPropertiesOnce || apiProperties.length === 0)) ||
    (!isPropertySearchLoading &&
      Boolean(propertyFor?.[0]) &&
      !hasLoadedPropertiesOnce &&
      apiProperties.length === 0);

  useEffect(() => {
    let mounted = true;
    getSupportedUrlsMasterData()
      .then((resp) => {
        if (!mounted) return;
        const items = resp.data?.items;
        const map = Array.isArray(items)
          ? (items.reduce((acc: SupportedUrlMap, cur: Record<string, unknown>) => {
              return { ...acc, ...cur };
            }, {}) as SupportedUrlMap)
          : (items as SupportedUrlMap);
        setSupportedUrls(map);
      })
      .catch(() => {
        // Optional: if this fails, cards will use the image URL returned by API directly.
        if (mounted) setSupportedUrls(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const s = (location.state ?? {}) as typeof locationState;
    setAppliedFilters(s.appliedFilters ?? []);
    setPropertyFor(s.propertyFor ?? []);
    setSelectedPropertyTypeIds(s.propertyTypes ?? []);
    setBedrooms(s.bedrooms ?? 0);
    setBathrooms(s.bathrooms ?? 0);
    setFurnishing(s.furnishing ?? "");
    setAmenities(s.amenities ?? []);
    setNearbySearchEnabled(s.nearbySearchEnabled ?? false);
    setOnlyCommercialProperties(s.onlyCommercialProperties ?? false);
    setCategory(s.category ?? "All");
    const kw = (s.keyword ?? "").trim();
    setSearchQuery(kw);
    setDebouncedSearchQuery(kw);
    const lid = s.listingLocationId?.trim();
    setListingLocationId(lid || null);
    if (s.nearbySearchEnabled) {
      const ns = s.nearSearch;
      if (
        ns &&
        typeof ns.lat === "number" &&
        typeof ns.lng === "number" &&
        Number.isFinite(ns.lat) &&
        Number.isFinite(ns.lng)
      ) {
        setNearSearchCoords({ lat: ns.lat, lng: ns.lng });
      }
    } else {
      setNearSearchCoords(null);
    }
    if (typeof s.sortByApiValue === "string") setSortByApiValue(s.sortByApiValue);
    if (typeof s.viewType === "string") setViewType(s.viewType);
    if (
      Array.isArray(s.priceRange) &&
      s.priceRange.length === 2 &&
      Number.isFinite(s.priceRange[0]) &&
      Number.isFinite(s.priceRange[1])
    ) {
      setPriceRange([s.priceRange[0], s.priceRange[1]]);
    }
    if (typeof s.priceFilterActive === "boolean") {
      setPriceFilterActive(s.priceFilterActive);
    }
    if (typeof s.verifiedProperties === "boolean") {
      setVerifiedProperties(s.verifiedProperties);
    }
    if (typeof s.postedByFilter === "string") setPostedByFilter(s.postedByFilter);
    if (s.minSqft != null) setMinSqft(s.minSqft);
    if (s.maxSqft != null) setMaxSqft(s.maxSqft);
    setCurrentPage(1);
  }, [location.key, location.state]);

  useEffect(() => {
    let mounted = true;
    getListingFilterMasterData()
      .then((resp) => {
        if (!mounted) return;
        const priceValues = (resp.data.priceRange ?? [])
          .map((item) => Number(item?.value))
          .filter((num) => Number.isFinite(num));
        if (priceValues.length > 1) {
          // Master list may not be sorted; compute bounds order-independently.
          const minValue = Math.min(...priceValues);
          const maxValue = Math.max(...priceValues);
          if (minValue === maxValue) return;
          // UI expects "millions AED" for <= 10_000 range.
          const internalMin = minValue > 10_000 ? minValue / 1_000_000 : minValue;
          const internalMax =
            maxValue > 10_000 ? maxValue / 1_000_000 : maxValue;
          setPriceRangeBounds([internalMin, internalMax]);
          setPriceRange((prev) =>
            prev[0] === 3 && prev[1] === 30
              ? [internalMin, internalMax]
              : prev
          );
        } else {
          setPriceRangeBounds(null);
        }
      })
      .catch(() => {
        if (mounted) setPriceRangeBounds(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!nearbySearchEnabled) {
      setNearSearchCoords(null);
      return;
    }
    const s = (location.state ?? {}) as typeof locationState;
    const ns = s.nearSearch;
    if (
      ns &&
      typeof ns.lat === "number" &&
      typeof ns.lng === "number" &&
      Number.isFinite(ns.lat) &&
      Number.isFinite(ns.lng)
    ) {
      setNearSearchCoords({ lat: ns.lat, lng: ns.lng });
      return;
    }
    if (nearSearchCoords !== null) return;
    let cancelled = false;
    requestUserGeolocation()
      .then(({ lat, lng }) => {
        if (!cancelled) setNearSearchCoords({ lat, lng });
      })
      .catch(() => {
        if (!cancelled) {
          setNearSearchCoords(null);
          setNearbySearchEnabled(false);
          setAppliedFilters((prev) =>
            prev.filter((f) => f.trim() !== "Search near by")
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [nearbySearchEnabled, location.key, location.state, nearSearchCoords]);

  useEffect(() => {
    let mounted = true;
    getPropertySearchListingMasterData()
      .then((resp) => {
        if (!mounted) return;
        setSortByPropertyOptions(resp.data.sortByProperty ?? []);
      })
      .catch(() => {
        if (mounted) setSortByPropertyOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getListingSearchCityMasterData("property")
      .then((resp) => {
        if (!mounted) return;
        const list = resp.data?.cities ?? [];
        setPropertyListingCities(
          list.filter((c) => c?._id?.trim() && c?.displayName?.trim())
        );
      })
      .catch(() => {
        if (mounted) setPropertyListingCities([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getListingTypesMasterData()
      .then((resp) => {
        if (!mounted) return;
        const items = (resp.data.items ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        setListingTypeOptions(items);
      })
      .catch(() => {
        if (mounted) setListingTypeOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getAlertFrequenciesMasterData()
      .then((resp) => {
        if (!mounted) return;
        setAlertFrequencyOptions(resp.data?.alertFrequencies ?? []);
      })
      .catch(() => {
        if (mounted) setAlertFrequencyOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePriceRangeChange = useCallback((range: [number, number]) => {
    setPriceRange(range);
    setPriceFilterActive(true);
  }, []);

  const handleFiltersCleared = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setViewType("Any");
    setSortByApiValue("");
    setVerifiedProperties(false);
    setOnlyCommercialProperties(false);
    setCategory("All");
    setNearbySearchEnabled(false);
    setNearSearchCoords(null);
    setCurrentPage(1);
    setPriceRange(priceRangeBounds ?? [3, 30]);
    setPriceFilterActive(false);
    setPostedByFilter("");
    setMinSqft(null);
    setMaxSqft(null);
    setListingLocationId(null);
    sendClearAllNextRef.current = true;
    setClearAllSearchNonce((n) => n + 1);
  }, [priceRangeBounds]);

  const handlePropertyForChange = useCallback(
    (values: string[]) => {
      const id = values[0];
      if (!id) {
        setPropertyFor(values);
        return;
      }
      const opt = listingTypeOptions.find(
        (o) => String(o._id || o.id || "") === String(id)
      );
      if (opt && isNewProjectsListingType(opt)) {
        const kw = searchQuery.trim();
        const listingNames = new Set(
          listingTypeOptions.map((o) => o.name).filter(Boolean)
        );
        const baseFilters = appliedFilters.filter((f) => !listingNames.has(f));
        const nextApplied = opt.name ? [...baseFilters, opt.name] : baseFilters;
        const loc = listingLocationId?.trim();
        navigate("/newprojectlisting", {
          state: {
            appliedFilters: nextApplied,
            propertyFor: values,
            propertyTypes: selectedPropertyTypeIds,
            bedrooms,
            bathrooms,
            furnishing,
            amenities,
            nearbySearchEnabled,
            onlyCommercialProperties,
            category,
            ...(kw ? { keyword: kw } : {}),
            ...(loc ? { listingLocationId: loc } : {}),
            ...(nearbySearchEnabled && nearSearchCoords
              ? {
                  nearSearch: {
                    lat: nearSearchCoords.lat,
                    lng: nearSearchCoords.lng,
                    radiusKm: DEFAULT_NEARBY_RADIUS_KM,
                  },
                }
              : {}),
          },
        });
        return;
      }
      setPropertyFor(values);
    },
    [
      listingTypeOptions,
      navigate,
      searchQuery,
      listingLocationId,
      appliedFilters,
      selectedPropertyTypeIds,
      bedrooms,
      bathrooms,
      furnishing,
      amenities,
      nearbySearchEnabled,
      nearSearchCoords,
      onlyCommercialProperties,
      category,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, PROPERTY_SEARCH_LOCATION_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;
    const forceClearAll = sendClearAllNextRef.current;
    if (forceClearAll) {
      sendClearAllNextRef.current = false;
    }
    if (
      !forceClearAll &&
      nearbySearchEnabled &&
      !nearSearchCoords
    ) {
      // We are not calling /properties/search until we have coords.
      setIsPropertySearchLoading(false);
      setHasLoadedPropertiesOnce(true);
      return undefined;
    }
    const payload = buildPropertySearchRequest({
      listingTypeId: propertyFor[0],
      propertyTypeIds: selectedPropertyTypeIds,
      bedrooms,
      bathrooms,
      searchQuery: debouncedSearchQuery,
      furnishing,
      amenities,
      verifiedOnly: verifiedProperties,
      onlyCommercial: onlyCommercialProperties,
      viewTypeTab: viewType,
      sortBy: sortByApiValue,
      page: currentPage,
      limit: PROPERTY_LISTING_PAGE_SIZE,
      appliedFilters,
      priceRange,
      priceFilterActive,
      postedBy: postedByFilter,
      minSqft,
      maxSqft,
      listingLocationId,
      nearbySearchEnabled,
      nearSearchCoords,
      forceClearAll,
    });
    if (!payload) {
      console.warn(
        "[property search] skipped: set Property for (listingType) in filters to call /properties/search"
      );
      setIsPropertySearchLoading(false);
      setHasLoadedPropertiesOnce(true);
      return undefined;
    }
    const requestId = ++propertySearchRequestIdRef.current;
    if (forceClearAll) {
      setHasLoadedPropertiesOnce(false);
      setApiProperties([]);
    }
    setIsPropertySearchLoading(true);
    postPropertySearch(payload, abortController.signal)
      .then((envelope) => {
        if (
          cancelled ||
          propertySearchRequestIdRef.current !== requestId
        )
          return;
        const rawSort = envelope.data?.appliedFilters?.sortBy;
        const apiSort =
          typeof rawSort === "string" ? rawSort.trim() : "";
        if (apiSort) {
          setSortByApiValue(apiSort);
        }
        setApiProperties(envelope.data?.properties ?? []);

        const apiPagination = envelope.data?.pagination;
        if (apiPagination?.totalPages && Number.isFinite(apiPagination.totalPages)) {
          setTotalPages(apiPagination.totalPages);
        }
        if (
          typeof apiPagination?.totalProperties === "number" &&
          Number.isFinite(apiPagination.totalProperties)
        ) {
          setTotalPropertiesCount(apiPagination.totalProperties);
        } else {
          setTotalPropertiesCount(0);
        }
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          propertySearchRequestIdRef.current !== requestId
        )
          return;
        const aborted =
          abortController.signal.aborted ||
          (typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: string }).code === "ERR_CANCELED");
        if (aborted) return;
        console.error("[property search] request failed", err);
      })
      .finally(() => {
        // Only stop skeleton for the latest request.
        if (propertySearchRequestIdRef.current === requestId) {
          setIsPropertySearchLoading(false);
          setHasLoadedPropertiesOnce(true);
        }
      });
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    propertyFor,
    selectedPropertyTypeIds,
    bedrooms,
    bathrooms,
    debouncedSearchQuery,
    furnishing,
    amenities,
    verifiedProperties,
    onlyCommercialProperties,
    viewType,
    sortByApiValue,
    currentPage,
    appliedFilters,
    clearAllSearchNonce,
    priceRange,
    priceFilterActive,
    postedByFilter,
    minSqft,
    maxSqft,
    listingLocationId,
    nearbySearchEnabled,
    nearSearchCoords,
  ]);

  const sortDisplayLabel =
    sortByPropertyOptions.find((o) => o.value === sortByApiValue)?.name ??
    (sortByApiValue ? sortByApiValue : "Select");

  const selectedListingType = useMemo(() => {
    const id = String(propertyFor?.[0] ?? "").trim();
    if (!id) return null;
    return (
      listingTypeOptions.find((o) => String(o._id || o.id || "") === id) ?? null
    );
  }, [listingTypeOptions, propertyFor]);

  const listingTransactionLabel = useMemo(() => {
    const tx = String(selectedListingType?.transaction ?? "")
      .toLowerCase()
      .trim();
    if (tx === "rent" || tx === "rental") return "rent";
    if (tx === "sale" || tx === "buy" || tx === "sell") return "sale";
    return "sale";
  }, [selectedListingType]);

  const properties = useMemo(
    () =>
      apiProperties.map((p) =>
        mapPropertySearchApiToCardData(
          p,
          propertyImageBaseUrl,
          agentImageBaseUrl,
          developerLogoBaseUrl,
          agencyLogoBaseUrl,
          listingTransactionLabel
        )
      ),
    [
      apiProperties,
      propertyImageBaseUrl,
      agentImageBaseUrl,
      developerLogoBaseUrl,
      agencyLogoBaseUrl,
      listingTransactionLabel,
    ]
  );

  const listingHeaderTitle = useMemo(() => {
    return `Properties for ${listingTransactionLabel}`;
  }, [listingTransactionLabel]);

  const breadcrumbSubtitle = useMemo(() => {
    return `Property for ${listingTransactionLabel}`;
  }, [listingTransactionLabel]);

  const listingLocationLabel = useMemo(() => {
    const id = (listingLocationId ?? "").trim();
    if (!id) return "";
    return (
      propertyListingCities.find((c) => c._id === id)?.displayName?.trim() || ""
    );
  }, [listingLocationId, propertyListingCities]);

  const defaultAlertName = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${listingHeaderTitle}`);
    const kw = debouncedSearchQuery.trim();
    if (kw) parts.push(kw);
    if (listingLocationLabel) parts.push(listingLocationLabel);
    if (bedrooms > 0) parts.push(`${bedrooms} bed`);
    if (bathrooms > 0) parts.push(`${bathrooms} bath`);
    return parts.join(" • ");
  }, [
    listingHeaderTitle,
    debouncedSearchQuery,
    listingLocationLabel,
    bedrooms,
    bathrooms,
  ]);

  const propertiesCountLabel = useMemo(() => {
    const count = totalPropertiesCount;
    if (!Number.isFinite(count) || count <= 0) return "0 properties";
    return `${count.toLocaleString("en-US")} properties`;
  }, [totalPropertiesCount]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const viewTypeTabs = ["Any", "Off-plan", "Ready",];

  const fallbackBannerImages = [searchListing01, searchListing02, searchListing03];
  const fallbackBannerTitles = [
    "Modern homes worldwide",
    "Furnished Homes",
    "Properties Nearby",
  ];

  const pageBanners = usePageBanners("listing-page", {
    images: fallbackBannerImages,
    titles: fallbackBannerTitles,
  });

  /* Sample property data (disabled; API-bound properties now)
  const properties: PropertyListingCardData[] = [
    {
      id: 1,
      image:
        "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo2,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 25,
      title: "Omniyat Bespoke | Villa",
      location: "Dubai, Palm Jumeirah",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Jackson Crosland",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 4,
      },
    },
    {
      id: 2,
      image:
        "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo1,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 18,
      title: "chevalla-estate | Villa",
      location:
        "Dubai, Dubai Investment Park (DIP), Grand Polo Club and Resort, Chevalla Estate",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Sarah Johnson",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 2,
      },
    },
    {
      id: 3,
      image:
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo2,
      badges: {
        verified: true,
        superAgent: false,
        propertyType: "VILLA",
      },
      photoCount: 22,
      title: "Luna Sky Palace | Villa",
      location: "Dubai, Palm Jumeirah",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Michael Chen",
        image:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 7,
      },
    },
    {
      id: 4,
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo1,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 30,
      title: "Rosehill by Emaar | Villa",
      location: "Dubai, Dubai Hills Estate, Rosehill",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Emma Wilson",
        image:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 1,
      },
    },
    {
      id: 5,
      image:
        "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo2,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 25,
      title: "Omniyat Bespoke | Villa",
      location: "Dubai, Palm Jumeirah",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Jackson Crosland",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 4,
      },
    },
    {
      id: 6,
      image:
        "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo1,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 18,
      title: "chevalla-estate | Villa",
      location:
        "Dubai, Dubai Investment Park (DIP), Grand Polo Club and Resort, Chevalla Estate",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Sarah Johnson",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 2,
      },
    },
    {
      id: 7,
      image:
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo2,
      badges: {
        verified: true,
        superAgent: false,
        propertyType: "VILLA",
      },
      photoCount: 22,
      title: "Luna Sky Palace | Villa",
      location: "Dubai, Palm Jumeirah",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Michael Chen",
        image:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 7,
      },
    },
    {
      id: 8,
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop",
      developerLogo: companyLogo1,
      badges: {
        verified: true,
        superAgent: true,
        propertyType: "VILLA",
      },
      photoCount: 30,
      title: "Rosehill by Emaar | Villa",
      location: "Dubai, Dubai Hills Estate, Rosehill",
      beds: 2,
      baths: 3,
      sqft: 3832,
      price: 9000000,
      currency: "AED",
      agent: {
        name: "Emma Wilson",
        image:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop",
        listedDaysAgo: 1,
      },
    },
  ];
  */

  const handlePropertyCardClick = useCallback(
    (id: string | number) => {
      if (typeof id !== "string") return;
      navigate(`/propertydrilldown/${encodeURIComponent(id)}`, {
        state: { propertyId: id },
      });
    },
    [navigate]
  );

  const isLoggedIn =
    Boolean(localStorage.getItem("accessToken")) ||
    localStorage.getItem("isLoggedIn") === "true";

  const handleCreateAlert = () => {
    setIsCreateAlertModalOpen(true);
  };

  const handleSubmitCreateAlert = useCallback(
    async (payload: { alertName: string; frequency: string }) => {
      const alertType = String(propertyFor?.[0] ?? "").trim();
      if (!alertType) {
        console.warn("[alerts] missing listingType (Property for) to create alert");
        return;
      }

      const selectedCityName =
        (listingLocationId ?? "").trim() && listingLocationLabel
          ? listingLocationLabel
          : "";

      const completionStatus =
        viewType === "Off-plan"
          ? "off-plan"
          : viewType === "Ready"
            ? "ready"
            : "all";

      const criteria: CreateSearchAlertRequestBody["searchCriteria"] = {};
      if (selectedCityName) criteria.location = selectedCityName;

      if (selectedPropertyTypeIds.length === 1) {
        const pt = String(selectedPropertyTypeIds[0] ?? "").trim();
        if (pt) criteria.propertyType = pt;
      }

      if (bedrooms > 0) criteria.bedrooms = bedrooms;
      if (bathrooms > 0) criteria.bathrooms = bathrooms;

      if (priceFilterActive) {
        const [minM, maxM] = priceRange;
        const minAed = minM > 0 ? listingPriceFilterToApiAed(minM) : undefined;
        const maxAed = maxM > 0 ? listingPriceFilterToApiAed(maxM) : undefined;
        if (minAed != null || maxAed != null) {
          criteria.priceRange = {};
          if (minAed != null) criteria.priceRange.min = minAed;
          if (maxAed != null) criteria.priceRange.max = maxAed;
        }
      }

      const furnished = furnishing.trim();
      if (furnished) criteria.furnished = furnished;

      if (amenities.length) criteria.amenities = amenities;
      if (completionStatus) criteria.completionStatus = completionStatus;

      const body: CreateSearchAlertRequestBody = {
        alertName: payload.alertName,
        alertType,
        searchCriteria: criteria,
        frequency: payload.frequency,
      };

      try {
        const resp = await createSearchAlert(body);
        if (resp?.status === false) {
          throw new Error(resp.message || "Failed to create alert");
        }
        console.log("[alerts] created", resp.data?._id);
        setToast({
          open: true,
          severity: "success",
          message: "Alert created successfully",
        });
        setIsCreateAlertModalOpen(false);
      } catch (err) {
        console.error("[alerts] create failed", err);
        setToast({
          open: true,
          severity: "error",
          message:
            err instanceof Error && err.message
              ? err.message
              : "Failed to create alert",
        });
      }
    },
    [
      amenities,
      bathrooms,
      bedrooms,
      furnishing,
      listingLocationId,
      listingLocationLabel,
      priceFilterActive,
      priceRange,
      propertyFor,
      selectedPropertyTypeIds,
      viewType,
    ]
  );

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSortDropdown]);
  return (
    <div className="pf-search-listing">
      <PFContainer>
        {/* Breadcrumbs Section */}

        <BreadcrumbsComponentFirstLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1={breadcrumbSubtitle}
          breadcrumbLinkTitleTo="/"
        />

        {/* Main Content Layout */}
        <Box className="pf-search-listing__main-layout">
          {/* Mobile Filter Button */}
          {isMobile && (
            <Button
              className="pf-search-listing__mobile-filter-btn"
              onClick={() => setIsFilterDrawerOpen(true)}
              startIcon={<SearchFilterIcon width={14} height={10} stroke="#FFFFFF" />}
            >
              Filters
            </Button>
          )}

          <Box className="pf-search-listing__layout-container">
            {/* Left Sidebar - Search & Filters (Desktop only) */}
            {!isMobile && (
              <Box className="pf-search-listing__sidebar-wrapper">
                <aside className="pf-search-listing__sidebar">
                  <ListingFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    appliedFilters={appliedFilters}
                    onFiltersChange={setAppliedFilters}
                    propertyFor={propertyFor}
                    onPropertyForChange={handlePropertyForChange}
                    propertyTypes={selectedPropertyTypeIds}
                    onPropertyTypesChange={setSelectedPropertyTypeIds}
                    bedrooms={bedrooms}
                    onBedroomsChange={setBedrooms}
                    bathrooms={bathrooms}
                    onBathroomsChange={setBathrooms}
                    furnishing={furnishing}
                    onFurnishingChange={setFurnishing}
                    amenities={amenities}
                    onAmenitiesChange={setAmenities}
                    nearbySearchEnabled={nearbySearchEnabled}
                    onNearbySearchEnabledChange={setNearbySearchEnabled}
                    onlyCommercialProperties={onlyCommercialProperties}
                    onOnlyCommercialPropertiesChange={setOnlyCommercialProperties}
                    category={category}
                    onCategoryChange={setCategory}
                    verifiedProperties={verifiedProperties}
                    onVerifiedChange={setVerifiedProperties}
                    priceRange={priceRange}
                    onPriceRangeChange={handlePriceRangeChange}
                    postedBy={postedByFilter}
                    onPostedByChange={setPostedByFilter}
                    minSqft={minSqft}
                    onMinSqftChange={setMinSqft}
                    maxSqft={maxSqft}
                    onMaxSqftChange={setMaxSqft}
                    listingSearchCities={propertyListingCities}
                    selectedListingLocationId={listingLocationId}
                    onListingLocationIdChange={setListingLocationId}
                    hiddenFilters={["postHandover", "dldStatus", "deliveryDate"]}
                    onFiltersCleared={handleFiltersCleared}
                  />
                </aside>
              </Box>
            )}

            {/* Right Side - Property Listings */}
            <Box className="pf-search-listing__content-wrapper">
              <main className="pf-search-listing__content">
                {/* Banner Carousel Section */}
                <BannerCarousel
                  images={pageBanners.images}
                  titles={pageBanners.titles}
                  buttonTexts={pageBanners.buttonTexts}
                  links={pageBanners.links}
                  autoSlideInterval={pageBanners.autoSlideInterval}
                />

                {/* Properties Header Section */}
                <Box className="pf-search-listing__properties-header">
                  <Box className="pf-search-listing__header-top">
                    <Box className="pf-search-listing__header-title">
                      <Typography
                        variant="h2"
                        className="pf-search-listing__properties-title"
                      >
                        {listingHeaderTitle}
                      </Typography>
                      <Chip
                        label={propertiesCountLabel}
                        className="pf-search-listing__properties-count"
                      />
                    </Box>

                    <Box className="pf-search-listing__header-actions">
                      <Button
                        variant="outlined"
                        startIcon={
                          <BoldLocationIcon
                            width={18}
                            height={18}
                            stroke="#FFFFFF"
                            strokeWidth="1.2"
                          />
                        }
                        className="pf-search-listing__action-button"
                        onClick={() => {
                          const payload = buildPropertySearchRequest({
                            listingTypeId: propertyFor[0],
                            propertyTypeIds: selectedPropertyTypeIds,
                            bedrooms,
                            bathrooms,
                            searchQuery: debouncedSearchQuery,
                            furnishing,
                            amenities,
                            verifiedOnly: verifiedProperties,
                            onlyCommercial: onlyCommercialProperties,
                            viewTypeTab: viewType,
                            sortBy: sortByApiValue,
                            page: currentPage,
                            limit: PROPERTY_LISTING_PAGE_SIZE,
                            appliedFilters,
                            priceRange,
                            priceFilterActive,
                            postedBy: postedByFilter,
                            minSqft,
                            maxSqft,
                            listingLocationId,
                            nearbySearchEnabled,
                            nearSearchCoords,
                          });
                          navigate("/mapview", {
                            state: {
                              initialPropertySearch: payload,
                              returnListingState: {
                                appliedFilters,
                                propertyFor,
                                propertyTypes: selectedPropertyTypeIds,
                                bedrooms,
                                bathrooms,
                                furnishing,
                                amenities,
                                nearbySearchEnabled,
                                onlyCommercialProperties,
                                category,
                                ...(debouncedSearchQuery.trim()
                                  ? { keyword: debouncedSearchQuery.trim() }
                                  : {}),
                                ...(listingLocationId
                                  ? { listingLocationId }
                                  : {}),
                                ...(nearbySearchEnabled && nearSearchCoords
                                  ? {
                                      nearSearch: {
                                        lat: nearSearchCoords.lat,
                                        lng: nearSearchCoords.lng,
                                        radiusKm: DEFAULT_NEARBY_RADIUS_KM,
                                      },
                                    }
                                  : {}),
                                sortByApiValue,
                                viewType,
                                priceRange,
                                priceFilterActive,
                                verifiedProperties,
                                postedByFilter,
                                minSqft,
                                maxSqft,
                              },
                            },
                          });
                        }}
                      >
                        Map view
                      </Button>
                      {isLoggedIn ? (
                        <Button
                          variant="outlined"
                          startIcon={
                            <BellIcon width={18} height={18} stroke="#3b82f6" />
                          }
                          className="pf-search-listing__action-button"
                          onClick={handleCreateAlert}
                        >
                          Create alert
                        </Button>
                      ) : null}
                    </Box>
                  </Box>


                  <div className="pf-search-listing-tabs-container">
                    <div className="pf-search-listing-tabs-container-left">
                      {viewTypeTabs.map((tab) => (
                        <button
                          key={tab}
                          className={`pf-search-listing-tabs-left-tab ${viewType === tab ? "pf-search-listing-tabs-left-tab-active" : ""}`}
                          onClick={() => setViewType(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="pf-search-listing-tabs-container-right">
                      <div className="pf-search-listing-right-dropdown-container">
                        <p className="pf-search-listing-tabs-right-label">Sort by :</p>
                        {/* Sort by dropdown */}
                        <div
                          ref={sortDropdownRef}
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className="pf-search-listing-right-dropdown pf-search-listing-right-dropdown-wrapper"
                        >
                          <div className="pf-search-listing-right-dropdown-content">
                            <h4 className="pf-search-listing-right-dropdown-value">
                              {sortDisplayLabel}
                            </h4>
                          </div>

                          <DownArrowIconBlack
                            className="pf-field-flex-section-item-icon"
                            width={12}
                            height={8}
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                          />

                          {showSortDropdown && (
                            <ul className="pf-search-listing-right-dropdown-list">
                              <li
                                className="pf-search-listing-right-dropdown-list-item"
                                onClick={() => {
                                  setSortByApiValue("");
                                  setShowSortDropdown(false);
                                }}
                              >
                                Select
                              </li>
                              {sortByPropertyOptions.map((opt) => (
                                <li
                                  key={opt.value}
                                  onClick={() => {
                                    setSortByApiValue(opt.value);
                                    setShowSortDropdown(false);
                                  }}
                                  className="pf-search-listing-right-dropdown-list-item"
                                >
                                  {opt.name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* <Box className="pf-search-listing__header-controls">
                    <Box className="pf-search-listing__view-tabs">
                      <Tabs
                        value={viewTypeTabs.indexOf(viewType)}
                        onChange={(_e, idx) => {
                          setViewType(viewTypeTabs[idx]);
                        }}
                        className="pf-search-listing__tabsComponent"
                        TabIndicatorProps={{ style: { display: "none" } }}
                      >
                        {viewTypeTabs.map((tab) => (
                          <Tab
                            key={tab}
                            label={tab}
                            className="pf-search-listing__tab"
                            disableRipple
                            disableFocusRipple
                          />
                        ))}
                      </Tabs>
                    </Box>

                    <Box className="pf-search-listing__sort-wrapper">
                      <Typography
                        variant="body2"
                        className="pf-search-listing__sort-label"
                      >
                        Sort by:
                      </Typography>
                      <FormControl className="pf-search-listing__sort-control">
                        <Select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="pf-search-listing__sort-select"
                          displayEmpty
                          IconComponent={() => (
                            <DownArrowIconBlack
                              className="pf-search-listing__sort-arrow"
                              width={18}
                              height={15}
                              fill="#707070"
                            />
                          )}
                          MenuProps={{
                            PaperProps: {
                              className: "pf-dropdown",
                            },
                            anchorOrigin: {
                              vertical: "bottom",
                              horizontal: "left",
                            },
                            transformOrigin: {
                              vertical: "top",
                              horizontal: "left",
                            },
                            disablePortal: false,
                            disableScrollLock: true,
                          }}
                        >
                          <MenuItem
                            value="featured"
                            className="pf-dropdown__item"
                          >
                            Featured
                          </MenuItem>
                          <MenuItem
                            value="price-low"
                            className="pf-dropdown__item"
                          >
                            Low to High
                          </MenuItem>
                          <MenuItem
                            value="price-high"
                            className="pf-dropdown__item"
                          >
                            High to Low
                          </MenuItem>
                          <MenuItem
                            value="newest"
                            className="pf-dropdown__item"
                          >
                            Newest First
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box> */}
                </Box>

                {/* Property Listings */}
                <Box className="pf-search-listing__property-list">
                  {shouldShowSkeleton
                    ? Array.from({ length: PROPERTY_LISTING_SKELETON_COUNT }).map((_, index) => (
                        <PropertyListingCardSkeleton key={`skeleton-${index}`} />
                      ))
                    : properties.length > 0
                      ? properties.map((property, index) => (
                          <Box key={property.id}>
                            <PropertyListingCard
                              property={property}
                              defaultFavorite={property.isSaved}
                              onPropertyClick={() =>
                                handlePropertyCardClick(property.id)
                              }
                            />
                            {/* Ad Section - Show after first property */}
                            {index === 1 && (
                              <Box className="pf-search-listing__ad-section">
                                <Typography
                                  variant="h6"
                                  className="pf-search-listing__ad-text"
                                >
                                  Newly renovated homes area all here
                                </Typography>
                                <Button
                                  variant="outlined"
                                  className="pf-search-listing__ad-button"
                                  onClick={() => {
                                    navigate("/allcommunities");
                                  }}
                                >
                                  Get a view
                                </Button>
                              </Box>
                            )}
                          </Box>
                        ))
                      : (
                          <Box
                            sx={{
                              py: 6,
                              display: "flex",
                              justifyContent: "center",
                              width: "100%",
                            }}
                          >
                            <Typography variant="h6" color="text.secondary">
                              No data found
                            </Typography>
                          </Box>
                        )}
                </Box>

                {/* Pagination */}
                {!shouldShowSkeleton && properties.length > 0 && (
                  <PFPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </main>
            </Box>
          </Box>
        </Box>

        {/* Mobile Filter Drawer */}
        <Drawer
          anchor="left"
          open={isFilterDrawerOpen}
          onClose={() => setIsFilterDrawerOpen(false)}
          PaperProps={{ className: "pf-search-listing__filter-drawer" }}
        >
          <Box className="pf-search-listing__filter-drawer-content">
            <Box className="pf-search-listing__filter-drawer-header">
              <Typography
                variant="h6"
                className="pf-search-listing__filter-drawer-title"
              >
                Filters
              </Typography>
              <IconButton
                onClick={() => setIsFilterDrawerOpen(false)}
                className="pf-search-listing__filter-drawer-close-btn"
              >
                <ModalCloseIcon width={16} height={16} fill="#222222" />
              </IconButton>
            </Box>
            <Box className="pf-search-listing__filter-drawer-body">
              <ListingFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                appliedFilters={appliedFilters}
                onFiltersChange={setAppliedFilters}
                propertyFor={propertyFor}
                onPropertyForChange={handlePropertyForChange}
                propertyTypes={selectedPropertyTypeIds}
                onPropertyTypesChange={setSelectedPropertyTypeIds}
                bedrooms={bedrooms}
                onBedroomsChange={setBedrooms}
                bathrooms={bathrooms}
                onBathroomsChange={setBathrooms}
                furnishing={furnishing}
                onFurnishingChange={setFurnishing}
                amenities={amenities}
                onAmenitiesChange={setAmenities}
                nearbySearchEnabled={nearbySearchEnabled}
                onNearbySearchEnabledChange={setNearbySearchEnabled}
                onlyCommercialProperties={onlyCommercialProperties}
                onOnlyCommercialPropertiesChange={setOnlyCommercialProperties}
                category={category}
                onCategoryChange={setCategory}
                verifiedProperties={verifiedProperties}
                onVerifiedChange={setVerifiedProperties}
                priceRange={priceRange}
                onPriceRangeChange={handlePriceRangeChange}
                postedBy={postedByFilter}
                onPostedByChange={setPostedByFilter}
                minSqft={minSqft}
                onMinSqftChange={setMinSqft}
                maxSqft={maxSqft}
                onMaxSqftChange={setMaxSqft}
                listingSearchCities={propertyListingCities}
                selectedListingLocationId={listingLocationId}
                onListingLocationIdChange={setListingLocationId}
                hiddenFilters={["postHandover", "dldStatus", "deliveryDate"]}
                onFiltersCleared={handleFiltersCleared}
              />
            </Box>
          </Box>
        </Drawer>
        <CreateAlertModal
          open={isCreateAlertModalOpen}
          onClose={() => setIsCreateAlertModalOpen(false)}
          defaultAlertName={defaultAlertName}
          frequencyOptions={alertFrequencyOptions}
          onCreate={handleSubmitCreateAlert}
        />
        <Snackbar
          open={toast.open}
          autoHideDuration={3500}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast((t) => ({ ...t, open: false }))}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </PFContainer>
    </div>
  );
}

export default SearchListing;  
