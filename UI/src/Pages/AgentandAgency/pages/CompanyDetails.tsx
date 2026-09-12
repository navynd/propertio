import {
  Alert,
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import ReactDOMServer from "react-dom/server";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PFContainer from "../../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../../Components/parts/component";
import {
  DownArrowIconBlack,
  MailIcon,
  ShareIcon,
  TelephoneIcon,
  VectorIcon,
  MarkerIcon,
} from "../../../Components/parts/icon";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../../../context/GoogleMapsLoaderContext";
import CallAndMailUsModal from "../components/callandmailusModal";
import CallCompanyModal from "../components/callCompanyModal";
import PFPagination from "../../../Components/pagination/PFPagination";
import PropertyListingCard, {
  type PropertyListingCardData,
  PropertyListingCardSkeleton,
  PROPERTY_LISTING_SKELETON_COUNT,
  resolveListingTransactionForProperty,
} from "../../Search/components/PropertyListingCard";
import AgentDetailsCard, {
  AgentDetailsCardSkeleton,
  type AgentCardProps,
} from "../components/agentCard";
import CompanyLogo1 from "../../../assets/img/company_logos/1.png";
import CompanyLogo2 from "../../../assets/img/company_logos/2.png";
import CompanyLogo3 from "../../../assets/img/company_logos/3.png";
import CompanyLogo4 from "../../../assets/img/company_logos/4.png";
import CompanyAward01 from "../../../assets/img/caward01.png";
import CompanyAward02 from "../../../assets/img/caward02.png";
import CompanyAward03 from "../../../assets/img/caward03.png";
import C12 from "../../../assets/img/company_logos/C12.jpg";

import {
  getAgencyProfile,
  getSupportedUrlsMasterData,
  getAgentSearchMasterBundle,
  searchAgents,
  postPropertySearch,
  getListingTypesMasterData,
  getPropertySearchListingMasterData,
  type AgencyProfileApiData,
  type AgentSearchApiItem,
  type ListingTypeMaster,
  type NamedValueMaster,
  type PropertySearchApiProperty,
} from "../../../services/apiService";

type CompanyView = {
  id: string;
  shareLink: string;
  name: string;
  logo: string;
  email: string;
  phone: string;
  orn: string;
  address: string;
  aboutText: string;
  totalActive: number;
  agents: number;
  superAgents: number;
};

const FALLBACK_COMPANY: CompanyView = {
  id: "",
  shareLink: "",
  name: "Elite property Brokerage",
  logo: C12,
  email: "info@eliteproperty.com",
  phone: "+971 4 876 1234",
  orn: "21635",
  address:
    "Office 14 th, Building Westburry Tower, Business Bay, Westbry, Dubai, PO Box",
  aboutText: "",
  totalActive: 458,
  agents: 26,
  superAgents: 25,
};

const companyInfo = {
  position: { lat: 25.2048, lng: 55.271 },
  mapImage:
    "https://static-maps.yandex.ru/1.x/?ll=55.271,25.2048&size=650,240&z=15&l=map&pt=55.271,25.2048,pm2rdm",
};

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

function normalizeSupportedUrls(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) return (raw[0] ?? {}) as Record<string, unknown>;
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function agencyImgBaseFromSupportedUrls(su: unknown): string {
  const m = normalizeSupportedUrls(su);
  const agencyUrl =
    m && typeof m === "object" && "agencyUrl" in m
      ? ((m as any).agencyUrl as any)
      : null;
  const img = agencyUrl && typeof agencyUrl === "object" ? agencyUrl.img : null;
  return typeof img === "string" ? img : "";
}

function mapAgencyProfileToCompanyView(
  p: AgencyProfileApiData,
  agencyImgBase: string
): CompanyView {
  const addressFull =
    typeof p.address?.fullAddress === "string" ? p.address.fullAddress.trim() : "";
  const addressFallback = [p.address?.city, p.address?.state, p.address?.country]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(", ");
  const about =
    (typeof p.aboutUs === "string" && p.aboutUs.trim()) ||
    (typeof p.description === "string" && p.description.trim()) ||
    "";
  return {
    id: p._id,
    shareLink: String(p.shareLink ?? "").trim(),
    name: (p.name ?? "").trim() || FALLBACK_COMPANY.name,
    logo:
      resolveSupportedUrlPath(p.logo, agencyImgBase) ||
      resolveSupportedUrlPath(p.logo, null) ||
      FALLBACK_COMPANY.logo,
    email: (p.email ?? "").trim() || FALLBACK_COMPANY.email,
    phone: (p.phoneNumber ?? "").trim() || FALLBACK_COMPANY.phone,
    orn: (p.orn ?? "").trim() || FALLBACK_COMPANY.orn,
    address: addressFull || addressFallback || FALLBACK_COMPANY.address,
    aboutText: about || FALLBACK_COMPANY.aboutText,
    totalActive:
      typeof p.statistics?.totalActiveListings === "number"
        ? p.statistics.totalActiveListings
        : FALLBACK_COMPANY.totalActive,
    agents:
      typeof p.totalAgents === "number" ? p.totalAgents : FALLBACK_COMPANY.agents,
    superAgents:
      typeof p.totalSuperAgents === "number"
        ? p.totalSuperAgents
        : FALLBACK_COMPANY.superAgents,
  };
}

const defaultAboutText =
  "A premier luxury real estate brokerage dedicated to delivering exceptional advisory, acquisition, and portfolio management services across the world's most sought-after prime property markets. Our international team of advisors provides unmatched market intelligence, bespoke marketing, and discretion for discerning clients worldwide.";

const propertyCategoryOptions = ["Buy", "Rent", "Projects"];
const propertySortOptions = ["Featured", "Newest", "Low to High"];

type DirectoryTab = "properties" | "agents";

type CompanyProperty = PropertyListingCardData & {
  serviceType: "sale" | "rent" | "management";
};
const options = ["For Sale", "For Rent", "Property Management"];
const languages = ["English", "Arabic", "French",];
const nationalities = [
  "Indian",
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
];
const sortOptions = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low to High", value: "price-low" },
  { label: "Price: High to Low", value: "price-high" },
  { label: "Newest", value: "newest" },
];
const categoryOptions = [
  { label: "Buy", value: "buy" },
  { label: "Rent", value: "rent" },
  { label: "Projects", value: "projects" },
];

