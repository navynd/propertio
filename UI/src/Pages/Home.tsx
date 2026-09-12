import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import ReactDOMServer from "react-dom/server";
import {
  Select,
  MenuItem,
  FormControl,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  Switch,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Skeleton,
} from "@mui/material";
import "../assets/styles/style.scss";
import {
  DownArrowIconBlack,
  SearchIcon,
  GrayLogoIcon,
  RightArrowRoundFillIcon,
  StarIcon,
  PlayStoreIcon,
  AppleStoreIcon,
  QrIcon,
  LocationIcon,
  MarkerIcon,
  ExpandIcon,
  LeftArrowIcon,
  RightArrowIcon,
  MapSliderBackIcon,
  TickIcon,
  BoldLocationIcon,
} from "../Components/parts/icon";
import PFContainer from "../Components/container/PFContainer";
import { GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { useNavigate, useLocation } from "react-router-dom";
import PropertyCard from "../Components/cards/HomePropertyCard";
import type { PropertyTag } from "../Components/cards/HomePropertyCard";
import HomeSlider from "../Components/carousel/HomeSlider";
import Homepage03Image from "../assets/img/Homepage03.png";
import companyLogo1 from "../assets/img/company_logos/1.png";
import companyLogo2 from "../assets/img/company_logos/2.png";
import CustomerReviewCard from "../Components/cards/CustomerReviewCard";
import {
  testimonialService,
  type HomeTestimonial,
  type TestimonialSectionSettings,
} from "../services/testimonialService";
import defaultAvatar from "../assets/img/header_person.png";
import LoginSuccessModal from "../Components/accountSection/LoginSuccessModal";
import AccountCreatedModal from "../Components/accountSection/AccountCreatedModal";
import { useGoogleMapsLoader } from "../context/GoogleMapsLoaderContext";
import { resolveListingTransactionForProperty } from "./Search/components/PropertyListingCard";
import {
  type AmenityMaster,
  type FurnishedStatusMaster,
  getListingSearchCityMasterData,
  getSupportedUrlsMasterData,
  getListingTypesMasterData,
  type ListingTypeMaster,
  type ListingSearchCityMaster,
  postProjectSearch,
  postPropertySearch,
  type ProjectSearchApiProject,
  type ProjectSearchRequestBody,
  type PropertySearchApiProperty,
  type PropertySearchRequestBody,
  getPropertyTypesMasterData,
  type PropertyTypeMaster,
  getAmenitiesAndFurnishedStatusMasterData,
} from "../services/apiService";

type SupportedUrlMap = Record<string, unknown>;

type PrimeLocationKind = "property" | "project";

type PrimeLocationProperty = {
  id: string;
  name: string;
  location: string;
  price: string;
  /** Label above price (e.g. Launch price, Rent from, Price). */
  priceCaption: string;
  category: string;
  position: { lat: number; lng: number };
  image: string;
  kind: PrimeLocationKind;
};

function listingTypeMasterId(item: ListingTypeMaster): string {
  return String(item._id ?? item.id ?? "").trim();
}

function readGeoPointCoordinates(
  coordinates?: { type?: string; coordinates?: number[] } | null
): { lat: number; lng: number } | null {
  const coords = coordinates?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

type BedsBathOption = {
  label: string;
  value: number;
};

type HomeProjectCardData = {
  key: string;
  projectId: string;
  city: string;
  title: string;
  location: string;
  launchPrice?: string;
  currency?: string;
  features: string[];
  image: string;
  logo?: string;
  tags?: PropertyTag[];
  developerPhone?: string;
  whatsappMessage?: string;
};

function HomeNewProjectCardSkeleton({ isExpanded }: { isExpanded: boolean }) {
  return (
    <Box
      className={isExpanded ? "pf-projectsGrid__item--expanded" : undefined}
      sx={{
        gridColumn: {
          xs: "span 1",
          sm: "span 1",
          md: "span 1",
          lg: isExpanded ? "span 2" : "span 1",
        },
      }}
    >
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

const SearchSelectIcon = React.forwardRef<
  SVGSVGElement,
  React.ComponentPropsWithoutRef<typeof DownArrowIconBlack>
>(({ className, ...props }, ref) => (
  <DownArrowIconBlack
    {...props}
    ref={ref}
    className={[className, "pf-field__chevron"].filter(Boolean).join(" ")}
    width={12}
    height={8}
  />
));

SearchSelectIcon.displayName = "SearchSelectIcon";

/** Listing type drives route: property search vs new-project search (different filters on each page). */
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

function normListingStr(s?: string) {
  return (s ?? "").toLowerCase().trim();
}

function findCommercialBuyListingType(
  options: ListingTypeMaster[]
): ListingTypeMaster | null {
  if (!options.length) return null;
  return (
    options.find((o) => normListingStr(o.slug) === "commercial-buy") ??
    options.find((o) => normListingStr(o.slug) === "commercial_buy") ??
    options.find(
      (o) =>
        normListingStr(o.name).includes("commercial") &&
        normListingStr(o.name).includes("buy")
    ) ??
    options.find(
      (o) =>
        normListingStr(o.category) === "commercial" &&
        (normListingStr(o.slug).includes("buy") ||
          normListingStr(o.name).includes("buy"))
    ) ??
    null
  );
}

function findDefaultResidentialBuyListingType(
  options: ListingTypeMaster[]
): ListingTypeMaster | null {
  if (!options.length) return null;
  return (
    options.find(
      (o) =>
        normListingStr(o.slug) === "buy" &&
        normListingStr(o.category) !== "commercial"
    ) ??
    options.find((o) => normListingStr(o.name) === "buy") ??
    options[0]
  );
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [propertyFor, setPropertyFor] = React.useState<ListingTypeMaster>({
    name: "",
    slug: "",
  });
  // const [propertyType, setPropertyType] = React.useState<string>("Apartment");
  const [bedsBaths, setBedsBaths] = React.useState<string>("Select");
  const [selectedBedrooms, setSelectedBedrooms] = React.useState<number | null>(
    null
  );
  const [selectedBathrooms, setSelectedBathrooms] = React.useState<number | null>(
    null
  );
  const [showAdvancedFilters, setShowAdvancedFilters] =
    React.useState<boolean>(false);
  const [nearbySearchEnabled, setNearbySearchEnabled] =
    React.useState<boolean>(false);
  const [onlyCommercialProperties, setOnlyCommercialProperties] =
    React.useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [heroSearchKeyword, setHeroSearchKeyword] = React.useState<string>("");
  const [primeLocationListingTypeId, setPrimeLocationListingTypeId] =
    React.useState<string>("");
  const [primeLocationSearch, setPrimeLocationSearch] =
    React.useState<string>("");
  const [debouncedPrimeLocationSearch, setDebouncedPrimeLocationSearch] =
    React.useState<string>("");
  const [primeLocationItems, setPrimeLocationItems] = React.useState<
    PrimeLocationProperty[]
  >([]);
  const [primeLocationLoading, setPrimeLocationLoading] =
    React.useState<boolean>(false);
  const [primeLocationTotalCount, setPrimeLocationTotalCount] =
    React.useState<number>(0);
  const primeLocationSearchGenRef = useRef(0);
  const primeListRef = useRef<HTMLDivElement | null>(null);
  const [primeListAtBottom, setPrimeListAtBottom] =
    React.useState<boolean>(false);
  const [selectedMarkerId, setSelectedMarkerId] = React.useState<string | null>(
    null
  );
  const [hoveredMarkerId, setHoveredMarkerId] = React.useState<string | null>(
    null
  );
  const worldwideRef = useRef<HTMLElement>(null);
  const [worldwideParallaxOffset, setWorldwideParallaxOffset] =
    React.useState<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const [primeMobileView, setPrimeMobileView] = React.useState<"map" | "list">(
    "map"
  );
  const [customerSlideIndex, setCustomerSlideIndex] = React.useState<number>(0);
  const [customerVisibleCards, setCustomerVisibleCards] =
    React.useState<number>(4);
  const [customerRatings, setCustomerRatings] = React.useState<HomeTestimonial[]>([]);
  const [testimonialSettings, setTestimonialSettings] =
    React.useState<TestimonialSectionSettings>({
      sectionTitle: "Don't take our word for it!",
      sectionSubtitle: "Hear it from our customers",
    });
  const [testimonialMediaBaseUrl, setTestimonialMediaBaseUrl] = React.useState("");
  const [testimonialsLoading, setTestimonialsLoading] = React.useState(true);
  const mapRef = useRef<any>(null);
  const searchRef = useRef<HTMLFormElement | null>(null);
  const homeProjectSearchGenRef = useRef(0);
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down("md"));
  const shouldShowExpandedCard = useMediaQuery("(min-width: 961px)");
  const [accountCreatedModalOpen, setAccountCreatedModalOpen] =
    React.useState<boolean>(false);
  const [loginSuccessModalOpen, setLoginSuccessModalOpen] =
    React.useState<boolean>(false);
  const [propertyForOptions, setPropertyForOptions] = React.useState<
    ListingTypeMaster[]
  >([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = React.useState<
    PropertyTypeMaster[]
  >([]);
  const bedsBathsOptions = [
    "1 Bed | 1 Bath",
    "2 Beds | 2 Bath",
    "3 Beds | 3 Bath",
  ];
  const bedroomOptions: BedsBathOption[] = [
    { label: "Studio", value: 0 },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "7", value: 7 },
    { label: "7+", value: 8 },
  ];
  const bathroomOptions: BedsBathOption[] = [
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "7", value: 7 },
    { label: "7+", value: 8 },
  ];
  const popularSearches = useMemo(
    () => [
      "Luxury Waterfront Villas",
      "Modern Penthouses",
      "Prime Off-Plan Investments",
    ],
    []
  );
  const [furnishingSelection, setFurnishingSelection] =
    React.useState<string>("");
  const [amenitiesSelection, setAmenitiesSelection] =
    React.useState<string>("");
  const [furnishingOptions, setFurnishingOptions] = React.useState<
    FurnishedStatusMaster[]
  >([]);
  const [amenitiesOptions, setAmenitiesOptions] = React.useState<
    AmenityMaster[]
  >([]);
  const [projectLocationOptions, setProjectLocationOptions] = React.useState<
    ListingSearchCityMaster[]
  >([]);
  const [homeProjectCards, setHomeProjectCards] = React.useState<
    HomeProjectCardData[]
  >([]);
  const [homeProjectSearchLoading, setHomeProjectSearchLoading] =
    React.useState(false);
  const [homeSupportedUrls, setHomeSupportedUrls] = React.useState<SupportedUrlMap | null>(
    null
  );

  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();

  const projectImageBaseUrl = useMemo(() => {
    const base = (homeSupportedUrls as { projectUrl?: { img?: unknown } } | null)
      ?.projectUrl?.img;
    return typeof base === "string" ? base : null;
  }, [homeSupportedUrls]);

  const developerLogoBaseUrl = useMemo(() => {
    const base = (homeSupportedUrls as { developerUrl?: { img?: unknown } } | null)
      ?.developerUrl?.img;
    return typeof base === "string" ? base : null;
  }, [homeSupportedUrls]);

  const primePropertyImageBaseUrl = useMemo(() => {
    const base = (homeSupportedUrls as { propertyUrl?: { img?: unknown } } | null)
      ?.propertyUrl?.img;
    return typeof base === "string" ? base : null;
  }, [homeSupportedUrls]);

  const primeActiveListingType = useMemo(() => {
    const id = primeLocationListingTypeId.trim();
    if (!id) return null;
    return (
      propertyForOptions.find((item) => listingTypeMasterId(item) === id) ?? null
    );
  }, [propertyForOptions, primeLocationListingTypeId]);

  const primeLocationTabsValue = useMemo(() => {
    const id = primeLocationListingTypeId.trim();
    if (id && propertyForOptions.some((item) => listingTypeMasterId(item) === id)) {
      return id;
    }
    const first = propertyForOptions[0];
    return first ? listingTypeMasterId(first) : "";
  }, [primeLocationListingTypeId, propertyForOptions]);

  const projectTabLabels = useMemo(() => {
    const byLabel = new Map<
      string,
      { label: string; projectCount: number; fallbackOrder: number }
    >();
    projectLocationOptions.forEach((item, index) => {
      const label = String(item.displayName ?? "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      const count =
        typeof item.projectCount === "number" && Number.isFinite(item.projectCount)
          ? item.projectCount
          : 0;
      const existing = byLabel.get(key);
      if (!existing || count > existing.projectCount) {
        byLabel.set(key, { label, projectCount: count, fallbackOrder: index });
      }
    });

    const topLabels = Array.from(byLabel.values())
      .sort((a, b) => {
        if (b.projectCount !== a.projectCount) {
          return b.projectCount - a.projectCount;
        }
        return a.fallbackOrder - b.fallbackOrder;
      })
      .slice(0, 7)
      .map((item) => item.label);

    return ["All", ...topLabels];
  }, [projectLocationOptions]);

  const selectedProjectTabIndex = useMemo(() => {
    const index = projectTabLabels.indexOf(selectedCategory);
    return index >= 0 ? index : 0;
  }, [projectTabLabels, selectedCategory]);

  useEffect(() => {
    if (!projectTabLabels.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [projectTabLabels, selectedCategory]);

  useEffect(() => {
    let mounted = true;

    const loadListingTypes = async () => {
      try {
        const resp = await getListingTypesMasterData();
        const options = (resp.data.items ?? []).filter(
          (item) => !!item?.name?.trim()
        );

        if (!mounted || !options.length) return;
        setPropertyForOptions(options);
        setPropertyFor(options[0]);
        setPrimeLocationListingTypeId((prev) => {
          if (prev && options.some((o) => listingTypeMasterId(o) === prev)) {
            return prev;
          }
          return listingTypeMasterId(options[0]);
        });
      } catch {
        // Keep dropdowns empty if API fails.
      }
    };

    loadListingTypes();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedPrimeLocationSearch(primeLocationSearch.trim());
    }, 450);
    return () => window.clearTimeout(handle);
  }, [primeLocationSearch]);

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
        setHomeSupportedUrls(map);
      })
      .catch(() => {
        if (mounted) setHomeSupportedUrls(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProjectLocations = async () => {
      try {
        const resp = await getListingSearchCityMasterData("project");
        if (!mounted) return;
        const options = (resp?.data?.cities ?? []).filter(
          (item) => !!item?._id && !!String(item.displayName ?? "").trim()
        );
        setProjectLocationOptions(options);
      } catch {
        if (mounted) setProjectLocationOptions([]);
      }
    };
    loadProjectLocations();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestGen = ++homeProjectSearchGenRef.current;
    setHomeProjectSearchLoading(true);
    const selectedLocationId =
      selectedCategory === "All"
        ? ""
        : (
            projectLocationOptions.find(
              (item) =>
                String(item.displayName ?? "").trim().toLowerCase() ===
                selectedCategory.trim().toLowerCase()
            )?._id ?? ""
          ).trim();

    const mapProjectToHomeCard = (
      project: ProjectSearchApiProject,
      index: number
    ): HomeProjectCardData => {
      const images = project.images ?? [];
      const primaryImageRaw =
        images.find((img) => img?.isPrimary)?.url ?? images[0]?.url ?? "";
      const image = resolveSupportedUrlPath(primaryImageRaw, projectImageBaseUrl);
      const logo = resolveSupportedUrlPath(
        project.developer?.logo as unknown,
        developerLogoBaseUrl
      );

      const locationLabel = [
        project.location?.address,
        project.location?.zone,
        project.location?.city,
      ]
        .filter((item): item is string => Boolean(item && String(item).trim()))
        .join(", ");
      const launchPriceValue =
        typeof project.launchPrice === "number"
          ? project.launchPrice
          : typeof project.launchPrice?.startingFrom === "number"
            ? project.launchPrice.startingFrom
            : null;
      const launchPrice =
        typeof launchPriceValue === "number" && Number.isFinite(launchPriceValue)
          ? launchPriceValue.toLocaleString("en-US")
          : undefined;
      const currency =
        typeof project.launchPrice === "object" &&
        typeof project.launchPrice?.currency === "string" &&
        project.launchPrice.currency.trim()
          ? project.launchPrice.currency.trim()
          : "AED";
      const bedsRange =
        project.bedroomRange?.min != null || project.bedroomRange?.max != null;
      const bedroomLabel = bedsRange
        ? project.bedroomRange?.min != null && project.bedroomRange?.max != null
          ? project.bedroomRange.min === project.bedroomRange.max
            ? `${project.bedroomRange.min} bedrooms`
            : `${project.bedroomRange.min}-${project.bedroomRange.max} bedrooms`
          : project.bedroomRange?.min != null
            ? `${project.bedroomRange.min}+ bedrooms`
            : `Up to ${project.bedroomRange?.max} bedrooms`
        : "";
      const propertyTypeNames = (project.propertyTypes ?? [])
        .map((p) => String(p?.name ?? "").trim())
        .filter(Boolean);
      const amenityCount = Array.isArray(project.amenities)
        ? project.amenities.length
        : 0;
      const completionLabel = String(project.completionStatus ?? "").trim();
      const featureCandidates: string[] = [
        bedroomLabel,
        project.paymentPlansCount
          ? `${project.paymentPlansCount} payment plans`
          : "",
        project.availableUnits
          ? `${project.availableUnits} units available`
          : project.totalUnits
            ? `${project.totalUnits} total units`
            : "",
        project.totalUnits ? `${project.totalUnits} total units` : "",
        project.projectType ? `${project.projectType} project` : "",
        propertyTypeNames.length
          ? `${propertyTypeNames.slice(0, 2).join(" / ")}`
          : "",
        completionLabel
          ? `Completion: ${completionLabel
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (ch) => ch.toUpperCase())}`
          : "",
        project.deliveryQuarter ? `Delivery ${project.deliveryQuarter}` : "",
        project.hasPostHandoverPayment ? "Post handover payment" : "",
        project.isDldRegistered ? "DLD registered" : "",
        project.isVerified ? "Verified project" : "",
        amenityCount > 0 ? `${amenityCount} amenities` : "",
        project.views ? `${project.views.toLocaleString("en-US")} views` : "",
        project.location?.city ? `City: ${project.location.city}` : "",
      ];
      const features = Array.from(
        new Set(featureCandidates.map((item) => item.trim()).filter(Boolean))
      ).slice(0, 9);
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

      const id = String(project._id ?? "").trim();
      const title = String(project.projectName ?? "").trim() || "Project";
      const developerPhone =
        String(
          (project.developer as { phoneNumber?: string } | null)?.phoneNumber ?? ""
        ).trim() || undefined;
      const whatsappMessage = `Hi, I'm interested in this project: ${title}${
        project._id ? ` (ID: ${project._id})` : ""
      }.`;

      return {
        key: id || `${project.slug ?? "project"}-${index}`,
        projectId: id,
        city: String(project.location?.city ?? "").trim(),
        title,
        location: locationLabel || "Prime Location",
        launchPrice,
        currency,
        features: features.length ? features : ["Featured Project"],
        image: image || companyLogo1,
        logo: logo || undefined,
        tags: tags.length ? tags : undefined,
        developerPhone,
        whatsappMessage,
      };
    };

    void postProjectSearch(
      {
        page: 1,
        limit: 6,
        ...(selectedLocationId ? { location: selectedLocationId } : {}),
      },
      controller.signal
    )
      .then((resp) => {
        if (controller.signal.aborted) return;
        const projects = Array.isArray(resp?.data?.projects) ? resp.data.projects : [];
        setHomeProjectCards(projects.slice(0, 6).map(mapProjectToHomeCard));
      })
      .catch(() => {
        if (!controller.signal.aborted) setHomeProjectCards([]);
      })
      .finally(() => {
        if (homeProjectSearchGenRef.current === requestGen) {
          setHomeProjectSearchLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    selectedCategory,
    projectLocationOptions,
    projectImageBaseUrl,
    developerLogoBaseUrl,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadAmenitiesAndFurnishedStatus = async () => {
      try {
        const resp = await getAmenitiesAndFurnishedStatusMasterData();
        const furnishedOptions = (resp.data.furnishedStatus ?? []).filter(
          (item) => !!item?.name?.trim() && !!item?.value?.trim()
        );
        const amenityItems = (resp.data.amenities ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );

        if (!mounted) return;

        if (furnishedOptions.length) {
          setFurnishingOptions(furnishedOptions);
        }

        if (amenityItems.length) {
          setAmenitiesOptions(amenityItems);
        }
      } catch {
        // Keep dropdowns empty if API fails.
      }
    };

    loadAmenitiesAndFurnishedStatus();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPropertyTypes = async () => {
      try {
        const resp = await getPropertyTypesMasterData();
        const options = (resp.data.items ?? []).filter(
          (item) => !!item?.name?.trim()
        );

        if (!mounted || !options.length) return;
        setPropertyTypeOptions(options);
      } catch {
        // Keep static fallback options if API fails.
      }
    };

    loadPropertyTypes();
    return () => {
      mounted = false;
    };
  }, []);

  /* Legacy static prime-location demo markers (replaced by /properties/search and /projects/search).
  const primeLocationProperties = useMemo<PrimeLocationProperty[]>(() => [...], []);
  */



  const resolveTestimonialAvatar = useCallback(
    (filename: string | undefined) => {
      const trimmed = String(filename || "").trim();
      if (!trimmed) return defaultAvatar;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const base = testimonialMediaBaseUrl.replace(/\/+$/, "");
      return base ? `${base}/${encodeURIComponent(trimmed)}` : defaultAvatar;
    },
    [testimonialMediaBaseUrl]
  );

  useEffect(() => {
    let mounted = true;

    testimonialService
      .getTestimonials()
      .then((data) => {
        if (!mounted) return;
        setTestimonialSettings({
          sectionTitle: data.settings?.sectionTitle || "Don't take our word for it!",
          sectionSubtitle:
            data.settings?.sectionSubtitle || "Hear it from our customers",
        });
        setCustomerRatings(data.testimonials || []);
        setTestimonialMediaBaseUrl(data.mediaBaseUrl?.img || "");
      })
      .catch(() => {
        if (!mounted) return;
        setCustomerRatings([]);
      })
      .finally(() => {
        if (mounted) setTestimonialsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const updateVisibleCards = () => {
      const width = window.innerWidth;
      const visible =
        width <= 600 ? 1 : width <= 960 ? 2 : width <= 1200 ? 3 : 4;
      setCustomerVisibleCards(visible);
    };

    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);
    return () => window.removeEventListener("resize", updateVisibleCards);
  }, []);

  const maxCustomerSlide = useMemo(
    () => Math.max(customerRatings.length - customerVisibleCards, 0),
    [customerRatings.length, customerVisibleCards]
  );

  React.useEffect(() => {
    setCustomerSlideIndex((prev) => Math.min(prev, maxCustomerSlide));
  }, [maxCustomerSlide]);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("showAccountCreated") === "true") {
      setAccountCreatedModalOpen(true);
      // Clean up URL parameter
      navigate("/", { replace: true });
      setTimeout(() => {
        handleAccountCreatedModalClose();
      }, 2000);
    }
    if (searchParams.get("showLoginSuccess") === "true") {
      setLoginSuccessModalOpen(true);
      // Clean up URL parameter
      navigate("/", { replace: true });
      setTimeout(() => {
        handleCloseLoginSuccessModal();
      }, 1000);
    }
  }, [location.search, navigate]);

  const handleCustomerPrev = useCallback(() => {
    setCustomerSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleCustomerNext = useCallback(() => {
    setCustomerSlideIndex((prev) => Math.min(prev + 1, maxCustomerSlide));
  }, [maxCustomerSlide]);

  const customerTranslatePercent = 100 / customerVisibleCards;

  useEffect(() => {
    const listingId = primeLocationListingTypeId.trim();
    if (!listingId || !propertyForOptions.length) return;

    const selectedLt = propertyForOptions.find(
      (item) => listingTypeMasterId(item) === listingId
    );
    if (!selectedLt) return;

    const requestGen = ++primeLocationSearchGenRef.current;
    const controller = new AbortController();
    setPrimeLocationLoading(true);

    const listingName = String(selectedLt.name ?? "").trim() || "Properties";
    const keyword = debouncedPrimeLocationSearch.trim();
    const kwPayload = keyword ? { keyword } : {};

    const mapPropertyRow = (
      property: PropertySearchApiProperty
    ): PrimeLocationProperty | null => {
      const position = readGeoPointCoordinates(property.location?.coordinates ?? null);
      if (!position) return null;
      const images = property.images ?? [];
      const raw =
        images.find((img) => img?.isPrimary)?.url ?? images[0]?.url ?? "";
      const image =
        resolveSupportedUrlPath(raw, primePropertyImageBaseUrl) || companyLogo1;
      const locationLabel =
        String(property.location?.fullAddress ?? "").trim() ||
        [property.location?.city, property.location?.zone, property.location?.building]
          .filter((part): part is string => Boolean(part && String(part).trim()))
          .join(", ") ||
        "Prime Location";
      const currency = String(property.currency ?? "AED").trim() || "AED";
      const tx = resolveListingTransactionForProperty(property, "sale");
      const rentPricing = property.rentPricing ?? null;
      const hasRentPricing =
        tx === "rent" &&
        rentPricing &&
        typeof rentPricing.yearly === "number" &&
        typeof rentPricing.monthly === "number" &&
        Number.isFinite(rentPricing.yearly) &&
        Number.isFinite(rentPricing.monthly) &&
        rentPricing.yearly > 0 &&
        rentPricing.monthly > 0;
      let price = "—";
      let priceCaption = "Price";
      if (hasRentPricing) {
        price = `${Number(rentPricing.yearly).toLocaleString("en-US")} ${currency}/year · ${Number(
          rentPricing.monthly
        ).toLocaleString("en-US")} ${currency}/month`;
        priceCaption = "Rent from";
      } else if (typeof property.price === "number" && Number.isFinite(property.price)) {
        price = `${property.price.toLocaleString("en-US")} ${currency}`;
        priceCaption = tx === "rent" ? "Rent" : "Price";
      }
      const id = String(property._id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(property.title ?? "").trim() || "Property",
        location: locationLabel,
        price,
        priceCaption,
        category: listingName,
        position,
        image,
        kind: "property",
      };
    };

    const mapProjectRow = (
      project: ProjectSearchApiProject
    ): PrimeLocationProperty | null => {
      const position = readGeoPointCoordinates(project.location?.coordinates ?? null);
      if (!position) return null;
      const images = project.images ?? [];
      const raw =
        images.find((img) => img?.isPrimary)?.url ?? images[0]?.url ?? "";
      const image =
        resolveSupportedUrlPath(raw, projectImageBaseUrl) || companyLogo1;
      const locationLabel = [
        project.location?.address,
        project.location?.zone,
        project.location?.city,
      ]
        .filter((part): part is string => Boolean(part && String(part).trim()))
        .join(", ");
      const lp = project.launchPrice as
        | number
        | null
        | { startingFrom?: number | null; currency?: string | null };
      const n =
        typeof lp === "number"
          ? lp
          : typeof lp === "object" && lp && typeof lp.startingFrom === "number"
            ? lp.startingFrom
            : null;
      const cur =
        typeof lp === "object" && lp && typeof lp.currency === "string" && lp.currency.trim()
          ? lp.currency.trim()
          : "AED";
      const price =
        typeof n === "number" && Number.isFinite(n)
          ? `${n.toLocaleString("en-US")} ${cur}`
          : "Price on request";
      const id = String(project._id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(project.projectName ?? "").trim() || "Project",
        location: locationLabel || "Prime Location",
        price,
        priceCaption: "Launch price",
        category: listingName,
        position,
        image,
        kind: "project",
      };
    };

    const applyResult = (rows: PrimeLocationProperty[], total: number) => {
      if (primeLocationSearchGenRef.current !== requestGen) return;
      setPrimeLocationItems(rows);
      setPrimeLocationTotalCount(total);
    };

    if (isNewProjectsListingType(selectedLt)) {
      void postProjectSearch(
        { page: 1, limit: 40, ...kwPayload },
        controller.signal
      )
        .then((resp) => {
          if (primeLocationSearchGenRef.current !== requestGen) return;
          if (resp?.status === false) {
            applyResult([], 0);
            return;
          }
          const projects = Array.isArray(resp?.data?.projects) ? resp.data.projects : [];
          const rows = projects
            .map((project) => mapProjectRow(project))
            .filter((row): row is PrimeLocationProperty => Boolean(row));
          const total = resp?.data?.pagination?.totalProjects ?? rows.length;
          applyResult(rows, total);
        })
        .catch(() => {
          if (primeLocationSearchGenRef.current === requestGen) {
            applyResult([], 0);
          }
        })
        .finally(() => {
          if (primeLocationSearchGenRef.current === requestGen) {
            setPrimeLocationLoading(false);
          }
        });
    } else {
      void postPropertySearch(
        { listingType: listingId, page: 1, limit: 40, ...kwPayload },
        controller.signal
      )
        .then((resp) => {
          if (primeLocationSearchGenRef.current !== requestGen) return;
          if (resp?.status === false) {
            applyResult([], 0);
            return;
          }
          const properties = Array.isArray(resp?.data?.properties)
            ? resp.data.properties
            : [];
          const rows = properties
            .map((property) => mapPropertyRow(property))
            .filter((row): row is PrimeLocationProperty => Boolean(row));
          const total = resp?.data?.pagination?.totalProperties ?? rows.length;
          applyResult(rows, total);
        })
        .catch(() => {
          if (primeLocationSearchGenRef.current === requestGen) {
            applyResult([], 0);
          }
        })
        .finally(() => {
          if (primeLocationSearchGenRef.current === requestGen) {
            setPrimeLocationLoading(false);
          }
        });
    }

    return () => controller.abort();
  }, [
    primeLocationListingTypeId,
    debouncedPrimeLocationSearch,
    propertyForOptions,
    primePropertyImageBaseUrl,
    projectImageBaseUrl,
  ]);

  React.useEffect(() => {
    const element = primeListRef.current;
    if (!element) return;

    const handleScroll = () => {
      const isAtBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight <= 1;
      setPrimeListAtBottom(isAtBottom);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [primeLocationItems]);

  const activeProperty = useMemo(() => {
    if (hoveredMarkerId == null) {
      return null;
    }
    return (
      primeLocationItems.find((property) => property.id === hoveredMarkerId) ??
      null
    );
  }, [primeLocationItems, hoveredMarkerId]);

  const handlePrimeInfoSeeDetails = useCallback(() => {
    if (!hoveredMarkerId) return;
    const row = primeLocationItems.find((p) => p.id === hoveredMarkerId);
    if (!row) return;
    if (row.kind === "project") {
      navigate(
        `/newprojectdrilldown/${encodeURIComponent(row.id)}`,
        { state: { projectId: row.id } }
      );
    } else {
      navigate(
        `/propertydrilldown/${encodeURIComponent(row.id)}`,
        { state: { propertyId: row.id } }
      );
    }
  }, [hoveredMarkerId, primeLocationItems, navigate]);

  const mapCenter = useMemo(() => {
    if (primeLocationItems.length === 0) {
      return { lat: 25.2048, lng: 55.2708 };
    }

    const sums = primeLocationItems.reduce(
      (acc, property) => {
        acc.lat += property.position.lat;
        acc.lng += property.position.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sums.lat / primeLocationItems.length,
      lng: sums.lng / primeLocationItems.length,
    };
  }, [primeLocationItems]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      clickableIcons: false,
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

  React.useEffect(() => {
    const googleMaps = (window as typeof window & { google?: any }).google
      ?.maps;
    if (
      !isLoaded ||
      !mapRef.current ||
      !primeLocationItems.length ||
      !googleMaps
    ) {
      return;
    }

    if (primeLocationItems.length === 1) {
      mapRef.current.setCenter(primeLocationItems[0].position);
      mapRef.current.setZoom(14);
      return;
    }

    const bounds = new googleMaps.LatLngBounds();
    primeLocationItems.forEach((property) => {
      bounds.extend(property.position);
    });
    mapRef.current.fitBounds(bounds);
  }, [isLoaded, primeLocationItems]);

  const handlePropertyClick = useCallback(
    (property: PrimeLocationProperty) => {
      setSelectedMarkerId(property.id);
      mapRef.current?.panTo(property.position);
      mapRef.current?.setZoom(14);

      if (isMobileViewport) {
        setPrimeMobileView("map");
      }
    },
    [isMobileViewport]
  );

  const handlePrimeLocationSeeAll = useCallback(() => {
    const lt = primeActiveListingType;
    if (!lt) return;
    const kw = debouncedPrimeLocationSearch.trim();
    if (isNewProjectsListingType(lt)) {
      navigate("/newprojectlisting", {
        state: {
          ...(kw ? { keyword: kw } : {}),
        },
      });
    } else {
      const id = listingTypeMasterId(lt);
      navigate("/searchlisting", {
        state: {
          propertyFor: id ? [id] : [],
          ...(kw ? { keyword: kw } : {}),
        },
      });
    }
  }, [navigate, primeActiveListingType, debouncedPrimeLocationSearch]);

  const handlePrimeSeeFullMap = useCallback(() => {
    const lt = primeActiveListingType;
    const kw = debouncedPrimeLocationSearch.trim();
    const kwOpt = kw ? { keyword: kw } : {};
    if (!lt) {
      navigate("/mapview");
      return;
    }
    if (isNewProjectsListingType(lt)) {
      const payload: ProjectSearchRequestBody = {
        page: 1,
        limit: 40,
        ...kwOpt,
      };
      navigate("/mapview", { state: { initialProjectSearch: payload } });
      return;
    }
    const listingType = listingTypeMasterId(lt);
    if (!listingType) {
      navigate("/mapview");
      return;
    }
    const payload: PropertySearchRequestBody = {
      listingType,
      page: 1,
      limit: 40,
      ...kwOpt,
    };
    navigate("/mapview", { state: { initialPropertySearch: payload } });
  }, [navigate, primeActiveListingType, debouncedPrimeLocationSearch]);

  const mapZoom = primeLocationItems.length <= 1 ? 14 : 12;

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

  React.useEffect(() => {
    if (!isMobileViewport && primeMobileView !== "map") {
      setPrimeMobileView("map");
    }
  }, [isMobileViewport, primeMobileView]);

  const primeLocationContainerClassName = `pf-prime-location__container${isMobileViewport
    ? ` pf-prime-location__container--mobile-${primeMobileView}`
    : ""
    }`;

  const handleAccountCreatedModalClose = () => {
    setAccountCreatedModalOpen(false);
  };

  const handleCloseLoginSuccessModal = () => {
    setLoginSuccessModalOpen(false);
  };

  const handleNavigateToSearchList = () => {
    const isNewProjectSearch = isNewProjectsListingType(propertyFor);

    const appliedFilters: string[] = [];

    if (propertyFor?.name) {
      appliedFilters.push(propertyFor.name);
    }
    if (propertyType?.name) {
      appliedFilters.push(propertyType.name);
    }
    if (selectedBedrooms !== null) {
      if (selectedBedrooms > 0) {
        appliedFilters.push(`${selectedBedrooms} bedroom`);
      } else {
        appliedFilters.push("Studio");
      }
    }
    if (selectedBathrooms !== null && selectedBathrooms > 0) {
      appliedFilters.push(`${selectedBathrooms} bathroom`);
    }
    if (!isNewProjectSearch && furnishingSelection) {
      const furnishingName =
        furnishingOptions.find((o) => o.value === furnishingSelection)?.name ??
        furnishingSelection;
      appliedFilters.push(furnishingName);
    }
    if (amenitiesSelection) {
      const amenityName =
        amenitiesOptions.find((o) => o._id === amenitiesSelection)?.name ??
        amenitiesSelection;
      appliedFilters.push(amenityName);
    }
    if (nearbySearchEnabled) {
      appliedFilters.push("Search near by");
    }
    if (onlyCommercialProperties) {
      appliedFilters.push("Only commercial properties");
    }
    if (selectedCategory && selectedCategory !== "All") {
      appliedFilters.push(selectedCategory);
    }

    const kw = heroSearchKeyword.trim();
    const navigationState = {
      appliedFilters,
      propertyFor: propertyFor?._id ? [propertyFor._id] : [],
      propertyTypes: propertyType?._id ? [propertyType._id] : [],
      bedrooms: selectedBedrooms ?? 0,
      bathrooms: selectedBathrooms ?? 0,
      furnishing: isNewProjectSearch ? "" : furnishingSelection,
      amenities: amenitiesSelection ? [amenitiesSelection] : [],
      nearbySearchEnabled,
      onlyCommercialProperties,
      category: selectedCategory,
      ...(kw ? { keyword: kw } : {}),
    };

    navigate(
      isNewProjectSearch ? "/newprojectlisting" : "/searchlisting",
      { state: navigationState }
    );
  };
  const [showPropertyType, setShowPropertyType] = useState(false);
  const [propertyType, setPropertyType] = useState<PropertyTypeMaster>({
    name: "",
    slug: "",
  });
  const propertyTypeDropdownRef = useRef<HTMLDivElement | null>(null);

  const [showPropertyFor, setShowPropertyFor] = useState(false);
  const propertyForDropdownRef = useRef<HTMLDivElement | null>(null);

  const [showBedsBaths, setShowBedsBaths] = useState(false);
  const bedsBathsDropdownRef = useRef<HTMLDivElement | null>(null);

  // Update bedsBaths display when bedrooms or bathrooms change
  React.useEffect(() => {
    if (selectedBedrooms === null || selectedBathrooms === null) {
      setBedsBaths("Select");
      return;
    }
    const selectedBedroomOption = bedroomOptions.find(
      (option) => option.value === selectedBedrooms
    );
    const selectedBathroomOption = bathroomOptions.find(
      (option) => option.value === selectedBathrooms
    );
    const bedroomsText =
      selectedBedrooms === 0
        ? "Studio"
        : `${selectedBedroomOption?.label ?? selectedBedrooms} Beds`;
    const bathroomsText = `${selectedBathroomOption?.label ?? selectedBathrooms} Bath`;
    setBedsBaths(`${bedroomsText} | ${bathroomsText}`);
  }, [selectedBedrooms, selectedBathrooms, bedroomOptions, bathroomOptions]);

  const handleOnlyCommercialToggle = () => {
    const next = !onlyCommercialProperties;
    setOnlyCommercialProperties(next);
    if (!propertyForOptions.length) return;
    if (next) {
      const commercialBuy = findCommercialBuyListingType(propertyForOptions);
      if (commercialBuy) setPropertyFor(commercialBuy);
    } else {
      const residential = findDefaultResidentialBuyListingType(
        propertyForOptions
      );
      if (residential) setPropertyFor(residential);
    }
  };

  // Close Property type dropdown when clicking outside
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

  // Close Property for dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyForDropdownRef.current &&
        !propertyForDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPropertyFor(false);
      }
    };

    if (showPropertyFor) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPropertyFor]);

  // Close Beds & Baths dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bedsBathsDropdownRef.current &&
        !bedsBathsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBedsBaths(false);
      }
    };

    if (showBedsBaths) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBedsBaths]);

  return (
    <>
      <AccountCreatedModal
        open={accountCreatedModalOpen}
        onClose={handleAccountCreatedModalClose}
      />
      <LoginSuccessModal
        open={loginSuccessModalOpen}
        onClose={handleCloseLoginSuccessModal}
      />
      <main className="pf-hero" role="main">
        <div className="pf-hero__shade" />

        <PFContainer className="pf-hero__content">
          <div className="pf-hero__vertical-brand">Estatehub — Luxury Real Estate</div>
          <div className="pf-hero__badge">
            <span className="pf-hero__badge-dot" />
            Exclusive Living Spaces
          </div>
          <h1 className="pf-hero__title">
            Where Luxury <span className="pf-hero__title-gold">Meets Home</span>
          </h1>
          <p className="pf-hero__subtitle">
            Curated ultra-luxury residences, off-plan penthouses, and private estates across top destinations worldwide.
          </p>

          <div className="pf-hero__actions">
            <Button className="pf-btn pf-btn--primary" disableRipple onClick={() => navigate("/searchlisting")}>
              Explore properties
            </Button>
            <Button className="pf-btn pf-btn--ghost" disableRipple onClick={() => navigate("/contact")} >
              Contact us
              <RightArrowRoundFillIcon
                className="pf-btn__circle"
                fill="#222222"
                roundFill="#FFFFFF"
              />
            </Button>
          </div>

          {/* pf search */}
          <div className="pf-hero__search">
            <div className="pf-search__wrapper">
              <div className="pf-search__inner">
                <form
                  ref={searchRef}
                  className={`pf-search pf-search--pill${onlyCommercialProperties ? " pf-search--commercial-active" : ""}`}
                  onSubmit={(e) => e.preventDefault()}
                  aria-label="Property search"
                >
                  <div className="pf-field pf-field--input">
                    <SearchIcon className="pf-field__icon" />
                    <input
                      className="pf-field__control"
                      type="text"
                      placeholder="Search by city, Community or Building"
                      aria-label="Search keywords"
                      value={heroSearchKeyword}
                      onChange={(e) => setHeroSearchKeyword(e.target.value)}
                    />
                  </div>
                  <div className="pf-field-flex-section">
                    {/* Property for */}
                    <div
                      ref={propertyForDropdownRef}
                      onClick={() => setShowPropertyFor(!showPropertyFor)}
                      className="pf-field-flex-section-item pf-dropdown-wrapper"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="pf-field-flex-section-item-content">
                        <h6 className="pf-field-flex-section-item-content-label">Property for</h6>
                        <h4 className="pf-field-flex-section-item-content-value">
                          {propertyFor?.name?.trim() || "Select"}
                        </h4>
                      </div>
                      <DownArrowIconBlack
                        className="pf-field-flex-section-item-icon"
                        width={12}
                        height={8}
                        onClick={() => setShowPropertyFor(!showPropertyFor)}
                      />

                      {showPropertyFor && (
                        <ul className="pf-dropdown-property-type">
                          {propertyForOptions.map((option) => (
                            <li
                              key={option._id || option.id || option.slug || option.name}
                              onClick={() => {
                                setPropertyFor(option);
                                setShowPropertyFor(false);
                              }}
                            >
                              {option.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Property type */}
                    <div
                      ref={propertyTypeDropdownRef}
                      onClick={() => setShowPropertyType(!showPropertyType)}
                      className="pf-field-flex-section-item pf-dropdown-wrapper"
                    >
                      <div className="pf-field-flex-section-item-content">
                        <h6 className="pf-field-flex-section-item-content-label">Property type</h6>
                        <h4 className="pf-field-flex-section-item-content-value">
                          {propertyType?.name || "Select"}
                        </h4>
                      </div>

                      <DownArrowIconBlack
                        className="pf-field-flex-section-item-icon"
                        width={12}
                        height={8}
                        onClick={() => setShowPropertyType(!showPropertyType)}
                      />

                      {showPropertyType && (
                        <ul className="pf-dropdown-property-type">
                          {propertyTypeOptions.map((type) => (
                            <li
                              key={type._id || type.id || type.slug || type.name}
                              onClick={() => {
                                setPropertyType(type);
                                setShowPropertyType(false);
                              }}
                            >
                              {type.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Beds & Baths */}
                    <div
                      ref={bedsBathsDropdownRef}
                      onClick={() => setShowBedsBaths(!showBedsBaths)}
                      className="pf-field-flex-section-item pf-dropdown-wrapper pf-beds-baths-none"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="pf-field-flex-section-item-content">
                        <h6 className="pf-field-flex-section-item-content-label">Beds & Baths</h6>
                        <h4 className="pf-field-flex-section-item-content-value">{bedsBaths}</h4>
                      </div>
                      <DownArrowIconBlack
                        className="pf-field-flex-section-item-icon"
                        width={12}
                        height={8}
                        onClick={() => setShowBedsBaths(!showBedsBaths)}
                      />

                      {showBedsBaths && (
                        <div className="pf-dropdown-beds-baths">
                          <div className="pf-dropdown-beds-baths__section">
                            <h6 className="pf-dropdown-beds-baths__label">Bedrooms</h6>
                            <div className="pf-dropdown-beds-baths__buttons">
                              {bedroomOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`pf-dropdown-beds-baths__button ${selectedBedrooms !== null && selectedBedrooms === option.value ? "pf-dropdown-beds-baths__button--active" : ""
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBedrooms(option.value);
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="pf-dropdown-beds-baths__section">
                            <h6 className="pf-dropdown-beds-baths__label">Bathrooms</h6>
                            <div className="pf-dropdown-beds-baths__buttons">
                              {bathroomOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`pf-dropdown-beds-baths__button ${selectedBathrooms !== null && selectedBathrooms === option.value ? "pf-dropdown-beds-baths__button--active" : ""
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBathrooms(option.value);
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      className="pf-search__submit pf-search__submit--dark"
                      type="submit"
                      onClick={handleNavigateToSearchList}
                    >
                      <SearchIcon className="pf-search__submitIcon" />
                      <span>Search</span>
                    </button>
                  </div>
                </form>
                <div className="pf-search__meta">
                  {showAdvancedFilters ? (
                    <div className="pf-search__row pf-search__row--advanced">
                      <span className="pf-search__label">
                        Advanced filters :
                      </span>
                      <div className="pf-search__filters">
                        <div className="pf-search__filterField">
                          <span className="pf-search__filterLabel">
                            Furnishing
                          </span>
                          <FormControl
                            size="small"
                            className="pf-search__filterControl"
                          >
                            <Select
                              value={furnishingSelection}
                              onChange={(e) =>
                                setFurnishingSelection(e.target.value as string)
                              }
                              displayEmpty
                              renderValue={(v) =>
                                v
                                  ? furnishingOptions.find((o) => o.value === v)
                                      ?.name ?? ""
                                  : "Select"
                              }
                              className="pf-search__filterSelect"
                              IconComponent={SearchSelectIcon}
                              MenuProps={{
                                PaperProps: {
                                  className: "pf-dropdown",
                                },
                                anchorReference: "anchorEl",
                                disablePortal: false,
                                disableScrollLock: true,
                                anchorOrigin: {
                                  vertical: "bottom",
                                  horizontal: "left",
                                },
                                transformOrigin: {
                                  vertical: "top",
                                  horizontal: "left",
                                },
                              }}
                            >
                              <MenuItem value="" className="pf-dropdown__item">
                                Select
                              </MenuItem>
                              {furnishingOptions.map((opt) => (
                                <MenuItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="pf-dropdown__item"
                                >
                                  {opt.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>

                        <div className="pf-search__filterField">
                          <span className="pf-search__filterLabel">
                            Amenities
                          </span>
                          <FormControl
                            size="small"
                            className="pf-search__filterControl"
                          >
                            <Select
                              value={amenitiesSelection}
                              onChange={(e) =>
                                setAmenitiesSelection(e.target.value as string)
                              }
                              displayEmpty
                              renderValue={(v) =>
                                v
                                  ? amenitiesOptions.find((o) => o._id === v)
                                      ?.name ?? ""
                                  : "Select"
                              }
                              className="pf-search__filterSelect"
                              IconComponent={SearchSelectIcon}
                              MenuProps={{
                                PaperProps: {
                                  className: "pf-dropdown",
                                },
                                anchorReference: "anchorEl",
                                disablePortal: false,
                                disableScrollLock: true,
                                anchorOrigin: {
                                  vertical: "bottom",
                                  horizontal: "left",
                                },
                                transformOrigin: {
                                  vertical: "top",
                                  horizontal: "left",
                                },
                              }}
                            >
                              <MenuItem value="" className="pf-dropdown__item">
                                Select
                              </MenuItem>
                              {amenitiesOptions.map((opt) => (
                                <MenuItem
                                  key={opt._id}
                                  value={opt._id}
                                  className="pf-dropdown__item"
                                >
                                  {opt.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>

                        <button
                          type="button"
                          className={`pf-searchChip pf-searchChip--filter pf-searchChip--nearby${nearbySearchEnabled ? " pf-searchChip--active" : ""
                            }`}
                          onClick={() =>
                            setNearbySearchEnabled((prevState) => !prevState)
                          }
                          aria-pressed={nearbySearchEnabled}
                        >
                          <BoldLocationIcon width="14" height="14" stroke="#222222" />
                          <span className="pf-searchChip__value">
                            Search near by
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="pf-search__back"
                        onClick={() => setShowAdvancedFilters(false)}
                      >
                        <LeftArrowIcon width="15" height="15" fill="#1F3D51" />
                        <span>Back</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pf-search__row pf-search__row--popular">
                      <span className="pf-search__label">
                        Popular searches :
                      </span>
                      <div className="pf-search__chips">
                        {popularSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            className="pf-searchChip"
                          >
                            {term}
                          </button>
                        ))}
                      </div>


                      {/* <div className="pf-search__filterToggle pf-search__filterToggle--popular">
                          <Switch
                            checked={onlyCommercialProperties}
                            onChange={(e) =>
                              setOnlyCommercialProperties(e.target.checked)
                            }
                            className="pf-search__commercial-switch"
                          />
                        <span className="pf-search__filterLabel pf-search__filterLabel--toggle">
                          Only commercial properties
                        </span>
                      </div> */}

                      <div className="pf-toggle">
                        <label className="pf-toggle__label">
                          <input
                            type="checkbox"
                            checked={onlyCommercialProperties}
                            onChange={handleOnlyCommercialToggle}
                          />
                          <span className="pf-toggle__slider" />
                        </label>
                        <span className="pf-toggle__text">Only commercial properties</span>
                      </div>
                      <span className="pf-search__toggle-divider" aria-hidden="true" />
                      <button
                        type="button"
                        className="pf-search__toggle"
                        onClick={() => setShowAdvancedFilters(true)}
                      >
                        Advanced filters
                        <RightArrowIcon width="15" height="15" fill="#1F3D51" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Animated Stats Ticker */}
          <div className="pf-hero__stats-ticker">
            <div className="pf-hero__stat-item">
              <span className="pf-hero__stat-number">2,847+</span>
              <span className="pf-hero__stat-label">Exclusive Properties</span>
            </div>
            <span className="pf-hero__stat-separator" />
            <div className="pf-hero__stat-item">
              <span className="pf-hero__stat-number">180+</span>
              <span className="pf-hero__stat-label">Verified Agents</span>
            </div>
            <span className="pf-hero__stat-separator" />
            <div className="pf-hero__stat-item">
              <span className="pf-hero__stat-number">50+</span>
              <span className="pf-hero__stat-label">Prime Global Markets</span>
            </div>
            <span className="pf-hero__stat-separator" />
            <div className="pf-hero__stat-item">
              <span className="pf-hero__stat-number">$4.2B+</span>
              <span className="pf-hero__stat-label">Transaction Volume</span>
            </div>
          </div>
        </PFContainer>
      </main>

      <section className="pf-section_about pf-about" aria-label="About">
        <PFContainer className="pf-about__container">
          <div className="pf-about__left">
            <div className="pf-about__badge">The Estatehub Difference</div>
            <h2 className="pf-about__title">
              Crafting Exceptional
              <br />
              <span className="pf-about__title-gold">Real Estate Journeys</span>
            </h2>
            <div className="pf-about__accent-bar" />
          </div>

          <div className="pf-about__right">
            <p className="pf-about__text">
              Estatehub is the premier global destination for bespoke real estate acquisition. From beachfront villas in Dubai and penthouses in London to architectural marvels in New York and Paris, our private network unlocks unlisted opportunities for discerning investors and homeowners worldwide.
            </p>
            <div className="pf-about__actions">
              <button
                type="button"
                className="pf-about__btn pf-about__btn--primary"
                onClick={() => navigate("/about")}
              >
                Learn More
              </button>

              <button
                type="button"
                className="pf-about__btn pf-about__btn--ghost"
                onClick={() => navigate("/findagentorcompany")}
              >
                Find Elite Agents
                <RightArrowRoundFillIcon />
              </button>
            </div>
          </div>
        </PFContainer>
      </section>

      {/* slider section starts */}
      <section className="pf-section pf-section--slider">
        <PFContainer className="pf-section_slider">
          <HomeSlider />
        </PFContainer>
      </section>
      {/* slider section ends  */}

      <section
        className="pf-section pf-section--new-projects"
        aria-label="New Projects"
      >
        <PFContainer>
          <div className="pf-new-projects">
            <div className="pf-new-projects__header">
              <Typography variant="h2" className="pf-new-projects__title">
                Explore new projects worldwide
              </Typography>
              <Typography variant="body1" className="pf-new-projects__subtitle">
                Discover the latest off-plan properties and iconic global developments
              </Typography>
            </div>

            <div className="pf-new-projects__actions">
              <div className="pf-new-projects__tabs">
                <Tabs
                  value={selectedProjectTabIndex}
                  onChange={(_e, idx) => {
                    const label = projectTabLabels[idx];
                    setSelectedCategory(label ?? "All");
                  }}
                  className="pf-new-projects__tabsComponent"
                  TabIndicatorProps={{ style: { display: "none" } }}
                >
                  {projectTabLabels.map((label) => (
                    <Tab
                      key={label}
                      label={label}
                      className="pf-new-projects__tab"
                      disableRipple
                      disableFocusRipple
                    />
                  ))}
                </Tabs>
              </div>
              <Button
                type="button"
                variant="contained"
                className="pf-new-projects__see-all"
                onClick={() => navigate("/newprojectlisting")}
              >
                See all projects
              </Button>
            </div>

            <div className="pf-new-projects__grid-wrapper">
              <div className="pf-projectsGrid">
                {homeProjectSearchLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <HomeNewProjectCardSkeleton
                        key={`home-project-skeleton-${index}`}
                        isExpanded={index === 1 || index === 4}
                      />
                    ))
                  : homeProjectCards.map((project, index) => {
                      const canOpenProject = Boolean(project.projectId);
                      const isExpandedCard = index === 1 || index === 4;
                      return (
                        <Box
                          key={project.key}
                          className={
                            isExpandedCard ? "pf-projectsGrid__item--expanded" : undefined
                          }
                          role={canOpenProject ? "button" : undefined}
                          tabIndex={canOpenProject ? 0 : -1}
                          sx={{
                            gridColumn: {
                              xs: "span 1",
                              sm: "span 1",
                              md: "span 1",
                              lg: isExpandedCard ? "span 2" : "span 1",
                            },
                          }}
                          onClick={(event) => {
                            const target = event.target as HTMLElement;
                            if (
                              target.closest(
                                "button, .MuiButtonBase-root, .pf-whatsapp-btn, a[href]"
                              )
                            ) {
                              return;
                            }
                            if (!canOpenProject) return;
                            navigate(
                              `/newprojectdrilldown/${encodeURIComponent(project.projectId)}`,
                              { state: { projectId: project.projectId } }
                            );
                          }}
                          onKeyDown={(event) => {
                            if (!canOpenProject) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(
                                `/newprojectdrilldown/${encodeURIComponent(project.projectId)}`,
                                { state: { projectId: project.projectId } }
                              );
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
                            isExpanded={isExpandedCard}
                            whatsappPhone={project.developerPhone}
                            whatsappMessage={project.whatsappMessage}
                          />
                        </Box>
                      );
                    })}
              </div>
              <div className="pf-new-projects__see-all-wrapper">
                <Button
                  type="button"
                  variant="contained"
                  className="pf-new-projects__see-all pf-new-projects__see-all--mobile"
                  onClick={() => navigate("/newprojectlisting")}
                >
                  See all projects
                </Button>
              </div>
              {/* Legacy hardcoded projects retained but disabled by request. */}
              {false && (() => {
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

                const filtered =
                  selectedCategory === "All"
                    ? projects
                    : projects.filter((p) => p.city === selectedCategory);
                const visible = filtered.slice(0, 8); // max 2 rows * 4 per row

                return (
                  <>
                    <div className="pf-projectsGrid">
                      {visible.map((p, index) => (
                        <PropertyCard
                          key={p.id}
                          image={p.image}
                          logo={p.logo}
                          title={p.title}
                          location={p.location}
                          features={p.features}
                          launchPrice={p.launchPrice}
                          currency={p.currency}
                          tags={p.tags}
                          isExpanded={shouldShowExpandedCard && index === 1}
                        />
                      ))}
                    </div>
                    <div className="pf-new-projects__see-all-wrapper">
                      <Button
                        type="button"
                        variant="contained"
                        className="pf-new-projects__see-all pf-new-projects__see-all--mobile"
                        onClick={() => navigate("/newprojectlisting")}
                      >
                        See all projects
                      </Button>
                    </div>
                  </>
                );
              })()}
              <div className="pf-new-projects__cta-bg"></div>
              <div className="pf-cta">
                <h3 className="pf-cta__title">
                  Looking to invest
                  <br />
                  internationally?
                </h3>
                <p className="pf-cta__desc">
                  Register your interest and connect with premier approved developers worldwide
                </p>
                <button type="button" className="pf-cta__btn" onClick={() => navigate("/contact")}>
                  Get in touch
                </button>
              </div>
            </div>
          </div>
        </PFContainer>
      </section>

      <section
        className="pf-section pf-section--market"
        aria-label="Global Markets"
      >
        <PFContainer className="pf-market">
          <Typography variant="h2" className="pf-market__title">
            Explore premier global markets
          </Typography>
          <Box className="pf-market__cards">
            <Box className="pf-market__card" onClick={() => navigate("/searchlisting?destination=Dubai")}>
              <img
                src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1600&auto=format&fit=crop"
                alt="Dubai"
                className="pf-market__cardImage"
              />
              <Typography className="pf-market__cardLabel">Dubai</Typography>
            </Box>
            <Box className="pf-market__card" onClick={() => navigate("/searchlisting?destination=London")}>
              <img
                src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1600&auto=format&fit=crop"
                alt="London"
                className="pf-market__cardImage"
              />
              <Typography className="pf-market__cardLabel">
                London
              </Typography>
            </Box>
            <Box className="pf-market__card" onClick={() => navigate("/searchlisting?destination=New%20York")}>
              <img
                src="https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1600&auto=format&fit=crop"
                alt="New York"
                className="pf-market__cardImage"
              />
              <Typography className="pf-market__cardLabel">New York</Typography>
            </Box>
            <Box className="pf-market__card" onClick={() => navigate("/searchlisting?destination=Paris")}>
              <img
                src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1600&auto=format&fit=crop"
                alt="Paris"
                className="pf-market__cardImage"
              />
              <Typography className="pf-market__cardLabel">Paris</Typography>
            </Box>
          </Box>
          <Typography className="pf-market__description">
            Dive deep into global real estate markets with prices, transaction
            histories, and community insights to help you make an educated
            decision anywhere in the world.
          </Typography>
        </PFContainer>
      </section>



      {/* Worldwide User Management Section */}
      <section
        ref={worldwideRef}
        className="pf-section pf-section--worldwide"
        aria-label="Worldwide Management"
      // style={{
      //   transform: `translateY(${worldwideParallaxOffset}px)`,
      //   marginBottom:
      //     worldwideParallaxOffset < 0
      //       ? `${worldwideParallaxOffset}px`
      //       : "0px",
      // }}
      >
        <PFContainer className="pf-worldwide">
          <Box className="pf-worldwide__content">
            <Box className="pf-worldwide__textOverlay">
              <Typography variant="h2" className="pf-worldwide__title">
                Worldwide user management
              </Typography>
              <Typography className="pf-worldwide__description">
                Distance should never be a barrier to owning your dream
                property. Whether you're across the city or across the globe,
                our seamless process makes it easy for you to invest, manage,
                and secure real estate anywhere.
              </Typography>
            </Box>
          </Box>
        </PFContainer>
      </section>

      {/* Prime Location Section */}
      <section
        className="pf-section pf-section--prime-location"
        aria-label="Prime Location"
      >
        <PFContainer >
          <Typography variant="h2" className="pf-prime-location__title">
            Explore properties in your
            <br />
            desired prime location
          </Typography>

          <div className={primeLocationContainerClassName}>
            {isMobileViewport && (
              <button
                type="button"
                className={`pf-prime-location__mobileToggle pf-prime-location__mobileToggle--${primeMobileView}`}
                onClick={() =>
                  setPrimeMobileView((prev) =>
                    prev === "map" ? "list" : "map"
                  )
                }
                aria-label={
                  primeMobileView === "map" ? "Show property list" : "Show map"
                }
              >
                <span
                  className={`pf-prime-location__mobileToggleIcon pf-prime-location__mobileToggleIcon--${primeMobileView}`}
                >
                  <MapSliderBackIcon width="25" height="58" />
                </span>
              </button>
            )}
            {/* Left Side - Property List */}
            <div className="pf-prime-location__left">
              <div className="pf-prime-location__search">
                <TextField
                  fullWidth
                  placeholder="Search by location or property type"
                  value={primeLocationSearch}
                  onChange={(e) => setPrimeLocationSearch(e.target.value)}
                  className="pf-prime-location__searchInput"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon className="pf-prime-location__searchIcon" />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <div className="pf-prime-location__tabs">
                <Tabs
                  value={primeLocationTabsValue || false}
                  onChange={(_e, newValue) => {
                    setPrimeLocationListingTypeId(String(newValue));
                    setSelectedMarkerId(null);
                  }}
                  className="pf-prime-location__tabsComponent"
                  TabIndicatorProps={{ style: { display: "none" } }}
                >
                  {propertyForOptions
                    .filter((lt) => listingTypeMasterId(lt))
                    .map((lt) => (
                      <Tab
                        key={listingTypeMasterId(lt)}
                        label={lt.name}
                        value={listingTypeMasterId(lt)}
                        className="pf-prime-location__tab"
                        disableRipple
                        disableFocusRipple
                      />
                    ))}
                </Tabs>
              </div>

              <div
                className={`pf-prime-location__listWrapper${primeListAtBottom ? " pf-prime-location__listWrapper--no-gradient" : ""
                  }`}
              >
                <div
                  className="pf-prime-location__list"
                  ref={primeListRef}
                >
                  {primeLocationLoading ? (
                    <Box sx={{ px: 1, py: 2 }}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton
                          key={`prime-loc-skel-${index}`}
                          variant="rounded"
                          height={88}
                          animation="wave"
                          sx={{ mb: 1.5, borderRadius: 1 }}
                        />
                      ))}
                    </Box>
                  ) : primeLocationItems.length === 0 ? (
                    <Typography className="pf-prime-location__empty">
                      {primeActiveListingType &&
                      isNewProjectsListingType(primeActiveListingType)
                        ? "No projects match your search yet."
                        : "No properties match your search yet."}
                    </Typography>
                  ) : (
                    primeLocationItems.map((property) => {
                      const isActive = property.id === selectedMarkerId;
                      const itemClassName = `pf-prime-location__item${isActive ? " pf-prime-location__item--active" : ""
                        }`;

                      const handleClick = () => handlePropertyClick(property);

                      return (
                        <div
                          key={property.id}
                          className={itemClassName}
                          onClick={handleClick}
                        >
                          <img
                            src={property.image}
                            alt={property.name}
                            className="pf-prime-location__itemImage"
                          />
                          <div className="pf-prime-location__itemContent">
                            <Typography className="pf-prime-location__itemName">
                              {property.name}
                            </Typography>
                            <div className="pf-prime-location__itemLocation">
                              <LocationIcon width="12" height="14" />
                              <Typography className="pf-prime-location__itemLocationText">
                                {property.location}
                              </Typography>
                            </div>
                            <Typography className="pf-prime-location__itemPriceLabel">
                              {property.priceCaption}
                            </Typography>
                            <Typography className="pf-prime-location__itemPrice">
                              {property.price}
                            </Typography>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <Box className="sellbtn_div">
                  <Button
                    type="button"
                    variant="contained"
                    className="pf-prime-location__seeAllBtn"
                    onClick={handlePrimeLocationSeeAll}
                  >
                    See all{" "}
                    {primeLocationTotalCount > 0
                      ? primeLocationTotalCount
                      : primeLocationItems.length}{" "}
                    {primeActiveListingType &&
                    isNewProjectsListingType(primeActiveListingType)
                      ? "projects"
                      : "properties"}
                  </Button>
                </Box>
              </div>
            </div>

            {/* Right Side - Map */}
            <div className="pf-prime-location__right">
              <div className="pf-prime-location__map">
                <div className="pf-prime-location__mapControls">
                  <Button
                    type="button"
                    className="pf-prime-location__mapLink"
                    onClick={handlePrimeSeeFullMap}
                  >
                    <ExpandIcon width="16" height="16" />
                    See full map
                  </Button>
                </div>
                <div className="pf-prime-location__mapContainer">
                  {!googleMapsApiKey ? (
                    <div className="pf-prime-location__mapFallback">
                      Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your
                      environment to display the interactive map.
                    </div>
                  ) : loadError ? (
                    <div className="pf-prime-location__mapFallback">
                      We couldn't load Google Maps. Please check your API key
                      and network connection.
                    </div>
                  ) : !isLoaded ? (
                    <div className="pf-prime-location__mapFallback">
                      Loading Google Maps…
                    </div>
                  ) : primeLocationLoading ? (
                    <div className="pf-prime-location__mapFallback">
                      Loading locations…
                    </div>
                  ) : primeLocationItems.length === 0 ? (
                    <div className="pf-prime-location__mapFallback">
                      {primeActiveListingType &&
                      isNewProjectsListingType(primeActiveListingType)
                        ? "No projects with map locations match your search yet."
                        : "No properties with map locations match your search yet."}
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerClassName="pf-prime-location__mapCanvas"
                      center={mapCenter}
                      zoom={mapZoom}
                      options={mapOptions}
                      onLoad={handleMapLoad}
                      onUnmount={handleMapUnmount}
                    >
                      {primeLocationItems.map((property) => {
                        const isSelected = property.id === selectedMarkerId;
                        const icon = getMarkerIcon(isSelected);

                        return (
                          <Marker
                            key={property.id}
                            position={property.position}
                            icon={icon}
                            onMouseOver={() => setHoveredMarkerId(property.id)}
                            onMouseOut={() => setHoveredMarkerId(null)}
                            onClick={() => handlePropertyClick(property)}
                          />
                        );
                      })}

                      {activeProperty && isLoaded && (
                        <InfoWindow
                          position={activeProperty.position}
                          onCloseClick={() => setHoveredMarkerId(null)}
                          options={infoWindowOptions}
                        >
                          <div className="pf-prime-location__infoWindow">
                            <div className="pf-prime-location__infoHeader">
                              <img
                                src={activeProperty.image}
                                alt={activeProperty.name}
                                className="pf-prime-location__infoImage"
                              />
                              <div className="pf-prime-location__infoText">
                                <Typography className="pf-prime-location__infoName">
                                  {activeProperty.name}
                                </Typography>
                                <div className="pf-prime-location__infoLocation">
                                  <LocationIcon width="10" height="12" />
                                  <Typography className="pf-prime-location__infoLocationText">
                                    {activeProperty.location}
                                  </Typography>
                                </div>
                              </div>
                            </div>

                            <div className="pf-prime-location__infoFooter">
                              <div className="pf-prime-location__infoPriceBlock">
                                <Typography className="pf-prime-location__infoPriceLabel">
                                  {activeProperty.priceCaption}
                                </Typography>
                                <Typography className="pf-prime-location__infoPrice">
                                  {activeProperty.price}
                                </Typography>
                              </div>

                              <Button
                                type="button"
                                className="pf-prime-location__infoCta"
                                variant="text"
                                endIcon={
                                  <RightArrowRoundFillIcon
                                    width="20"
                                    height="20"
                                  />
                                }
                                disableRipple
                                onClick={handlePrimeInfoSeeDetails}
                              >
                                See details
                              </Button>
                            </div>
                          </div>
                        </InfoWindow>
                      )}
                    </GoogleMap>
                  )}
                </div>
                {isMobileViewport && primeMobileView === "map" && (
                  <div className="pf-prime-location__mobileActions">
                    <Button
                      type="button"
                      variant="contained"
                      className="pf-prime-location__mobileAction pf-prime-location__mobileAction--primary"
                      onClick={handlePrimeLocationSeeAll}
                    >
                      {primeActiveListingType &&
                      isNewProjectsListingType(primeActiveListingType)
                        ? "See all projects"
                        : "See all properties"}
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<ExpandIcon width="16" height="16" />}
                      className="pf-prime-location__mobileAction pf-prime-location__mobileAction--secondary"
                      onClick={handlePrimeSeeFullMap}
                    >
                      See full map
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Typography className="pf-prime-location__description">
            Explore world-renowned districts and vibrant global hubs. From waterfront residences in Dubai to historic avenues in London and New York, find the perfect neighborhood for your lifestyle.
          </Typography>
        </PFContainer>
      </section>

      {/* Customer Rating Section */}
      {!testimonialsLoading && customerRatings.length > 0 && (
      <section
        className="pf-section pf-section--customer-rating"
        aria-label="Customer Testimonials"
      >
        <PFContainer className="pf-customer-rating__container">
          <div className="pf-customer-rating__head">
            <div className="pf-customer-rating__titles">
              <Typography variant="h2" className="pf-customer-rating__title">
                {testimonialSettings.sectionTitle}
              </Typography>
              <Typography className="pf-customer-rating__subtitle">
                {testimonialSettings.sectionSubtitle}
              </Typography>
            </div>
            <div className="pf-customer-rating__controls">
              <IconButton
                className="pf-customer-rating__control"
                onClick={handleCustomerPrev}
                disabled={customerSlideIndex === 0}
                disableRipple
                disableFocusRipple
                disableTouchRipple
              >
                <LeftArrowIcon width="28" height="38" />
              </IconButton>
              <IconButton
                className="pf-customer-rating__control"
                onClick={handleCustomerNext}
                disabled={customerSlideIndex === maxCustomerSlide}
                disableRipple
                disableFocusRipple
                disableTouchRipple
              >
                <RightArrowIcon width="28" height="38" />
              </IconButton>
            </div>
          </div>

          <div className="pf-customer-rating__viewport">
            <div
              className="pf-customer-rating__track"
              style={{
                transform: `translateX(-${customerSlideIndex * customerTranslatePercent
                  }%)`,
              }}
            >
              {customerRatings.map((customer) => (
                <CustomerReviewCard
                  key={customer.id}
                  name={customer.name}
                  role={customer.role}
                  quote={customer.quote}
                  avatar={resolveTestimonialAvatar(customer.avatar)}
                  style={{ flex: `0 0 ${100 / customerVisibleCards}%` }}
                />
              ))}
            </div>
          </div>
        </PFContainer>
      </section>
      )}
    </>
  );
}

export default Home;
