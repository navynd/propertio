import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useLocation, useNavigate } from "react-router-dom";
import PFContainer from "../../Components/container/PFContainer";
import {
  SearchIcon,
  DownArrowIconBlack,
  ModalCloseIcon,
  LeftArrowIcon,
} from "../../Components/parts/icon";
import { useGoogleMapsLoader } from "../../context/GoogleMapsLoaderContext";
import "../../assets/styles/components/MapView.scss";
import pinIcon from "../../assets/img/pin.svg";
import MoreFilterModal from "../Developers/components/MoreFilterModal";
import {
  getCompletionStatusMasterData,
  getListingFilterMasterData,
  getListingSearchCityMasterData,
  getListingTypesMasterData,
  getProjectSearchListingMasterData,
  getPropertySearchListingMasterData,
  getSupportedUrlsMasterData,
  postProjectSearch,
  postPropertySearch,
  type AmenityMaster,
  type ListingSearchCityMaster,
  type ListingTypeMaster,
  type ProjectSearchApiProject,
  type ProjectSearchRequestBody,
  type NamedValueMaster,
  type PropertySearchApiProperty,
  type PropertySearchRequestBody,
  type PropertyTypeMaster,
  type SupportedUrls,
} from "../../services/apiService";

type SupportedUrlMap = Record<string, unknown>;

