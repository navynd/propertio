import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import PFContainer from "../../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../../Components/parts/component";
import PropertyListingCard, {
  type PropertyListingCardData,
  PropertyListingCardSkeleton,
  PROPERTY_LISTING_SKELETON_COUNT,
  resolveListingTransactionForProperty,
} from "../../Search/components/PropertyListingCard";
import PFPagination from "../../../Components/pagination/PFPagination";
import C12 from "../../../assets/img/company_logos/C12.jpg";
import companyLogo1 from "../../../assets/img/company_logos/1.png";
import {
  HandshakeIcon,
  HouseIcon,
  MoneyIcon,
  PropertyBuildingIcon,
  RespondCircleIcon,
  ShareIcon,
  StarIcon,
  WhatsappIcon,
  KeyCardIcon,
  SuperAgentStarIcon,
  AgentStarIcon,
  RightArrowRoundFillIcon,
  LocationIcon,
  DownArrowIconBlack,
  LinkedInIcon02,
} from "../../../Components/parts/icon";
import {
  getAgentProfile,
  getAgentSearchMasterBundle,
  postPropertySearch,
  getListingTypesMasterData,
  getPropertySearchListingMasterData,
  getSupportedUrlsMasterData,
  type AgentProfileApiAward,
  type AgentProfileApiData,
  type AgentProfileApiExpertiseArea,
  type AgentProfileApiTrackRecord,
  type ListingTypeMaster,
  type NamedValueMaster,
  type PropertySearchApiProperty,
} from "../../../services/apiService";
import { normalizePhoneForWhatsapp } from "../../../utils/phoneWhatsapp";

type AgentProfileView = {
  agentId: string;
  shareLink: string;
  name: string;
  phoneNumber: string;
  title: string;
  rating: number;
  ratingsCount: number;
  isSuperAgent: boolean;
  profileImage: string;
  nationality: string;
  languages: string[];
  forSale: number;
  forRent: number;
  respondsText: string;
  experienceText: string;
  closedDeals: number;
  totalValue: string;
  totalValueCurrency: string;
  aboutText: string;
  specialization: string;
  experienceSince: string;
  brokerLicense: string;
  links: { label: string; url: string }[];
  agency: {
    id?: string;
    name: string;
    logo: string;
  };
};

type TrackRecord = {
  title: string;
  subtitle: string;
  dealType: string;
  date: string;
  propertyType: string;
  bedrooms: string;
};

type ExpertiseArea = {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  ratingsCount: number;
  saleCount: number;
  rentCount: number;
  closedDeals: number;
};

const EMPTY_AGENT: AgentProfileView = {
  agentId: "",
  shareLink: "",
  name: "—",
  phoneNumber: "",
  title: "—",
  rating: 0,
  ratingsCount: 0,
  isSuperAgent: false,
  profileImage:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  nationality: "—",
  languages: [],
  forSale: 0,
  forRent: 0,
  respondsText: "—",
  experienceText: "—",
  closedDeals: 0,
  totalValue: "—",
  totalValueCurrency: "",
  aboutText: "—",
  specialization: "—",
  experienceSince: "—",
  brokerLicense: "—",
  links: [],
  agency: {
    id: undefined,
    name: "—",
    logo: C12,
  },
};

type AwardRow = { key: string; image: string; title?: string; subtitle?: string };

type SupportedUrlBases = {
  propertyImgBase?: string;
  agentImgBase?: string;
  awardImgBase?: string;
  developerLogoBase?: string;
  agencyLogoBase?: string;
};

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

function resolveAwardImageUrl(
  image: string | null | undefined,
  agentImgBase: string
): string {
  const raw = image?.trim() || "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return resolveSupportedUrlPath(raw, agentImgBase);
}

function normalizeSupportedUrls(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) return (raw[0] ?? {}) as Record<string, unknown>;
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function pickSupportedBases(su: unknown): SupportedUrlBases {
  const m = normalizeSupportedUrls(su);
  const asRec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const propertyUrl = asRec(m.propertyUrl);
  const agentUrl = asRec(m.agentUrl);
  const awardUrl = asRec(m.awardUrl);
  const developerUrl = asRec(m.developerUrl);
  const agencyUrl = asRec(m.agencyUrl);
  const s = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    propertyImgBase: s(propertyUrl.img),
    agentImgBase: s(agentUrl.img),
    awardImgBase: s(awardUrl.img),
    developerLogoBase: s(developerUrl.logo),
    agencyLogoBase: s(agencyUrl.img),
  };
}

function mapPropertySearchApiToCardData(
  property: PropertySearchApiProperty,
  bases: SupportedUrlBases
): PropertyListingCardData {
  const images = property.images ?? [];
  const primaryUrlRaw = images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const primaryImageUrl = resolveSupportedUrlPath(primaryUrlRaw, bases.propertyImgBase);

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
        return resolved || (property.agent?.profilePicture as string) || companyLogo1;
      })(),
      listedDaysAgo,
      email: property.agent?.email ?? undefined,
      phoneNumber: property.agent?.phoneNumber ?? undefined,
      languagesLabel: agentLanguagesLabel || undefined,
      brokerLicenseNumber: property.agent?.brokerLicenseNumber ?? undefined,
    },
  };
}

function formatCompactMoney(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

function formatExperienceSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return String(d.getFullYear());
}

