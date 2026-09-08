import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Drawer,
  Skeleton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
import PropertyCard, { type PropertyTag } from "../../Components/cards/HomePropertyCard";
import PFPagination from "../../Components/pagination/PFPagination";
import ListingFilter from "./components/ListingFilter";
import CreateAlertModal from "./components/CreateAlertModal";
import "../../assets/styles/SearchListing.scss";
import searchListing01 from "../../assets/img/searchlisting01.png";
import searchListing02 from "../../assets/img/searchlisting02.png";
import searchListing03 from "../../assets/img/searchlisting03.png";
import companyLogo1 from "../../assets/img/company_logos/C13.jpg";
import companyLogo2 from "../../assets/img/company_logos/C14.jpg";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import {
  postProjectSearch,
  getListingFilterMasterData,
  getListingSearchCityMasterData,
  getSupportedUrlsMasterData,
  getProjectSearchListingMasterData,
  type ListingSearchCityMaster,
  type ProjectSearchApiProject,
  type ProjectSearchRequestBody,
  type NamedValueMaster,
} from "../../services/apiService";
import {
  requestUserGeolocation,
  DEFAULT_NEARBY_RADIUS_KM,
} from "../../utils/requestUserGeolocation";

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

function NewProjectCardSkeleton() {
  return (
    <Box className="pf-newproject-listing__card">
      <Box className="pf-projectCard" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Skeleton variant="rectangular" height={250} animation="wave" />
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" height={28} animation="wave" />
          <Skeleton variant="text" width="75%" height={18} animation="wave" />
          <Box sx={{ mt: 1 }}>
            <Skeleton variant="text" width="55%" height={18} animation="wave" />
            <Skeleton variant="text" width="50%" height={18} animation="wave" />
            <Skeleton variant="text" width="45%" height={18} animation="wave" />
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Skeleton variant="rectangular" width={120} height={34} animation="wave" />
            <Skeleton variant="rectangular" width={90} height={34} animation="wave" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function mapApiProjectToCardData(params: {
  project: ProjectSearchApiProject;
  projectImageBaseUrl?: string | null;
  developerLogoBaseUrl?: string | null;
}): {
  key: string;
  projectId: string;
  image: string;
  logo?: string;
  title: string;
  location: string;
  features: string[];
  launchPrice?: string;
  currency?: string;
  tags?: PropertyTag[];
  developerPhone?: string;
  whatsappMessage?: string;
} {
  const { project, projectImageBaseUrl, developerLogoBaseUrl } = params;
  const images = project.images ?? [];
  const primaryImageRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const image = resolveSupportedUrlPath(primaryImageRaw, projectImageBaseUrl);

  const logo = resolveSupportedUrlPath(
    project.developer?.logo as unknown,
    developerLogoBaseUrl
  );

  const city = project.location?.city ?? "";
  const zone = project.location?.zone ?? "";
  const address = project.location?.address ?? "";
  const location = [address, zone, city].filter(Boolean).join(", ");

  const features: string[] = [];
  if (project.bedroomRange?.min != null || project.bedroomRange?.max != null) {
    const min = project.bedroomRange?.min;
    const max = project.bedroomRange?.max;
    if (min != null && max != null) {
      features.push(min === max ? `${min} bedrooms` : `${min}-${max} bedrooms`);
    } else if (min != null) {
      features.push(`${min}+ bedrooms`);
    } else if (max != null) {
      features.push(`Up to ${max} bedrooms`);
    }
  }
  if (project.paymentPlansCount != null && project.paymentPlansCount > 0) {
    features.push(`${project.paymentPlansCount} payment plans`);
  }
  if (project.availableUnits != null) {
    features.push(`${project.availableUnits} units available`);
  } else if (project.totalUnits != null) {
    features.push(`${project.totalUnits} total units`);
  }

  const tags: PropertyTag[] = [];
  if ((project.completionStatus ?? "").toLowerCase() === "off-plan") {
    tags.push({ label: "OFF-PLAN", type: "offplan" });
  }
  if (project.deliveryQuarter) {
    tags.push({
      label: `DELIVERY DATE: ${project.deliveryQuarter}`,
      type: "deliverydate",
    });
  }
  if (project.saleStarted) {
    const d = new Date(project.saleStarted);
    if (!Number.isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
      const year = d.getFullYear();
      tags.push({
        label: `SALE STARTED : ${day} ${month} ${year}`,
        type: "salestarted",
      });
    }
  }
  if (project.paymentPlansCount != null && project.paymentPlansCount > 0) {
    tags.push({
      label: `${project.paymentPlansCount} PAYMENT PLAN AVAILABLE`,
      type: "paymentplan",
    });
  }

  return {
    key: project._id ?? project.slug ?? project.projectName ?? `${Math.random()}`,
    projectId: String(project._id ?? project.slug ?? project.projectName ?? "").trim(),
    image: image || companyLogo1,
    logo: logo || undefined,
    title: project.projectName ?? "",
    location,
    features: features.length ? features : [city || "UAE"],
    launchPrice: (() => {
      const lp = project.launchPrice as any;
      const n =
        typeof lp === "number"
          ? lp
          : typeof lp?.startingFrom === "number"
            ? lp.startingFrom
            : null;
      return typeof n === "number" && Number.isFinite(n)
        ? n.toLocaleString("en-US")
        : undefined;
    })(),
    currency: (() => {
      const lp = project.launchPrice as any;
      const c = typeof lp?.currency === "string" ? lp.currency.trim() : "";
      return c || "AED";
    })(),
    tags: tags.length ? tags : undefined,
    developerPhone: String((project.developer as { phoneNumber?: string } | null)?.phoneNumber ?? "").trim() || undefined,
    whatsappMessage: `Hi, I'm interested in this project: ${String(
      project.projectName ?? "Project"
    ).trim()}${project._id ? ` (ID: ${project._id})` : ""}.`,
  };
}

/** Debounce search box before calling project search (`keyword`). */
const PROJECT_SEARCH_KEYWORD_DEBOUNCE_MS = 450;

/** Same convention as property search: values ≤ 10_000 = millions AED; larger = full AED. */
function listingPriceFilterToApiAed(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  return value <= 10_000 ? value * 1_000_000 : value;
}

function buildProjectSearchRequest(params: {
  propertyTypeIds: string[];
  bedrooms: number;
  bathrooms: number;
  searchQuery: string;
  amenities: string[];
  verifiedOnly: boolean;
  postHandover: boolean;
  dldRegistered: boolean;
  viewTypeTab: string;
  /** Master-data `value` sent as API `sortBy` (omit when empty). */
  sortBy: string;
  page: number;
  limit: number;
  appliedFilters: string[];
  priceRange: [number, number];
  priceFilterActive: boolean;
  minSqft: number | null;
  maxSqft: number | null;
  selectedDeliveryDate: string;
  /** ListingSearchCity ObjectId from `projectlocations` master. */
  listingLocationId: string | null;
  nearbySearchEnabled: boolean;
  nearSearchCoords: { lat: number; lng: number } | null;
  forceClearAll?: boolean;
}): ProjectSearchRequestBody {
  if (params.forceClearAll) {
    return {
      clearAll: true,
      page: params.page,
      limit: params.limit,
    };
  }

  const body: ProjectSearchRequestBody = {
    page: params.page,
    limit: params.limit,
  };
  if (params.sortBy.trim()) {
    body.sortBy = params.sortBy.trim();
  }

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
  if (params.bathrooms > 0) {
    body.bathrooms = String(params.bathrooms);
  }

  if (params.priceFilterActive) {
    const [prMin, prMax] = params.priceRange;
    if (prMin > 0) body.priceMin = listingPriceFilterToApiAed(prMin);
    if (prMax > 0) body.priceMax = listingPriceFilterToApiAed(prMax);
  }

  if (params.minSqft != null) body.areaMin = params.minSqft;
  if (params.maxSqft != null) body.areaMax = params.maxSqft;

  if (params.amenities.length === 1) {
    body.amenities = params.amenities[0];
  } else if (params.amenities.length > 1) {
    body.amenities = params.amenities;
  }

  if (params.postHandover) body.hasPostHandover = "true";
  if (params.dldRegistered) body.isDldRegistered = "true";
  if (params.verifiedOnly) body.isVerified = "true";

  if (params.viewTypeTab === "Off-plan") {
    body.completionStatus = "off-plan";
  } else if (params.viewTypeTab === "Ready") {
    body.completionStatus = "ready";
  }

  const dd = params.selectedDeliveryDate.trim();
  if (dd && dd !== "all-dates") {
    body.deliveryDate = dd;
  }

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

const newProjectListingHiddenFilters = [
  "propertyFor",
  "postedBy",
  "furnishing",
  "virtualViewings",
  "verifiedProperties"
] as const;

function NewProjectListing() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleProjectCardClick = useCallback(
    (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return;
      navigate(`/newprojectdrilldown/${encodeURIComponent(trimmed)}`, {
        state: { projectId: trimmed },
      });
    },
    [navigate]
  );
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
    /** ListingSearchCity id when coming from property search (project master locations). */
    listingLocationId?: string | null;
    nearSearch?: { lat: number; lng: number; radiusKm?: number };
    sortByApiValue?: string;
    viewType?: string;
    priceRange?: [number, number];
    priceFilterActive?: boolean;
    verifiedProperties?: boolean;
    minSqft?: number | null;
    maxSqft?: number | null;
    postHandover?: boolean;
    dldRegistered?: boolean;
    selectedDeliveryDate?: string;
  };

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
  const [selectedPropertyTypeIds, setSelectedPropertyTypeIds] = useState<
    string[]
  >(locationState.propertyTypes ?? []);
  const [bedrooms, setBedrooms] = useState<number>(locationState.bedrooms ?? 0);
  const [bathrooms, setBathrooms] = useState<number>(
    locationState.bathrooms ?? 0
  );
  const [furnishing, setFurnishing] = useState<string>(
    locationState.furnishing ?? ""
  );
  const [amenities, setAmenities] = useState<string[]>(
    locationState.amenities ?? []
  );
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
  const [onlyCommercialProperties, setOnlyCommercialProperties] =
    useState<boolean>(locationState.onlyCommercialProperties ?? false);
  const [category, setCategory] = useState<string>(
    locationState.category ?? "All"
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([3, 30]);
  const [priceRangeBounds, setPriceRangeBounds] = useState<[number, number] | null>(
    null
  );
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [minSqft, setMinSqft] = useState<number | null>(null);
  const [maxSqft, setMaxSqft] = useState<number | null>(null);
  const [projectListingCities, setProjectListingCities] = useState<
    ListingSearchCityMaster[]
  >([]);
  const [listingLocationId, setListingLocationId] = useState<string | null>(
    () => {
      const id = locationState.listingLocationId?.trim();
      return id || null;
    }
  );
  const [postHandover, setPostHandover] = useState(false);
  const [dldRegistered, setDldRegistered] = useState(false);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState("");
  const sendClearAllNextRef = useRef(false);
  const [clearAllSearchNonce, setClearAllSearchNonce] = useState(0);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [showPropertyType, setShowPropertyType] = useState<boolean>(false);
  const [sortByApiValue, setSortByApiValue] = useState<string>("");
  const [sortByProjectOptions, setSortByProjectOptions] = useState<
    NamedValueMaster[]
  >([]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyTypeDropdownRef.current &&
        !propertyTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPropertyType(false);
      }
    };

    if (showPropertyType) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPropertyType]);
  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] =
    useState<boolean>(false);

  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);
  const [apiProjects, setApiProjects] = useState<ProjectSearchApiProject[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [isProjectSearchLoading, setIsProjectSearchLoading] =
    useState<boolean>(false);
  const [hasLoadedProjectsOnce, setHasLoadedProjectsOnce] =
    useState<boolean>(false);
  const projectSearchRequestIdRef = useRef(0);

  const projectImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.projectUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const developerLogoBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.developerUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const projects = useMemo(() => {
    return apiProjects.map((project) =>
      mapApiProjectToCardData({
        project,
        projectImageBaseUrl,
        developerLogoBaseUrl,
      })
    );
  }, [apiProjects, projectImageBaseUrl, developerLogoBaseUrl]);

  const shouldShowSkeleton =
    (isProjectSearchLoading &&
      (!hasLoadedProjectsOnce || apiProjects.length === 0)) ||
    (!isProjectSearchLoading &&
      !hasLoadedProjectsOnce &&
      apiProjects.length === 0);

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
        if (mounted) setSupportedUrls(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getProjectSearchListingMasterData()
      .then((resp) => {
        if (!mounted) return;
        const opts = resp.data?.sortByProject ?? [];
        setSortByProjectOptions(opts);
      })
      .catch(() => {
        if (mounted) setSortByProjectOptions([]);
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
    setVerifiedProperties(false);
    setOnlyCommercialProperties(false);
    setCategory("All");
    setNearbySearchEnabled(false);
    setNearSearchCoords(null);
    setCurrentPage(1);
    setPriceRange(priceRangeBounds ?? [3, 30]);
    setPriceFilterActive(false);
    setMinSqft(null);
    setMaxSqft(null);
    setListingLocationId(null);
    setPostHandover(false);
    setDldRegistered(false);
    setSelectedDeliveryDate("");
    setSortByApiValue("");
    sendClearAllNextRef.current = true;
    setClearAllSearchNonce((n) => n + 1);
  }, [priceRangeBounds]);

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
    if (s.minSqft != null) setMinSqft(s.minSqft);
    if (s.maxSqft != null) setMaxSqft(s.maxSqft);
    if (typeof s.postHandover === "boolean") setPostHandover(s.postHandover);
    if (typeof s.dldRegistered === "boolean") setDldRegistered(s.dldRegistered);
    if (typeof s.selectedDeliveryDate === "string") {
      setSelectedDeliveryDate(s.selectedDeliveryDate);
    }
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
    getListingSearchCityMasterData("project")
      .then((resp) => {
        if (!mounted) return;
        const list = resp.data?.cities ?? [];
        setProjectListingCities(
          list.filter((c) => c?._id?.trim() && c?.displayName?.trim())
        );
      })
      .catch(() => {
        if (mounted) setProjectListingCities([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, PROJECT_SEARCH_KEYWORD_DEBOUNCE_MS);
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
      return undefined;
    }
    const payload = buildProjectSearchRequest({
      propertyTypeIds: selectedPropertyTypeIds,
      bedrooms,
      bathrooms,
      searchQuery: debouncedSearchQuery,
      amenities,
      verifiedOnly: verifiedProperties,
      postHandover,
      dldRegistered,
      viewTypeTab: viewType,
      sortBy: sortByApiValue,
      page: currentPage,
      limit: 9,
      appliedFilters,
      priceRange,
      priceFilterActive,
      minSqft,
      maxSqft,
      selectedDeliveryDate,
      listingLocationId,
      nearbySearchEnabled,
      nearSearchCoords,
      forceClearAll,
    });
    // console.log("[project search] request body", payload);
    const requestId = ++projectSearchRequestIdRef.current;
    if (forceClearAll) {
      setHasLoadedProjectsOnce(false);
      setApiProjects([]);
    }
    setIsProjectSearchLoading(true);
    postProjectSearch(payload, abortController.signal)
      .then((envelope) => {
        if (cancelled || projectSearchRequestIdRef.current !== requestId) return;
        const rawSort = envelope.data?.appliedFilters?.sortBy;
        const apiSort =
          typeof rawSort === "string" ? rawSort.trim() : "";
        if (apiSort) {
          setSortByApiValue(apiSort);
        }
        setApiProjects(envelope.data?.projects ?? []);
        const apiPagination = envelope.data?.pagination;
        if (apiPagination?.totalPages && Number.isFinite(apiPagination.totalPages)) {
          setTotalPages(apiPagination.totalPages);
        }
        setTotalProjects(apiPagination?.totalProjects ?? 0);
      })
      .catch((err: unknown) => {
        if (cancelled || projectSearchRequestIdRef.current !== requestId) return;
        const aborted =
          abortController.signal.aborted ||
          (typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: string }).code === "ERR_CANCELED");
        if (aborted) return;
        console.error("[project search] request failed", err);
      })
      .finally(() => {
        if (projectSearchRequestIdRef.current === requestId) {
          setIsProjectSearchLoading(false);
          setHasLoadedProjectsOnce(true);
        }
      });
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    selectedPropertyTypeIds,
    bedrooms,
    bathrooms,
    debouncedSearchQuery,
    amenities,
    verifiedProperties,
    postHandover,
    dldRegistered,
    viewType,
    sortByApiValue,
    currentPage,
    appliedFilters,
    priceRange,
    priceFilterActive,
    minSqft,
    maxSqft,
    selectedDeliveryDate,
    listingLocationId,
    nearbySearchEnabled,
    nearSearchCoords,
    clearAllSearchNonce,
  ]);

  const sortDisplayLabel =
    sortByProjectOptions.find((o) => o.value === sortByApiValue)?.name ??
    (sortByApiValue ? sortByApiValue : "Select");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const viewTypeTabs = ["Any", "Off-plan", "Ready"];

  const fallbackBannerImages = [searchListing01, searchListing02, searchListing03];
  const fallbackBannerTitles = [
    "Modern homes in UAE",
    "Furnished Homes",
    "Properties Nearby",
  ];

  const pageBanners = usePageBanners("project-page", {
    images: fallbackBannerImages,
    titles: fallbackBannerTitles,
  });

  /* Mock projects (disabled; API-bound projects now)
  type Project = {
    id: number;
    city: string;
    title: string;
    location: string;
    launchPrice?: string;
    currency?: string;
    features: string[];
    image: string;
    logo?: string;
    tags?: PropertyTag[];
  };

  const projects: Project[] = [
    {
      id: 1,
      city: "Dubai",
      title: "Omniyat Bespoke",
      location: "Dubai, Palm Jumeirah",
      features: ["2 floors", "4 bedrooms", "2 bathrooms"],
      image:
        "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo2,
      tags: [
        { label: "OFF-PLAN", type: "offplan" },
        { label: "DELIVERY DATE: Q3 2030", type: "deliverydate" },
      ],
    },
    {
      id: 2,
      city: "Dubai",
      title: "chevalia-estate",
      location:
        "Dubai, Dubai Investment Park (DIP), Grand Polo Club and Resort, Chevalia Estate",
      launchPrice: "9M",
      currency: "AED",
      features: [
        "2 floors",
        "4 bedrooms",
        "2 bathrooms",
        "1 Kitchen",
        "Swimming pool",
        "1 Garage",
        "Indoor theater",
        "Party room",
        "underground pool",
        "water pool",
        "water park",
        "everthing is here",
      ],
      image:
        "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo1,
      tags: [
        { label: "OFF-PLAN", type: "offplan" },
        { label: "DELIVERY DATE: Q1 2029", type: "deliverydate" },
        {
          label: "SALE STARTED : 21 MARCH 2025",
          type: "salestarted",
        },
        {
          label: "2 PAYMENT PLAN AVAILABLE",
          type: "paymentplan",
        },
      ],
    },
    {
      id: 3,
      city: "Dubai",
      title: "Luxe Sky Palace",
      location: "Dubai, Marina",
      features: ["2 floors", "4 bedrooms"],
      image:
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo1,
      tags: [{ label: "OFF-PLAN", type: "offplan" }],
    },
    {
      id: 4,
      city: "Sharjah",
      title: "Luxe Sky Palace",
      location: "Sharjah",
      features: ["2 floors", "4 bedrooms", "2 bathrooms"],
      image:
        "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo2,
      tags: [{ label: "OFF-PLAN", type: "offplan" }],
    },
    {
      id: 5,
      city: "Dubai",
      title: "Emerald Bay Vista",
      location: "Dubai Creek",
      launchPrice: "994k",
      currency: "AED",
      features: ["2 floors", "4 bedrooms", "2 bathrooms"],
      image:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo2,
    },
    {
      id: 6,
      city: "Abu Dhabi",
      title: "Oryxhill Bayscape",
      location: "Abu Dhabi, Saadiyat",
      features: ["2 floors", "4 bedrooms", "2 bathrooms"],
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo1,
    },
    {
      id: 7,
      city: "Ras Al Khaimah",
      title: "Ridgeview Villas",
      location: "RAK",
      features: ["2 floors", "4 bedrooms", "2 bathrooms"],
      image:
        "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1600&auto=format&fit=crop",
      logo: companyLogo2,
    },
  ];
  */

  const handleCreateAlert = () => {
    setIsCreateAlertModalOpen(true);
  };

  return (
    <div className="pf-search-listing">
      <PFContainer>
        {/* Breadcrumbs Section */}

        <BreadcrumbsComponentFirstLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="New & Off-Plan Projects"
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
                    onPropertyForChange={setPropertyFor}
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
                    onOnlyCommercialPropertiesChange={
                      setOnlyCommercialProperties
                    }
                    category={category}
                    onCategoryChange={setCategory}
                    verifiedProperties={verifiedProperties}
                    onVerifiedChange={setVerifiedProperties}
                    postHandover={postHandover}
                    onPostHandoverChange={setPostHandover}
                    dldStatus={dldRegistered}
                    onDldStatusChange={setDldRegistered}
                    priceRange={priceRange}
                    onPriceRangeChange={handlePriceRangeChange}
                    minSqft={minSqft}
                    onMinSqftChange={setMinSqft}
                    maxSqft={maxSqft}
                    onMaxSqftChange={setMaxSqft}
                    listingSearchCities={projectListingCities}
                    selectedListingLocationId={listingLocationId}
                    onListingLocationIdChange={setListingLocationId}
                    selectedDeliveryDate={selectedDeliveryDate}
                    onSelectedDeliveryDateChange={setSelectedDeliveryDate}
                    skipListingTypeDefault
                    onFiltersCleared={handleFiltersCleared}
                    hiddenFilters={[...newProjectListingHiddenFilters]}
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
                        New & Off-Plan Projects
                      </Typography>
                      <Chip
                        label={`${totalProjects} projects`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          const payload = buildProjectSearchRequest({
                            propertyTypeIds: selectedPropertyTypeIds,
                            bedrooms,
                            bathrooms,
                            searchQuery: debouncedSearchQuery,
                            amenities,
                            verifiedOnly: verifiedProperties,
                            postHandover,
                            dldRegistered,
                            viewTypeTab: viewType,
                            sortBy: sortByApiValue,
                            page: currentPage,
                            limit: 9,
                            appliedFilters,
                            priceRange,
                            priceFilterActive,
                            minSqft,
                            maxSqft,
                            selectedDeliveryDate,
                            listingLocationId,
                            nearbySearchEnabled,
                            nearSearchCoords,
                          });
                          navigate("/mapview", {
                            state: {
                              initialProjectSearch: payload,
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
                                minSqft,
                                maxSqft,
                                postHandover,
                                dldRegistered,
                                selectedDeliveryDate,
                              },
                            },
                          });
                        }}
                      >
                        Map view
                      </Button>
                      {/* <Button
                        variant="outlined"
                        startIcon={
                          <BellIcon width={18} height={18} stroke="#3b82f6" />
                        }
                        className="pf-search-listing__action-button"
                        onClick={handleCreateAlert}
                      >
                        Create alert
                      </Button> */}
                    </Box>
                  </Box>

                  <Box className="pf-search-listing__header-controls">
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

                    <div className="pf-search-listing-tabs-container-right">
                      <div className="pf-search-listing-right-dropdown-container">
                        <p className="pf-search-listing-tabs-right-label">Sort by :</p>
                        {/* Sort by dropdown */}
                        <div
                          ref={propertyTypeDropdownRef}
                          onClick={() => setShowPropertyType(!showPropertyType)}
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
                            onClick={() => setShowPropertyType(!showPropertyType)}
                          />

                          {showPropertyType && (
                            <ul className="pf-search-listing-right-dropdown-list">
                              {sortByProjectOptions.map((opt) => (
                                <li
                                  key={opt.value}
                                  onClick={() => {
                                    if (opt.value) {
                                      setSortByApiValue(String(opt.value));
                                    }
                                    setShowPropertyType(false);
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
                  </Box>
                </Box>

                {/* Property Listings */}
                <Box className="pf-search-listing__property-list pf-newproject-listing">
                  {shouldShowSkeleton
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <NewProjectCardSkeleton key={`skeleton-${index}`} />
                      ))
                    : projects.length > 0
                      ? projects.map((project) => (
                          <Box
                            key={project.key}
                            className="pf-newproject-listing__card"
                            onClick={() => handleProjectCardClick(project.key)}
                            sx={{ cursor: "pointer" }}
                          >
                            <PropertyCard
                              image={project.image}
                              logo={project.logo}
                              title={project.title}
                              location={project.location}
                              features={project.features}
                              launchPrice={project.launchPrice}
                              currency={project.currency}
                              tags={project.tags}
                              isExpanded={false}
                              whatsappPhone={project.developerPhone}
                              whatsappMessage={project.whatsappMessage}
                            />
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
                {!shouldShowSkeleton && projects.length > 0 && (
                  <PFPagination
                    className="pf-newproject-listing__pagination"
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
                onPropertyForChange={setPropertyFor}
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
                postHandover={postHandover}
                onPostHandoverChange={setPostHandover}
                dldStatus={dldRegistered}
                onDldStatusChange={setDldRegistered}
                priceRange={priceRange}
                onPriceRangeChange={handlePriceRangeChange}
                minSqft={minSqft}
                onMinSqftChange={setMinSqft}
                maxSqft={maxSqft}
                onMaxSqftChange={setMaxSqft}
                listingSearchCities={projectListingCities}
                selectedListingLocationId={listingLocationId}
                onListingLocationIdChange={setListingLocationId}
                selectedDeliveryDate={selectedDeliveryDate}
                onSelectedDeliveryDateChange={setSelectedDeliveryDate}
                skipListingTypeDefault
                onFiltersCleared={handleFiltersCleared}
                hiddenFilters={[...newProjectListingHiddenFilters]}
              />
            </Box>
          </Box>
        </Drawer>
        <CreateAlertModal
          open={isCreateAlertModalOpen}
          onClose={() => setIsCreateAlertModalOpen(false)}
        />
      </PFContainer>
    </div>
  );
}

export default NewProjectListing;