function resolveSupportedUrlPath(url: unknown, baseImg?: string | null): string {
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

type MapItem = {
  id: string;
  title: string;
  locationText: string;
  image: string;
  priceText?: string;
  position?: { lat: number; lng: number };
};

type DropdownOption = { label: string; value: string };

/** Filter state passed back to SearchListing / NewProjectListing. */
export type ListingReturnState = {
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
  keyword?: string;
  listingLocationId?: string | null;
  nearSearch?: { lat: number; lng: number; radiusKm?: number };
  sortByApiValue?: string;
  viewType?: string;
  priceRange?: [number, number];
  priceFilterActive?: boolean;
  verifiedProperties?: boolean;
  postedByFilter?: string;
  minSqft?: number | null;
  maxSqft?: number | null;
  postHandover?: boolean;
  dldRegistered?: boolean;
  selectedDeliveryDate?: string;
};

type MapViewNavState = {
  focus?: { id?: string | number; lat: number; lng: number } | null;
  initialPropertySearch?: PropertySearchRequestBody | null;
  initialProjectSearch?: ProjectSearchRequestBody | null;
  returnListingState?: ListingReturnState | null;
};

function MapView() {
  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const navState = (routerLocation.state ?? {}) as MapViewNavState;
  const focus = navState.focus ?? null;
  const initialPropertySearch = navState.initialPropertySearch ?? null;
  const initialProjectSearch = navState.initialProjectSearch ?? null;
  const listingReturnBaseRef = useRef<ListingReturnState | null>(
    navState.returnListingState ?? null
  );

  const [searchValue, setSearchValue] = useState("");
  const [selectedPropertyFor, setSelectedPropertyFor] = useState(""); // listingTypeId (property/projects switch)
  const [selectedLocation, setSelectedLocation] = useState(""); // stores locationId
  const [selectedPropertyType, setSelectedPropertyType] = useState("");
  const [selectedBeds, setSelectedBeds] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedSortBy, setSelectedSortBy] = useState(""); // sortBy value
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const mapRef = useRef<any>(null);

  const [items, setItems] = useState<MapItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const initialSearchUsedRef = useRef(false);
  const initialAutoSearchRanRef = useRef(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);

  const [moreFilters, setMoreFilters] = useState({
    postHandover: false,
    dldRegistered: false,
    completionStatus: "all",
    deliveryDate: "all",
    minArea: "MinArea",
    maxArea: "MaxArea",
    amenities: [] as string[],
  });

  const [listingTypes, setListingTypes] = useState<ListingTypeMaster[]>([]);
  const [propertyForOptions, setPropertyForOptions] = useState<DropdownOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<DropdownOption[]>([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<DropdownOption[]>([]);
  const [priceOptions, setPriceOptions] = useState<DropdownOption[]>([]);
  const [sortOptions, setSortOptions] = useState<DropdownOption[]>([]);
  const [amenitiesOptions, setAmenitiesOptions] = useState<AmenityMaster[]>([]);
  const [sqftAreaSizeOptions, setSqftAreaSizeOptions] = useState<NamedValueMaster[]>([]);
  const [completionStatusOptions, setCompletionStatusOptions] = useState<NamedValueMaster[]>([]);
  const [deliveryDateOptions, setDeliveryDateOptions] = useState<NamedValueMaster[]>([]);

  const propertyImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.propertyUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const projectImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.projectUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  useEffect(() => {
    let mounted = true;
    getSupportedUrlsMasterData()
      .then((resp) => {
        if (!mounted) return;
        const items = resp.data?.items as SupportedUrls | undefined;
        const map = Array.isArray(items)
          ? (items.reduce((acc: SupportedUrlMap, cur: Record<string, unknown>) => {
              return { ...acc, ...cur };
            }, {}) as SupportedUrlMap)
          : ((items as SupportedUrlMap) ?? null);
        setSupportedUrls(map);
      })
      .catch(() => {
        if (mounted) setSupportedUrls(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedListingType = useMemo(() => {
    const id = selectedPropertyFor.trim();
    if (!id) return null;
    return (
      listingTypes.find((lt) => String(lt._id ?? lt.id) === id) ?? null
    );
  }, [listingTypes, selectedPropertyFor]);

  const isProjectMode = useMemo(() => {
    const name = String(selectedListingType?.name ?? "").toLowerCase();
    const slug = String(selectedListingType?.slug ?? "").toLowerCase();
    return name.includes("project") || slug.includes("project");
  }, [selectedListingType]);

  // Apply incoming filters from SearchListing / NewProjectListing
  useEffect(() => {
    if (!listingTypes.length) return;
    if (!initialPropertySearch && !initialProjectSearch) return;

    // Only apply once per navigation
    if (initialSearchUsedRef.current) return;
    initialSearchUsedRef.current = true;

    if (initialPropertySearch?.listingType) {
      setSelectedPropertyFor(String(initialPropertySearch.listingType));
      if (typeof initialPropertySearch.keyword === "string") {
        setSearchValue(initialPropertySearch.keyword);
      }
      if (typeof initialPropertySearch.location === "string") {
        setSelectedLocation(initialPropertySearch.location);
      }
      const pt = initialPropertySearch.propertyType;
      if (typeof pt === "string") setSelectedPropertyType(pt);
      else if (Array.isArray(pt) && typeof pt[0] === "string")
        setSelectedPropertyType(pt[0]);
      const beds = initialPropertySearch.bedrooms;
      if (typeof beds === "string") setSelectedBeds(beds);
      const sortBy = initialPropertySearch.sortBy;
      if (typeof sortBy === "string") setSelectedSortBy(sortBy);
      return;
    }

    if (initialProjectSearch) {
      const projectLt =
        listingTypes.find((lt) =>
          String(lt?.name ?? "").toLowerCase().includes("project")
        ) ?? null;
      if (projectLt?._id || projectLt?.id) {
        setSelectedPropertyFor(String(projectLt._id ?? projectLt.id));
      }
      if (typeof initialProjectSearch.keyword === "string") {
        setSearchValue(initialProjectSearch.keyword);
      }
      if (typeof initialProjectSearch.location === "string") {
        setSelectedLocation(initialProjectSearch.location);
      }
      const pt = initialProjectSearch.propertyType;
      if (typeof pt === "string") setSelectedPropertyType(pt);
      else if (Array.isArray(pt) && typeof pt[0] === "string")
        setSelectedPropertyType(pt[0]);
      const beds = initialProjectSearch.bedrooms;
      if (typeof beds === "string") setSelectedBeds(beds);
      const sortBy = initialProjectSearch.sortBy;
      if (typeof sortBy === "string") setSelectedSortBy(sortBy);
    }
  }, [initialProjectSearch, initialPropertySearch, listingTypes]);

  // When switching between property/project via "Property for", reset More filters state.
  useEffect(() => {
    setMoreFilters({
      postHandover: false,
      dldRegistered: false,
      completionStatus: "all",
      deliveryDate: "all",
      minArea: "MinArea",
      maxArea: "MaxArea",
      amenities: [],
    });
  }, [isProjectMode]);

  const mapPropertyToItem = useCallback((p: PropertySearchApiProperty): MapItem => {
    const coords = p.location?.coordinates?.coordinates;
    const pos =
      Array.isArray(coords) && coords.length >= 2
        ? (() => {
            const [lng, lat] = coords;
            if (typeof lat !== "number" || typeof lng !== "number") return undefined;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
            return { lat, lng };
          })()
        : undefined;
    const locationText =
      p.location?.fullAddress ??
      [p.location?.building, p.location?.zone, p.location?.city]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .join(", ");
    return {
      id: String(p._id ?? p.title ?? Math.random()),
      title: p.title ?? "",
      locationText: locationText || "",
      image: resolveSupportedUrlPath(
        p.images?.find((i) => i?.isPrimary)?.url ?? p.images?.[0]?.url ?? "",
        propertyImageBaseUrl
      ),
      priceText:
        typeof p.price === "number"
          ? `${p.currency ?? "AED"} ${p.price.toLocaleString("en-US")}`
          : undefined,
      position: pos,
    };
  }, [propertyImageBaseUrl]);

  const mapProjectToItem = useCallback((p: ProjectSearchApiProject): MapItem => {
    const coords = p.location?.coordinates?.coordinates;
    const pos =
      Array.isArray(coords) && coords.length >= 2
        ? (() => {
            const [lng, lat] = coords;
            if (typeof lat !== "number" || typeof lng !== "number") return undefined;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
            return { lat, lng };
          })()
        : undefined;
    const locationText =
      [p.location?.address, p.location?.zone, p.location?.city]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .join(", ") || "";
    const launch = p.launchPrice;
    const launchObj = typeof launch === "object" && launch ? launch : null;
    const startingFrom =
      typeof (launchObj as any)?.startingFrom === "number"
        ? (launchObj as any).startingFrom
        : typeof launch === "number"
          ? launch
          : null;
    const currency =
      typeof (launchObj as any)?.currency === "string"
        ? (launchObj as any).currency
        : "AED";
    return {
      id: String(p._id ?? p.slug ?? Math.random()),
      title: p.projectName ?? "",
      locationText,
      image: resolveSupportedUrlPath(p.images?.[0]?.url ?? "", projectImageBaseUrl),
      priceText:
        typeof startingFrom === "number"
          ? `${currency} ${startingFrom.toLocaleString("en-US")}`
          : undefined,
      position: pos,
    };
  }, [projectImageBaseUrl]);

  const runSearch = useCallback(
    (opts?: { useInitial?: boolean; moreFiltersOverride?: typeof moreFilters }) => {
      const useInitial = Boolean(opts?.useInitial);
      const mf = opts?.moreFiltersOverride ?? moreFilters;
      setSearchLoading(true);
      const ac = new AbortController();

      if (!isProjectMode) {
        const payload: PropertySearchRequestBody | null =
          useInitial && initialPropertySearch
            ? initialPropertySearch
            : selectedPropertyFor
              ? {
                  listingType: selectedPropertyFor,
                  ...(searchValue.trim() ? { keyword: searchValue.trim() } : {}),
                  ...(selectedLocation.trim() ? { location: selectedLocation.trim() } : {}),
                  ...(selectedPropertyType.trim()
                    ? { propertyType: selectedPropertyType.trim() }
                    : {}),
                  ...(selectedBeds.trim() ? { bedrooms: selectedBeds.trim() } : {}),
                  ...(selectedSortBy.trim() ? { sortBy: selectedSortBy.trim() } : {}),
                  page: 1,
                  limit: 50,
                }
              : null;

        if (!payload) {
          setItems([]);
          setSearchLoading(false);
          return () => {};
        }

        postPropertySearch(payload, ac.signal)
          .then((env) => {
            const list = env.data?.properties ?? [];
            setItems(list.map(mapPropertyToItem));
            const total = env.data?.pagination?.totalProperties;
            setTotalCount(typeof total === "number" && Number.isFinite(total) ? total : list.length);
          })
          .catch(() => setItems([]))
          .finally(() => setSearchLoading(false));

        return () => ac.abort();
      }

      const payload: ProjectSearchRequestBody =
        useInitial && initialProjectSearch
          ? initialProjectSearch
          : {
              ...(searchValue.trim() ? { keyword: searchValue.trim() } : {}),
              ...(selectedLocation.trim() ? { location: selectedLocation.trim() } : {}),
              ...(selectedPropertyType.trim()
                ? { propertyType: selectedPropertyType.trim() }
                : {}),
              ...(selectedBeds.trim() ? { bedrooms: selectedBeds.trim() } : {}),
              ...(mf.amenities.length ? { amenities: mf.amenities } : {}),
              ...(mf.postHandover ? { hasPostHandover: "yes" } : {}),
              ...(mf.dldRegistered ? { isDldRegistered: "yes" } : {}),
              ...(mf.completionStatus && mf.completionStatus !== "all"
                ? { completionStatus: mf.completionStatus }
                : {}),
              ...(mf.deliveryDate && mf.deliveryDate !== "all"
                ? { deliveryDate: mf.deliveryDate }
                : {}),
              ...(() => {
                const n = Number(mf.minArea);
                return mf.minArea && mf.minArea !== "MinArea" && Number.isFinite(n)
                  ? { areaMin: n }
                  : {};
              })(),
              ...(() => {
                const n = Number(mf.maxArea);
                return mf.maxArea && mf.maxArea !== "MaxArea" && Number.isFinite(n)
                  ? { areaMax: n }
                  : {};
              })(),
              ...(selectedSortBy.trim() ? { sortBy: selectedSortBy.trim() } : {}),
              page: 1,
              limit: 50,
            };

      postProjectSearch(payload, ac.signal)
        .then((env) => {
          const list = env.data?.projects ?? [];
          setItems(list.map(mapProjectToItem));
          const total = env.data?.pagination?.totalProjects;
          setTotalCount(typeof total === "number" && Number.isFinite(total) ? total : list.length);
        })
        .catch(() => setItems([]))
        .finally(() => setSearchLoading(false));

      return () => ac.abort();
    },
    [
      initialProjectSearch,
      initialPropertySearch,
      isProjectMode,
      mapProjectToItem,
      mapPropertyToItem,
      moreFilters,
      searchValue,
      selectedBeds,
      selectedLocation,
      selectedPropertyFor,
      selectedPropertyType,
      selectedSortBy,
    ]
  );

  // Auto-run when arriving from listing pages with applied filters.
  useEffect(() => {
    if (!listingTypes.length) return;
    if (!initialPropertySearch && !initialProjectSearch) return;
    if (initialAutoSearchRanRef.current) return;

    if (initialPropertySearch?.listingType) {
      if (String(selectedPropertyFor) !== String(initialPropertySearch.listingType)) {
        return;
      }
      initialAutoSearchRanRef.current = true;
      void runSearch({ useInitial: true });
      return;
    }

    if (initialProjectSearch) {
      if (!isProjectMode) return;
      initialAutoSearchRanRef.current = true;
      void runSearch({ useInitial: true });
    }
  }, [
    initialProjectSearch,
    initialPropertySearch,
    isProjectMode,
    listingTypes.length,
    runSearch,
    selectedPropertyFor,
  ]);

  const sidebarTitle = useMemo(() => {
    if (isProjectMode) return "New & Off-Plan Projects";
    const n = String(selectedListingType?.name ?? "").toLowerCase();
    const s = String(selectedListingType?.slug ?? "").toLowerCase();
    if (n.includes("rent") || s.includes("rent")) return "Properties for rent";
    if (n.includes("sale") || s.includes("sale") || n.includes("buy") || s.includes("buy"))
      return "Properties for sale";
    return "Properties";
  }, [isProjectMode, selectedListingType]);

  const buildListingReturnState = useCallback((): ListingReturnState => {
    const base = listingReturnBaseRef.current ?? {};
    const appliedFilters: string[] = [];

    if (selectedListingType?.name) {
      appliedFilters.push(String(selectedListingType.name));
    }
    const propertyTypeLabel = propertyTypeOptions.find(
      (o) => o.value === selectedPropertyType
    )?.label;
    if (propertyTypeLabel) appliedFilters.push(propertyTypeLabel);

    if (selectedBeds === "0") {
      appliedFilters.push("Studio");
    } else if (selectedBeds) {
      const bedsNum = Number(selectedBeds);
      if (Number.isFinite(bedsNum) && bedsNum > 0) {
        appliedFilters.push(`${bedsNum} bedroom`);
      }
    }

    const priceLabel = priceOptions.find((o) => o.value === selectedPrice)?.label;
    if (selectedPrice && priceLabel) appliedFilters.push(priceLabel);

    if (isProjectMode) {
      if (moreFilters.postHandover) appliedFilters.push("Post handover");
      if (moreFilters.dldRegistered) appliedFilters.push("DLD registered");
      for (const amId of moreFilters.amenities) {
        const am = amenitiesOptions.find((o) => o._id === amId);
        if (am?.name) appliedFilters.push(am.name);
      }
    } else {
      if (base.onlyCommercialProperties) {
        appliedFilters.push("Only commercial properties");
      }
      if (base.nearbySearchEnabled) appliedFilters.push("Search near by");
      const cat = base.category;
      if (cat && cat !== "All") appliedFilters.push(cat);
      if (base.furnishing) {
        appliedFilters.push(base.furnishing);
      }
    }

    const bedrooms =
      selectedBeds === "0"
        ? 0
        : selectedBeds
          ? Number(selectedBeds)
          : (base.bedrooms ?? 0);

    let minSqft = base.minSqft ?? null;
    let maxSqft = base.maxSqft ?? null;
    if (isProjectMode) {
      const minN = Number(moreFilters.minArea);
      if (
        moreFilters.minArea &&
        moreFilters.minArea !== "MinArea" &&
        Number.isFinite(minN)
      ) {
        minSqft = minN;
      }
      const maxN = Number(moreFilters.maxArea);
      if (
        moreFilters.maxArea &&
        moreFilters.maxArea !== "MaxArea" &&
        Number.isFinite(maxN)
      ) {
        maxSqft = maxN;
      }
    }

    return {
      ...base,
      appliedFilters: appliedFilters.length ? appliedFilters : base.appliedFilters ?? [],
      propertyFor: selectedPropertyFor ? [selectedPropertyFor] : base.propertyFor ?? [],
      propertyTypes: selectedPropertyType
        ? [selectedPropertyType]
        : base.propertyTypes ?? [],
      bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
      bathrooms: base.bathrooms ?? 0,
      keyword: searchValue.trim() || base.keyword,
      listingLocationId: (() => {
        const loc = selectedLocation.trim();
        if (loc) return loc;
        return base.listingLocationId ?? null;
      })(),
      amenities:
        isProjectMode && moreFilters.amenities.length
          ? moreFilters.amenities
          : base.amenities ?? [],
      sortByApiValue: selectedSortBy.trim() || base.sortByApiValue,
      minSqft,
      maxSqft,
      postHandover: isProjectMode ? moreFilters.postHandover : base.postHandover,
      dldRegistered: isProjectMode ? moreFilters.dldRegistered : base.dldRegistered,
      selectedDeliveryDate:
        isProjectMode && moreFilters.deliveryDate !== "all"
          ? moreFilters.deliveryDate
          : base.selectedDeliveryDate,
    };
  }, [
    amenitiesOptions,
    isProjectMode,
    moreFilters,
    priceOptions,
    propertyTypeOptions,
    searchValue,
    selectedBeds,
    selectedListingType?.name,
    selectedLocation,
    selectedPrice,
    selectedPropertyFor,
    selectedPropertyType,
    selectedSortBy,
  ]);

  const handleSeeAllResults = () => {
    navigate(isProjectMode ? "/newprojectlisting" : "/searchlisting", {
      state: buildListingReturnState(),
    });
  };

  const sidebarCountLabel = useMemo(() => {
    const count = Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : 0;
    return isProjectMode ? `${count} projects` : `${count} properties`;
  }, [isProjectMode, totalCount]);

  const bedsOptions = useMemo<DropdownOption[]>(
    () => [
      { label: "Studio", value: "0" },
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
      { label: "4", value: "4" },
      { label: "5", value: "5" },
      { label: "6", value: "6" },
      { label: "7", value: "7" },
    ],
    []
  );

  // Listing types (Property for) should always be available.
  useEffect(() => {
    let cancelled = false;
    void getListingTypesMasterData()
      .then((resp) => {
        if (cancelled) return;
        const raw =
          (resp as any)?.data?.items ??
          (resp as any)?.data?.listingTypes ??
          (resp as any)?.data?.listingtypes ??
          [];
        const items = (Array.isArray(raw) ? raw : []) as ListingTypeMaster[];
        setListingTypes(items);
        const opts = items
          .filter((lt) => (lt?._id || lt?.id) && lt?.name)
          .map((lt) => ({
            value: String(lt._id ?? lt.id),
            label: String(lt.name),
          }));
        setPropertyForOptions(opts);

        // Default selection: first listing type
        if (!selectedPropertyFor && opts.length) {
          setSelectedPropertyFor(opts[0].value);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setListingTypes([]);
        setPropertyForOptions([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mode-specific master data (changes when Property for changes)
  useEffect(() => {
    let cancelled = false;
    const kind = isProjectMode ? "project" : "property";
    void Promise.all([
      getListingSearchCityMasterData(kind),
      getListingFilterMasterData(),
      isProjectMode ? getProjectSearchListingMasterData() : getPropertySearchListingMasterData(),
      isProjectMode ? getCompletionStatusMasterData() : Promise.resolve(null),
    ])
      .then(([locResp, filterResp, sortResp, csResp]) => {
        if (cancelled) return;

        const cities = (locResp?.data?.cities ?? []) as ListingSearchCityMaster[];
        const locOpts = (Array.isArray(cities) ? cities : [])
          .filter((c) => c?._id && c?.displayName)
          .map((c) => ({ value: String(c._id), label: String(c.displayName) }));
        setLocationOptions(locOpts);

        const pts = (filterResp?.data?.propertyTypes ?? []) as PropertyTypeMaster[];
        const ptOpts = (Array.isArray(pts) ? pts : [])
          .filter((p) => (p?._id || (p as any)?.id) && p?.name)
          .map((p) => ({
            // Send id to API (not name/slug)
            value: String(p._id ?? (p as any).id),
            label: String(p.name),
          }));
        setPropertyTypeOptions(ptOpts);

        const pr = (filterResp?.data?.priceRange ?? []) as NamedValueMaster[];
        const priceOpts = (Array.isArray(pr) ? pr : [])
          .filter((p) => p?.name && p?.value)
          .map((p) => ({ value: String(p.value), label: String(p.name) }));
        setPriceOptions(priceOpts);

        const sortRaw = isProjectMode
          ? ((sortResp as any)?.data?.sortByProject ??
            (sortResp as any)?.data?.sortbyproject ??
            [])
          : ((sortResp as any)?.data?.sortByProperty ??
            (sortResp as any)?.data?.sortbyproperty ??
            []);
        const sortOpts = (Array.isArray(sortRaw) ? sortRaw : [])
          .filter((s) => (s as any)?.name && (s as any)?.value)
          .map((s) => ({
            value: String((s as any).value),
            label: String((s as any).name),
          }));
        setSortOptions(sortOpts);

        if (isProjectMode) {
          setAmenitiesOptions((filterResp?.data?.amenities ?? []) as AmenityMaster[]);
          setSqftAreaSizeOptions((filterResp?.data?.sqftAreaSizes ?? []) as NamedValueMaster[]);
          setDeliveryDateOptions((filterResp?.data?.deliveryDates ?? []) as NamedValueMaster[]);
          setCompletionStatusOptions(((csResp as any)?.data?.completionStatus ?? []) as NamedValueMaster[]);
        } else {
          setAmenitiesOptions([]);
          setSqftAreaSizeOptions([]);
          setDeliveryDateOptions([]);
          setCompletionStatusOptions([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLocationOptions([]);
        setPropertyTypeOptions([]);
        setPriceOptions([]);
        setSortOptions([]);
        setAmenitiesOptions([]);
        setSqftAreaSizeOptions([]);
        setDeliveryDateOptions([]);
        setCompletionStatusOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isProjectMode, selectedPropertyFor]);

  // Dropdown states
  const [propertyForOpen, setPropertyForOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [propertyTypeOpen, setPropertyTypeOpen] = useState(false);
  const [bedsOpen, setBedsOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [sortByOpen, setSortByOpen] = useState(false);

  // Refs for dropdowns
  const propertyForDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);
  const bedsDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const sortByDropdownRef = useRef<HTMLDivElement>(null);

  // Toggle handlers with mutual exclusivity
  const handlePropertyForToggle = () => {
    setPropertyForOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setLocationOpen(false);
        setPropertyTypeOpen(false);
        setBedsOpen(false);
        setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handleLocationToggle = () => {
    setLocationOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setPropertyForOpen(false);
        setPropertyTypeOpen(false);
        setBedsOpen(false);
        setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handlePropertyTypeToggle = () => {
    setPropertyTypeOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setPropertyForOpen(false);
        setLocationOpen(false);
        setBedsOpen(false);
        setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handleBedsToggle = () => {
    setBedsOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setPropertyForOpen(false);
        setLocationOpen(false);
        setPropertyTypeOpen(false);
        setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handlePriceToggle = () => {
    setPriceOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setPropertyForOpen(false);
        setLocationOpen(false);
        setPropertyTypeOpen(false);
        setBedsOpen(false);
      }
      return newValue;
    });
  };

  const handleSortByToggle = () => {
    setSortByOpen((prev) => !prev);
  };

  // Outside click handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyForDropdownRef.current &&
        !propertyForDropdownRef.current.contains(event.target as Node)
      ) {
        setPropertyForOpen(false);
      }
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setLocationOpen(false);
      }
      if (
        propertyTypeDropdownRef.current &&
        !propertyTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setPropertyTypeOpen(false);
      }
      if (
        bedsDropdownRef.current &&
        !bedsDropdownRef.current.contains(event.target as Node)
      ) {
        setBedsOpen(false);
      }
      if (
        priceDropdownRef.current &&
        !priceDropdownRef.current.contains(event.target as Node)
      ) {
        setPriceOpen(false);
      }
      if (
        sortByDropdownRef.current &&
        !sortByDropdownRef.current.contains(event.target as Node)
      ) {
        setSortByOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const mapCenter = useMemo(() => {
    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
      return { lat: focus.lat, lng: focus.lng };
    }
    const withPos = items.filter((i) => i.position);
    if (withPos.length === 0) {
      return { lat: 25.2048, lng: 55.2708 };
    }
    const sums = withPos.reduce(
      (acc, item) => {
        acc.lat += item.position!.lat;
        acc.lng += item.position!.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return {
      lat: sums.lat / withPos.length,
      lng: sums.lng / withPos.length,
    };
  }, [focus, items]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    }),
    []
  );

  const activeProperty = useMemo(() => {
    if (!hoveredPropertyId) return null;
    return items.find((p) => String(p.id) === hoveredPropertyId) ?? null;
  }, [hoveredPropertyId, items]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) {
      return;
    }
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(14);
    const focusId = focus.id != null ? String(focus.id).trim() : "";
    if (focusId && items.some((p) => String(p.id) === focusId)) {
      setHoveredPropertyId(focusId);
    }
  }, [focus, items]);

  const handleMapLoad = useCallback((map: any) => {
    mapRef.current = map;
    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
      map.panTo({ lat: focus.lat, lng: focus.lng });
      map.setZoom(14);
      const focusId = focus.id != null ? String(focus.id).trim() : "";
      if (focusId) setHoveredPropertyId(focusId);
    }
  }, [focus]);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handlePropertyClick = useCallback((property: MapItem) => {
    if (!mapRef.current || !property.position) return;
    mapRef.current.panTo(property.position);
    mapRef.current.setZoom(14);
    const numId = Number(property.id);
    if (Number.isFinite(numId)) setHoveredPropertyId(String(numId));
  }, []);

  return (
    <div className="pf-map-view">
      {/* Top Filter Bar */}
      <Box className="pf-map-view__filter-bar">
        <PFContainer>
          <Box className="pf-map-view__filters">
            <Box className="pf-map-view__filters-left">
              <TextField
                className="pf-map-view__search"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="pf-map-view__search-icon" />
                    </InputAdornment>
                  ),
                }}
              />
              {/* Property For (Property mode only) */}
              <Box ref={propertyForDropdownRef} className="pf-map-view__dropdown">
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handlePropertyForToggle}
                >
                  <Typography
                    className={`pf-map-view__dropdown-text ${
                      selectedPropertyFor ? "selected" : ""
                    }`}
                  >
                    {propertyForOptions.find((o) => o.value === selectedPropertyFor)
                      ?.label || "Property for"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {propertyForOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {propertyForOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedPropertyFor(option.value);
                          setPropertyForOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Location Dropdown */}
              <Box
                ref={locationDropdownRef}
                className="pf-map-view__dropdown"
              >
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handleLocationToggle}
                >
                  <Typography className={`pf-map-view__dropdown-text ${selectedLocation ? "selected" : ""}`}>
                    {locationOptions.find((o) => o.value === selectedLocation)?.label ||
                      "Location"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {locationOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {locationOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedLocation(option.value);
                          setLocationOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Property Type Dropdown */}
              <Box
                ref={propertyTypeDropdownRef}
                className="pf-map-view__dropdown"
              >
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handlePropertyTypeToggle}
                >
                  <Typography className="pf-map-view__dropdown-text">
                    {propertyTypeOptions.find((o) => o.value === selectedPropertyType)
                      ?.label || "Property type"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {propertyTypeOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {propertyTypeOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedPropertyType(option.value);
                          setPropertyTypeOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Beds Dropdown */}
              <Box ref={bedsDropdownRef} className="pf-map-view__dropdown">
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handleBedsToggle}
                >
                  <Typography className="pf-map-view__dropdown-text">
                    {selectedBeds || "Beds"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {bedsOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {bedsOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedBeds(option.value);
                          setBedsOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Price Dropdown */}
              <Box ref={priceDropdownRef} className="pf-map-view__dropdown">
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handlePriceToggle}
                >
                  <Typography className="pf-map-view__dropdown-text">
                    {priceOptions.find((o) => o.value === selectedPrice)?.label ||
                      "Price"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {priceOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {priceOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedPrice(option.value);
                          setPriceOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* More Filters */}
              {isProjectMode && (
                <Box className="pf-map-view__dropdown">
                  <Box
                    className="pf-map-view__dropdown-btn"
                    onClick={() => setMoreFiltersOpen(true)}
                  >
                    <Typography className="pf-map-view__dropdown-text">
                      More filters
                    </Typography>
                    <DownArrowIconBlack width={13} height={13} />
                  </Box>
                </Box>
              )}
            </Box>
            <Box className="pf-map-view__filters-right">
              <Button
                variant="text"
                className="pf-map-view__clear-filters"
                onClick={() => {
                  const keepPropertyFor =
                    String(selectedPropertyFor ?? "").trim() ||
                    propertyForOptions[0]?.value ||
                    "";

                  // Keep "Property for" selection; if empty, fall back to first listing type.
                  setSelectedPropertyFor((prev) => {
                    const v = String(prev ?? "").trim();
                    if (v) return v;
                    return propertyForOptions[0]?.value ?? "";
                  });
                  setSearchValue("");
                  setSelectedLocation("");
                  setSelectedPropertyType("");
                  setSelectedBeds("");
                  setSelectedPrice("");
                  setSelectedSortBy("");
                  setMoreFilters({
                    postHandover: false,
                    dldRegistered: false,
                    completionStatus: "all",
                    deliveryDate: "all",
                    minArea: "MinArea",
                    maxArea: "MaxArea",
                    amenities: [],
                  });
                  setMoreFiltersOpen(false);

                  // Trigger API call immediately with clearAll.
                  if (isProjectMode) {
                    postProjectSearch({ clearAll: true, page: 1, limit: 50 })
                      .then((env) => {
                        const list = env.data?.projects ?? [];
                        setItems(list.map(mapProjectToItem));
                        const total = env.data?.pagination?.totalProjects;
                        setTotalCount(
                          typeof total === "number" && Number.isFinite(total)
                            ? total
                            : list.length
                        );
                      })
                      .catch(() => {
                        setItems([]);
                        setTotalCount(0);
                      });
                  } else if (keepPropertyFor) {
                    postPropertySearch(
                      { listingType: keepPropertyFor, clearAll: true, page: 1, limit: 50 },
                      undefined
                    )
                      .then((env) => {
                        const list = env.data?.properties ?? [];
                        setItems(list.map(mapPropertyToItem));
                        const total = env.data?.pagination?.totalProperties;
                        setTotalCount(
                          typeof total === "number" && Number.isFinite(total)
                            ? total
                            : list.length
                        );
                      })
                      .catch(() => {
                        setItems([]);
                        setTotalCount(0);
                      });
                  }
                }}
              >
                Clear all filters
              </Button>

              <Button
                variant="contained"
                className="pf-map-view__apply-btn"
                disableElevation
                onClick={() => runSearch()}
              >
                Apply filter
              </Button>
            </Box>
          </Box>
        </PFContainer>
      </Box>

      {/* Main Content - Map and Sidebar */}
      <Box className="pf-map-view__main">
        {/* Map Section */}
        <Box className="pf-map-view__map-container">
          <Button className="pf-map-view__exit-btn" onClick={() => navigate(-1)}>
            <LeftArrowIcon width={16} height={16} />
            <Typography>Exit full map</Typography>
          </Button>

          {!googleMapsApiKey ? (
            <Box className="pf-map-view__map-fallback">
              Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to load the map.
            </Box>
          ) : loadError ? (
            <Box className="pf-map-view__map-fallback">
              We couldn't load Google Maps. Please check your API key and network
              connection.
            </Box>
          ) : !isLoaded ? (
            <Box className="pf-map-view__map-fallback">Loading map…</Box>
          ) : (
            <GoogleMap
              mapContainerClassName="pf-map-view__map"
              center={mapCenter}
              zoom={12}
              options={mapOptions}
              onLoad={handleMapLoad}
              onUnmount={handleMapUnmount}
            >
              {items
                .filter((it) => it.position)
                .map((property) => {
                const itemId = String(property.id);
                const mapsApi = (window as typeof window & { google?: any }).google?.maps;
                const iconConfig = mapsApi ? {
                  url: pinIcon,
                  scaledSize: new mapsApi.Size(31, 41),
                  anchor: new mapsApi.Point(15.5, 41),
                } : { url: pinIcon };

                return (
                  <Marker
                    key={property.id}
                    position={property.position!}
                    onMouseOver={() => {
                      setHoveredPropertyId(itemId);
                    }}
                    onMouseOut={() => setHoveredPropertyId(null)}
                    icon={iconConfig}
                  />
                );
              })}

              {activeProperty?.position && (
                <InfoWindow position={activeProperty.position}>
                  <Box></Box>
                  {/* <Box className="pf-map-view__info-window">
                    <Typography className="pf-map-view__info-title">
                      {activeProperty.name}
                    </Typography>
                    <Typography className="pf-map-view__info-location">
                      {activeProperty.location}
                    </Typography>
                    <Typography className="pf-map-view__info-price">
                      Launch price: {activeProperty.launchPrice} {activeProperty.currency}
                    </Typography>
                  </Box> */}
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </Box>

        {/* Sidebar */}
        {isSidebarOpen && (
          <Box className="pf-map-view__sidebar">
            <Box className="pf-map-view__sidebar-header">
              <Box>
                <Typography className="pf-map-view__sidebar-title">
                  {sidebarTitle}
                </Typography>
                <Typography className="pf-map-view__sidebar-count">
                  {sidebarCountLabel}
                </Typography>
              </Box>
              {/* <IconButton
                className="pf-map-view__sidebar-close"
                onClick={() => setIsSidebarOpen(false)}
              >
                <ModalCloseIcon width={16} height={16} />
              </IconButton> */}
            </Box>

            <Box className="pf-map-view__sidebar-sort">
              <Typography className="pf-map-view__sidebar-sort-label">
                Sort by:
              </Typography>
              <Box ref={sortByDropdownRef} className="pf-map-view__dropdown">
                <Box
                  className="pf-map-view__dropdown-btn"
                  onClick={handleSortByToggle}
                >
                  <Typography
                    className={`pf-map-view__dropdown-text ${
                      selectedSortBy ? "selected" : ""
                    }`}
                  >
                    {sortOptions.find((o) => o.value === selectedSortBy)?.label ||
                      "Sort by"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
                {sortByOpen && (
                  <Box className="pf-map-view__dropdown-menu">
                    {sortOptions.map((option) => (
                      <Box
                        key={option.value}
                        className="pf-map-view__dropdown-item"
                        onClick={() => {
                          setSelectedSortBy(option.value);
                          setSortByOpen(false);
                        }}
                      >
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            <Box className="pf-map-view__sidebar-list">
              {!searchLoading && items.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ color: "#666", fontSize: 14 }}>
                    No data found
                  </Typography>
                </Box>
              ) : (
                items.map((property) => (
                  <Box
                    key={property.id}
                    className="pf-map-view__property-item"
                    onMouseEnter={() => {
                      setHoveredPropertyId(String(property.id));
                    }}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    onClick={() => handlePropertyClick(property)}
                  >
                    <Box className="pf-map-view__property-image">
                      <img
                        src={property.image}
                        alt={property.title}
                        className="pf-map-view__property-img"
                      />
                    </Box>
                    <Box className="pf-map-view__property-content">
                      <Typography className="pf-map-view__property-name">
                        {property.title}
                      </Typography>
                      <Typography className="pf-map-view__property-location">
                        {property.locationText}
                      </Typography>
                      <Typography className="pf-map-view__property-price">
                        {property.priceText ?? ""}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            <Box className="pf-map-view__sidebar-footer">
              <Button
                variant="contained"
                className="pf-map-view__see-all-btn"
                disableElevation
                fullWidth
                onClick={handleSeeAllResults}
              >
                {searchLoading ? "Loading…" : `See all ${items.length} results`}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {isProjectMode && (
        <MoreFilterModal
          open={moreFiltersOpen}
          onClose={() => setMoreFiltersOpen(false)}
          amenitiesOptions={amenitiesOptions}
          sqftAreaSizeOptions={sqftAreaSizeOptions}
          completionStatusOptions={completionStatusOptions}
          deliveryDateOptions={deliveryDateOptions}
          resultsCount={items.length}
          initialFilters={moreFilters}
          onApply={(next) => {
            setMoreFilters(next);
            setMoreFiltersOpen(false);
            runSearch({ moreFiltersOverride: next });
          }}
          onClear={() => {
            const cleared = {
              postHandover: false,
              dldRegistered: false,
              completionStatus: "all",
              deliveryDate: "all",
              minArea: "MinArea",
              maxArea: "MaxArea",
              amenities: [],
            };
            setMoreFilters(cleared);
            runSearch({ moreFiltersOverride: cleared });
          }}
        />
      )}
    </div>
  );
}

export default MapView;
