import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import ReactDOMServer from "react-dom/server";
import { GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PFContainer from "../../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../../Components/parts/component";
import PropertyCard, {
  type PropertyTag,
} from "../../../Components/cards/HomePropertyCard";
import PFPagination from "../../../Components/pagination/PFPagination";
import {
  DownArrowIconBlack,
  BellIcon,
  MailIcon,
  MarkerIcon,
  RightArrowRoundFillIcon,
  SearchIcon,
  LocationIcon,
  TelephoneIcon,
} from "../../../Components/parts/icon";
import { useGoogleMapsLoader } from "../../../context/GoogleMapsLoaderContext";
import "../../../assets/styles/Developers.scss";
import DeveloperLogo1 from "../../../assets/img/company_logos/C13.jpg";
import HeaderBannerImage from "../../../assets/img/developerbanner.png";
import MoreFilterModal from "../components/MoreFilterModal";
import CallCompanyModal from "../../AgentandAgency/components/callCompanyModal";
import MailusModal from "../../Search/components/MailusModal";
import {
  getCompletionStatusMasterData,
  getAuthUser,
  getDeveloperProfile,
  getListingFilterMasterData,
  getListingSearchCityMasterData,
  getProjectSearchListingMasterData,
  getSupportedUrlsMasterData,
  postProjectSearch,
  type AmenityMaster,
  type ListingSearchCityMaster,
  type NamedValueMaster,
  type PropertyTypeMaster,
  type ProjectSearchApiProject,
  type ProjectSearchRequestBody,
  type SupportedUrls,
  type DeveloperProfileApiData,
} from "../../../services/apiService";

type DeveloperProject = {
  id: string;
  title: string;
  location: string;
  features: string[];
  launchPrice?: string;
  currency?: string;
  image: string;
  logo?: string;
  tags?: PropertyTag[];
  position: { lat: number; lng: number };
  developerPhone?: string;
  whatsappMessage?: string;
};

type SupportedUrlMap = Record<string, unknown>;

function normalizeSupportedUrls(items: SupportedUrls | null | undefined): SupportedUrlMap | null {
  if (!items) return null;
  if (Array.isArray(items)) {
    return (items as Array<Record<string, unknown>>).reduce((acc: SupportedUrlMap, cur) => {
      Object.assign(acc, cur);
      return acc;
    }, {});
  }
  if (typeof items === "object") return items as SupportedUrlMap;
  return null;
}

function resolveSupportedUrlPath(url: unknown, baseImg?: string | null): string {
  if (!url) return "";
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (!baseImg) return s;
  return `${String(baseImg).replace(/\/$/, "")}/${s.replace(/^\//, "")}`;
}

function mapApiProjectToDeveloperProject(params: {
  project: ProjectSearchApiProject;
  projectImageBaseUrl?: string | null;
  developerLogoBaseUrl?: string | null;
}): DeveloperProject | null {
  const { project, projectImageBaseUrl, developerLogoBaseUrl } = params;
  const id = typeof project._id === "string" ? project._id : (project.slug ?? "");
  if (!id) return null;

  const images = project.images ?? [];
  const primaryImageRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const image = resolveSupportedUrlPath(primaryImageRaw, projectImageBaseUrl);

  const logo = resolveSupportedUrlPath(project.developer?.logo, developerLogoBaseUrl);

  const city = project.location?.city ?? "";
  const zone = project.location?.zone ?? "";
  const address = project.location?.address ?? "";
  const location = [address, zone, city].filter(Boolean).join(", ");

  const coords = project.location?.coordinates?.coordinates ?? [];
  const lng = Array.isArray(coords) && typeof coords[0] === "number" ? coords[0] : null;
  const lat = Array.isArray(coords) && typeof coords[1] === "number" ? coords[1] : null;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    // Keep card, but omit from map later by using 0/0.
  }

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
    tags.push({ label: `DELIVERY DATE: ${project.deliveryQuarter}`, type: "deliverydate" });
  }

  return {
    id,
    title: project.projectName ?? "",
    location,
    features: features.length ? features : [city || "Prime Location"],
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
    image: image || HeaderBannerImage,
    logo: logo || undefined,
    tags: tags.length ? tags : undefined,
    position: { lat: typeof lat === "number" ? lat : 0, lng: typeof lng === "number" ? lng : 0 },
    developerPhone:
      String(
        (project.developer as { phoneNumber?: string } | null)?.phoneNumber ?? ""
      ).trim() || undefined,
    whatsappMessage: `Hi, I'm interested in this project: ${String(
      project.projectName ?? "Project"
    ).trim()}${project._id ? ` (ID: ${project._id})` : ""}.`,
  };
}