type ListingTypeOption = { id: string; label: string; raw: ListingTypeMaster };
type SortByOption = { value: string; label: string };

type SupportedUrlBases = {
  propertyImgBase?: string;
  agentImgBase?: string;
  developerLogoBase?: string;
  agencyLogoBase?: string;
};

function pickSupportedBases(su: unknown): SupportedUrlBases {
  const m = normalizeSupportedUrls(su);
  const asRec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const propertyUrl = asRec(m.propertyUrl);
  const agentUrl = asRec(m.agentUrl);
  const developerUrl = asRec(m.developerUrl);
  const agencyUrl = asRec(m.agencyUrl);
  const s = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    propertyImgBase: s(propertyUrl.img),
    agentImgBase: s(agentUrl.img),
    developerLogoBase: s(developerUrl.logo),
    agencyLogoBase: s(agencyUrl.img),
  };
}

function mapPropertySearchApiToCardData(
  property: PropertySearchApiProperty,
  bases: SupportedUrlBases
): PropertyListingCardData {
  const images = property.images ?? [];
  const primaryUrlRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const primaryImageUrl = resolveSupportedUrlPath(
    primaryUrlRaw,
    bases.propertyImgBase
  );

  const locationText =
    property.location?.fullAddress ??
    [property.location?.building, property.location?.zone, property.location?.city]
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
  const hasBadges = !!badges.verified || !!badges.superAgent || !!badges.propertyType;
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
    image: primaryImageUrl || CompanyLogo1,
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
        bases.agencyLogoBase
      );
      return resolved || undefined;
    })(),
    developerLogo: (() => {
      const resolved = resolveSupportedUrlPath(
        property.developer?.logo as unknown,
        bases.developerLogoBase
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
    listingTransaction: resolveListingTransactionForProperty(property, "sale"),
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
          bases.agentImgBase
        );
        return resolved || (property.agent?.profilePicture as string) || CompanyLogo2;
      })(),
      listedDaysAgo,
      email: property.agent?.email ?? undefined,
      phoneNumber: property.agent?.phoneNumber ?? undefined,
      languagesLabel: agentLanguagesLabel || undefined,
      brokerLicenseNumber: property.agent?.brokerLicenseNumber ?? undefined,
    },
  };
}