function linksFromSocial(
  s?: AgentProfileApiData["socialLinks"]
): { label: string; url: string }[] {
  if (!s) return [];
  const out: { label: string; url: string }[] = [];
  if (s.linkedin?.trim()) out.push({ label: "LinkedIn", url: s.linkedin.trim() });
  if (s.facebook?.trim()) out.push({ label: "Facebook", url: s.facebook.trim() });
  if (s.instagram?.trim())
    out.push({ label: "Instagram", url: s.instagram.trim() });
  if (s.twitter?.trim()) out.push({ label: "Twitter", url: s.twitter.trim() });
  return out;
}

function mapTrackRecordsFromApi(
  rows: AgentProfileApiTrackRecord[]
): TrackRecord[] {
  return rows.map((r) => {
    const title =
      r.propertyName?.trim() || r.location?.trim() || "—";
    const subtitle = r.locationArea?.trim() || "";
    const dealTypeRaw = r.dealType?.trim()?.toLowerCase();
    const dealTypeLabel =
      dealTypeRaw === "rent" || dealTypeRaw === "sale"
        ? dealTypeRaw.charAt(0).toUpperCase() + dealTypeRaw.slice(1)
        : r.dealType?.trim() || "—";
    const dateStr = r.dealClosedDate
      ? new Date(r.dealClosedDate).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      : "—";
    const beds =
      typeof r.bedrooms === "number"
        ? r.bedrooms <= 0
          ? "Studio"
          : `${r.bedrooms} Bed`
        : "—";
    return {
      title,
      subtitle,
      dealType: dealTypeLabel,
      date: dateStr,
      propertyType: r.propertyType?.name?.trim() || "—",
      bedrooms: beds,
    };
  });
}