function buildDeveloperProjectSearchRequest(params: {
  developerId: string;
  keyword: string;
  locationId: string;
  propertyType: string;
  beds: string;
  priceValue: string;
  sortByValue: string;
  moreFilters: {
    postHandover: boolean;
    dldRegistered: boolean;
    completionStatus: string;
    deliveryDate: string;
    minArea: string;
    maxArea: string;
    amenities: string[];
  };
  page: number;
  limit: number;
}): ProjectSearchRequestBody {
  const body: ProjectSearchRequestBody = {
    developerId: params.developerId,
    page: params.page,
    limit: params.limit,
  };
  const q = params.keyword.trim();
  if (q) body.keyword = q;
  const loc = params.locationId.trim();
  if (loc) body.location = loc;
  if (params.propertyType && params.propertyType !== "all") {
    body.propertyType = params.propertyType;
  }
  if (params.beds === "studio") body.bedrooms = "0";
  else if (params.beds && params.beds !== "any") body.bedrooms = params.beds;
  if (params.priceValue && params.priceValue !== "any") {
    // priceValue is master-data value; API expects numeric min/max, but this page currently uses a single select.
    // We'll send it via sortBy only for now (same as previous UI). Full range mapping can be added next.
  }
  if (params.sortByValue.trim()) body.sortBy = params.sortByValue.trim();

  if (params.moreFilters.postHandover) body.hasPostHandover = "true";
  if (params.moreFilters.dldRegistered) body.isDldRegistered = "true";

  const cs = params.moreFilters.completionStatus.trim().toLowerCase();
  if (cs && cs !== "all") body.completionStatus = params.moreFilters.completionStatus.trim();

  const dd = params.moreFilters.deliveryDate.trim().toLowerCase();
  if (dd && dd !== "all") body.deliveryDate = params.moreFilters.deliveryDate.trim();

  const parseArea = (s: string): number | null => {
    const m = String(s).match(/(\d+(\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };
  const minA = parseArea(params.moreFilters.minArea);
  const maxA = parseArea(params.moreFilters.maxArea);
  if (minA != null) body.areaMin = minA;
  if (maxA != null) body.areaMax = maxA;

  if (params.moreFilters.amenities.length === 1) {
    body.amenities = params.moreFilters.amenities[0];
  } else if (params.moreFilters.amenities.length > 1) {
    body.amenities = params.moreFilters.amenities;
  }

  return body;
}

function DeveloperDetails() {
  const locationRoute = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ developerId?: string }>();
  const routeState = (locationRoute.state ?? {}) as { developerId?: string };
  const developerId = String(params.developerId ?? routeState.developerId ?? "").trim();

  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfileApiData | null>(null);
  const [developerProfileError, setDeveloperProfileError] = useState<string | null>(null);
  const [developerProfileLoading, setDeveloperProfileLoading] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [beds, setBeds] = useState("any");
  const [price, setPrice] = useState("any");
  const [sortBy, setSortBy] = useState("Featured");
  const [page, setPage] = useState(1);
  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [infoWindowHover, setInfoWindowHover] = useState(false);
  const hideInfoWindowTimerRef = useRef<number | null>(null);
  const mapRef = useRef<any>(null);

  // Custom dropdown states
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("Location");
  const [locationId, setLocationId] = useState<string>("");
  const [propertyTypeOpen, setPropertyTypeOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);
  const bedsDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const [bedsOpen, setBedsOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortByOpen, setSortByOpen] = useState(false);
  const [isCallCompanyModalOpen, setIsCallCompanyModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);
  const projectImageBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.projectUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);
  const developerLogoBaseUrl = useMemo(() => {
    const base = (supportedUrls as any)?.developerUrl?.img;
    return typeof base === "string" ? base : null;
  }, [supportedUrls]);

  const developerName = (developerProfile?.name ?? "").trim() || "Developer";
  const developerShortDescription =
    (developerProfile?.shortDescription ??
      developerProfile?.description ??
      "")
      .trim();
  const developerAboutText =
    (developerProfile?.aboutUs ??
      developerProfile?.description ??
      "")
      .trim();
  const developerLogoUrl =
    resolveSupportedUrlPath(developerProfile?.logo, developerLogoBaseUrl) || DeveloperLogo1;
  const developerPhone = String(developerProfile?.phoneNumber ?? "").trim();
  const developerEmail = String(developerProfile?.email ?? "").trim();
  const authUser = getAuthUser<{
    fullName?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }>();
  const isLoggedIn =
    Boolean(localStorage.getItem("accessToken")) ||
    localStorage.getItem("isLoggedIn") === "true";
  const initialUserName = (() => {
    const full =
      authUser?.fullName ||
      authUser?.name ||
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ");
    return (full || "").trim();
  })();
  const initialUserEmail = String(authUser?.email ?? "").trim();
  const initialUserPhone = String(authUser?.phoneNumber ?? "").trim();

  const [sortByProjectOptions, setSortByProjectOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [sortByApiValue, setSortByApiValue] = useState<string>("");

  const [apiProjects, setApiProjects] = useState<ProjectSearchApiProject[]>([]);
  const [projectSearchLoading, setProjectSearchLoading] = useState(false);
  const [projectSearchError, setProjectSearchError] = useState<string | null>(null);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [hasLoadedProjectsOnce, setHasLoadedProjectsOnce] = useState(false);

  const [moreFiltersAppliedNonce, setMoreFiltersAppliedNonce] = useState(0);
  const [appliedMoreFilters, setAppliedMoreFilters] = useState<{
    postHandover: boolean;
    dldRegistered: boolean;
    completionStatus: string;
    deliveryDate: string;
    minArea: string;
    maxArea: string;
    amenities: string[];
  }>({
    postHandover: false,
    dldRegistered: false,
    completionStatus: "all",
    deliveryDate: "all",
    minArea: "MinArea",
    maxArea: "MaxArea",
    amenities: [],
  });

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLocationId, setAppliedLocationId] = useState("");
  const [appliedPropertyType, setAppliedPropertyType] = useState("all");
  const [appliedBeds, setAppliedBeds] = useState("any");
  const [appliedPrice, setAppliedPrice] = useState("any");
  const [appliedSortByValue, setAppliedSortByValue] = useState("");

  const [projectLocationOptions, setProjectLocationOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [projectPropertyTypeOptions, setProjectPropertyTypeOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [projectPriceOptions, setProjectPriceOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [projectAmenities, setProjectAmenities] = useState<AmenityMaster[]>([]);
  const [sqftAreaSizes, setSqftAreaSizes] = useState<NamedValueMaster[]>([]);
  const [completionStatusOptions, setCompletionStatusOptions] = useState<
    NamedValueMaster[]
  >([]);
  const [deliveryDateOptions, setDeliveryDateOptions] = useState<
    NamedValueMaster[]
  >([]);
  const handleSortByToggle = () => {
    setSortByOpen((prev) => !prev);
  };

  const handleSortBySelect = (value: string) => {
    setSortBy(sortOptions.find((item) => item.value === value)?.label || "Featured");
    setSortByApiValue(value);
    // Sort should trigger search immediately (no need to click Apply).
    setAppliedSortByValue(value);
    setPage(1);
    setSortByOpen(false);
  };
  const handleToggle = () => {
    setOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Location dropdown
      if (newValue) {
        if (propertyTypeOpen) setPropertyTypeOpen(false);
        if (bedsOpen) setBedsOpen(false);
        if (priceOpen) setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handleSelect = (value: string) => {
    setLocationId(value);
    setLocation(
      projectLocationOptions.find((item) => item.value === value)?.label ||
        "Location"
    );
    setOpen(false);
  };

  const handlePropertyTypeToggle = () => {
    setPropertyTypeOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Property type dropdown
      if (newValue) {
        if (open) setOpen(false);
        if (bedsOpen) setBedsOpen(false);
        if (priceOpen) setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handlePropertyTypeSelect = (value: string) => {
    setPropertyType(value);
    setPropertyTypeOpen(false);
  };

  const handleBedsToggle = () => {
    setBedsOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Beds dropdown
      if (newValue) {
        if (open) setOpen(false);
        if (propertyTypeOpen) setPropertyTypeOpen(false);
        if (priceOpen) setPriceOpen(false);
      }
      return newValue;
    });
  };

  const handleBedsSelect = (value: string) => {
    setBeds(value);
    setBedsOpen(false);
  };

  const handlePriceToggle = () => {
    setPriceOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Price dropdown
      if (newValue) {
        if (open) setOpen(false);
        if (propertyTypeOpen) setPropertyTypeOpen(false);
        if (bedsOpen) setBedsOpen(false);
      }
      return newValue;
    });
  };

  const handlePriceSelect = (value: string) => {
    setPrice(value);
    setPriceOpen(false);
  };

  // Close Location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Close Property type dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (propertyTypeDropdownRef.current && !propertyTypeDropdownRef.current.contains(event.target as Node)) {
        setPropertyTypeOpen(false);
      }
    };

    if (propertyTypeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [propertyTypeOpen]);

  // Close Beds dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bedsDropdownRef.current && !bedsDropdownRef.current.contains(event.target as Node)) {
        setBedsOpen(false);
      }
    };

    if (bedsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bedsOpen]);

  // Close Price dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
        setPriceOpen(false);
      }
    };

    if (priceOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [priceOpen]);

  const selectProps = useMemo(
    () => ({
      IconComponent: (iconProps: any) => (
        <DownArrowIconBlack
          {...iconProps}
          fill="#707070"
          className={`pf-developers__select-icon ${iconProps.className || ""}`}
        />
      ),
      MenuProps: {
        classes: { paper: "pf-dropdown" },
        MenuListProps: { disablePadding: true },
      },
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getListingSearchCityMasterData("project"),
      getListingFilterMasterData(),
      getCompletionStatusMasterData(),
    ])
      .then(([locResp, filterResp, csResp]) => {
        if (cancelled) return;

        const cities = (locResp?.data?.cities ?? []) as ListingSearchCityMaster[];
        const locOpts = (Array.isArray(cities) ? cities : [])
          .filter((c) => c?._id && c?.displayName)
          .map((c) => ({ value: String(c._id), label: String(c.displayName) }));
        setProjectLocationOptions(locOpts);

        const pts = (filterResp?.data?.propertyTypes ?? []) as PropertyTypeMaster[];
        const ptOpts = (Array.isArray(pts) ? pts : [])
          .filter((p) => (p?._id || (p as any)?.id) && p?.name)
          .map((p) => ({
            value: String((p as any).slug ?? p._id ?? (p as any).id),
            label: String(p.name),
          }));
        setProjectPropertyTypeOptions(ptOpts);

        const pr = (filterResp?.data?.priceRange ?? []) as NamedValueMaster[];
        const priceOpts = (Array.isArray(pr) ? pr : [])
          .filter((p) => p?.name && p?.value)
          .map((p) => ({ value: String(p.value), label: String(p.name) }));
        setProjectPriceOptions(priceOpts);

        setProjectAmenities((filterResp?.data?.amenities ?? []) as AmenityMaster[]);
        setSqftAreaSizes((filterResp?.data?.sqftAreaSizes ?? []) as NamedValueMaster[]);
        setDeliveryDateOptions((filterResp?.data?.deliveryDates ?? []) as NamedValueMaster[]);
        setCompletionStatusOptions((csResp?.data?.completionStatus ?? []) as NamedValueMaster[]);
      })
      .catch(() => {
        if (cancelled) return;
        setProjectLocationOptions([]);
        setProjectPropertyTypeOptions([]);
        setProjectPriceOptions([]);
        setProjectAmenities([]);
        setSqftAreaSizes([]);
        setDeliveryDateOptions([]);
        setCompletionStatusOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getSupportedUrlsMasterData(), getProjectSearchListingMasterData()])
      .then(([suResp, sortResp]) => {
        if (cancelled) return;
        if (suResp?.status === false) throw new Error(String(suResp.message ?? "Supported URLs failed"));
        if (sortResp?.status === false) throw new Error(String(sortResp.message ?? "Sort master failed"));
        setSupportedUrls(normalizeSupportedUrls(suResp?.data?.items));

        const rows = sortResp?.data?.sortByProject ?? [];
        const opts = (Array.isArray(rows) ? rows : [])
          .filter((r) => r?.name && r?.value)
          .map((r) => ({ label: String(r.name), value: String(r.value) }));
        setSortByProjectOptions(opts);
      })
      .catch(() => {
        if (cancelled) return;
        setSupportedUrls(null);
        setSortByProjectOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setDeveloperProfileError(null);
    setDeveloperProfileLoading(Boolean(developerId));
    if (!developerId) {
      setDeveloperProfile(null);
      setDeveloperProfileError("Missing developerId");
      setDeveloperProfileLoading(false);
      return () => ac.abort();
    }
    void getDeveloperProfile(developerId, ac.signal)
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) throw new Error(String(resp.message ?? "Developer profile failed"));
        setDeveloperProfile(resp.data ?? null);
        setDeveloperProfileLoading(false);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setDeveloperProfile(null);
        setDeveloperProfileError(e instanceof Error ? e.message : "Developer profile failed");
        setDeveloperProfileLoading(false);
      });
    return () => ac.abort();
  }, [developerId]);

  useEffect(() => {
    const ac = new AbortController();
    if (!developerId) {
      setApiProjects([]);
      setProjectTotalPages(1);
      setProjectSearchError("Missing developerId");
      setHasLoadedProjectsOnce(true);
      return () => ac.abort();
    }
    setProjectSearchError(null);
    setProjectSearchLoading(true);
    const payload = buildDeveloperProjectSearchRequest({
      developerId,
      keyword: appliedSearch,
      locationId: appliedLocationId,
      propertyType: appliedPropertyType,
      beds: appliedBeds,
      priceValue: appliedPrice,
      sortByValue: appliedSortByValue,
      moreFilters: appliedMoreFilters,
      page,
      limit: 9,
    });
    void postProjectSearch(payload, ac.signal)
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) throw new Error(String(resp.message ?? "Project search failed"));
        const projects = resp?.data?.projects ?? [];
        const pagination = resp?.data?.pagination;
        setApiProjects(Array.isArray(projects) ? projects : []);
        const tp = typeof pagination?.totalPages === "number" && pagination.totalPages > 0 ? pagination.totalPages : 1;
        setProjectTotalPages(tp);
        setHasLoadedProjectsOnce(true);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setApiProjects([]);
        setProjectTotalPages(1);
        setProjectSearchError(e instanceof Error ? e.message : "Project search failed");
        setHasLoadedProjectsOnce(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setProjectSearchLoading(false);
      });
    return () => ac.abort();
  }, [
    developerId,
    appliedSearch,
    appliedLocationId,
    appliedPropertyType,
    appliedBeds,
    appliedPrice,
    appliedSortByValue,
    page,
    moreFiltersAppliedNonce,
  ]);

  const shouldShowPageSkeleton =
    developerProfileLoading ||
    (projectSearchLoading && !hasLoadedProjectsOnce);

  const bedsOptions = useMemo(() => {
    // Match SearchListing / NewProjectListing bedroom options.
    return [
      { label: "Studio", value: "0" },
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
      { label: "4", value: "4" },
      { label: "5", value: "5" },
      { label: "6", value: "6" },
      { label: "7", value: "7" },
    ];
  }, []);

  const sortOptions = sortByProjectOptions.length
    ? sortByProjectOptions
    : [
        { label: "Featured", value: "featured" },
        { label: "Price: Low to High", value: "price-low" },
        { label: "Price: High to Low", value: "price-high" },
        { label: "Newest", value: "newest" },
      ];

  const developerProjects = useMemo<DeveloperProject[]>(() => {
    return (apiProjects ?? [])
      .map((p) =>
        mapApiProjectToDeveloperProject({
          project: p,
          projectImageBaseUrl,
          developerLogoBaseUrl,
        })
      )
      .filter(Boolean) as DeveloperProject[];
  }, [apiProjects, projectImageBaseUrl, developerLogoBaseUrl]);

  /* const developerProjects = useMemo<DeveloperProject[]>(
    () => [
      {
        id: 1,
        title: "Rosehill by Emaar",
        location: "Dubai Hills Estate, Dubai",
        position: { lat: 25.1523, lng: 55.2575 },
        features: [
          "4 bedrooms",
          "6 bathrooms",
          "Maid room",
          "BUA: 6,000 sqft",
          "Plot: 8,200 sqft",
          "Community park access",
          "Private pool option",
          "Near GEMS Wellington",
          "Handover Q3 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [
          { label: "OFF-PLAN", type: "offplan" },
          { label: "DELIVERY DATE: Q3 2030", type: "deliverydate" },
        ],
      },
      {
        id: 2,
        title: "Vida Residences Hillside",
        location: "Dubai, Dubai Hills Estate",
        position: { lat: 25.1268, lng: 55.2429 },
        features: [
          "3 bedrooms",
          "4 bathrooms",
          "Balcony",
          "Golf course view",
          "Built in wardrobes",
          "Shared gym",
          "Shared pool",
          "Covered parking",
          "Handover 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [{ label: "OFF-PLAN", type: "offplan" }],
      },
      {
        id: 3,
        title: "Albero",
        location: "Dubai, Dubai Creek Harbour",
        position: { lat: 25.1995, lng: 55.2825 },
        features: [
          "3 bedrooms",
          "2 bathrooms",
          "Balcony",
          "BUA: 1,950 sqft",
          "Creek promenade access",
          "Shared gym",
          "Shared pool",
          "Sky garden",
          "Payment plan 70/30",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
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
        id: 4,
        title: "Rosehill by Emaar",
        location: "Dubai Hills Estate, Dubai",
        position: { lat: 25.2667, lng: 55.3167 },
        features: [
          "4 bedrooms",
          "6 bathrooms",
          "Maid room",
          "BUA: 6,000 sqft",
          "Plot: 8,200 sqft",
          "Community park access",
          "Private pool option",
          "Near GEMS Wellington",
          "Handover Q3 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [{ label: "OFF-PLAN", type: "offplan" }],
      },
      {
        id: 5,
        title: "Vida Residences Hillside",
        location: "Dubai, Dubai Hills Estate",
        position: { lat: 25.132, lng: 55.246 },
        features: [
          "3 bedrooms",
          "4 bathrooms",
          "Balcony",
          "Golf course view",
          "Built in wardrobes",
          "Shared gym",
          "Shared pool",
          "Covered parking",
          "Handover 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1470246973918-29a93221c455?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
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
        id: 6,
        title: "Albero",
        location: "Dubai, Dubai Creek Harbour",
        position: { lat: 25.1975, lng: 55.2744 },
        features: [
          "3 bedrooms",
          "2 bathrooms",
          "Balcony",
          "BUA: 1,950 sqft",
          "Creek promenade access",
          "Shared gym",
          "Shared pool",
          "Sky garden",
          "Payment plan 70/30",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
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
        id: 7,
        title: "Rosehill by Emaar",
        location: "Dubai Hills Estate, Dubai",
        position: { lat: 25.1501, lng: 55.2501 },
        features: [
          "4 bedrooms",
          "6 bathrooms",
          "Maid room",
          "BUA: 6,000 sqft",
          "Plot: 8,200 sqft",
          "Community park access",
          "Private pool option",
          "Near GEMS Wellington",
          "Handover Q3 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1502005097973-6a7082348e28?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [
          { label: "Launched", type: "salestarted" },
          { label: "New projects", type: "new" },
        ],
      },
      {
        id: 8,
        title: "Vida Residences Hillside",
        location: "Dubai, Dubai Hills Estate",
        position: { lat: 25.1405, lng: 55.2342 },
        features: [
          "3 bedrooms",
          "4 bathrooms",
          "Balcony",
          "Golf course view",
          "Built in wardrobes",
          "Shared gym",
          "Shared pool",
          "Covered parking",
          "Handover 2026",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [
          { label: "Launched", type: "salestarted" },
          { label: "New projects", type: "new" },
        ],
      },
      {
        id: 9,
        title: "Albero",
        location: "Dubai, Dubai Creek Harbour",
        position: { lat: 25.205, lng: 55.3005 },
        features: [
          "3 bedrooms",
          "2 bathrooms",
          "Balcony",
          "BUA: 1,950 sqft",
          "Creek promenade access",
          "Shared gym",
          "Shared pool",
          "Sky garden",
          "Payment plan 70/30",
        ],
        launchPrice: "9M",
        currency: "AED",
        image:
          "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop",
        logo: DeveloperLogo1,
        tags: [
          { label: "Launched", type: "salestarted" },
          { label: "New projects", type: "new" },
        ],
      },
    ],
    []
  ); */

  const activeProjectId = selectedProjectId ?? hoveredProjectId;

  const activeProject = useMemo(
    () =>
      activeProjectId
        ? developerProjects.find((project) => project.id === activeProjectId) ??
        null
        : null,
    [activeProjectId, developerProjects]
  );

  const mapCenter = useMemo(() => {
    if (!developerProjects.length) {
      return { lat: 25.2048, lng: 55.2708 };
    }

    const sums = developerProjects.reduce(
      (acc, project) => {
        acc.lat += project.position.lat;
        acc.lng += project.position.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sums.lat / developerProjects.length,
      lng: sums.lng / developerProjects.length,
    };
  }, [developerProjects]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      clickableIcons: false,
      // Ensure scroll inside the map zooms the map and doesn't scroll the page
      gestureHandling: "greedy",
      styles: [
        {
          featureType: "poi",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          stylers: [{ visibility: "off" }],
        },
      ],
    }),
    []
  );

  const getMarkerIcon = useCallback(
    (isActive: boolean) => {
      const mapsApi = (window as typeof window & { google?: any }).google?.maps;
      if (!isLoaded || !mapsApi) {
        return undefined;
      }

      const width = isActive ? 38 : 31;
      const height = isActive ? 50 : 41;

      const svgMarkup = ReactDOMServer.renderToStaticMarkup(
        <MarkerIcon width={width} height={height} />
      );

      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          svgMarkup
        )}`,
        scaledSize: new mapsApi.Size(width, height),
        anchor: new mapsApi.Point(width / 2, height),
      };
    },
    [isLoaded]
  );

  const handleMapLoad = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMarkerMouseOver = useCallback((id: string) => {
    if (hideInfoWindowTimerRef.current != null) {
      window.clearTimeout(hideInfoWindowTimerRef.current);
      hideInfoWindowTimerRef.current = null;
    }
    setHoveredProjectId(id);
  }, []);

  const handleMarkerMouseOut = useCallback(() => {
    if (hideInfoWindowTimerRef.current != null) {
      window.clearTimeout(hideInfoWindowTimerRef.current);
    }
    hideInfoWindowTimerRef.current = window.setTimeout(() => {
      // If a project is selected, keep the info window.
      if (selectedProjectId) return;
      // If mouse is on the info window, keep it open.
      if (infoWindowHover) return;
      setHoveredProjectId(null);
    }, 120);
  }, [infoWindowHover, selectedProjectId]);

  const handleProjectSelect = useCallback(
    (id: string) => {
      setSelectedProjectId(id);
      setHoveredProjectId(null);
      const proj = developerProjects.find((p) => p.id === id);
      if (!proj?.position) return;
      if (!mapRef.current) return;
      if (!Number.isFinite(proj.position.lat) || !Number.isFinite(proj.position.lng)) return;
      if (proj.position.lat === 0 && proj.position.lng === 0) return;
      mapRef.current.setCenter(proj.position);
      mapRef.current.setZoom(14);
    },
    [developerProjects]
  );

  useEffect(() => {
    const googleMaps = (window as typeof window & { google?: any }).google
      ?.maps;
    if (
      !isLoaded ||
      !mapRef.current ||
      !developerProjects.length ||
      !googleMaps
    ) {
      return;
    }

    if (developerProjects.length === 1) {
      mapRef.current.setCenter(developerProjects[0].position);
      mapRef.current.setZoom(14);
      return;
    }

    const bounds = new googleMaps.LatLngBounds();
    developerProjects.forEach((project) => {
      bounds.extend(project.position);
    });
    mapRef.current.fitBounds(bounds);
  }, [developerProjects, isLoaded]);

  const mapZoom = developerProjects.length <= 1 ? 14 : 12;

  const infoWindowOptions = useMemo(() => {
    const mapsApi = (window as typeof window & { google?: any }).google?.maps;
    if (!mapsApi) {
      return undefined;
    }

    return {
      pixelOffset: new mapsApi.Size(0, -70),
      shouldFocus: false,
    };
  }, [isLoaded]);

  const projectsCount = developerProjects.length;
  const totalPages = projectTotalPages;
  const paginatedProjects = developerProjects;

  return (
    <main className="pf-developer-details pf-developers">
      <PFContainer>
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Find Developers"
          breadcrumbSubTitle2={developerName}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/finddevelopers"
        />

        {developerProfileError ? (
          <Typography color="error" sx={{ mb: 2 }}>
            {developerProfileError}
          </Typography>
        ) : null}

        {shouldShowPageSkeleton ? (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Skeleton variant="rounded" height={210} />
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={980} />
            <Skeleton variant="rounded" height={420} />
            <Skeleton variant="rounded" height={520} />
          </Box>
        ) : (
          <>
            <section
              className="pf-developer-details__banner"
              style={{ backgroundImage: `url(${HeaderBannerImage})` }}
            >
              <Box className="pf-developer-details__banner-inner">
                <Box className="pf-developer-details__logo-card">
                  <img
                    src={developerLogoUrl}
                    alt={`${developerName} logo`}
                    className="pf-developer-details__logo"
                    loading="lazy"
                  />
                </Box>

                <Box className="pf-developer-details__content">
                  <Typography className="pf-developer-details__headline">
                    {developerShortDescription || "—"}
                  </Typography>

                  <Box className="pf-developer-details__actions">
                    <Button
                      className="pf-developer-details__action-btn"
                      variant="contained"
                      disableElevation
                      onClick={() => setIsCallCompanyModalOpen(true)}
                      startIcon={
                        <TelephoneIcon width={15} height={15} fill="#222222" />
                      }
                    >
                      Call us
                    </Button>
                    <Button
                      className="pf-developer-details__action-btn pf-developer-details__action-btn--mail"
                      variant="contained"
                      disableElevation
                      onClick={() => setIsMailModalOpen(true)}
                      startIcon={
                        <MailIcon width={15} height={12} fill="#222222" />
                      }
                    >
                      Mail us
                    </Button>
                  </Box>
                </Box>
              </Box>
            </section>

            <Box className="pf-developer-details__filters">
              <Box className="pf-developer-details__filters-inner">
                <Box className="pf-developer-details__filters-controls">
                  <TextField
                    className="pf-developers__field pf-developer-details__search-field pf-developers__search-field"
                    placeholder="Search"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="pf-developers__search-icon" />
                        </InputAdornment>
                      ),
                    }}
                  />


              {/* Location dropdown */}
              <Box ref={locationDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                {/* Button */}
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handleToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {location}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>

                {/* Dropdown */}
                {open && (
                  <Box className="pf-agent-Service__dropdown">
                    {projectLocationOptions.map((item) => {
                      const isActive =
                        location === item.label ||
                        location === item.value;
                      return (
                        <Box
                          key={item.label}
                          className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => handleSelect(item.value)}
                        >
                          {item.label}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Property type dropdown (custom format) */}
              <Box
                ref={propertyTypeDropdownRef}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
              >
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handlePropertyTypeToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {projectPropertyTypeOptions.find(
                      (item) => item.value === propertyType
                    )?.label || "Property type"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>

                {propertyTypeOpen && (
                  <Box className="pf-agent-Service__dropdown">
                    {projectPropertyTypeOptions.map((item) => {
                      const isActive = propertyType === item.value;
                      return (
                        <Box
                          key={item.value}
                          className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => handlePropertyTypeSelect(item.value)}
                        >
                          {item.label}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Beds dropdown (custom format) */}
              <Box
                ref={bedsDropdownRef}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
              >
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handleBedsToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {bedsOptions.find((item) => item.value === beds)?.label ||
                      "Beds"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>

                {bedsOpen && (
                  <Box className="pf-agent-Service__dropdown">
                    {bedsOptions.map((item) => {
                      const isActive = beds === item.value;
                      return (
                        <Box
                          key={item.value}
                          className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => handleBedsSelect(item.value)}
                        >
                          {item.label}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Price dropdown (custom format) */}
              <Box
                ref={priceDropdownRef}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
              >
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handlePriceToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {(projectPriceOptions.length ? projectPriceOptions : [{ label: "Any", value: "any" }]).find(
                      (item) => item.value === price
                    )?.label ||
                      "Price"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>

                {priceOpen && (
                  <Box className="pf-agent-Service__dropdown">
                    {(projectPriceOptions.length ? projectPriceOptions : [{ label: "Any", value: "any" }]).map((item) => {
                      const isActive = price === item.value;
                      return (
                        <Box
                          key={item.value}
                          className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => handlePriceSelect(item.value)}
                        >
                          {item.label}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* More filters dropdown (custom format) */}
              <Box className="pf-agent-Service__custom-select" onClick={() => setMoreFiltersOpen(true)}>
                <Box
                  className="pf-agent-Service__select-btn"
                >
                  <Typography className="pf-agent-Service__name">
                    More filters
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>
              </Box>
            </Box>

            <Box className="pf-developer-details__filters-actions">
              <Button
                className="pf-developer-details__clear"
                variant="text"
                onClick={() => {
                  setSearchValue("");
                  setLocation("Location");
                  setLocationId("");
                  setPropertyType("all");
                  setBeds("any");
                  setPrice("any");
                  setSortBy("Featured");
                  setSortByApiValue("");

                  setAppliedSearch("");
                  setAppliedLocationId("");
                  setAppliedPropertyType("all");
                  setAppliedBeds("any");
                  setAppliedPrice("any");
                  setAppliedSortByValue("");
                  setAppliedMoreFilters({
                    postHandover: false,
                    dldRegistered: false,
                    completionStatus: "all",
                    deliveryDate: "all",
                    minArea: "MinArea",
                    maxArea: "MaxArea",
                    amenities: [],
                  });
                  setMoreFiltersAppliedNonce((n) => n + 1);
                  setPage(1);
                }}
              >
                Clear all filters
              </Button>
              <Button
                className="pf-developers__search-btn pf-developer-details__apply-btn"
                variant="contained"
                disableElevation
                onClick={() => {
                  setAppliedSearch(searchValue.trim());
                  setAppliedLocationId(locationId);
                  setAppliedPropertyType(propertyType);
                  setAppliedBeds(beds);
                  setAppliedPrice(price);
                  setAppliedSortByValue(sortByApiValue);
                  setPage(1);
                }}
                disabled={projectSearchLoading}
              >
                Apply filter
              </Button>
            </Box>
          </Box>
        </Box>
          </>
        )}
      </PFContainer>

      {shouldShowPageSkeleton ? null : (
        <>
      <section className="pf-developer-details__projects">
        <Grid
          container
          spacing={2}
          className="pf-developer-details__projects-grid"
        >
          <Grid size={{ xs: 12, md: 7, lg: 7, xl: 7 }}>
            <Box className="pf-developer-details__projects-details">
              <Box className="pf-developer-details__projects-header">
                <Box className="pf-developer-details__projects-title-row">
                  <Typography className="pf-search-listing__properties-title pf-developer-details__projects-title">
                    New &amp; Off-Plan Projects by {developerName}
                  </Typography>
                  {/* <Chip
                    label={`${projectsCount} projects`}
                    className="pf-search-listing__properties-count pf-developer-details__projects-count"
                  /> */}
                </Box>

                <Box className="pf-search-listing__header-controls pf-developer-details__projects-controls">
                  {/* <Button
                    variant="outlined"
                    startIcon={
                      <BellIcon width={18} height={18} stroke="#3b82f6" />
                    }
                    className="pf-search-listing__action-button"
                  >
                    Create alert
                  </Button> */}
                  <Chip
                    label={`${projectsCount} projects`}
                    className="pf-search-listing__properties-count pf-developer-details__projects-count"
                  />

                  <Box className="pf-search-listing__sort-wrapper pf-developer-details__projects-sort">
                    <Typography
                      variant="body2"
                      className="pf-search-listing__sort-label"
                    >
                      Sort by:
                    </Typography>
                    {/* <FormControl className="pf-search-listing__sort-control">
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
                        {sortOptions.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            className="pf-dropdown__item"
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl> */}

                    {/* sortby dropdown */}
                    <Box className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                      {/* Button */}
                      <Box
                        className="pf-agent-Service__select-btn"
                        onClick={handleSortByToggle}
                      >
                        <Typography
                          className={`pf-agent-Service__name ${location ? "selected" : "placeholder"
                            }`}
                        >
                          {sortBy}
                        </Typography>
                        <DownArrowIconBlack width={13} height={13} />
                      </Box>

                      {/* Dropdown */}
                      {sortByOpen && (
                        <Box className="pf-agent-Service__dropdown">
                          {sortOptions.map((item) => {
                            const isActive =
                              sortBy === item.label ||
                              sortBy === item.value;
                            return (
                              <Box
                                key={item.value}
                                className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                  }`}
                                onClick={() => handleSortBySelect(item.value)}
                              >
                                {item.label}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>

                  </Box>
                </Box>
              </Box>

              <Box className="pf-developer-details__cards-wrapper">
                <Box className="pf-developer-details__cards-grid">
                {projectSearchError ? (
                  <Typography color="error" sx={{ py: 2 }}>
                    {projectSearchError}
                  </Typography>
                ) : null}

                {projectSearchLoading && !projectSearchError ? (
                  <>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <Box key={`proj-skel-${i}`} sx={{ borderRadius: 2, overflow: "hidden" }}>
                        <Skeleton variant="rectangular" height={250} />
                        <Box sx={{ p: 2 }}>
                          <Skeleton variant="text" width="70%" height={20} />
                          <Skeleton variant="text" width="50%" height={18} />
                          <Skeleton variant="text" width="90%" height={18} />
                        </Box>
                      </Box>
                    ))}
                  </>
                ) : null}

                {!projectSearchLoading &&
                !projectSearchError &&
                paginatedProjects.length === 0 ? (
                  <Typography sx={{ py: 2 }}>No projects found.</Typography>
                ) : null}

                {!projectSearchLoading &&
                !projectSearchError &&
                paginatedProjects.map((project) => (
                  <Box
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      const pid = project.id?.trim();
                      if (!pid) return;
                      navigate(`/newprojectdrilldown/${encodeURIComponent(pid)}`, {
                        state: { projectId: pid },
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const pid = project.id?.trim();
                        if (!pid) return;
                        navigate(`/newprojectdrilldown/${encodeURIComponent(pid)}`, {
                          state: { projectId: pid },
                        });
                      }
                    }}
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
                ))}
                </Box>

              {!projectSearchLoading &&
              !projectSearchError &&
              paginatedProjects.length > 0 &&
              totalPages > 0 ? (
                <PFPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="pf-developer-details__pagination"
                />
              ) : null}
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 5, lg: 5, xl: 5 }}>
            <Box className="pf-developer-details__projects-map">
              {!googleMapsApiKey ? (
                <Box className="pf-developer-details__map-fallback">
                  Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to load the map.
                </Box>
              ) : loadError ? (
                <Box className="pf-developer-details__map-fallback">
                  We couldn't load Google Maps. Please check your API key and
                  network connection.
                </Box>
              ) : !isLoaded ? (
                <Box className="pf-developer-details__map-fallback">
                  Loading map…
                </Box>
              ) : developerProjects.length === 0 ? (
                <Box className="pf-developer-details__map-fallback">
                  No projects to display on the map.
                </Box>
              ) : (
                <GoogleMap
                  mapContainerClassName="pf-developer-details__map-canvas"
                  center={mapCenter}
                  zoom={mapZoom}
                  options={mapOptions}
                  onLoad={handleMapLoad}
                  onUnmount={handleMapUnmount}
                >
                  {developerProjects.map((project) => {
                    const isActive = activeProjectId === project.id;
                    const icon = getMarkerIcon(isActive);

                    return (
                      <Marker
                        key={project.id}
                        position={project.position}
                        icon={icon}
                        onMouseOver={() => handleMarkerMouseOver(project.id)}
                        onMouseOut={handleMarkerMouseOut}
                        onClick={() => handleProjectSelect(project.id)}
                      />
                    );
                  })}

                  {activeProject && isLoaded && (
                    <InfoWindow
                      position={activeProject.position}
                      onCloseClick={() => {
                        setSelectedProjectId(null);
                        setHoveredProjectId(null);
                      }}
                      options={infoWindowOptions}
                    >
                      <div
                        className="pf-prime-location__infoWindow"
                        onMouseEnter={() => {
                          if (hideInfoWindowTimerRef.current != null) {
                            window.clearTimeout(hideInfoWindowTimerRef.current);
                            hideInfoWindowTimerRef.current = null;
                          }
                          setInfoWindowHover(true);
                        }}
                        onMouseLeave={() => {
                          setInfoWindowHover(false);
                          if (!selectedProjectId) setHoveredProjectId(null);
                        }}
                      >
                        <div className="pf-prime-location__infoHeader">
                          <img
                            src={activeProject.image}
                            alt={activeProject.title}
                            className="pf-prime-location__infoImage"
                          />
                          <div className="pf-prime-location__infoText">
                            <Typography className="pf-prime-location__infoName">
                              {activeProject.title}
                            </Typography>
                            <div className="pf-prime-location__infoLocation">
                              <LocationIcon width="10" height="12" />
                              <Typography className="pf-prime-location__infoLocationText">
                                {activeProject.location}
                              </Typography>
                            </div>
                          </div>
                        </div>

                        <div className="pf-prime-location__infoFooter">
                          <div className="pf-prime-location__infoPriceBlock">
                            <Typography className="pf-prime-location__infoPriceLabel">
                              Launch price
                            </Typography>
                            <Typography className="pf-prime-location__infoPrice">
                              {activeProject.launchPrice}{" "}
                              {activeProject.currency}
                            </Typography>
                          </div>

                          <Button
                            className="pf-prime-location__infoCta"
                            variant="text"
                            endIcon={
                              <RightArrowRoundFillIcon width="20" height="20" />
                            }
                            disableRipple
                            onClick={() => {
                              const pid = activeProjectId?.trim();
                              if (!pid) return;
                              navigate(`/newprojectdrilldown/${encodeURIComponent(pid)}`, {
                                state: { projectId: pid },
                              });
                            }}
                          >
                            See details
                          </Button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </Box>
          </Grid>
        </Grid>
      </section>

      <PFContainer className="pf-developer-details__info">
        <Box className="pf-developer-details__info-inner">
          <Box className="pf-developer-details__info-section">
            <Typography className="pf-developer-details__info-heading">
              About me
            </Typography>
            <Typography className="pf-developer-details__info-text">
              {developerAboutText || "—"}
            </Typography>
          </Box>

          <Box className="pf-developer-details__info-section">
            <Typography className="pf-developer-details__info-heading">
              {developerName}&apos;s ongoing projects in Dubai
            </Typography>
            <Typography className="pf-developer-details__info-text">
              Each Emaar property has its own unique design aesthetic, providing
              an aspirational lifestyle within a thriving community, supported
              by Emaar&apos;s community management team. Discover luxurious
              Emaar Communities and properties in Dubai.
            </Typography>
          </Box>

          <Box className="pf-developer-details__info-section">
            <Typography className="pf-developer-details__info-heading">
              Know more about {developerName}
            </Typography>

            <Box className="pf-developer-details__faq">
              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  Who is Emaar Properties?
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Emaar Properties is a real estate development company based in
                  Dubai. The company is known for selling properties that are
                  not yet constructed, also known as &apos;off-plan&apos;
                  properties. Emaar was founded in 1997 and has since grown to
                  become one of the largest real estate developers in the Middle
                  East, with operations in several countries around the world.
                </Typography>
              </Box>

              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  What are some of Emaar Properties&apos; major projects?
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Emaar Properties has developed some of the most iconic and
                  ambitious projects in Dubai, including the Burj Khalifa (the
                  tallest building in the world), The Dubai Mall (one of the
                  largest shopping centers in the world), Downtown Dubai (one of
                  Dubai&apos;s most iconic neighborhoods) and Dubai Marina (a
                  luxurious waterfront development).
                </Typography>
              </Box>

              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  What are some of Emaar&apos;s new projects in Dubai?
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Emaar has developed several notable projects in Dubai in
                  recent years. Some of these include Dubai Hills Estate, a
                  2,700-acre master-planned community with residential,
                  commercial, and retail components; Dubai Creek Harbour, a
                  waterfront development that will include the world&apos;s
                  tallest tower; and The Dubai Mall Zabeel, a new addition to
                  the Dubai Mall complex that features high-end retail and
                  entertainment offerings. Emaar is also developing other
                  properties and projects in Dubai and other countries.
                </Typography>
              </Box>

              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  What are some of Emaar&apos;s Off-Plan Projects?
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Emaar's off-plan properties in Dubai are wide and varied.
                  These include:
                </Typography>
              </Box>
              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  Club Drive
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Delivery Date:{" "}
                  <span className="pf-developer-details__faq-answer-value pf-developer-details__faq-answer-value--semibold">
                    Q3 2029
                  </span>
                </Typography>
              </Box>
              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  Cedar Creek Beach
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Delivery Date:{" "}
                  <span className="pf-developer-details__faq-answer-value pf-developer-details__faq-answer-value--semibold">
                    Q3 2029
                  </span>
                </Typography>
              </Box>
              <Box className="pf-developer-details__faq-item">
                <Typography className="pf-developer-details__faq-question">
                  Address Za'abeel
                </Typography>
                <Typography className="pf-developer-details__faq-answer">
                  Delivery Date:{" "}
                  <span className="pf-developer-details__faq-answer-value pf-developer-details__faq-answer-value--semibold">
                    Q3 2029
                  </span>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </PFContainer>
      <MoreFilterModal
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        amenitiesOptions={projectAmenities}
        sqftAreaSizeOptions={sqftAreaSizes}
        completionStatusOptions={completionStatusOptions}
        deliveryDateOptions={deliveryDateOptions}
        resultsCount={projectsCount}
        initialFilters={appliedMoreFilters}
        onApply={(filters) => {
          setAppliedMoreFilters(filters);
          setPage(1);
          setMoreFiltersAppliedNonce((n) => n + 1);
        }}
        onClear={() => {
          setAppliedMoreFilters({
            postHandover: false,
            dldRegistered: false,
            completionStatus: "all",
            deliveryDate: "all",
            minArea: "MinArea",
            maxArea: "MaxArea",
            amenities: [],
          });
          setPage(1);
          setMoreFiltersAppliedNonce((n) => n + 1);
        }}
      />
      <CallCompanyModal
        open={isCallCompanyModalOpen}
        onClose={() => setIsCallCompanyModalOpen(false)}
        phoneNumber={developerPhone || "—"}
      />
      <MailusModal
        open={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        agentName={developerName}
        agentEmail={developerEmail}
        initialName={isLoggedIn ? initialUserName : ""}
        initialEmail={isLoggedIn ? initialUserEmail : ""}
        initialPhone={isLoggedIn ? initialUserPhone : ""}
        title={`Mail ${developerName}`}
      />
        </>
      )}
    </main>
  );
}

export default DeveloperDetails;
{/* <FormControl
                className="pf-developers__field pf-developer-details__select"
                variant="outlined"
                size="small"
              >
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  displayEmpty
                  inputProps={{ "aria-label": "Select location" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  {projectLocationOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}

{/* <FormControl
                className="pf-developers__field pf-developer-details__select"
                variant="outlined"
                size="small"
              >
                <Select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  displayEmpty
                  inputProps={{ "aria-label": "Select property type" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  {projectPropertyTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}

{/* <FormControl
                className="pf-developers__field pf-developer-details__select pf-developer-details__select--small"
                variant="outlined"
                size="small"
              >
                <Select
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  displayEmpty
                  inputProps={{ "aria-label": "Select beds" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  {bedsOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}
{/* <FormControl
                className="pf-developers__field pf-developer-details__select pf-developer-details__select--small"
                variant="outlined"
                size="small"
              >
                <Select
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  displayEmpty
                  inputProps={{ "aria-label": "Select price" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  {(projectPriceOptions.length ? projectPriceOptions : [{ label: "Any", value: "any" }]).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}

{/* <FormControl
                className="pf-developers__field pf-developer-details__select pf-developer-details__select--more"
                variant="outlined"
                size="small"
              >
                <Select
                  value="more-filters"
                  displayEmpty
                  inputProps={{ "aria-label": "More filters" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  <MenuItem value="more-filters">More filters</MenuItem>
                </Select>
              </FormControl> */}