function mapSearchAgentToCard(
  item: AgentSearchApiItem,
  agentImgBase: string,
  agencyImgBase: string
): AgentCardProps {
  const langs = (item.languages ?? [])
    .map((l) => (typeof l?.name === "string" ? l.name.trim() : ""))
    .filter(Boolean);

  return {
    agentId: item._id,
    name: item.name?.trim() || "Agent",
    title: item.specialization?.title?.trim() || "Property consultant",
    rating: typeof item.ratings?.average === "number" ? item.ratings.average : 0,
    ratingsCount: item.ratings?.totalCount,
    isSuperAgent: item.agentType === "superagent",
    agency: item.agency?.name?.trim() || "—",
    agencyLogo:
      resolveSupportedUrlPath(item.agency?.logo, agencyImgBase) || CompanyLogo1,
    profileImage:
      resolveSupportedUrlPath(item.profilePicture, agentImgBase) || CompanyLogo1,
    languages: langs,
    nationality: item.nationality?.name?.trim() || "—",
    forSale: item.statistics?.totalSaleProperties ?? 0,
    forRent: item.statistics?.totalRentProperties ?? 0,
  };
}
function CompanyDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ companyId?: string }>();
  const navState = location.state as { companyId?: string } | undefined;
  const companyId = String(params.companyId ?? navState?.companyId ?? "").trim();

  const [company, setCompany] = useState<CompanyView>(FALLBACK_COMPANY);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const [propertyListingTypes, setPropertyListingTypes] = useState<ListingTypeOption[]>([]);
  const [propertySortByOptions, setPropertySortByOptions] = useState<SortByOption[]>([]);
  const [supportedBases, setSupportedBases] = useState<SupportedUrlBases>({});
  const [agencyProperties, setAgencyProperties] = useState<PropertyListingCardData[]>([]);
  const [agencyPropertiesLoading, setAgencyPropertiesLoading] = useState(false);
  const [agencyPropertiesError, setAgencyPropertiesError] = useState<string | null>(null);
  const [agencyPropertiesTotalPages, setAgencyPropertiesTotalPages] = useState(1);

  const [agentImgBase, setAgentImgBase] = useState("");
  const [agencyImgBase, setAgencyImgBase] = useState("");
  const [agencyAgents, setAgencyAgents] = useState<AgentCardProps[]>([]);
  const [agencyAgentsLoading, setAgencyAgentsLoading] = useState(false);
  const [agencyAgentsError, setAgencyAgentsError] = useState<string | null>(null);
  const [agencyAgentsTotalPages, setAgencyAgentsTotalPages] = useState(1);
  const [agentsSearchVersion, setAgentsSearchVersion] = useState(0);

  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [activeDirectoryTab, setActiveDirectoryTab] =
    useState<DirectoryTab>("properties");
  const [filters, setFilters] = useState({
    service: "",
    language: "",
    nationality: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    service: "",
    language: "",
    nationality: "",
  });
  const [propertyPage, setPropertyPage] = useState(1);
  const [agentPage, setAgentPage] = useState(1);
  const [propertyCategory, setPropertyCategory] = useState(
    propertyCategoryOptions[0]
  );
  const [propertySort, setPropertySort] = useState(propertySortOptions[0]);
  const [isCallMailModalOpen, setIsCallMailModalOpen] = useState(false);
  const [isCallCompanyModalOpen, setIsCallCompanyModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();
  const isMapReady = isLoaded && !loadError && Boolean(googleMapsApiKey);
  const markerIconDataUrl = useMemo(() => {
    const svgMarkup = ReactDOMServer.renderToStaticMarkup(
      <MarkerIcon width={30} height={40} />
    );
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
  }, []);

  const markerIconOptions = useMemo<google.maps.Icon | undefined>(() => {
    if (typeof google === "undefined") {
      return undefined;
    }

    return {
      url: markerIconDataUrl,
      scaledSize: new google.maps.Size(30, 40),
      anchor: new google.maps.Point(15, 40),
    };
  }, [markerIconDataUrl]);

  const aboutText = company.aboutText || defaultAboutText;
  const shouldShowReadMore = aboutText.length > 420;
  const shouldApplyGradient = shouldShowReadMore && !isAboutExpanded;

  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState("Service needed");
  const [langOpen, setLangOpen] = useState(false);
  const [language, setLanguage] = useState("Language");
  const [nationOpen, setNationOpen] = useState(false);
  const [nationality, setNationality] = useState("Nationality");
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);
  const handleToggle = () => {
    setOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Service dropdown
      if (newValue) {
        if (langOpen) setLangOpen(false);
        if (nationOpen) setNationOpen(false);
      }
      return newValue;
    });
  };
  const handleLangToggle = () => {
    setLangOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Language dropdown
      if (newValue) {
        if (open) setOpen(false);
        if (nationOpen) setNationOpen(false);
      }
      return newValue;
    });
  };
  const handleNationToggle = () => {
    setNationOpen((prev) => {
      const newValue = !prev;
      // Close other dropdowns when opening Nationality dropdown
      if (newValue) {
        if (open) setOpen(false);
        if (langOpen) setLangOpen(false);
      }
      return newValue;
    });
  };
  const handleSelect = (opt: { label: string; value: string }) => {
    setFrequency(opt.label);
    setFilters((prev) => ({ ...prev, service: opt.value }));
    setOpen(false);
  };
  const handleLangSelect = (opt: { label: string; value: string }) => {
    setLanguage(opt.label);
    setFilters((prev) => ({ ...prev, language: opt.value }));
    setLangOpen(false);
  };
  const handleNationSelect = (opt: { label: string; value: string }) => {
    setNationality(opt.label);
    setFilters((prev) => ({ ...prev, nationality: opt.value }));
    setNationOpen(false);
  };
  const [sortBy, setSortBy] = useState("Sort by");
  const [sortByOpen, setSortByOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Listing type");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sortByDropdownRef = useRef<HTMLDivElement>(null);
  const handleCategoryToggle = () => {
    setCategoryOpen((prev) => {
      const newValue = !prev;
      // Close SortBy dropdown when opening Category dropdown
      if (newValue && sortByOpen) {
        setSortByOpen(false);
      }
      return newValue;
    });
  };
  const handleCategorySelect = (value: string) => {
    const opt = propertyListingTypes.find((o) => o.id === value);
    setSelectedCategory(opt?.label || "Buy");
    setPropertyPage(1);
    setCategoryOpen(false);
  };
  const handleSortByToggle = () => {
    setSortByOpen((prev) => {
      const newValue = !prev;
      // Close Category dropdown when opening SortBy dropdown
      if (newValue && categoryOpen) {
        setCategoryOpen(false);
      }
      return newValue;
    });
  };
  const handleSortBySelect = (value: string) => {
    const opt = propertySortByOptions.find((o) => o.value === value);
    setSortBy(opt?.label || "Featured");
    setPropertyPage(1);
    setSortByOpen(false);
  };

  // Close Service dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
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

  // Close Language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    };

    if (langOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langOpen]);

  // Close Nationality dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setNationOpen(false);
      }
    };

    if (nationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [nationOpen]);
  // Close Category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
    };

    if (categoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryOpen]);

  // Close SortBy dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortByDropdownRef.current && !sortByDropdownRef.current.contains(event.target as Node)) {
        setSortByOpen(false);
      }
    };

    if (sortByOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sortByOpen]);

  const [serviceOptions, setServiceOptions] = useState(
    () =>
      [
        { label: "Service needed", value: "" },
      ] as Array<{ label: string; value: string }>
  );

  const [languageOptions, setLanguageOptions] = useState(
    () =>
      [
        { label: "Language", value: "" },
        { label: "English", value: "english" },
        { label: "Arabic", value: "arabic" },
        { label: "French", value: "french" },
      ] as Array<{ label: string; value: string }>
  );

  const [nationalityOptions, setNationalityOptions] = useState(
    () =>
      [
        { label: "Nationality", value: "" },
        { label: "UAE", value: "uae" },
        { label: "United Kingdom", value: "uk" },
        { label: "Portugal", value: "portugal" },
        { label: "Jordan", value: "jordan" },
        { label: "Lebanon", value: "lebanon" },
      ] as Array<{ label: string; value: string }>
  );

  const selectProps = useMemo(
    () =>
      ({
        IconComponent: (iconProps: any) => (
          <DownArrowIconBlack
            {...iconProps}
            fill="#707070"
            className={`pf-agent-agency__select-icon ${iconProps.className || ""
              }`}
          />
        ),
        MenuProps: {
          classes: { paper: "pf-dropdown" },
          MenuListProps: { disablePadding: true },
        },
      }) as const,
    []
  );

  const companyProperties = useMemo<CompanyProperty[]>(
    () => [
      {
        id: 1,
        image:
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80",
        developerLogo: CompanyLogo1,
        badges: { verified: true, superAgent: true, propertyType: "Villa" },
        photoCount: 25,
        title: "Omniyat Bespoke | Villa",
        location: "Dubai, Palm jumeirah",
        beds: 2,
        baths: 3,
        sqft: 3832,
        price: 9000000,
        agent: {
          name: "Jackson Crosland",
          image:
            "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=200&q=80",
          listedDaysAgo: 4,
        },
        serviceType: "sale",
      },
      {
        id: 2,
        image:
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1000&q=80",
        developerLogo: CompanyLogo2,
        badges: { verified: true, propertyType: "Villa" },
        photoCount: 19,
        title: "Chevalia Estate Phase 2 By Emaar",
        location: "Dubai Investment Park (DIP), Dubai",
        beds: 3,
        baths: 4,
        sqft: 4200,
        price: 7200000,
        agent: {
          name: "Ella Martinez",
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
          listedDaysAgo: 6,
        },
        serviceType: "rent",
      },
      {
        id: 3,
        image:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
        developerLogo: CompanyLogo3,
        badges: { superAgent: true, propertyType: "Townhouse" },
        photoCount: 12,
        title: "Marina Heights Signature Townhouse",
        location: "Dubai Marina, Dubai",
        beds: 4,
        baths: 5,
        sqft: 5100,
        price: 10500000,
        agent: {
          name: "Ryan Cooper",
          image:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
          listedDaysAgo: 2,
        },
        serviceType: "management",
      },
      {
        id: 4,
        image:
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80",
        developerLogo: CompanyLogo4,
        badges: { verified: true, propertyType: "Apartment" },
        photoCount: 16,
        title: "Downtown Skyline Apartment",
        location: "Downtown Dubai, Dubai",
        beds: 2,
        baths: 3,
        sqft: 2100,
        price: 3800000,
        agent: {
          name: "Dana Joseph",
          image:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
          listedDaysAgo: 3,
        },
        serviceType: "sale",
      },
    ],
    []
  );

  const companyAgents = useMemo<AgentCardProps[]>(
    () => [
      {
        name: "William turner",
        title: "Senior Property Consultant",
        rating: 4.8,
        ratingsCount: 52,
        isSuperAgent: true,
        agency: "EMAAR",
        agencyLogo: CompanyLogo1,
        profileImage:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        languages: ["English", "French", "Spanish", "Italian", "Portuguese"],
        nationality: "Portugal",
        forSale: 19,
        forRent: 13,
      },
      {
        name: "Daisy Johnson",
        title: "Senior Property Consultant",
        rating: 4.6,
        ratingsCount: 48,
        isSuperAgent: false,
        agency: "MAG",
        agencyLogo: CompanyLogo2,
        profileImage:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
        languages: ["English", "Albanian"],
        nationality: "United Kingdom",
        forSale: 24,
        forRent: 18,
      },
      {
        name: "Barain carben",
        title: "Property Consultant",
        rating: 4.4,
        ratingsCount: 51,
        isSuperAgent: true,
        agency: "AZIZI",
        agencyLogo: CompanyLogo3,
        profileImage:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
        languages: ["English", "Arabic"],
        nationality: "UAE",
        forSale: 19,
        forRent: 13,
      },
      {
        name: "Wardyana",
        title: "Senior Property Consultant",
        rating: 4.6,
        ratingsCount: 44,
        isSuperAgent: false,
        agency: "DAMAC",
        agencyLogo: CompanyLogo4,
        profileImage:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        languages: ["English"],
        nationality: "United Kingdom",
        forSale: 19,
        forRent: 13,
      },
      {
        name: "Jonathanm",
        title: "Leasing Consultant",
        rating: 4.5,
        ratingsCount: 39,
        isSuperAgent: false,
        agency: "DAMAC",
        agencyLogo: CompanyLogo2,
        profileImage:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        languages: ["English", "Arabic"],
        nationality: "Lebanon",
        forSale: 18,
        forRent: 11,
      },
      {
        name: "Kelly",
        title: "Senior Sales / Leasing Consultant",
        rating: 4.7,
        ratingsCount: 55,
        isSuperAgent: true,
        agency: "EMAAR",
        agencyLogo: CompanyLogo1,
        profileImage:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
        languages: ["English", "Arabic"],
        nationality: "Jordan",
        forSale: 24,
        forRent: 18,
      },
    ],
    []
  );

  const nationalityLookup: Record<string, string> = useMemo(
    () => ({
      uae: "uae",
      "united arab emirates": "uae",
      "united kingdom": "uk",
      uk: "uk",
      portugal: "portugal",
      jordan: "jordan",
      lebanon: "lebanon",
    }),
    []
  );

  const totalPropertyPages = agencyPropertiesTotalPages;
  const totalAgentPages = agencyAgentsTotalPages;

  const pagedProperties = agencyProperties;
  const pagedAgents = agencyAgents;

  useEffect(() => {
    setPropertyPage(1);
    setAgentPage(1);
  }, [activeDirectoryTab, selectedCategory, sortBy]);

  useEffect(() => {
    if (propertyPage > totalPropertyPages) {
      setPropertyPage(totalPropertyPages);
    }
  }, [propertyPage, totalPropertyPages]);

  useEffect(() => {
    if (agentPage > totalAgentPages) {
      setAgentPage(totalAgentPages);
    }
  }, [agentPage, totalAgentPages]);

  const handleDirectoryTabChange = (
    _event: SyntheticEvent,
    value: DirectoryTab
  ) => {
    setActiveDirectoryTab(value);
    setPropertyPage(1);
    setAgentPage(1);
  };

  const handleFilterChange =
    (field: "service" | "language" | "nationality") =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setFilters((prev) => ({ ...prev, [field]: event.target.value }));
      };

  const handlePropertyCategoryChange = (event: SelectChangeEvent<string>) => {
    setPropertyCategory(event.target.value);
  };

  const handlePropertySortChange = (event: SelectChangeEvent<string>) => {
    setPropertySort(event.target.value);
  };

  const handleAboutToggle = () => setIsAboutExpanded((prev) => !prev);

  const handleCallCompanyRequest = () => {
    setIsCallCompanyModalOpen(true);
  };

  const handleShareCompanyClick = useCallback(async () => {
    const fallbackId = String(company.id ?? "").trim();
    const shareUrl =
      String(company.shareLink ?? "").trim() ||
      (fallbackId
        ? `${window.location.origin}/companydetails/${encodeURIComponent(fallbackId)}`
        : window.location.href);

    if (navigator.share) {
      void navigator
        .share({
          title: company.name || "Company profile",
          text: company.name || "Check this company",
          url: shareUrl,
        })
        .catch(() => {
          // user cancelled or browser blocked share sheet
        });
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast({
          open: true,
          message: "Link copied to clipboard",
          severity: "success",
        });
      } catch {
        setToast({
          open: true,
          message: "Could not copy link",
          severity: "error",
        });
      }
    } else {
      setToast({
        open: true,
        message: "Could not copy link",
        severity: "error",
      });
    }
  }, [company.id, company.name, company.shareLink]);

  const handlePropertyCardClick = useCallback(
    (id: string | number) => {
      if (typeof id !== "string") return;
      navigate(`/propertydrilldown/${encodeURIComponent(id)}`, { state: { propertyId: id } });
    },
    [navigate]
  );

  const handleAgentClick = useCallback(
    (agent: AgentCardProps) => {
      if (!agent.agentId) return;
      navigate(`/agentdetails/${encodeURIComponent(agent.agentId)}`, { state: { agentId: agent.agentId } });
    },
    [navigate]
  );

  useEffect(() => {
    let cancelled = false;
    setCompanyError(null);
    setCompanyLoading(Boolean(companyId));
    if (!companyId) {
      setCompany(FALLBACK_COMPANY);
      setCompanyLoading(false);
      return;
    }
    void Promise.all([getSupportedUrlsMasterData(), getAgencyProfile(companyId)])
      .then(([suResp, profileResp]) => {
        if (cancelled) return;
        if (suResp?.status === false) {
          throw new Error(
            typeof suResp.message === "string" ? suResp.message : "Supported URLs failed"
          );
        }
        if (profileResp?.status === false) {
          throw new Error(
            typeof profileResp.message === "string" ? profileResp.message : "Company load failed"
          );
        }
        const agencyImgBase = agencyImgBaseFromSupportedUrls(suResp.data?.items);
        const raw = profileResp.data;
        if (!raw?._id) throw new Error("Invalid company profile");
        setCompany(mapAgencyProfileToCompanyView(raw, agencyImgBase));
        setCompanyLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setCompanyError(e instanceof Error ? e.message : "Could not load company");
          setCompany(FALLBACK_COMPANY);
          setCompanyLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Properties masters (listing types + sort) + supported URLs for images
  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;
    setAgencyPropertiesError(null);
    void Promise.all([
      getListingTypesMasterData(),
      getPropertySearchListingMasterData(),
      getSupportedUrlsMasterData(),
    ])
      .then(([ltResp, sortResp, suResp]) => {
        if (cancelled) return;
        if (ltResp?.status === false) throw new Error(String(ltResp.message ?? "Listing types failed"));
        if (sortResp?.status === false) throw new Error(String(sortResp.message ?? "Sort master failed"));
        if (suResp?.status === false) throw new Error(String(suResp.message ?? "Supported URLs failed"));

        const listingTypesRaw = ltResp?.data?.items ?? [];
        const listingTypes = Array.isArray(listingTypesRaw) ? listingTypesRaw : [];
        const options = listingTypes
          .filter((l) => (l?._id || l?.id) && l?.name)
          .map((l) => ({ id: String(l._id ?? l.id), label: String(l.name), raw: l }));
        setPropertyListingTypes(options);

        const sortRowsRaw = sortResp?.data?.sortByProperty ?? [];
        const sortRows = Array.isArray(sortRowsRaw) ? (sortRowsRaw as NamedValueMaster[]) : [];
        const sorts = sortRows
          .filter((s) => s?.value && s?.name)
          .map((s) => ({ value: String(s.value), label: String(s.name) }));
        setPropertySortByOptions(sorts);

        setSupportedBases(pickSupportedBases(suResp?.data?.items));

        // Default selections for existing dropdown UI
        if (selectedCategory === "Listing type" && options.length > 0)
          setSelectedCategory(options[0].label);
        if (sortBy === "Sort by" && sorts.length > 0) setSortBy(sorts[0].label);
      })
      .catch((e) => {
        if (!cancelled) setAgencyPropertiesError(e instanceof Error ? e.message : "Could not load property filters");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Fetch agency properties via property search
  useEffect(() => {
    if (!companyId || activeDirectoryTab !== "properties") return;
    const listingTypeId =
      propertyListingTypes.find((o) => o.label === selectedCategory)?.id ?? "";
    if (!listingTypeId) return;
    const sortValue =
      propertySortByOptions.find((o) => o.label === sortBy)?.value ?? undefined;

    const ac = new AbortController();
    setAgencyPropertiesLoading(true);
    setAgencyPropertiesError(null);
    void postPropertySearch(
      {
        listingType: listingTypeId,
        sortBy: sortValue,
        page: propertyPage,
        limit: 3,
        agencyId: companyId,
      },
      ac.signal
    )
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) throw new Error(String(resp.message ?? "Property search failed"));
        const props = resp?.data?.properties ?? [];
        const pagination = resp?.data?.pagination;
        const mapped = Array.isArray(props) ? props.map((p) => mapPropertySearchApiToCardData(p, supportedBases)) : [];
        setAgencyProperties(mapped);
        const tp =
          typeof pagination?.totalPages === "number" && pagination.totalPages >= 1
            ? pagination.totalPages
            : 1;
        setAgencyPropertiesTotalPages(tp);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setAgencyProperties([]);
        setAgencyPropertiesTotalPages(1);
        setAgencyPropertiesError(e instanceof Error ? e.message : "Property search failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) setAgencyPropertiesLoading(false);
      });
    return () => ac.abort();
  }, [
    companyId,
    activeDirectoryTab,
    propertyPage,
    selectedCategory,
    sortBy,
    propertyListingTypes,
    propertySortByOptions,
    supportedBases,
  ]);

  // Agents masters (languages/countries/services + supported url bases)
  useEffect(() => {
    let cancelled = false;
    setAgencyAgentsError(null);
    if (!companyId) return;
    void getAgentSearchMasterBundle()
      .then((resp) => {
        if (cancelled) return;
        if (resp?.status === false) throw new Error(String(resp.message ?? "Master data failed"));
        const su = resp.data?.supportedUrls as
          | { agentUrl?: { img?: string }; agencyUrl?: { img?: string } }
          | undefined;
        setAgentImgBase(typeof su?.agentUrl?.img === "string" ? su.agentUrl.img : "");
        setAgencyImgBase(typeof su?.agencyUrl?.img === "string" ? su.agencyUrl.img : "");
        // Replace static dropdown sources with master where possible
        const services = Array.isArray(resp.data?.services) ? resp.data.services : [];
        const langs = Array.isArray(resp.data?.languages) ? resp.data.languages : [];
        const countries = Array.isArray(resp.data?.countries) ? resp.data.countries : [];
        setServiceOptions([
          { label: "Service needed", value: "" },
          ...services
            .filter((s: any) => s?.value && s?.name)
            .map((s: any) => ({ label: String(s.name), value: String(s.value) })),
        ]);
        setLanguageOptions([
          { label: "Language", value: "" },
          ...langs
            .filter((l: any) => l?._id && l?.name)
            .map((l: any) => ({ label: String(l.name), value: String(l._id) })),
        ]);
        setNationalityOptions([
          { label: "Nationality", value: "" },
          ...countries
            .filter((c: any) => c?._id && c?.name)
            .map((c: any) => ({ label: String(c.name), value: String(c._id) })),
        ]);
      })
      .catch((e) => {
        if (!cancelled) setAgencyAgentsError(e instanceof Error ? e.message : "Could not load agent filters");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Fetch agency agents using /agents/search?agencyId=...
  useEffect(() => {
    if (!companyId || activeDirectoryTab !== "agents") return;
    const ac = new AbortController();
    setAgencyAgentsLoading(true);
    setAgencyAgentsError(null);

    void searchAgents({
      agencyId: companyId,
      serviceNeeded: appliedFilters.service || undefined,
      language: appliedFilters.language || undefined,
      nationality: appliedFilters.nationality || undefined,
      agentType: "all",
      page: agentPage,
      limit: 6,
      signal: ac.signal,
    })
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) throw new Error(String(resp.message ?? "Agent search failed"));
        const items = resp?.data?.items ?? [];
        const pagination = resp?.data?.pagination;
        const mapped = Array.isArray(items)
          ? items.map((it) => mapSearchAgentToCard(it, agentImgBase, agencyImgBase))
          : [];
        setAgencyAgents(mapped);
        const tp =
          typeof pagination?.totalPages === "number" && pagination.totalPages >= 1
            ? pagination.totalPages
            : 1;
        setAgencyAgentsTotalPages(tp);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setAgencyAgents([]);
        setAgencyAgentsTotalPages(1);
        setAgencyAgentsError(e instanceof Error ? e.message : "Agent search failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) setAgencyAgentsLoading(false);
      });

    return () => ac.abort();
  }, [
    companyId,
    activeDirectoryTab,
    agentPage,
    appliedFilters.service,
    appliedFilters.language,
    appliedFilters.nationality,
    agentImgBase,
    agencyImgBase,
    agentsSearchVersion,
  ]);

  return (
    <main className="pf-company-details pf-agent-agency">
      <PFContainer>
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Find companies"
          breadcrumbSubTitle2={company.name}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/findagentorcompany"
          breadcrumbLinkSubTitle1State={{ activeTab: "companies" }}
        />
        {companyError ? (
          <Typography color="error" sx={{ mb: 2 }}>
            {companyError}
          </Typography>
        ) : null}

        {companyLoading ? (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Skeleton variant="rounded" height={110} />
            <Skeleton variant="rounded" height={520} />
            <Skeleton variant="rounded" height={260} />
            <Skeleton variant="rounded" height={720} />
          </Box>
        ) : (
          <>
            <Box className="pf-company-details__layout">
            <Box className="pf-company-details__sidebar">
              <Box className="pf-company-details__card">
                <Box className="pf-company-details__card-header">
                <button
                  type="button"
                  className="pf-company-details__share-btn"
                  aria-label="Share company"
                  onClick={handleShareCompanyClick}
                >
                  <ShareIcon width="28" height="28" />
                </button>

                <Box className="pf-company-details__logo">
                  <img src={company.logo} alt={company.name} />
                </Box>

                <Typography className="pf-company-details__name">
                  {company.name}
                </Typography>

                <Button
                  className="pf-company-details__primary-btn"
                  startIcon={<MailIcon width="15" height="12" fill="#ffffff" />}
                  disableRipple
                  onClick={() => setIsCallMailModalOpen(true)}
                >
                  Email Company
                </Button>

                <Button
                  className="pf-company-details__secondary-btn"
                  startIcon={<TelephoneIcon width="14" height="14" />}
                  disableRipple
                  onClick={() => {
                    setIsCallMailModalOpen(false);
                    setIsCallCompanyModalOpen(true);
                  }}
                >
                  Call Company
                </Button>
              </Box>

              <Box className="pf-company-details__stats">
                <Box className="pf-company-details__stat">
                  <Typography className="pf-company-details__stat-label">
                    Total active
                  </Typography>
                  <Typography className="pf-company-details__stat-value">
                    {company.totalActive}
                  </Typography>
                </Box>
                <Box className="pf-company-details__stat pf-company-details__stat--bordered">
                  <Typography className="pf-company-details__stat-label">
                    Agents
                  </Typography>
                  <Typography className="pf-company-details__stat-value">
                    {company.agents}
                  </Typography>
                </Box>
                <Box className="pf-company-details__stat pf-company-details__stat--bordered">
                  <Typography className="pf-company-details__stat-label">
                    Superagent
                  </Typography>
                  <Typography className="pf-company-details__stat-value">
                    {company.superAgents}
                  </Typography>
                </Box>
                </Box>
              </Box>
            </Box>

          <Box className="pf-company-details__content">
            <Box className="pf-company-details__about pf-company-details__panel">
              <Typography className="pf-agent-details__about-title">
                About me
              </Typography>
              <Box
                className={`pf-agent-details__about-text${isAboutExpanded
                  ? " pf-agent-details__about-text--expanded"
                  : ""
                  }`}
              >
                <Typography
                  className={`pf-agent-details__about-body${shouldApplyGradient
                    ? " pf-agent-details__about-body--gradient"
                    : ""
                    }`}
                >
                  {company.aboutText}
                </Typography>
                {!isAboutExpanded && shouldShowReadMore && (
                  <Box className="pf-agent-details__about-gradient" />
                )}
              </Box>
              {shouldShowReadMore && (
                <Button
                  className={`pf-agent-details__about-toggle${isAboutExpanded
                    ? " pf-agent-details__about-toggle--expanded"
                    : ""
                    }`}
                  disableRipple
                  onClick={handleAboutToggle}
                >
                  <Typography className="pf-agent-details__about-toggle-text">
                    {isAboutExpanded ? "Show less" : "Read more"}
                  </Typography>
                  <span className="pf-agent-details__about-toggle-icon">
                    <DownArrowIconBlack width="14" height="9" />
                  </span>
                </Button>
              )}
            </Box>

            <Box className="pf-company-details__info pf-company-details__panel">
              <Box className="pf-company-details__info-body">
                <Typography className="pf-company-details__info-titles">
                  Company information
                </Typography>

                <Box className="pf-company-details__info-row">
                  <Typography className="pf-company-details__info-label">
                    Address :
                  </Typography>
                  <Typography className="pf-company-details__info-text">
                    {company.address}
                  </Typography>
                </Box>

                <Box className="pf-company-details__info-row pf-company-details__info-row--orn">
                  <Typography className="pf-company-details__info-label">
                    ORN :
                  </Typography>
                  <Typography className="pf-company-details__info-text pf-company-details__info-text--inline">
                    {company.orn}
                    <span className="pf-company-details__orn-icon">
                      <VectorIcon width="13" height="13" />
                    </span>
                  </Typography>
                </Box>
              </Box>

              <Box className="pf-company-details__map">
                {isMapReady ? (
                  <GoogleMap
                    mapContainerStyle={{
                      width: "100%",
                      height: "240px",
                      borderRadius: "12px",
                    }}
                    center={companyInfo.position}
                    zoom={15}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: false,
                      clickableIcons: false,
                      styles: [
                        {
                          featureType: "poi",
                          stylers: [{ visibility: "off" }],
                        },
                      ],
                    }}
                  >
                    <Marker
                      position={companyInfo.position}
                      icon={markerIconOptions}
                    />
                  </GoogleMap>
                ) : (
                  <>
                    <img
                      src={companyInfo.mapImage}
                      alt="Company location preview"
                      className="pf-company-details__map-image"
                    />
                    <span className="pf-company-details__map-marker">
                      <MarkerIcon width={30} height={40} />
                    </span>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className="pf-company-details__awards pf-company-details__panel">
          <Typography className="pf-company-details__awards-title">
            Awards
          </Typography>
          <Box className="pf-company-details__awards-grid">
            {[CompanyAward01, CompanyAward02, CompanyAward03].map(
              (award, index) => (
                <img
                  key={`award-${index}`}
                  src={award}
                  alt={`Company award ${index + 1}`}
                />
              )
            )}
          </Box>
        </Box>

        <Box className="pf-company-details__directory pf-company-details__panel">
          <Box className="pf-company-details__directory-head">
            <Tabs
              value={activeDirectoryTab}
              onChange={handleDirectoryTabChange}
              className="pf-agent-agency__tabs pf-company-details__directory-tabs"
            >
              <Tab
                disableRipple
                value="properties"
                label="Properties"
                className="pf-agent-agency__tab"
              />
              <Tab
                disableRipple
                value="agents"
                label="Agents"
                className="pf-agent-agency__tab"
              />
            </Tabs>

            <Box className="pf-company-details__directory-toolbar pf-agent-agency__toolbar">
              {activeDirectoryTab === "properties" ? (
                <>
                  <Box ref={categoryDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                    {/* Button */}
                    <Box
                      className="pf-agent-Service__select-btn"
                      onClick={handleCategoryToggle}
                    >
                      <Typography
                        className={`pf-agent-Service__name ${selectedCategory ? "selected" : "placeholder"
                          }`}
                      >
                        {selectedCategory}
                      </Typography>
                      <DownArrowIconBlack width={13} height={13} />
                    </Box>

                    {/* Dropdown */}
                    {categoryOpen && (
                      <Box className="pf-agent-Service__dropdown">
                        {propertyListingTypes.map((item) => {
                          const isActive = selectedCategory === item.label;
                          return (
                            <Box
                              key={item.id}
                              className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                }`}
                              onClick={() => handleCategorySelect(item.id)}
                            >
                              {item.label}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                  <Box ref={sortByDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
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
                        {propertySortByOptions.map((item) => {
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
                </>
              ) : (
                <>
                  {/*Service dropdown*/}
                  <Box ref={serviceDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                    {/* Button */}
                    <Box
                      className="pf-agent-Service__select-btn"
                      onClick={handleToggle}
                    >
                      <Typography className="pf-agent-Service__name">
                        {frequency}
                      </Typography>

                      <DownArrowIconBlack width={13} height={13} />
                    </Box>

                    {/* Dropdown */}
                    {open && (
                      <Box className="pf-agent-Service__dropdown">
                        {serviceOptions.map((item) => {
                          const isActive = frequency === item.label;
                          return (
                            <Box
                              key={item.value || "service-all"}
                              className={`pf-saved-alerts__dropdown-item ${isActive ? "active" : ""
                                }`}
                              onClick={() => handleSelect(item)}
                            >
                              {item.label}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                  {/*Language dropdown*/}
                  <Box ref={languageDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                    {/* Button */}
                    <Box
                      className="pf-agent-Service__select-btn"
                      onClick={handleLangToggle}
                    >
                      <Typography className="pf-agent-Service__name">
                        {language}
                      </Typography>

                      <DownArrowIconBlack width={14} height={14} />
                    </Box>

                    {/* Dropdown */}
                    {langOpen && (
                      <Box className="pf-agent-Service__dropdown">
                        {languageOptions.map((item) => {
                          const isActive = language === item.label;

                          return (
                            <Box
                              key={item.value || "lang-all"}
                              className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                }`}
                              onClick={() => handleLangSelect(item)}
                            >
                              {item.label}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                  {/*Nationality dropdown*/}
                  <Box ref={nationalityDropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                    {/* Button */}
                    <Box
                      className="pf-agent-Service__select-btn"
                      onClick={handleNationToggle}
                    >
                      <Typography className="pf-agent-Service__name">
                        {nationality}
                      </Typography>

                      <DownArrowIconBlack width={14} height={14} />
                    </Box>

                    {/* Dropdown */}
                    {nationOpen && (
                      <Box className="pf-agent-Service__dropdown">
                        {nationalityOptions.map((item) => {
                          const isActive = nationality === item.label;

                          return (
                            <Box
                              key={item.value || "nat-all"}
                              className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                }`}
                              onClick={() => handleNationSelect(item)}
                            >
                              {item.label}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>


                  <Button
                    disableRipple
                    variant="contained"
                    className="pf-agent-agency__search-btn"
                    onClick={() => {
                      setAppliedFilters(filters);
                      setAgentPage(1);
                      setAgentsSearchVersion((v) => v + 1);
                    }}
                    disabled={agencyAgentsLoading}
                  >
                    Search
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {activeDirectoryTab === "properties" && (
            <>
              <Box className="pf-agent-details__properties-list pf-company-details__properties-list">
                {agencyPropertiesError ? (
                  <Typography color="error" sx={{ py: 2 }}>
                    {agencyPropertiesError}
                  </Typography>
                ) : null}
                {agencyPropertiesLoading && !agencyPropertiesError ? (
                  <>
                    {Array.from({ length: PROPERTY_LISTING_SKELETON_COUNT }).map((_, i) => (
                      <PropertyListingCardSkeleton key={`company-prop-skel-${i}`} />
                    ))}
                  </>
                ) : null}
                {!agencyPropertiesLoading &&
                !agencyPropertiesError &&
                pagedProperties.length === 0 ? (
                  <Typography sx={{ py: 2 }}>No properties found.</Typography>
                ) : null}
                {pagedProperties.map((property) => (
                  <PropertyListingCard
                    key={property.id}
                    property={property}
                    defaultFavorite={Boolean(property.isSaved)}
                    onPropertyClick={() => handlePropertyCardClick(property.id)}
                  />
                ))}
              </Box>

              {!agencyPropertiesLoading &&
              !agencyPropertiesError &&
              pagedProperties.length > 0 &&
              totalPropertyPages > 0 ? (
                <Box className="pf-agent-details__properties-pagination pf-company-details__pagination">
                  <PFPagination
                    currentPage={propertyPage}
                    totalPages={totalPropertyPages}
                    onPageChange={setPropertyPage}
                  />
                </Box>
              ) : null}
            </>
          )}

          {activeDirectoryTab === "agents" && (
            <>
              <Box className="pf-agent-agency__grid pf-company-details__agents-grid">
                {agencyAgentsError ? (
                  <Typography color="error" sx={{ py: 2 }}>
                    {agencyAgentsError}
                  </Typography>
                ) : null}
                {agencyAgentsLoading && !agencyAgentsError ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <AgentDetailsCardSkeleton key={`company-agent-skel-${i}`} />
                    ))}
                  </>
                ) : null}
                {!agencyAgentsLoading && !agencyAgentsError && pagedAgents.length === 0 ? (
                  <Typography sx={{ py: 2 }}>No agents found.</Typography>
                ) : null}
                {pagedAgents.map((agent) => (
                  <AgentDetailsCard
                    key={agent.agentId ?? agent.name}
                    {...agent}
                    onClick={() => handleAgentClick(agent)}
                  />
                ))}
              </Box>

              {!agencyAgentsLoading &&
              !agencyAgentsError &&
              pagedAgents.length > 0 &&
              totalAgentPages > 0 ? (
                <Box className="pf-agent-details__properties-pagination pf-company-details__pagination">
                  <PFPagination
                    currentPage={agentPage}
                    totalPages={totalAgentPages}
                    onPageChange={setAgentPage}
                  />
                </Box>
              ) : null}
            </>
          )}
        </Box>
          </>
        )}
      </PFContainer>

      <CallAndMailUsModal
        open={isCallMailModalOpen}
        onClose={() => setIsCallMailModalOpen(false)}
        onCallCompanyRequest={handleCallCompanyRequest}
        companyName={company.name}
        companyLogo={company.logo}
        address={company.address}
        orn={company.orn}
        phone={company.phone}
      />
      <CallCompanyModal
        open={isCallCompanyModalOpen}
        onClose={() => setIsCallCompanyModalOpen(false)}
        phoneNumber={company.phone}
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
    </main>
  );
}

export default CompanyDetails;