function mapExpertiseFromApi(
  rows: AgentProfileApiExpertiseArea[],
  bases: SupportedUrlBases
): ExpertiseArea[] {
  const fallbackImg =
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";
  const propertyBase = bases.propertyImgBase ?? "";
  const agentBase = bases.agentImgBase ?? "";

  return rows.map((a, idx) => {
    const id = String(a.location ?? `exp-${idx}`);
    const name = (
      a.locationName ||
      a.locationDetails?.name ||
      "Area"
    ).trim();
    const listingFromApi = a.listingImage?.trim() || "";
    const img =
      (/^https?:\/\//i.test(listingFromApi) ? listingFromApi : "") ||
      resolveSupportedUrlPath(listingFromApi, propertyBase) ||
      (a.locationDetails?.coverImage?.trim() &&
        /^https?:\/\//i.test(a.locationDetails.coverImage)
        ? a.locationDetails.coverImage.trim()
        : resolveSupportedUrlPath(a.locationDetails?.coverImage, agentBase)) ||
      (a.locationDetails?.gallery?.[0]
        ? /^https?:\/\//i.test(a.locationDetails.gallery[0])
          ? a.locationDetails.gallery[0]
          : resolveSupportedUrlPath(a.locationDetails.gallery[0], agentBase)
        : "") ||
      fallbackImg;
    const rating =
      typeof a.averageRating === "number"
        ? Math.min(5, Math.max(0, a.averageRating))
        : 0;
    const ratingsCount =
      typeof a.ratingsCount === "number" ? a.ratingsCount : 0;
    const description =
      a.description?.trim() ||
      (
        a.locationDetails as { metaDescription?: string } | null | undefined
      )?.metaDescription?.trim() ||
      `Residential and rental market activity for ${name}.`;
    return {
      id,
      name,
      description,
      image: img,
      rating,
      ratingsCount,
      saleCount: a.saleDeals ?? 0,
      rentCount: a.rentDeals ?? 0,
      closedDeals: a.totalDeals ?? 0,
    };
  });
}

function mapAwardsFromApi(
  awards: Array<AgentProfileApiAward | string> | undefined,
  awardImgBase: string
): AwardRow[] {
  if (!awards?.length) return [];

  const rows: AwardRow[] = [];
  awards.forEach((item, i) => {
    if (typeof item === "string") {
      const image = resolveAwardImageUrl(item, awardImgBase);
      if (!image) return;
      rows.push({ key: `aw-${i}`, image });
      return;
    }

    const image = resolveAwardImageUrl(item.image, awardImgBase);
    if (!image) return;

    const subtitle = [item.awardedBy, item.year != null ? String(item.year) : ""]
      .filter(Boolean)
      .join(" · ");

    rows.push({
      key: `aw-${i}`,
      image,
      title: item.title?.trim() || undefined,
      subtitle: subtitle || undefined,
    });
  });
  return rows;
}

function mapAgentProfileToView(
  p: AgentProfileApiData,
  agentImgBase: string,
  agencyImgBase: string,
): AgentProfileView {
  const stats = p.statistics ?? {};
  const totalDeals =
    typeof stats.totalDealsClosed === "number"
      ? stats.totalDealsClosed
      : (Number(stats.dealsClosedSales) || 0) +
      (Number(stats.dealsClosedRent) || 0);
  const totalRev =
    typeof stats.totalRevenue === "number" ? stats.totalRevenue : NaN;
  const langRows = (p.languages ?? [])
    .map((l) => (typeof l?.name === "string" ? l.name.trim() : ""))
    .filter(Boolean);
  const saleN =
    typeof stats.totalSaleProperties === "number" ? stats.totalSaleProperties : 0;
  const rentN =
    typeof stats.totalRentProperties === "number" ? stats.totalRentProperties : 0;

  const profileFallbackImg =
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80";
  const agencyFallbackImg = C12;
  const agentName = p.name?.trim() || "Agent";
  const rawRt = typeof p.responseTime === "string" ? p.responseTime.trim() : "";
  const respondsText = rawRt
    ? rawRt.toLowerCase().startsWith("within")
      ? `${agentName} usually responds ${rawRt}`
      : `${agentName} usually responds within ${rawRt}`
    : undefined;

  return {
    agentId: p._id,
    shareLink: String(p.shareLink ?? "").trim(),
    name: agentName,
    phoneNumber: String(p.whatsappNumber ?? p.phoneNumber ?? "").trim(),
    title: p.specialization?.title?.trim() || "Property consultant",
    rating: typeof p.ratings?.average === "number" ? p.ratings.average : 0,
    ratingsCount:
      typeof p.ratings?.totalCount === "number" ? p.ratings.totalCount : 0,
    isSuperAgent: p.agentType === "superagent",
    profileImage:
      resolveSupportedUrlPath(p.profilePicture, agentImgBase) || profileFallbackImg,
    nationality: p.nationality?.name?.trim() || "—",
    languages: langRows,
    forSale: saleN,
    forRent: rentN,
    respondsText: respondsText ?? "—",
    experienceText: (() => {
      const raw =
        p.experience != null && String(p.experience).trim() !== ""
          ? String(p.experience).trim()
          : "";
      return raw ? `${raw} Years of experience` : "—";
    })(),
    closedDeals: totalDeals,
    totalValue:
      Number.isFinite(totalRev) && totalRev > 0 ? formatCompactMoney(totalRev) : "—",
    totalValueCurrency: Number.isFinite(totalRev) && totalRev > 0 ? "AED" : "",
    aboutText: (p.aboutMe || p.description || "").trim() || "—",
    specialization: p.specialization?.title?.trim() || "—",
    experienceSince: p.experienceSince ? formatExperienceSince(p.experienceSince) : "—",
    brokerLicense: p.brokerLicenseNumber?.trim() || "—",
    links: linksFromSocial(p.socialLinks),
    agency: {
      id: p.agency?._id,
      name: p.agency?.name?.trim() || "—",
      logo: resolveSupportedUrlPath(p.agency?.logo, agencyImgBase) || agencyFallbackImg,
    },
  };
}

const defaultAgentProperties: PropertyListingCardData[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Chevalia Estate Phase 2 By Emaar",
    location:
      "Chevalia Estate, Grand Polo Club and Resort, Dubai Investment Park (DIP), Dubai",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1501127122-f385ca6ddd9d?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 5,
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 6,
    image:
      "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 7,
    image:
      "https://images.unsplash.com/photo-1502003148287-a82ef80a6abc?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
  {
    id: 8,
    image:
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80",
    developerLogo:
      companyLogo1,
    badges: { verified: true, superAgent: true, propertyType: "Villa" },
    photoCount: 25,
    title: "Omniyat Bespoke | Villa",
    location: "Dubai, Palm jumeirah",
    beds: 2,
    baths: 3,
    sqft: 3832,
    price: 9000000,
    currency: "AED",
    agent: {
      name: "Jackson crosland",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60",
      listedDaysAgo: 4,
    },
  },
];

type ListingTypeOption = { id: string; label: string; raw: ListingTypeMaster };
type SortByOption = { value: string; label: string };

function AgentDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ agentId?: string }>();
  const navState = location.state as { agentId?: string } | undefined;
  const agentId = String(params.agentId ?? navState?.agentId ?? "").trim();

  const [agent, setAgent] = useState<AgentProfileView>(EMPTY_AGENT);
  const [trackRecordsList, setTrackRecordsList] = useState<TrackRecord[]>([]);
  const [expertiseList, setExpertiseList] = useState<ExpertiseArea[]>([]);
  const [awardRows, setAwardRows] = useState<AwardRow[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [listingTypeOptions, setListingTypeOptions] = useState<ListingTypeOption[]>([]);
  const [sortByOptions, setSortByOptions] = useState<SortByOption[]>([]);
  const [supportedBases, setSupportedBases] = useState<SupportedUrlBases>({});

  const [selectedListingTypeId, setSelectedListingTypeId] = useState<string>("");
  const [selectedListingTypeLabel, setSelectedListingTypeLabel] = useState<string>("Listing type");
  const [selectedSortByValue, setSelectedSortByValue] = useState<string>("");
  const [selectedSortByLabel, setSelectedSortByLabel] = useState<string>("Sort by");

  const [agencyProperties, setAgencyProperties] = useState<PropertyListingCardData[]>([]);
  const [agencyPropertiesLoading, setAgencyPropertiesLoading] = useState(false);
  const [agencyPropertiesError, setAgencyPropertiesError] = useState<string | null>(null);
  const [agencyPropertiesTotal, setAgencyPropertiesTotal] = useState(0);
  const [agencyPropertiesTotalPages, setAgencyPropertiesTotalPages] = useState(1);

  const [propertyPage, setPropertyPage] = useState(1);
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
    const opt = listingTypeOptions.find((o) => o.id === value);
    if (opt) {
      setSelectedListingTypeId(opt.id);
      setSelectedListingTypeLabel(opt.label);
      setSelectedCategory(opt.label);
      setPropertyPage(1);
    }
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
    const opt = sortByOptions.find((o) => o.value === value);
    if (opt) {
      setSelectedSortByValue(opt.value);
      setSelectedSortByLabel(opt.label);
      setSortBy(opt.label);
      setPropertyPage(1);
    }
    setSortByOpen(false);
  };

  const handleWhatsappClick = useCallback(() => {
    const digits = normalizePhoneForWhatsapp(agent.phoneNumber);
    if (!digits) return;
    const message = "Hey, I'm interested in your property.";
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [agent.phoneNumber]);

  const handleShareClick = useCallback(() => {
    const fallbackId = String(agent.agentId ?? "").trim();
    const shareUrl =
      String(agent.shareLink ?? "").trim() ||
      (fallbackId
        ? `${window.location.origin}/agentdetails/${encodeURIComponent(fallbackId)}`
        : window.location.href);

    if (navigator.share) {
      void navigator
        .share({
          title: agent.name || "Agent profile",
          text: agent.name || "Check this agent",
          url: shareUrl,
        })
        .catch(() => {
          // user cancelled or browser blocked share sheet
        });
      return;
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl).catch(() => {
        // ignore clipboard errors
      });
    }
  }, [agent.agentId, agent.name, agent.shareLink]);

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

  useEffect(() => {
    let cancelled = false;
    setAgencyPropertiesError(null);
    if (!agent.agency?.id) return;

    void Promise.all([
      getListingTypesMasterData(),
      getPropertySearchListingMasterData(),
      getSupportedUrlsMasterData(),
    ])
      .then(([ltResp, sortResp, suResp]) => {
        if (cancelled) return;
        if (ltResp?.status === false) {
          throw new Error(
            typeof ltResp.message === "string" ? ltResp.message : "Listing types failed"
          );
        }
        if (sortResp?.status === false) {
          throw new Error(
            typeof sortResp.message === "string" ? sortResp.message : "Sort master failed"
          );
        }
        if (suResp?.status === false) {
          throw new Error(
            typeof suResp.message === "string" ? suResp.message : "Supported URLs failed"
          );
        }

        const listingTypesRaw = ltResp?.data?.items ?? [];
        const listingTypes = Array.isArray(listingTypesRaw) ? listingTypesRaw : [];
        const active = listingTypes
          .filter((l) => (l?._id || l?.id) && l?.name)
          .map((l) => ({
            id: String(l._id ?? l.id),
            label: String(l.name),
            raw: l,
          }));
        setListingTypeOptions(active);

        const sortRowsRaw = sortResp?.data?.sortByProperty ?? [];
        const sortRows = Array.isArray(sortRowsRaw) ? (sortRowsRaw as NamedValueMaster[]) : [];
        const sorts = sortRows
          .filter((s) => s?.value && s?.name)
          .map((s) => ({ value: String(s.value), label: String(s.name) }));
        setSortByOptions(sorts);

        const bases = pickSupportedBases(suResp?.data?.items);
        setSupportedBases(bases);

        if (!selectedListingTypeId) {
          const firstBuy =
            active.find((o) => String(o.raw?.transaction ?? "").toLowerCase() === "buy") ??
            active[0];
          if (firstBuy) {
            setSelectedListingTypeId(firstBuy.id);
            setSelectedListingTypeLabel(firstBuy.label);
            setSelectedCategory(firstBuy.label);
          }
        }
        if (!selectedSortByValue && sorts.length > 0) {
          setSelectedSortByValue(sorts[0].value);
          setSelectedSortByLabel(sorts[0].label);
          setSortBy(sorts[0].label);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAgencyPropertiesError(e instanceof Error ? e.message : "Could not load filters");
        }
      });

    return () => {
      cancelled = true;
    };
    // We intentionally do not depend on selectedListingTypeId/selectedSortByValue here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.agency?.id]);

  useEffect(() => {
    if (!agent.agency?.id) return;
    if (!selectedListingTypeId) return;

    const ac = new AbortController();
    setAgencyPropertiesLoading(true);
    setAgencyPropertiesError(null);

    void postPropertySearch(
      {
        listingType: selectedListingTypeId,
        sortBy: selectedSortByValue || undefined,
        page: propertyPage,
        limit: 5,
        agentId: agent.agentId,
      },
      ac.signal
    )
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Property search failed"
          );
        }
        const props = resp?.data?.properties ?? [];
        const pagination = resp?.data?.pagination;
        const mapped = Array.isArray(props)
          ? props.map((p) => mapPropertySearchApiToCardData(p, supportedBases))
          : [];
        setAgencyProperties(mapped);
        const total =
          typeof pagination?.totalProperties === "number" ? pagination.totalProperties : 0;
        const tp =
          typeof pagination?.totalPages === "number" && pagination.totalPages >= 1
            ? pagination.totalPages
            : 1;
        setAgencyPropertiesTotal(total);
        setAgencyPropertiesTotalPages(tp);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setAgencyProperties([]);
        setAgencyPropertiesTotal(0);
        setAgencyPropertiesTotalPages(1);
        setAgencyPropertiesError(e instanceof Error ? e.message : "Property search failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) setAgencyPropertiesLoading(false);
      });

    return () => ac.abort();
  }, [
    agent.agency?.id,
    selectedListingTypeId,
    selectedSortByValue,
    propertyPage,
    supportedBases,
  ]);

  useEffect(() => {
    let cancelled = false;
    setProfileError(null);
    setProfileLoading(Boolean(agentId));
    if (!agentId) {
      setAgent(EMPTY_AGENT);
      setTrackRecordsList([]);
      setExpertiseList([]);
      setAwardRows([]);
      setProfileLoading(false);
      return;
    }
    void Promise.all([getAgentSearchMasterBundle(), getAgentProfile(agentId)])
      .then(([bundleResp, profileResp]) => {
        if (cancelled) return;
        if (bundleResp?.status === false) {
          throw new Error(
            typeof bundleResp.message === "string"
              ? bundleResp.message
              : "Master data failed"
          );
        }
        if (profileResp?.status === false) {
          throw new Error(
            typeof profileResp.message === "string"
              ? profileResp.message
              : "Profile failed"
          );
        }
        const su = bundleResp.data?.supportedUrls;
        const urlBases = pickSupportedBases(su);
        const agentBase = urlBases.agentImgBase ?? "";
        const agencyBase = urlBases.agencyLogoBase ?? "";
        const raw = profileResp.data;
        if (!raw?._id) throw new Error("Invalid profile");
        setAgent(
          mapAgentProfileToView(raw, agentBase, agencyBase)
        );
        setTrackRecordsList(mapTrackRecordsFromApi(raw.trackRecords ?? []));
        setExpertiseList(
          mapExpertiseFromApi(raw.expertiseAreas ?? [], urlBases)
        );
        setAwardRows(
          mapAwardsFromApi(
            raw.awards,
            urlBases.awardImgBase ?? ""
          )
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setProfileError(
            e instanceof Error ? e.message : "Could not load agent"
          );
          setAgent(EMPTY_AGENT);
          setTrackRecordsList([]);
          setExpertiseList([]);
          setAwardRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    if (profileError) setProfileLoading(false);
    // When agent has a real id set, consider profile loaded.
    if (agent.agentId) setProfileLoading(false);
  }, [agentId, agent.agentId, profileError]);

  const expertiseOptions = expertiseList;

  const [activeExpertiseId, setActiveExpertiseId] = useState("");

  useEffect(() => {
    const first = expertiseOptions[0];
    if (first) setActiveExpertiseId(first.id);
  }, [expertiseOptions]);
  // const [selectedCategory, setSelectedCategory] = useState(
  //   propertyCategoryOptions[0]
  // );
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const respondsText = agent.respondsText;
  const experienceText = agent.experienceText;
  const totalValueAmount = agent.totalValue;
  const totalValueCurrency = agent.totalValueCurrency;
  const trackRecords = trackRecordsList;
  const totalPropertyPages = agencyPropertiesTotalPages;
  const activeExpertise =
    expertiseOptions.find((area) => area.id === activeExpertiseId) ??
    expertiseOptions[0];

  const aboutText = agent.aboutText;
  const shouldShowReadMore = aboutText.length > 420;
  const handleAboutToggle = () => setIsAboutExpanded((prev) => !prev);
  const shouldApplyGradient = shouldShowReadMore && !isAboutExpanded;

  const pagedProperties = agencyProperties;

  const handlePropertyCardClick = useCallback(
    (id: string | number) => {
      if (typeof id !== "string") return;
      navigate(`/propertydrilldown/${encodeURIComponent(id)}`, {
        state: { propertyId: id },
      });
    },
    [navigate]
  );

  const handleExpertiseChange = (id: string) => {
    setActiveExpertiseId(id);
  };
  const handleNavigateToCompanyDetails = () => {
    if (agent.agency?.id) {
      navigate(`/companydetails/${encodeURIComponent(agent.agency.id)}`, {
        state: { companyId: agent.agency.id, activeTab: "companies" },
      });
    }
  };

  const handleViewPropertiesClick = () => {
    const element = document.getElementById("agent-properties");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderRespondPills = (className: string) => (
    <Box className={className}>
      <Chip
        className="pf-agent-details__pill"
        icon={<RespondCircleIcon width="18" height="18" />}
        label={respondsText}
      />
      <Chip className="pf-agent-details__pill" label={experienceText} />
    </Box>
  );
  return (
    <main className="pf-agent-details pf-agent-agency">
      <PFContainer>
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Find agents"
          breadcrumbSubTitle2={agent.name}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/findagentorcompany"
        />

        {profileError ? (
          <Typography color="error" sx={{ mb: 2 }}>
            {profileError}
          </Typography>
        ) : null}

        {profileLoading && !profileError ? (
          <>
            {/* Top layout skeleton (agent card + brokerage card) */}
            <Box className="pf-agent-details__layout">
              <Box className="pf-agent-details__left">
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={320}
                  sx={{ borderRadius: 2 }}
                />
              </Box>

              <Box className="pf-agent-details__right-placeholder">
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={240}
                  sx={{ borderRadius: 2 }}
                />
              </Box>
            </Box>

            {/* Remaining sections skeletons (outer boxes only) */}
            <Skeleton
              variant="rounded"
              width="100%"
              height={260}
              sx={{ mt: 3, borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={180}
              sx={{ mt: 3, borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={220}
              sx={{ mt: 3, borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={340}
              sx={{ mt: 3, borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={220}
              sx={{ mt: 3, borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={420}
              sx={{ mt: 3, borderRadius: 2 }}
            />
          </>
        ) : null}

        {!profileLoading ? (
          <>
            <Box className="pf-agent-details__layout">
              <Box className="pf-agent-details__left">
                <Box className="pf-agent-details__card">
                  <Box className="pf-agent-details__card-top">
                    {renderRespondPills(
                      "pf-agent-details__pills pf-agent-details__pills--mobile"
                    )}
                    <Box className="pf-agent-details__profile">
                      <Box
                        className={`pf-agent-details__avatar-ring${agent.isSuperAgent
                          ? " pf-agent-details__avatar-ring--super"
                          : " pf-agent-details__avatar-ring--agent"
                          }`}
                      >
                        <img
                          src={agent.profileImage}
                          alt={agent.name}
                          className="pf-agent-details__avatar"
                          loading="lazy"
                        />
                      </Box>

                      <Box
                        component="span"
                        className={`pf-agent-details__badge${agent.isSuperAgent
                          ? " pf-agent-details__badge--super"
                          : " pf-agent-details__badge--agent"
                          }`}
                      >
                        {agent.isSuperAgent ? (
                          <SuperAgentStarIcon width="20" height="20" />
                        ) : (
                          <AgentStarIcon width="20" height="20" />
                        )}
                      </Box>
                    </Box>
                    <Box className="agentdetails_center">
                      <Box className="agentdetails_center_sub">
                        <Box className="pf-agent-details__head">
                          <Typography className="pf-agent-details__name">
                            {agent.name}
                          </Typography>

                          <Box className="pf-agent-details__rating">
                            <Box className="pf-agent-details__rating-track">
                              <StarIcon
                                width="76"
                                height="14"
                                starColor="#E5E7EB"
                              />
                              <Box
                                className="pf-agent-details__rating-fill"
                                style={{ width: `${(agent.rating / 5) * 100}%` }}
                              >
                                <StarIcon
                                  width="76"
                                  height="14"
                                  starColor="#FFCB2B"
                                />
                              </Box>
                            </Box>
                            <Typography className="pf-agent-details__rating-text">
                              {agent.rating}/5 based on {agent.ratingsCount ?? 0}{" "}
                              Ratings
                            </Typography>
                          </Box>
                        </Box>
                        {renderRespondPills(
                          "pf-agent-details__pills pf-agent-details__pills--desktop"
                        )}
                      </Box>
                      <Box className="pf-agent-details__actions">
                        <Button
                          className="pf-agent-details__action pf-agent-details__action--whatsapp"
                          startIcon={<WhatsappIcon width="20" height="20" />}
                          onClick={handleWhatsappClick}
                        >
                          Whatsapp
                        </Button>
                        <Button
                          className="pf-agent-details__action pf-agent-details__action--light"
                          startIcon={
                            <PropertyBuildingIcon width="20" height="20" />
                          }
                          onClick={handleViewPropertiesClick}
                        >
                          View properties
                        </Button>
                        <Button
                          className="pf-agent-details__action pf-agent-details__action--icon"
                          onClick={handleShareClick}
                        >
                          <ShareIcon width="25" height="25" fill="#ffffff" />
                        </Button>
                      </Box>
                    </Box>
                  </Box>

                  <Box className="pf-agent-details__languages">
                    <Typography className="pf-agent-details__label">
                      Languages known :
                    </Typography>
                    <Box className="pf-agent-details__chips">
                      {agent.languages.map((lang, i) => (
                        <Chip
                          key={`${lang}-${i}`}
                          label={lang}
                          className="pf-agent-details__chip"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box className="pf-agent-details__stats">
                    <Box className="pf-agent-details__stat">
                      <span className="pf-agent-details__stat-icon">
                        <HouseIcon width="30" height="30" />
                      </span>
                      <Box className="pf-agent-details__stat-content">
                        <Typography className="pf-agent-details__stat-value">
                          {agent.forSale}
                        </Typography>
                        <Typography className="pf-agent-details__stat-label">
                          Properties for Sale
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="pf-agent-details__stat">
                      <span className="pf-agent-details__stat-icon">
                        <KeyCardIcon width="25" height="25" fill="#ffffff" />
                      </span>
                      <Box className="pf-agent-details__stat-content">
                        <Typography className="pf-agent-details__stat-value">
                          {agent.forRent}
                        </Typography>
                        <Typography className="pf-agent-details__stat-label">
                          Properties for Rent
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="pf-agent-details__stat">
                      <span className="pf-agent-details__stat-icon">
                        <HandshakeIcon width="25" height="25" />
                      </span>
                      <Box className="pf-agent-details__stat-content">
                        <Typography className="pf-agent-details__stat-value">
                          {agent.closedDeals ?? 65}
                        </Typography>
                        <Typography className="pf-agent-details__stat-label">
                          Closed Deals
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="pf-agent-details__stat">
                      <span className="pf-agent-details__stat-icon">
                        <MoneyIcon width="30" height="30" />
                      </span>
                      <Box className="pf-agent-details__stat-content">
                        <Typography className="pf-agent-details__stat-value">
                          <span className="pf-agent-details__stat-price">
                            {totalValueAmount}
                          </span>
                          {totalValueCurrency && (
                            <span className="pf-agent-details__stat-currency">
                              {totalValueCurrency}
                            </span>
                          )}
                        </Typography>
                        <Typography className="pf-agent-details__stat-label">
                          Total value
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box className="pf-agent-details__right-placeholder">
                <Typography className="pf-agent-details__company-label">
                  Brokerage
                </Typography>

                <Box className="pf-agent-details__company-logo">
                  <img
                    src={agent.agency.logo}
                    alt={`${agent.agency.name} logo`}
                    loading="lazy"
                  />
                </Box>

                <Typography className="pf-agent-details__company-name">
                  {agent.agency.name}
                </Typography>

                <Box className="pf-agent-details__company-footer" onClick={handleNavigateToCompanyDetails}>
                  <Typography>About company</Typography>
                  <RightArrowRoundFillIcon width="20" height="20" />
                </Box>
              </Box>
            </Box>

            <Box className="pf-agent-details__track-record">
              <Box className="pf-agent-details__track-record-head">
                <Typography className="pf-agent-details__track-record-title">
                  Track Record for the past 12 months
                </Typography>
                <Typography className="pf-agent-details__track-record-note">
                  Transactions submitted by agent to Estatehub.
                </Typography>
              </Box>

              <Box className="pf-property-drilldown__price-table-wrapper pf-agent-details__track-record-table">
                <table className="pf-property-drilldown__price-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Deal type</th>
                      <th>Date</th>
                      <th>Property type</th>
                      <th>Bedrooms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!profileLoading && trackRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <Typography
                            className="pf-property-drilldown__price-date"
                            sx={{ py: 2, textAlign: "center" }}
                          >
                            No track record found.
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      trackRecords.map((row, index) => (
                        <tr key={`${row.title}-${index}`}>
                          <td>
                            <Box className="pf-property-drilldown__price-location-cell">
                              <Typography className="pf-property-drilldown__price-location-title">
                                {row.title}
                              </Typography>
                              <Box className="pf-property-drilldown__price-location-meta">
                                <Box className="pf-property-drilldown__price-location-meta-icon">
                                  <LocationIcon width={10} height={15} />
                                </Box>
                                <Typography className="pf-property-drilldown__price-location-subtitle">
                                  {row.subtitle}
                                </Typography>
                              </Box>
                            </Box>
                          </td>
                          <td>
                            <Typography className="pf-property-drilldown__price-date">
                              {row.dealType}
                            </Typography>
                          </td>
                          <td>
                            <Typography className="pf-property-drilldown__price-date">
                              {row.date}
                            </Typography>
                          </td>
                          <td>
                            <Typography className="pf-property-drilldown__price-value">
                              {row.propertyType}
                            </Typography>
                          </td>
                          <td>
                            <Typography className="pf-property-drilldown__price-area">
                              {row.bedrooms}
                            </Typography>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>

              {/* <Box className="pf-property-drilldown__price-table-cta-wrapper">
            <Button className="pf-property-drilldown__price-table-cta">
              Show all
            </Button>
          </Box> */}
            </Box>

            <Box className="pf-agent-details__achievements">
              <Box className="pf-agent-details__awards-card">
                <Typography className="pf-agent-details__awards-title">
                  Awards
                </Typography>
                {!profileLoading && awardRows.length === 0 ? (
                  <Typography sx={{ py: 1 }}>No awards found.</Typography>
                ) : (
                  <Box className="pf-agent-details__awards-list">
                    {awardRows.map((award) => (
                      <Box key={award.key} className="pf-agent-details__award-item">
                        <img
                          src={award.image}
                          alt={award.title ?? "Award"}
                          className="pf-agent-details__award-image"
                          loading="lazy"
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Box className="pf-agent-details__personal-info-card">
                <Typography className="pf-agent-details__personal-info-title">
                  Personal information
                </Typography>
                <Box className="pf-agent-details__personal-info-row">
                  <Typography className="pf-agent-details__personal-info-label">
                    Specialization
                  </Typography>
                  <Typography className="pf-agent-details__personal-info-value">
                    {agent.specialization ?? agent.title}
                  </Typography>
                </Box>
                <Box className="pf-agent-details__personal-info-row">
                  <Typography className="pf-agent-details__personal-info-label">
                    Experience since
                  </Typography>
                  <Typography className="pf-agent-details__personal-info-value">
                    {agent.experienceSince ?? "2020"}
                  </Typography>
                </Box>
                <Box className="pf-agent-details__personal-info-row">
                  <Typography className="pf-agent-details__personal-info-label">
                    Broker License (BRN)
                  </Typography>
                  <Typography className="pf-agent-details__personal-info-value">
                    {agent.brokerLicense ?? "60743"}
                  </Typography>
                </Box>
                {agent.links && agent.links.length > 0 && (
                  <Box className="pf-agent-details__personal-info-row">
                    <Typography className="pf-agent-details__personal-info-label">
                      Links
                    </Typography>
                    <Box className="pf-agent-details__personal-info-links">
                      {agent.links.map((link) => (
                        <Box
                          key={link.label}
                          component="a"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="pf-agent-details__personal-info-link"
                        >
                          <LinkedInIcon02 width="20" height="20" />
                          <Typography
                            component="span"
                            className="pf-agent-details__personal-info-link-text"
                          >
                            {link.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            <Box className="pf-agent-details__expertise">
              <Box className="pf-agent-details__expertise-head">
                <Typography className="pf-agent-details__expertise-title">
                  {`${agent.name}'s Areas of Expertise`}
                </Typography>
                <Typography className="pf-agent-details__expertise-subtitle">
                  Discover the neighborhoods where {agent.name} specialises and has
                  extensive market knowledge
                </Typography>
              </Box>

              {!profileLoading && expertiseOptions.length === 0 ? (
                <Typography sx={{ py: 2 }} className="pf-agent-details__expertise-subtitles">
                  No areas of expertise found.
                </Typography>
              ) : null}

              {expertiseOptions.length > 0 && activeExpertise ? (
                <>
                  <Box className="pf-agent-details__expertise-tabs">
                    {expertiseOptions.map((area) => {
                      const isActive = area.id === activeExpertiseId;
                      return (
                        <Button
                          key={area.id}
                          className={`pf-agent-details__expertise-tab${isActive ? " pf-agent-details__expertise-tab--active" : ""
                            }`}
                          onClick={() => handleExpertiseChange(area.id)}
                          disableRipple
                        >
                          {area.name}
                        </Button>
                      );
                    })}
                  </Box>

                  <Box className="pf-agent-details__expertise-card">
                    <Box className="pf-agent-details__expertise-image-wrapper">
                      <img
                        src={activeExpertise.image}
                        alt={activeExpertise.name}
                        loading="lazy"
                        className="pf-agent-details__expertise-image"
                      />
                    </Box>

                    <Box className="pf-agent-details__expertise-body">
                      <Box className="pf-agent-details__expertise-card-head">
                        <Box>
                          <Typography className="pf-agent-details__expertise-name">
                            {activeExpertise.name}
                          </Typography>
                          <Box className="pf-agent-details__expertise-rating">
                            <Box className="pf-agent-details__rating-track">
                              <StarIcon width="90" height="14" starColor="#E5E7EB" />
                              <Box
                                className="pf-agent-details__rating-fill"
                                style={{
                                  width: `${(activeExpertise.rating / 5) * 100}%`,
                                }}
                              >
                                <StarIcon width="90" height="14" starColor="#FFCB2B" />
                              </Box>
                            </Box>
                            <Typography className="pf-agent-details__expertise-rating-text">
                              {activeExpertise.rating}/5 based on{" "}
                              {activeExpertise.ratingsCount} Ratings
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          className="pf-agent-details__expertise-cta"
                          disableRipple
                          onClick={() => navigate('/areainsight')}
                        >
                          Learn more
                        </Button>
                      </Box>
                      <Divider className="pf-agent-details__expertise-divider" />

                      <Typography className="pf-agent-details__expertise-description">
                        {activeExpertise.description}
                      </Typography>

                      <Box className="pf-agent-details__expertise-metrics">
                        <Box className="pf-agent-details__expertise-metric">
                          <Typography className="pf-agent-details__expertise-metric-label">
                            Sale count :
                          </Typography>
                          <Typography className="pf-agent-details__expertise-metric-value">
                            {activeExpertise.saleCount}
                          </Typography>
                        </Box>
                        <Box className="pf-agent-details__expertise-metric">
                          <Typography className="pf-agent-details__expertise-metric-label">
                            Rent count :
                          </Typography>
                          <Typography className="pf-agent-details__expertise-metric-value">
                            {activeExpertise.rentCount}
                          </Typography>
                        </Box>
                        <Box className="pf-agent-details__expertise-metric">
                          <Typography className="pf-agent-details__expertise-metric-label">
                            Closed deals :
                          </Typography>
                          <Typography className="pf-agent-details__expertise-metric-value">
                            {activeExpertise.closedDeals}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </>
              ) : null}
            </Box>

            <Box className="pf-agent-details__about">
              <Typography className="pf-agent-details__about-title">About me</Typography>
              <Box
                className={`pf-agent-details__about-text${isAboutExpanded ? " pf-agent-details__about-text--expanded" : ""
                  }`}
              >
                <Typography
                  className={`pf-agent-details__about-body${shouldApplyGradient
                    ? " pf-agent-details__about-body--gradient"
                    : ""
                    }`}
                >
                  {aboutText}
                </Typography>
                {!isAboutExpanded && shouldShowReadMore && (
                  <Box className="pf-agent-details__about-gradient" />
                )}
              </Box>
              {shouldShowReadMore && (
                <Button
                  className={`pf-agent-details__about-toggle${isAboutExpanded ? " pf-agent-details__about-toggle--expanded" : ""
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

            <Box className="pf-agent-details__properties" id="agent-properties">
              <Box className="pf-agent-details__properties-head">
                <Box className="pf-agent-details__properties-title-row">
                  <Typography className="pf-agent-details__properties-title">
                    Agent properties
                  </Typography>
                  <Box className="pf-agent-details__properties-count">
                    {agencyPropertiesTotal} properties
                  </Box>
                </Box>

                <Box className="pf-agent-details__properties-filters">

                  {/* category dropdown */}
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
                        {listingTypeOptions.map((item) => {
                          const isActive =
                            selectedListingTypeId === item.id;
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

                  {/* sortby dropdown */}
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
                        {sortByOptions.map((item) => {
                          const isActive =
                            selectedSortByValue === item.value;
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

              <Box className="pf-agent-details__properties-list">
                {agencyPropertiesError ? (
                  <Typography color="error" sx={{ py: 2 }}>
                    {agencyPropertiesError}
                  </Typography>
                ) : null}
                {agencyPropertiesLoading && !agencyPropertiesError ? (
                  <>
                    {Array.from({ length: PROPERTY_LISTING_SKELETON_COUNT }).map((_, i) => (
                      <PropertyListingCardSkeleton key={`agency-prop-skel-${i}`} />
                    ))}
                  </>
                ) : null}
                {!agencyPropertiesLoading &&
                  !agencyPropertiesError &&
                  pagedProperties.length === 0 ? (
                  <Typography sx={{ py: 2 }} className="pf-agent-details__properties-lists">
                    No properties found.
                  </Typography>
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
                <Box className="pf-agent-details__properties-pagination">
                  <PFPagination
                    currentPage={propertyPage}
                    totalPages={totalPropertyPages}
                    onPageChange={setPropertyPage}
                  />
                </Box>
              ) : null}
            </Box>
          </>
        ) : null}
      </PFContainer>
    </main>
  );
}

export default AgentDetails;
