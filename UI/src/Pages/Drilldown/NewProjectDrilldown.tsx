import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { SyntheticEvent } from "react";
import {
  Alert,
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Select,
  Slider,
  Divider,
  Snackbar,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import {
  VerifiedBadgeIcon,
  LocationIcon,
  ThreeDotIcon,
  StarIcon,
  TelephoneIcon,
  WhatsappIcon,
  RightArrowRoundFillIcon,
  LeftArrowIcon,
  RightArrowIcon,
  LocationHomeIcon,
  ViewOnMapIcon,
  MailIcon,
  SuperAgentStarIcon,
  ModalCloseIcon,
  ReportFlagIcon,
  ShareIcon,
  DownLoadArrowIcon,
  ProgressRightArrowIcon,
  RightArrowBlackIcon,
} from "../../Components/parts/icon";
import "../../assets/styles/propertyDrilldown.scss";
import cctvIcon from "../../assets/svg/cctv.svg";
import gatedCommunityIcon from "../../assets/svg/gatedcommunity.svg";
import waterIcon from "../../assets/svg/water.svg";
import gymIcon from "../../assets/svg/gym.svg";
import schoolIcon from "../../assets/svg/school.svg";
import hospitalIcon from "../../assets/svg/hospital.svg";
import restaurantIcon from "../../assets/svg/restaurant.svg";
import developerLogo from "../../assets/img/company_logos/5.png";
import drilldownBg from "../../assets/img/drilldown01.png";
import SplineChart from "./components/splineChart";
import ThumbnailSlider from "./components/thumbnailSlider";
import DrilldownLayoutSkeleton from "./components/DrilldownLayoutSkeleton";
import MortgageDonutChart from "./components/mortgageDonutChart";
import RecommendedCard, {
  type RecommendedProperty,
} from "../../Components/cards/RecommendedCard";
import UpfrontCostModal from "./components/upfrontCostModal";
import ContactusModal from "../Search/components/ContactusModal";
import MailusModal from "../Search/components/MailusModal";
import Loader from "../../Components/loader/loader";
import {
  getProjectById,
  getSupportedUrlsMasterData,
  createInquiry,
  getAuthUser,
  type CreateInquiryResponseData,
} from "../../services/apiService";
import { normalizePhoneForDial, normalizePhoneForWhatsapp } from "../../utils/phoneWhatsapp";
import bathIcon from '../../assets/img/bath.svg'
import sqftIcon from '../../assets/img/Villa.svg'
type SupportedUrlMap = Record<string, unknown>;
type RecommendedProjectCard = RecommendedProperty & { projectId?: string };

type GuestInquiryDraft = {
  name: string;
  email: string;
  phoneNumber: string;
};

const GUEST_INQUIRY_SESSION_KEY = "pf_guest_inquiry_details";

const readGuestInquiryDraft = (): GuestInquiryDraft | null => {
  try {
    const raw = sessionStorage.getItem(GUEST_INQUIRY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestInquiryDraft>;
    const name = String(parsed?.name ?? "").trim();
    const email = String(parsed?.email ?? "").trim();
    const phoneNumber = String(parsed?.phoneNumber ?? "").trim();
    if (!name || !email || !phoneNumber) return null;
    return { name, email, phoneNumber };
  } catch {
    return null;
  }
};

const saveGuestInquiryDraft = (payload: GuestInquiryDraft) => {
  try {
    sessionStorage.setItem(
      GUEST_INQUIRY_SESSION_KEY,
      JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        phoneNumber: payload.phoneNumber.trim(),
      })
    );
  } catch {
    // Ignore storage errors
  }
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

const AMENITIES_FALLBACK: Array<{ name: string; icon: string; alt: string }> = [
  { name: "CCTV", icon: cctvIcon, alt: "CCTV" },
  {
    name: "Gated community",
    icon: gatedCommunityIcon,
    alt: "Gated community",
  },
  { name: "Regular water", icon: waterIcon, alt: "Regular water" },
  { name: "Gym", icon: gymIcon, alt: "Gym" },
  { name: "Power backup", icon: cctvIcon, alt: "Power backup" },
  { name: "Intercom", icon: gatedCommunityIcon, alt: "Intercom" },
  { name: "Kids area", icon: waterIcon, alt: "Kids area" },
  { name: "Swimming pool", icon: gymIcon, alt: "Swimming pool" },
  { name: "Parking", icon: cctvIcon, alt: "Parking" },
  { name: "Security", icon: gatedCommunityIcon, alt: "Security" },
  { name: "Elevator", icon: waterIcon, alt: "Elevator" },
  { name: "Balcony", icon: gymIcon, alt: "Balcony" },
];

const FEATURES_FALLBACK = [
  "It's a villa",
  "O street width",
  "7,066 sqft / 656 sqm",
  "Open-plan design",
  "4 bedrooms",
  "Swimming pool",
  "Renovated",
  "Close to lake",
  "2 bathrooms",
  "1 Garage",
  "North facade",
  "Private garden area",
  "Perfectly located",
];

type ProjectDrilldownEnvelope = {
  data?: {
    project?: Record<string, unknown>;
    authorizedAgencies?: unknown[];
    similarProjects?: unknown[];
  };
};

type PaymentPlanStepT = {
  percentage: number;
  title: string;
  subtitle?: string;
};

type LayoutContactStatus =
  | "sold-out"
  | "available-to-contact"
  | "unavailable";

type UnitRowT = {
  id: string;
  type: string;
  baths: number;
  area: number;
  imageUrl?: string;
  contactStatus: LayoutContactStatus;
};

function normalizeLayoutContactStatus(raw: unknown): LayoutContactStatus {
  const value = String(raw ?? "").trim();
  if (
    value === "sold-out" ||
    value === "available-to-contact" ||
    value === "unavailable"
  ) {
    return value;
  }
  return "unavailable";
}

type UnitLayoutContactActionProps = {
  contactStatus: LayoutContactStatus;
  layoutId: string;
  isInquirySubmitting: boolean;
  inquiryLayoutLoadingId: string | null;
  onInquire: (layoutId: string) => void;
};

function UnitLayoutContactAction({
  contactStatus,
  layoutId,
  isInquirySubmitting,
  inquiryLayoutLoadingId,
  onInquire,
}: UnitLayoutContactActionProps) {
  if (contactStatus === "available-to-contact") {
    return (
      <Button
        className="pf-property-drilldown__units-inquire-btn"
        startIcon={<WhatsappIcon width={18} height={18} />}
        onClick={() => onInquire(layoutId)}
        disabled={isInquirySubmitting}
      >
        {isInquirySubmitting && inquiryLayoutLoadingId === layoutId ? (
          <Loader size={26} margin={0} />
        ) : (
          "Inquire"
        )}
      </Button>
    );
  }

  if (contactStatus === "sold-out") {
    return (
      <Box
        className="pf-property-drilldown__units-status-pill pf-property-drilldown__units-status-pill--sold-out"
        component="span"
      >
        <span
          className="pf-property-drilldown__units-status-pill__indicator"
          aria-hidden
        />
        <Typography
          component="span"
          className="pf-property-drilldown__units-status-pill__label"
        >
          Sold out
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className="pf-property-drilldown__units-status-pill pf-property-drilldown__units-status-pill--coming-soon"
      component="span"
    >
      <span
        className="pf-property-drilldown__units-status-pill__indicator"
        aria-hidden
      />
      <Typography
        component="span"
        className="pf-property-drilldown__units-status-pill__label"
      >
        Coming soon
      </Typography>
    </Box>
  );
}

type BedSectionT = {
  beds: string;
  units: UnitRowT[];
  summary?: {
    bathsRange: string;
    areaRange: string;
    priceFrom: string;
  };
  comingSoon?: boolean;
};

type TowerDataT = {
  id: string;
  name: string;
  typeLabels: Record<string, string>;
  propertyTypes: Record<string, BedSectionT[]>;
};

type TimelineEventT = {
  id: string;
  title: string;
  date: string;
  isCompleted: boolean;
};

function slugifyType(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
}

function layoutsToBedSections(
  layouts: Array<Record<string, unknown>>,
  projectUrlBase: string
): BedSectionT[] {
  const byBed = new Map<number, Array<Record<string, unknown>>>();
  for (const L of layouts) {
    const b = Number(L.bedrooms) || 0;
    if (!byBed.has(b)) byBed.set(b, []);
    byBed.get(b)!.push(L);
  }
  return [...byBed.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bedNum, list]) => {
      const units: UnitRowT[] = list.map((L) => {
        const fps = L.floorPlans as unknown;
        const firstFp = Array.isArray(fps) && fps.length ? fps[0] : null;
        const url = resolveSupportedUrlPath(firstFp, projectUrlBase);
        return {
          id: String(L.layoutId ?? ""),
          type: String(L.layoutName ?? ""),
          baths: Number(L.bathrooms) || 0,
          area: Number(L.areaSqft) || 0,
          imageUrl: url || undefined,
          contactStatus: normalizeLayoutContactStatus(L.contactStatus),
        };
      });
      const areas = list
        .map((x) => Number(x.areaSqft))
        .filter((n) => Number.isFinite(n));
      const baths = list
        .map((x) => Number(x.bathrooms))
        .filter((n) => Number.isFinite(n));
      const prices = list
        .map((x) => {
          const sp = x.startingPrice as { amount?: number } | undefined;
          return sp?.amount;
        })
        .filter((n) => n != null && Number.isFinite(Number(n))) as number[];
      const cur =
        (list[0]?.startingPrice as { currency?: string } | undefined)
          ?.currency ?? "AED";
      const summary =
        baths.length && areas.length && prices.length
          ? {
            bathsRange: `${Math.min(...baths)} - ${Math.max(...baths)} Baths`,
            areaRange: `${Math.min(...areas).toLocaleString("en-US")} - ${Math.max(...areas).toLocaleString("en-US")} sqft`,
            priceFrom: `From ${(Math.min(...prices) / 1e6).toFixed(1)}M ${cur}`,
          }
          : undefined;
      return {
        beds: `${bedNum} Bed`,
        units,
        summary,
      };
    });
}

function mapUnitsFromDeveloper(
  units: unknown,
  projectUrlBase: string
): TowerDataT[] {
  if (!Array.isArray(units) || units.length === 0) {
    return [
      {
        id: "default",
        name: "Project",
        typeLabels: {},
        propertyTypes: {},
      },
    ];
  }
  return units.map((b: Record<string, unknown>, i: number) => {
    const typeLabels: Record<string, string> = {};
    const filt = b.propertyTypeFilter;
    if (Array.isArray(filt)) {
      for (const f of filt) {
        const fr = f as Record<string, unknown>;
        const slug = slugifyType(fr.slug) || slugifyType(fr.name);
        const name = String(fr.name ?? fr.slug ?? slug);
        if (slug) typeLabels[slug] = name;
      }
    }
    const layouts = Array.isArray(b.layouts) ? b.layouts : [];
    const typeKeys = new Set<string>(Object.keys(typeLabels));
    for (const L of layouts) {
      const lr = L as Record<string, unknown>;
      const pt = lr.propertyType as Record<string, unknown> | undefined;
      const sk = slugifyType(pt?.slug) || slugifyType(pt?.name);
      if (sk) {
        typeKeys.add(sk);
        if (!typeLabels[sk])
          typeLabels[sk] = String(pt?.name ?? pt?.slug ?? sk);
      }
    }
    const propertyTypes: Record<string, BedSectionT[]> = {};
    for (const key of typeKeys) {
      const layoutsForType = layouts.filter((L) => {
        const lr = L as Record<string, unknown>;
        const pt = lr.propertyType as Record<string, unknown> | undefined;
        const sk = slugifyType(pt?.slug) || slugifyType(pt?.name);
        return sk === key;
      }) as Array<Record<string, unknown>>;
      propertyTypes[key] = layoutsToBedSections(layoutsForType, projectUrlBase);
    }
    return {
      id: String(b.buildingId ?? `tower-${i}`),
      name: String(b.buildingName ?? `Building ${i + 1}`),
      typeLabels,
      propertyTypes,
    };
  });
}

function getPropertyTypeLabelsForTower(
  towerId: string,
  towers: TowerDataT[]
): string[] {
  const tower = towers.find((t) => t.id === towerId);
  if (!tower) return [];
  const labels = Object.values(tower.typeLabels);
  if (labels.length > 0) return labels;
  return Object.keys(tower.propertyTypes).map((slug) =>
    slug
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function resolvePropertyTypeSlug(
  tower: TowerDataT | undefined,
  selectedLabel: string
): string {
  if (!tower) return slugifyType(selectedLabel);
  for (const [slug, label] of Object.entries(tower.typeLabels)) {
    if (String(label).toLowerCase() === selectedLabel.toLowerCase()) return slug;
  }
  const sk = slugifyType(selectedLabel);
  if (tower.propertyTypes[sk]) return sk;
  for (const key of Object.keys(tower.propertyTypes)) {
    if (key.toLowerCase() === selectedLabel.toLowerCase()) return key;
  }
  return sk;
}

function NewProjectDrilldown() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const projectId = String(
    params.projectId ??
    (location.state as { projectId?: string })?.projectId ??
    ""
  ).trim();

  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(
    null
  );
  const [drilldownEnvelope, setDrilldownEnvelope] =
    useState<ProjectDrilldownEnvelope | null>(null);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(
    () => Boolean(projectId)
  );

  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [locationCardIndex, setLocationCardIndex] = useState(0);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const actionsMenuOpen = Boolean(actionsAnchorEl);
  const [paymentPlanTab, setPaymentPlanTab] = useState(0);
  const [priceTrendFilter, setPriceTrendFilter] = useState("Last 1 year");
  const [showSectionTabs, setShowSectionTabs] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(1908000);
  const [downPayment, setDownPayment] = useState(44);
  const [loanAmount, setLoanAmount] = useState(56);
  const [loanPeriod, setLoanPeriod] = useState(10);
  const [interestRate, setInterestRate] = useState(3.75);
  const [residencyTab, setResidencyTab] = useState("Citizen");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);
  const [inquiryLayoutLoadingId, setInquiryLayoutLoadingId] = useState<string | null>(null);
  const [pendingProjectLayoutId, setPendingProjectLayoutId] = useState<string | null>(null);
  const [isGuestDetailsMode, setIsGuestDetailsMode] = useState(false);
  const [isCtaScrolled, setIsCtaScrolled] = useState(false);
  const [stopCtaScroll, setStopCtaScroll] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
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
  const guestDraft = isLoggedIn ? null : readGuestInquiryDraft();
  const initialUserName = (() => {
    const full =
      authUser?.fullName ||
      authUser?.name ||
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ");
    return (full || "").trim();
  })();
  const initialUserEmail = String(authUser?.email ?? "").trim();
  const initialUserPhone = String(authUser?.phoneNumber ?? "").trim();

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
    if (!projectId) {
      setIsDrilldownLoading(false);
      setDrilldownEnvelope(null);
      return;
    }
    const abortController = new AbortController();
    setIsDrilldownLoading(true);
    getProjectById(projectId, abortController.signal)
      .then((resp) => {
        setDrilldownEnvelope(resp as ProjectDrilldownEnvelope);
      })
      .catch(() => {
        if (!abortController.signal.aborted) setDrilldownEnvelope(null);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsDrilldownLoading(false);
        }
      });
    return () => abortController.abort();
  }, [projectId]);

  const apiProject = (drilldownEnvelope?.data?.project ?? null) as Record<
    string,
    unknown
  > | null;
  const apiAuthorizedAgencies = (drilldownEnvelope?.data?.authorizedAgencies ??
    []) as Array<Record<string, unknown>>;
  const apiSimilarProjects = (drilldownEnvelope?.data?.similarProjects ??
    []) as Array<Record<string, unknown>>;

  useEffect(() => {
    const lp = apiProject?.launchPrice as { startingFrom?: number } | undefined;
    if (lp?.startingFrom != null && Number.isFinite(Number(lp.startingFrom))) {
      setPurchasePrice(Math.round(Number(lp.startingFrom)));
    }
  }, [apiProject]);

  const projectUrlBase =
    ((supportedUrls as { projectUrl?: { img?: string } })?.projectUrl?.img as
      | string
      | undefined) ?? "";
  const projectVideoUrlBase =
    ((supportedUrls as { projectUrl?: { vid?: string } })?.projectUrl?.vid as
      | string
      | undefined) ?? "";
  const projectDocUrlBase =
    ((supportedUrls as { projectUrl?: { doc?: string } })?.projectUrl?.doc as
      | string
      | undefined) ?? "";
  const developerUrlBase =
    ((supportedUrls as { developerUrl?: { img?: string } })?.developerUrl
      ?.img as string | undefined) ?? "";
  const agencyUrlBase =
    ((supportedUrls as { agencyUrl?: { img?: string } })?.agencyUrl?.img as
      | string
      | undefined) ?? "";
  const amenityUrlBase =
    ((supportedUrls as { amenityUrl?: { img?: string } })?.amenityUrl?.img as
      | string
      | undefined) ?? "";

  const amenities = useMemo(() => {
    const raw = apiProject?.amenities;
    if (!Array.isArray(raw) || raw.length === 0) return AMENITIES_FALLBACK;
    return raw.map((a: Record<string, unknown>) => ({
      name: String(a?.name ?? ""),
      icon:
        resolveSupportedUrlPath(a?.image, amenityUrlBase) ||
        resolveSupportedUrlPath(a?.icon, amenityUrlBase) ||
        gymIcon,
      alt: String(a?.name ?? "Amenity"),
    }));
  }, [apiProject, amenityUrlBase]);

  const features = useMemo(() => {
    if (!apiProject) return FEATURES_FALLBACK;
    const list: string[] = [];
    const pts = apiProject.propertyTypes;
    if (Array.isArray(pts) && pts.length) {
      list.push(
        pts
          .map((p: { name?: string }) => p?.name)
          .filter(Boolean)
          .join(", ")
      );
    }
    const bo = apiProject.bedroomOptions;
    if (Array.isArray(bo) && bo.length) {
      list.push(`Bedrooms: ${bo.join(", ")}`);
    }
    const lp = apiProject.launchPrice as
      | { startingFrom?: number; currency?: string }
      | undefined;
    if (lp?.startingFrom != null && Number.isFinite(lp.startingFrom)) {
      list.push(
        `From ${Number(lp.startingFrom).toLocaleString("en-US")} ${lp.currency ?? "AED"}`
      );
    }
    if (apiProject.completionStatus)
      list.push(`Completion: ${String(apiProject.completionStatus)}`);
    if (apiProject.projectType)
      list.push(`Project type: ${String(apiProject.projectType)}`);
    const ki = apiProject.keyInformation as
      | { totalUnits?: number; availableUnits?: number }
      | undefined;
    if (ki?.totalUnits != null)
      list.push(`Total units: ${ki.totalUnits}`);
    if (ki?.availableUnits != null)
      list.push(`Available units: ${ki.availableUnits}`);
    return list.length ? list.slice(0, 12) : FEATURES_FALLBACK;
  }, [apiProject]);

  const projectRibbons = useMemo(() => {
    const tags: { label: string; type: string }[] = [];
    const cs = String(
      apiProject?.completionStatus ?? apiProject?.projectType ?? ""
    ).toLowerCase();
    if (cs.includes("off") || cs === "off-plan")
      tags.push({ label: "OFF-PLAN", type: "offplan" });
    if (cs === "ready") tags.push({ label: "READY", type: "offplan" });
    const kq = (apiProject?.keyInformation as { deliveryQuarter?: string } | undefined)
      ?.deliveryQuarter;
    if (kq) tags.push({ label: `DELIVERY DATE: ${kq}`, type: "deliverydate" });
    const ss = apiProject?.saleStarted;
    if (ss) {
      const d = new Date(String(ss));
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
    const cnt = Number(apiProject?.paymentPlansCount ?? 0);
    if (cnt > 0) {
      tags.push({
        label: `${cnt} PAYMENT PLAN${cnt > 1 ? "S" : ""} AVAILABLE`,
        type: "paymentplan",
      });
    }
    if (apiProject?.isVerified) {
      tags.push({ label: "VERIFIED", type: "paymentplan" });
    }
    return tags.length
      ? tags
      : [
        { label: "OFF-PLAN", type: "offplan" },
        { label: "DELIVERY DATE: —", type: "deliverydate" },
      ];
  }, [apiProject]);

  const keyInformationItems = useMemo(() => {
    const ki = apiProject?.keyInformation as Record<string, unknown> | undefined;
    const loc = ki?.location as { city?: string; zone?: string } | undefined;
    const rows: { label: string; value: string }[] = [];
    if (ki?.deliveryQuarter)
      rows.push({
        label: "Delivery quarter",
        value: String(ki.deliveryQuarter),
      });
    if (ki?.deliveryDate) {
      const d = new Date(String(ki.deliveryDate));
      rows.push({
        label: "Delivery date",
        value: Number.isNaN(d.getTime())
          ? String(ki.deliveryDate)
          : d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
      });
    }
    if (loc?.zone || loc?.city)
      rows.push({
        label: "Location",
        value: [loc.zone, loc.city].filter(Boolean).join(", "),
      });
    if (ki?.paymentPlans)
      rows.push({ label: "Payment plans", value: String(ki.paymentPlans) });
    if (ki?.propertyTypes)
      rows.push({ label: "Property types", value: String(ki.propertyTypes) });
    if (ki?.totalUnits != null)
      rows.push({ label: "Total units", value: String(ki.totalUnits) });
    if (ki?.availableUnits != null)
      rows.push({
        label: "Available units",
        value: String(ki.availableUnits),
      });
    if (ki?.isDldRegistered != null)
      rows.push({
        label: "DLD registered",
        value: ki.isDldRegistered ? "Yes" : "No",
      });
    if (ki?.constructionProgress != null)
      rows.push({
        label: "Construction progress",
        value: `${ki.constructionProgress}%`,
      });
    if (rows.length === 0) {
      return [
        { label: "Details", value: "No key information available yet." },
      ];
    }
    return rows;
  }, [apiProject]);

  const paymentPlanOptions = useMemo(() => {
    const pp = apiProject?.paymentPlan as { plans?: unknown[] } | undefined;
    const plans = Array.isArray(pp?.plans) ? pp.plans : [];
    const fmt = (n: number, cur = "AED") =>
      `${cur} ${new Intl.NumberFormat("en-IN").format(n)}`;
    if (!plans.length) {
      return [{ label: "Plan", steps: [] as PaymentPlanStepT[] }];
    }
    return plans.map((plan, i) => {
      const p = plan as Record<string, unknown>;
      const steps: PaymentPlanStepT[] = [];
      const dp = p.downPayment as
        | { percentage?: number; amount?: number }
        | undefined;
      if (dp && Number(dp.percentage) > 0) {
        steps.push({
          percentage: Number(dp.percentage),
          title: "Down payment",
          subtitle:
            dp.amount != null && Number.isFinite(Number(dp.amount))
              ? fmt(Number(dp.amount))
              : undefined,
        });
      }
      const dc = p.duringConstruction as
        | { percentage?: number; amount?: number; installments?: unknown[] }
        | undefined;
      if (dc && Number(dc.percentage) > 0) {
        const inst = Array.isArray(dc.installments)
          ? dc.installments.length
          : 0;
        steps.push({
          percentage: Number(dc.percentage),
          title: "During construction",
          subtitle: inst ? `${inst} installment(s)` : undefined,
        });
      }
      const oh = p.onHandover as
        | { percentage?: number; amount?: number }
        | undefined;
      if (oh && Number(oh.percentage) > 0) {
        steps.push({
          percentage: Number(oh.percentage),
          title: "On handover",
          subtitle:
            oh.amount != null && Number.isFinite(Number(oh.amount))
              ? fmt(Number(oh.amount))
              : undefined,
        });
      }
      return {
        label: String(p.planName ?? `Option ${i + 1}`),
        steps,
      };
    });
  }, [apiProject]);

  useEffect(() => {
    if (paymentPlanTab >= paymentPlanOptions.length) {
      setPaymentPlanTab(0);
    }
  }, [paymentPlanOptions.length, paymentPlanTab]);

  const galleryImageUrls = useMemo(() => {
    const imgs = apiProject?.images as
      | Array<{ url?: string; order?: number }>
      | undefined;
    if (!Array.isArray(imgs) || !imgs.length) return [] as string[];
    return [...imgs]
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
      .map((im) => resolveSupportedUrlPath(im.url, projectUrlBase))
      .filter((u) => u.length > 0);
  }, [apiProject, projectUrlBase]);

  const galleryImagesCount =
    Number(apiProject?.imagesCount) || galleryImageUrls.length;
  const virtualTour360Url = String(apiProject?.virtualTour360 ?? "").trim();
  const videoTourUrl = resolveSupportedUrlPath(
    apiProject?.videoTour,
    projectVideoUrlBase
  );
  const brochureUrl = resolveSupportedUrlPath(
    apiProject?.brochure,
    projectDocUrlBase
  );
  const hasBrochure = brochureUrl.trim().length > 0;

  const handleBrochureDownload = useCallback(() => {
    if (!hasBrochure) return;
    const cleanUrl = brochureUrl.split("#")[0]?.split("?")[0] ?? brochureUrl;
    const fallbackName = "brochure.pdf";
    const extracted = cleanUrl.split("/").pop() ?? fallbackName;
    const fileName = decodeURIComponent(extracted.trim() || fallbackName);
    const anchor = document.createElement("a");
    anchor.href = brochureUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [brochureUrl, hasBrochure]);
  const handleLocationMapClick = useCallback(() => {
    const projectName = String(apiProject?.projectName ?? "").trim();
    const coords = (apiProject as any)?.location?.coordinates?.coordinates;
    const lng =
      Array.isArray(coords) && coords.length >= 2 ? Number(coords[0]) : NaN;
    const lat =
      Array.isArray(coords) && coords.length >= 2 ? Number(coords[1]) : NaN;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      navigate("/mapview", {
        state: {
          focus: { lat, lng },
          initialProjectSearch: {
            nearLat: lat,
            nearLng: lng,
            nearRadiusKm: 0.05,
            ...(projectName ? { keyword: projectName } : {}),
            page: 1,
            limit: 20,
          },
        },
      });
      return;
    }

    navigate("/mapview", {
      state: {
        initialProjectSearch: {
          ...(projectName ? { keyword: projectName } : {}),
          page: 1,
          limit: 20,
        },
      },
    });
  }, [apiProject, navigate]);

  const masterPlanImageUrl = useMemo(() => {
    const mp = apiProject?.masterPlan as unknown[] | undefined;
    if (!Array.isArray(mp) || !mp.length) return "";
    const first = mp[0] as Record<string, unknown>;
    const url = first?.url ?? first?.image ?? mp[0];
    return resolveSupportedUrlPath(url, projectUrlBase);
  }, [apiProject, projectUrlBase]);

  const recommendedList = useMemo((): RecommendedProjectCard[] => {
    return apiSimilarProjects.map((sp) => {
      const r = sp as Record<string, unknown>;
      const imgs = r.images as Array<{ url?: string; order?: number }> | undefined;
      const sorted =
        Array.isArray(imgs) && imgs.length
          ? [...imgs].sort(
            (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
          )
          : [];
      const imgUrl = sorted.length
        ? resolveSupportedUrlPath(sorted[0]?.url, projectUrlBase)
        : "";
      const loc = r.location as { zone?: string; city?: string } | undefined;
      const br = r.bedroomRange as { min?: number; max?: number } | undefined;
      const bedsArr = r.bedroomOptions as number[] | undefined;
      let bedsLabel = "—";
      if (br?.min != null && br?.max != null) {
        bedsLabel =
          br.min === br.max ? `${br.min} Bed` : `${br.min}–${br.max} Bed`;
      } else if (bedsArr?.length) {
        bedsLabel = `${Math.min(...bedsArr)}–${Math.max(...bedsArr)} Bed`;
      }
      const lp = r.launchPrice as
        | { startingFrom?: number; currency?: string }
        | undefined;
      const priceStr =
        lp?.startingFrom != null && Number.isFinite(Number(lp.startingFrom))
          ? `${Number(lp.startingFrom).toLocaleString("en-US")} ${lp.currency ?? "AED"}`
          : "—";
      const bathRange = r.bathroomRange as { min?: number; max?: number } | undefined;
      const bathsStr = (() => {
        if (bathRange?.min != null && bathRange?.max != null) {
          return bathRange.min === bathRange.max
            ? `${bathRange.min} Bath`
            : `${bathRange.min}–${bathRange.max} Bath`;
        }
        return "—";
      })();
      const sqftRange = r.areaRange as { min?: number; max?: number } | undefined;
      const areaStr = (() => {
        if (sqftRange?.min != null && sqftRange?.max != null) {
          const min = Number(sqftRange.min);
          const max = Number(sqftRange.max);
          if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
            return min === max
              ? `${min.toLocaleString("en-US")} sqft`
              : `${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")} sqft`;
          }
        }
        return "—";
      })();
      const cs = String(r.completionStatus ?? "").toUpperCase();
      return {
        projectId: String(r._id ?? "").trim() || undefined,
        image: imgUrl || drilldownBg,
        title: String(r.projectName ?? "Project"),
        location: [loc?.zone, loc?.city].filter(Boolean).join(", ") || "—",
        beds: bedsLabel,
        baths: bathsStr,
        area: areaStr,
        price: priceStr,
        ribbons: {
          verified: Boolean(r.isVerified),
          label: cs || undefined,
        },
      };
    });
  }, [apiSimilarProjects, projectUrlBase]);

  const authorizedAgenciesList = useMemo(() => {
    return apiAuthorizedAgencies.map((a, i) => {
      const r = a as Record<string, unknown>;
      const pic = resolveSupportedUrlPath(r.profilePicture, agencyUrlBase);
      return {
        id: String(r._id ?? i),
        name: String(r.agencyName ?? "Agency"),
        image: pic || drilldownBg,
      };
    });
  }, [apiAuthorizedAgencies, agencyUrlBase]);

  const timelineEvents = useMemo((): TimelineEventT[] => {
    const raw = apiProject?.projectTimeline;
    if (!Array.isArray(raw) || !raw.length) {
      return [
        {
          id: "placeholder",
          title: "Project timeline",
          date: "—",
          isCompleted: false,
        },
      ];
    }
    return raw.map((ev: unknown, i: number) => {
      const e = ev as Record<string, unknown>;
      const d = e.date ? new Date(String(e.date)) : null;
      const dateStr =
        d && !Number.isNaN(d.getTime())
          ? d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
          : "—";
      const st = String(e.status ?? "").toLowerCase();
      return {
        id: `${String(e.milestone ?? "m")}-${i}`,
        title: String(e.milestone ?? "Milestone"),
        date: dateStr,
        isCompleted: st === "completed",
      };
    });
  }, [apiProject]);

  const faqItems = useMemo(() => {
    const raw = apiProject?.faqs;
    if (!Array.isArray(raw) || !raw.length) {
      return [
        {
          id: "placeholder",
          question: "No FAQs yet",
          answer:
            "Frequently asked questions will appear here when the developer adds them.",
        },
      ];
    }
    return raw.map((f: unknown, i: number) => {
      const item = f as Record<string, unknown>;
      return {
        id: String(item._id ?? i),
        question: String(item.question ?? ""),
        answer: String(item.answer ?? ""),
      };
    });
  }, [apiProject]);

  const towersData = useMemo(
    () => mapUnitsFromDeveloper(apiProject?.unitsFromDeveloper, projectUrlBase),
    [apiProject, projectUrlBase]
  );

  const handlePaymentPlanTabChange = (
    _event: SyntheticEvent,
    newValue: number
  ) => {
    setPaymentPlanTab(newValue);
  };

  const nearbyPlaces = [
    {
      type: "School",
      name: "The new town school",
      distance: "3.5Km",
      icon: schoolIcon,
    },
    {
      type: "Hospital",
      name: "Multi special hospital",
      distance: "2.5Km",
      icon: hospitalIcon,
    },
    {
      type: "Restaurant",
      name: "Taj hotel",
      distance: "2.8Km",
      icon: restaurantIcon,
    },
    {
      type: "Restaurant",
      name: "Palm view cafe",
      distance: "3.1Km",
      icon: restaurantIcon,
    },
    {
      type: "School",
      name: "Palm international school",
      distance: "4.0Km",
      icon: schoolIcon,
    },
    {
      type: "Hospital",
      name: "Dubai care clinic",
      distance: "3.9Km",
      icon: hospitalIcon,
    },
  ];

  const visibleLocationCards = 3;
  const maxLocationIndex =
    nearbyPlaces.length > visibleLocationCards
      ? nearbyPlaces.length - visibleLocationCards
      : 0;

  const handleNextLocationCard = () => {
    if (maxLocationIndex === 0) return;
    setLocationCardIndex((prev) => (prev >= maxLocationIndex ? 0 : prev + 1));
  };

  const maxVisibleBeforeButton = 7; // Show 7 items, then button in 8th position
  const hasMoreAmenities = amenities.length > maxVisibleBeforeButton;
  const visibleAmenities = showAllAmenities
    ? amenities
    : amenities.slice(0, maxVisibleBeforeButton);

  const handleToggleAmenities = () => {
    setShowAllAmenities(!showAllAmenities);
  };
  const handleActionsClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionsAnchorEl(event.currentTarget);
  };
  const handleActionsClose = () => {
    setActionsAnchorEl(null);
  };
  const handleReport = () => {
    console.log("Report clicked");
    handleActionsClose();
  };
  const handleShare = async () => {
    const projectMongoId = String((apiProject as any)?._id ?? "").trim();
    const apiShareLink = String((apiProject as any)?.shareLink ?? "").trim();
    const shareUrl =
      apiShareLink ||
      (projectMongoId
        ? `${window.location.origin}/newprojectdrilldown/${encodeURIComponent(projectMongoId)}`
        : window.location.href);

    if (navigator.share) {
      void navigator
        .share({
          title: String((apiProject as any)?.projectName ?? "").trim() || "Project",
          text: String((apiProject as any)?.projectName ?? "").trim() || "Check this project",
          url: shareUrl,
        })
        .catch(() => {
          // user cancelled or browser blocked the share sheet
        });
      handleActionsClose();
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
    handleActionsClose();
  };
  const ratingValue = 3;
  const ratingFillPercent = Math.max(0, Math.min(1, ratingValue / 5)) * 100;

  const providedAgent = {
    name: "Jackson crosland",
    rating: 4.8,
    responseTime: "within 5 minutes",
    closedDeals: 17,
    languages: "English, Arabic",
    agentProperties: 59,
  };

  const providedAgency = {
    name: "Damac Properties",
    agencyProperties: 818,
    logo: developerLogo,
  };

  const recommendedRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRecommendedLeft, setCanScrollRecommendedLeft] =
    useState(false);
  const [canScrollRecommendedRight, setCanScrollRecommendedRight] =
    useState(false);

  const updateRecommendedScrollState = useCallback(() => {
    const container = recommendedRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
    setCanScrollRecommendedLeft(scrollLeft > 0);
    setCanScrollRecommendedRight(scrollLeft < maxScrollLeft - 1);
  }, []);

  const scrollRecommended = (direction: "left" | "right") => {
    const container = recommendedRef.current;
    if (!container) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  useEffect(() => {
    updateRecommendedScrollState();
    const container = recommendedRef.current;
    if (!container) return;

    const handleScroll = () => updateRecommendedScrollState();
    const handleResize = () => updateRecommendedScrollState();

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateRecommendedScrollState, recommendedList.length]);

  const headerTabs = [
    { label: "Description", id: "description" },
    { label: "Amenities", id: "amenities" },
    { label: "Key information", id: "key-information" },
    { label: "Payment plan", id: "payment-plan" },
    { label: "Project Timeline", id: "project-timeline" },
    { label: "Units", id: "units" }
  ];
  const [activeHeaderTab, setActiveHeaderTab] = useState("description");

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);
  const formatAED = (value: number) => `AED ${formatNumber(value)}`;

  const downPaymentAmount = Math.round((purchasePrice * downPayment) / 100);
  const loanAmountValue = Math.round((purchasePrice * loanAmount) / 100);
  const principalAmount = loanAmountValue;
  const totalMonths = Math.max(1, loanPeriod * 12);
  const monthlyRate = interestRate / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principalAmount / totalMonths
      : (principalAmount *
        monthlyRate *
        Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const totalPayment = monthlyPayment * totalMonths;
  const totalInterestPaid = Math.max(0, totalPayment - principalAmount);

  const handleTabClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const target = el.getBoundingClientRect().top + window.scrollY - 140; // offset for sticky header
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      setShowSectionTabs(scrollY > 240);
      setIsCtaScrolled(scrollY > 320);

      const recommended = document.getElementById("recommendedSection");

      if (recommended) {
        const rect = recommended.getBoundingClientRect();

        // Recommended finished → hide CTA
        if (rect.bottom < window.innerHeight - 250) {
          setStopCtaScroll(true);
        } else {
          setStopCtaScroll(false);
        }
      }
    };

    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = 140; // align with sticky header offset
      let current = activeHeaderTab;

      for (const tab of headerTabs) {
        const section = document.getElementById(tab.id);
        if (!section) continue;
        const rect = section.getBoundingClientRect();

        if (rect.top <= threshold && rect.bottom >= threshold) {
          current = tab.id;
          break;
        }
      }

      if (current !== activeHeaderTab) {
        setActiveHeaderTab(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeHeaderTab, headerTabs]);

  const providedRatingFillPercent =
    Math.max(0, Math.min(1, providedAgent.rating / 5)) * 100;
  const providedStats = [
    { label: "Response time", value: providedAgent.responseTime },
    { label: "Closed deals", value: `${providedAgent.closedDeals}` },
    { label: "Languages", value: providedAgent.languages },
  ];
  const selectedPaymentPlan =
    paymentPlanOptions[paymentPlanTab] ??
    paymentPlanOptions[0] ?? { label: "", steps: [] as PaymentPlanStepT[] };
  const paymentPlanGridColumns =
    selectedPaymentPlan.steps.length > 0
      ? selectedPaymentPlan.steps.length * 2 - 1
      : 0;

  const paymentPlansSubtitle = useMemo(() => {
    const fromApi = Number(apiProject?.paymentPlansCount);
    const withSteps = paymentPlanOptions.filter((o) => o.steps.length > 0).length;
    const n =
      Number.isFinite(fromApi) && fromApi > 0 ? fromApi : withSteps;
    if (n <= 0) return "Payment plan details";
    return `${n} payment plan${n > 1 ? "s" : ""} available`;
  }, [apiProject, paymentPlanOptions]);

  const projectDisplayName =
    String(apiProject?.projectName ?? "").trim() || "Project";
  const breadcrumbLocationLabel = (() => {
    const loc = apiProject?.location as { city?: string; country?: string } | undefined;
    const city = String(loc?.city ?? "").trim();
    const country = String(loc?.country ?? "").trim();
    return city || country || "Worldwide";
  })();
  const breadcrumbSubTitle1 = `New & Off-Plan Projects in ${breadcrumbLocationLabel}`;
  const locationLine = useMemo(() => {
    const loc = apiProject?.location as { zone?: string; city?: string } | undefined;
    return [loc?.zone, loc?.city].filter(Boolean).join(", ") || "—";
  }, [apiProject]);
  const launchPriceLine = useMemo(() => {
    const lp = apiProject?.launchPrice as
      | { startingFrom?: number; currency?: string }
      | undefined;
    if (
      lp?.startingFrom != null &&
      Number.isFinite(Number(lp.startingFrom))
    ) {
      return `${Number(lp.startingFrom).toLocaleString("en-US")} ${lp.currency ?? "AED"}`;
    }
    return "—";
  }, [apiProject]);
  const amenitiesBarLabel = useMemo(() => {
    const c = Number(apiProject?.amenitiesCount);
    if (Number.isFinite(c) && c > 0) return `${c}+ Amenities`;
    if (amenities.length) return `${amenities.length}+ Amenities`;
    return "Amenities";
  }, [apiProject, amenities.length]);

  const developerRecord = apiProject?.developer as
    | Record<string, unknown>
    | undefined;
  const developerId = (() => {
    const dev = apiProject?.developer;
    if (typeof dev === "string") return dev.trim();
    if (dev && typeof dev === "object") {
      return String(
        (dev as { _id?: string; developerId?: string; id?: string })._id ??
        (dev as { developerId?: string }).developerId ??
        (dev as { id?: string }).id ??
        ""
      ).trim();
    }
    return String(
      (apiProject as { developerId?: string } | undefined)?.developerId ?? ""
    ).trim();
  })();
  const developerName = String(
    developerRecord?.name ?? developerRecord?.developerName ?? "Developer"
  );
  const developerLogoUrl = resolveSupportedUrlPath(
    developerRecord?.logo ?? developerRecord?.profilePicture,
    developerUrlBase
  );
  const developerWhatsappDigits = normalizePhoneForWhatsapp(
    developerRecord?.phoneNumber
  );
  const handleDeveloperWhatsappClick = () => {
    if (!developerWhatsappDigits) return;
    const projectLabel = String(apiProject?.projectName ?? "this project").trim();
    const projectId = String(apiProject?._id ?? "").trim();
    const message = `Hi, I'm interested in ${projectLabel}${projectId ? ` (ID: ${projectId})` : ""}.`;
    window.open(
      `https://wa.me/${developerWhatsappDigits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  const handleDeveloperDetailsClick = () => {
    if (!developerId) return;
    navigate(`/developerdetails/${encodeURIComponent(developerId)}`, {
      state: { developerId },
    });
  };

  const descriptionText = String(apiProject?.description ?? "");
  const aboutText = String(apiProject?.aboutTheProject ?? apiProject?.about ?? "");

  const [selectedTower, setSelectedTower] = useState("");
  const [selectedPropertyType, setSelectedPropertyType] = useState("");
  const [expandedBeds, setExpandedBeds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!towersData.length) return;
    const ids = new Set(towersData.map((t) => t.id));
    if (!selectedTower || !ids.has(selectedTower)) {
      setSelectedTower(towersData[0].id);
    }
  }, [towersData, selectedTower]);

  const propertyTypesList = useMemo(
    () => getPropertyTypeLabelsForTower(selectedTower, towersData),
    [selectedTower, towersData]
  );

  useEffect(() => {
    const available = getPropertyTypeLabelsForTower(selectedTower, towersData);
    if (!available.length) return;
    const match = available.find(
      (l) => l.toLowerCase() === selectedPropertyType.toLowerCase()
    );
    if (!match) {
      setSelectedPropertyType(available[0]);
    }
  }, [selectedTower, towersData, selectedPropertyType]);

  useEffect(() => {
    const tower = towersData.find((t) => t.id === selectedTower) || towersData[0];
    if (!tower) return;
    const slug = resolvePropertyTypeSlug(tower, selectedPropertyType);
    const sections = tower.propertyTypes[slug] || [];

    setExpandedBeds((prev) => {
      const newSet = new Set(prev);
      sections.forEach((section) => {
        if (section.units.length === 0 && newSet.has(section.beds)) {
          newSet.delete(section.beds);
        }
      });
      return newSet;
    });
  }, [selectedTower, selectedPropertyType, towersData]);

  const handleToggleBeds = (beds: string, hasUnits: boolean) => {
    if (!hasUnits) {
      return;
    }
    setExpandedBeds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(beds)) {
        newSet.delete(beds);
      } else {
        newSet.add(beds);
      }
      return newSet;
    });
  };

  const currentTower =
    towersData.find((t) => t.id === selectedTower) || towersData[0];
  const currentPropertyTypeSlug = resolvePropertyTypeSlug(
    currentTower,
    selectedPropertyType
  );
  const currentBedSections =
    currentTower?.propertyTypes[currentPropertyTypeSlug] || [];

  const [expandedFAQ, setExpandedFAQ] = useState<string>("");

  const handleToggleFAQ = (id: string) => {
    setExpandedFAQ((prev) => (prev === id ? "" : id));
  };

  const handleMailClose = () => {
    setIsMailModalOpen(false);
    setIsGuestDetailsMode(false);
    setPendingProjectLayoutId(null);
    setInquiryLayoutLoadingId(null);
  };

  const openInquiryWhatsapp = (data?: CreateInquiryResponseData) => {
    const url = String(data?.whatsappUrl ?? "").trim();
    if (!url) return;
    window.open(url, "_blank", "noreferrer");
  };

  const submitProjectWhatsappInquiry = async (params: {
    layoutId: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
  }) => {
    const response = await createInquiry({
      projectId,
      layoutId: params.layoutId,
      inquiryType: "whatsapp",
      ...(params.name ? { name: params.name } : {}),
      ...(params.email ? { email: params.email } : {}),
      ...(params.phoneNumber ? { phoneNumber: params.phoneNumber } : {}),
    });

    if (response?.status === false) {
      throw new Error(
        typeof response.message === "string"
          ? response.message
          : "Failed to create inquiry"
      );
    }
    return response?.data;
  };

  const handleUnitInquireClick = async (layoutId: string) => {
    const selectedLayoutId = String(layoutId ?? "").trim();
    if (!selectedLayoutId || isInquirySubmitting) return;
    setInquiryLayoutLoadingId(selectedLayoutId);

    if (!isLoggedIn) {
      const cached = readGuestInquiryDraft();
      if (cached) {
        try {
          setIsInquirySubmitting(true);
          const data = await submitProjectWhatsappInquiry({
            layoutId: selectedLayoutId,
            name: cached.name,
            email: cached.email,
            phoneNumber: cached.phoneNumber,
          });
          openInquiryWhatsapp(data);
        } catch (err) {
          console.error("[inquiry] project guest whatsapp failed", err);
        } finally {
          setIsInquirySubmitting(false);
          setInquiryLayoutLoadingId(null);
        }
        return;
      }

      setPendingProjectLayoutId(selectedLayoutId);
      setIsGuestDetailsMode(true);
      setIsMailModalOpen(true);
      setInquiryLayoutLoadingId(null);
      return;
    }

    try {
      setIsInquirySubmitting(true);
      const data = await submitProjectWhatsappInquiry({
        layoutId: selectedLayoutId,
      });
      openInquiryWhatsapp(data);
    } catch (err) {
      console.error("[inquiry] project whatsapp failed", err);
    } finally {
      setIsInquirySubmitting(false);
      setInquiryLayoutLoadingId(null);
    }
  };

  const handleGuestProjectInquirySubmit = async (payload: {
    name: string;
    email: string;
    phoneNumber: string;
    comments: string;
  }) => {
    const selectedLayoutId = String(pendingProjectLayoutId ?? "").trim();
    if (!selectedLayoutId || isInquirySubmitting) return;
    setInquiryLayoutLoadingId(selectedLayoutId);

    try {
      setIsInquirySubmitting(true);
      saveGuestInquiryDraft({
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
      });
      const data = await submitProjectWhatsappInquiry({
        layoutId: selectedLayoutId,
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
      });
      openInquiryWhatsapp(data);
    } finally {
      setIsInquirySubmitting(false);
      setInquiryLayoutLoadingId(null);
    }
  };

  const handleMailOpen = () => {
    setIsGuestDetailsMode(false);
    setPendingProjectLayoutId(null);
    setIsMailModalOpen(true);
  };

  if (!projectId) {
    return (
      <div className="pf-property-drilldown">
        <PFContainer>
          <Box sx={{ py: 4 }}>
            <Typography variant="h6">No project selected</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Open a project from the new projects listing to view details.
            </Typography>
          </Box>
        </PFContainer>
      </div>
    );
  }

  if (isDrilldownLoading) {
    return <DrilldownLayoutSkeleton />;
  }

  return (
    <div className="pf-property-drilldown">
      <PFContainer>
        {/* Breadcrumbs Section */}
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1={breadcrumbSubTitle1}
          breadcrumbSubTitle2={projectDisplayName}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/newprojectlisting"
        />

        {/* Main Content Layout */}
        <Box className="pf-property-drilldown__main-layout">
          <Box className="pf-property-drilldown__layout-container">
            {/* Left Column - Images and Details */}
            <Box className="pf-property-drilldown__left-column">
              <Box className="pf-property-drilldown__left-content">
                {showSectionTabs && (
                  <Box className="pf-property-drilldown__section-tabs">
                    <Box className="pf-Box_div">
                      {headerTabs.map((tab) => (
                        <Button
                          key={tab.id}
                          className={`pf-property-drilldown__section-tab ${activeHeaderTab === tab.id
                            ? "pf-property-drilldown__section-tab--active"
                            : ""
                            }`}
                          disableRipple
                          onClick={() => {
                            setActiveHeaderTab(tab.id);
                            handleTabClick(tab.id);
                          }}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
                <ThumbnailSlider
                  images={galleryImageUrls}
                  imagesCount={galleryImagesCount}
                  virtualTour360Url={virtualTour360Url}
                  videoTourUrl={videoTourUrl}
                  onLocationClick={handleLocationMapClick}
                />
                {/* Project Details Section */}
                <Box
                  className="pf-property-drilldown__project-details"
                  id="description"
                >
                  <Typography className="pf-property-drilldown__project-title">
                    Project details
                  </Typography>

                  {descriptionText ? (
                    <Typography
                      className="pf-property-drilldown__project-paragraph"
                      dangerouslySetInnerHTML={{ __html: descriptionText }}
                    />
                  ) : (
                    <Typography className="pf-property-drilldown__project-paragraph">
                      Project description will appear here when available from the
                      developer.
                    </Typography>
                  )}

                  {/* Features List */}
                  <ul className="pf-property-drilldown__features-list">
                    {features.map((feature, index) => (
                      <li
                        key={index}
                        className="pf-property-drilldown__feature-item"
                      >
                        <Typography className="pf-property-drilldown__feature-text">
                          {feature}
                        </Typography>
                      </li>
                    ))}
                  </ul>

                </Box>

                {/* Amenities Section */}
                <Box
                  className="pf-property-drilldown__amenities"
                  id="amenities"
                >
                  <Typography className="pf-property-drilldown__amenities-title">
                    Amenities
                  </Typography>

                  <Box className="pf-property-drilldown__amenities-grid">
                    {visibleAmenities.map((amenity, index) => (
                      <Box
                        key={index}
                        className="pf-property-drilldown__amenity-item"
                      >
                        <Box className="pf-property-drilldown__amenity-icon-wrapper">
                          <img
                            src={amenity.icon}
                            alt={amenity.alt}
                            className="pf-property-drilldown__amenity-icon"
                          />
                        </Box>
                        <Typography className="pf-property-drilldown__amenity-text">
                          {amenity.name}
                        </Typography>
                      </Box>
                    ))}

                    {/* More amenities button - appears in 8th position (2nd row, last) if there are more than 7 amenities */}
                    {hasMoreAmenities && !showAllAmenities && (
                      <Box
                        className="pf-property-drilldown__amenity-item pf-property-drilldown__amenity-item--more"
                        onClick={handleToggleAmenities}
                        sx={{ cursor: "pointer" }}
                      >
                        <Button
                          className="pf-property-drilldown__more-amenities-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAmenities();
                          }}
                        >
                          <Typography className="pf-property-drilldown__more-amenities-text">
                            More amenities
                          </Typography>
                          <Box className="pf-property-drilldown__more-amenities-arrow">
                            <RightArrowRoundFillIcon
                              width={20}
                              height={20}
                              roundFill="#222222"
                              fill="white"
                            />
                          </Box>
                        </Button>
                      </Box>
                    )}

                    {/* Show less button when all amenities are shown */}
                    {hasMoreAmenities && showAllAmenities && (
                      <Box
                        className="pf-property-drilldown__amenity-item pf-property-drilldown__amenity-item--more"
                        onClick={handleToggleAmenities}
                        sx={{ cursor: "pointer" }}
                      >
                        <Button
                          className="pf-property-drilldown__more-amenities-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAmenities();
                          }}
                        >
                          <Typography className="pf-property-drilldown__more-amenities-text">
                            Show less
                          </Typography>
                          <Box className="pf-property-drilldown__more-amenities-arrow">
                            <RightArrowRoundFillIcon
                              width={20}
                              height={20}
                              roundFill="#222222"
                              fill="white"
                              style={{
                                transform: "rotate(180deg)",
                                transition: "transform 0.3s ease",
                              }}
                            />
                          </Box>
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Key information Section */}
                <Box
                  className="pf-property-drilldown__regulatory"
                  id="key-information"
                >
                  <Typography className="pf-property-drilldown__regulatory-title">
                    Key information
                  </Typography>
                  <Box className="pf-newproject-drilldown__keyinfo">
                    {keyInformationItems.map((item) => (
                      <Box
                        className="pf-newproject-drilldown__keyinfo-item"
                        key={item.label}
                      >
                        <Typography className="pf-newproject-drilldown__keyinfo-label">
                          {item.label}
                        </Typography>

                        <Typography className="pf-newproject-drilldown__keyinfo-value">
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Price Insights Section */}
                <Box
                  className="pf-property-drilldown__price-insights"
                  id="payment-plan"
                >
                  <Box className="pf-property-drilldown__price-insights-header">
                    <Typography className="pf-property-drilldown__price-insights-title">
                      Payment plan
                    </Typography>
                    <Typography className="pf-property-drilldown__price-insights-subtitle">
                      {paymentPlansSubtitle}
                    </Typography>
                  </Box>
                  <Tabs
                    value={paymentPlanTab}
                    onChange={handlePaymentPlanTabChange}
                    className="pf-property-drilldown__price-tabs"
                    TabIndicatorProps={{
                      className: "pf-property-drilldown__price-tabs-indicator",
                    }}
                    variant="fullWidth"
                  >
                    {paymentPlanOptions.map((option) => (
                      <Tab
                        key={option.label}
                        className="pf-property-drilldown__price-tab"
                        label={option.label}
                      />
                    ))}
                  </Tabs>

                  <Box className="pf-property-drilldown__price-insights-content">
                    {selectedPaymentPlan.steps.length > 0 ? (
                      <Box className="pf-property-drilldown__payment-plan">
                        <Box
                          className="pf-property-drilldown__payment-plan-percentage-grid"
                          sx={{
                            gridTemplateColumns: `repeat(${paymentPlanGridColumns}, 1fr)`,
                          }}
                        >
                          {selectedPaymentPlan.steps.map((step, idx) => (
                            <Fragment
                              key={`${selectedPaymentPlan.label}-percentage-${idx}`}
                            >
                              <Box className="pf-property-drilldown__payment-plan-percentage">
                                <Typography className="pf-property-drilldown__payment-plan-percentage-value">
                                  {step.percentage}%
                                </Typography>
                              </Box>
                              {idx < selectedPaymentPlan.steps.length - 1 && (
                                <Box
                                  className="pf-property-drilldown__payment-plan-arrow"
                                  key={`${selectedPaymentPlan.label}-arrow-${idx}`}
                                >
                                  <ProgressRightArrowIcon width="100%" height="13" />
                                </Box>
                              )}
                            </Fragment>
                          ))}
                        </Box>

                        <Box
                          className="pf-property-drilldown__payment-plan-timeline"
                          sx={{
                            gridTemplateColumns: `repeat(${paymentPlanGridColumns}, 1fr)`,
                          }}
                        >
                          <Box className="pf-property-drilldown__payment-plan-line" />
                          {selectedPaymentPlan.steps.map((step, idx) => (
                            <Box
                              className="pf-property-drilldown__payment-plan-step"
                              key={`${selectedPaymentPlan.label}-step-${idx}`}
                              sx={{ gridColumn: idx * 2 + 1 }}
                            >
                              <Box className="pf-property-drilldown__payment-plan-dot" />
                              <Typography className="pf-property-drilldown__payment-plan-step-title">
                                {step.title}
                              </Typography>
                              {step.subtitle ? (
                                <Typography className="pf-property-drilldown__payment-plan-step-subtitle">
                                  {step.subtitle}
                                </Typography>
                              ) : null}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Box className="pf-property-drilldown__payment-plan-placeholder">
                        Payment plan details coming soon.
                      </Box>
                    )}
                  </Box>
                </Box>

                {/*Project Timeline Section*/}
                <Box className="pf-property-drilldown__project-timeline" id="project-timeline">
                  <Typography className="pf-property-drilldown__project-timeline-title">
                    Project timeline
                  </Typography>
                  <Box className="pf-property-drilldown__project-timeline-list">
                    {timelineEvents.map((event, index) => (
                      <Box
                        key={event.id}
                        className="pf-property-drilldown__project-timeline-item"
                      >
                        <Box className="pf-property-drilldown__project-timeline-content">
                          <Box
                            className={`pf-property-drilldown__project-timeline-indicator ${event.isCompleted
                              ? "pf-property-drilldown__project-timeline-indicator--completed"
                              : "pf-property-drilldown__project-timeline-indicator--pending"
                              }`}
                          >
                            {event.isCompleted && (
                              <svg
                                width="12"
                                height="9"
                                viewBox="0 0 12 9"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 4.5L4.5 8L11 1"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                            {!event.isCompleted && (
                              <svg
                                width="12"
                                height="9"
                                viewBox="0 0 12 9"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 4.5L4.5 8L11 1"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </Box>
                          <Box className="pf-property-drilldown__project-timeline-text">
                            <Typography
                              className={`pf-property-drilldown__project-timeline-event-title ${!event.isCompleted
                                ? "pf-property-drilldown__project-timeline-event-title--pending"
                                : ""
                                }`}
                            >
                              {event.title} - ({event.date})
                            </Typography>

                          </Box>
                        </Box>
                        {index < timelineEvents.length - 1 && (
                          <Box
                            className={`pf-property-drilldown__project-timeline-line ${timelineEvents[index + 1].isCompleted
                              ? "pf-property-drilldown__project-timeline-line--completed"
                              : "pf-property-drilldown__project-timeline-line--pending"
                              }`}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/*Units from developer Section*/}
                <Box className="pf-property-drilldown__units-from-developer" id="units">
                  <Typography className="pf-property-drilldown__units-title">
                    Units from developer
                  </Typography>

                  {/* Tower Navigation Tabs */}
                  <Box className="pf-property-drilldown__units-towers">
                    {towersData.map((tower) => (
                      <Button
                        key={tower.id}
                        className={`pf-property-drilldown__units-tower-tab ${selectedTower === tower.id
                          ? "pf-property-drilldown__units-tower-tab--active"
                          : ""
                          }`}
                        onClick={() => setSelectedTower(tower.id)}
                        disableRipple
                      >
                        {tower.name}
                      </Button>
                    ))}
                  </Box>
                  <Divider className="pf-property-drilldown__units-divider" />

                  {/* Property Type Filters */}
                  <Box className="pf-property-drilldown__units-filters">
                    {propertyTypesList.map((type) => (
                      <Button
                        key={type}
                        className={`pf-property-drilldown__units-filter-btn ${selectedPropertyType === type
                          ? "pf-property-drilldown__units-filter-btn--active"
                          : ""
                          }`}
                        onClick={() => setSelectedPropertyType(type)}
                        disableRipple
                      >
                        {type}
                      </Button>
                    ))}
                  </Box>

                  {/* Bed Sections */}
                  <Box className="pf-property-drilldown__units-bed-sections">
                    {currentBedSections.map((section) => {
                      const isExpanded = expandedBeds.has(section.beds);
                      return (
                        <Box
                          key={section.beds}
                          className="pf-property-drilldown__units-bed-section"
                        >
                          {/* Bed Section Header */}
                          <Box
                            className={`pf-property-drilldown__units-bed-header ${isExpanded ? "pf-property-drilldown__units-bed-header--expanded" : ""}`}
                            onClick={() => handleToggleBeds(section.beds, section.units.length > 0)}
                            sx={{ cursor: section.units.length > 0 ? "pointer" : "default" }}
                          >
                            <Box className="pf-property-drilldown__units-bed-header-left">
                              <Box
                                className="pf-property-drilldown__units-chevron"
                                sx={{
                                  transform: isExpanded
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 0.3s ease",
                                }}
                              >
                                <RightArrowBlackIcon width={14} height={14} />
                              </Box>
                              <Typography className="pf-property-drilldown__units-bed-title">
                                {section.beds}
                              </Typography>
                            </Box>
                            <Box className="pf-property-drilldown__units-bed-header-right">
                              {section.comingSoon ? (
                                <Typography className="pf-property-drilldown__units-coming-soon">
                                  Coming soon
                                </Typography>
                              ) : section.summary ? (
                                <Box className="pf-property-drilldown__units-summary">
                                  <Box className="pf-property-drilldown__units-summary-item-icon">
                                    <img src={bathIcon} alt="bath" className="pf-property-drilldown__units-unit-detail-icon" />
                                    <Typography className="pf-property-drilldown__units-summary-item">
                                      {section.summary.bathsRange}
                                    </Typography>
                                  </Box>
                                  <Box className="pf-property-drilldown__units-summary-item-icon">
                                    <img src={sqftIcon} alt="sqft" className="pf-property-drilldown__units-unit-detail-icon" />
                                    <Typography className="pf-property-drilldown__units-summary-item">
                                      {section.summary.areaRange}
                                    </Typography>
                                  </Box>
                                  <Typography className="pf-property-drilldown__units-summary-item">
                                    {section.summary.priceFrom}
                                  </Typography>
                                </Box>
                              ) : null}
                            </Box>
                          </Box>

                          {/* Expanded Units List */}
                          {isExpanded && section.units.length > 0 && (
                            <Box className="pf-property-drilldown__units-list">
                              {section.units.map((unit, unitIndex) => (
                                <Box key={unit.id}>
                                  {unitIndex > 0 && (
                                    <Divider className="pf-property-drilldown__units-unit-divider" />
                                  )}
                                  <Box className="pf-property-drilldown__units-unit">
                                    <Box className="pf-property-drilldown__units-unit-thumbnail">
                                      <img
                                        src={unit.imageUrl || drilldownBg}
                                        alt={unit.type}
                                        className="pf-property-drilldown__units-thumbnail-img"
                                      />
                                    </Box>
                                    <Box className="pf-property-drilldown__units-unit-content">
                                      <Typography className="pf-property-drilldown__units-unit-type">
                                        {unit.type}
                                      </Typography>
                                      <Box className="pf-property-drilldown__units-unit-details">
                                        <Box className="pf-property-drilldown__units-unit-detail">

                                          <img src={bathIcon} alt="bath" className="pf-property-drilldown__units-unit-detail-icon" />
                                          <Typography className="pf-property-drilldown__units-unit-detail-text">
                                            {unit.baths} Bath
                                          </Typography>
                                        </Box>
                                        <Box className="pf-property-drilldown__units-unit-detail">
                                          <img src={sqftIcon} alt="sqft" className="pf-property-drilldown__units-unit-detail-icon" />
                                          <Typography className="pf-property-drilldown__units-unit-detail-text">
                                            {unit.area.toLocaleString()} sqft
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                    <UnitLayoutContactAction
                                      contactStatus={unit.contactStatus}
                                      layoutId={unit.id}
                                      isInquirySubmitting={isInquirySubmitting}
                                      inquiryLayoutLoadingId={inquiryLayoutLoadingId}
                                      onInquire={(layoutId) => {
                                        void handleUnitInquireClick(layoutId);
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/*About the project Section*/}
                <Box className="pf-property-drilldown__about-the-project">
                  <Typography className="pf-property-drilldown__about-the-project-title">
                    About the project
                  </Typography>
                  <Typography className="pf-property-drilldown__about-the-project-description">
                    {aboutText ||
                      "Further information about this project will appear here when the developer provides it."}
                  </Typography>
                </Box>

                {/*masterplan Section*/}
                {masterPlanImageUrl ? (
                  <Box className="pf-property-drilldown__masterplan">
                    <Typography className="pf-property-drilldown__masterplan-title">
                      {/* {projectDisplayName} masterplan */}
                      Masterplan
                    </Typography>
                    <Box className="pf-property-drilldown__masterplan-image-container">
                      <img
                        src={masterPlanImageUrl}
                        alt="Master plan"
                        className="pf-property-drilldown__masterplan-image"
                      />
                    </Box>
                  </Box>
                ) : null}

                {authorizedAgenciesList.length > 0 ? (
                  <Box className="pf-property-drilldown__authorized-agencies">
                    <Typography className="pf-property-drilldown__authorized-agencies-title">
                      Authorized agencies
                    </Typography>
                    <Box className="pf-property-drilldown__authorized-agencies-grid">
                      {authorizedAgenciesList.map((agency) => (
                        <Box
                          key={agency.id}
                          className="pf-property-drilldown__authorized-agency-item"
                        >
                          <Box className="pf-property-drilldown__authorized-agency-image">
                            <img
                              src={agency.image}
                              alt={agency.name}
                              className="pf-property-drilldown__authorized-agency-img"
                            />
                          </Box>
                          <Typography className="pf-property-drilldown__authorized-agency-name">
                            {agency.name}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}

                {/*Frequently asked questions Section*/}
                <Box className="pf-property-drilldown__faq">
                  <Typography className="pf-property-drilldown__faq-title">
                    Frequently asked questions
                  </Typography>
                  <Box className="pf-property-drilldown__faq-list">
                    {faqItems.map((item) => {
                      const isExpanded = expandedFAQ === item.id;
                      return (
                        <Box
                          key={item.id}
                          className={`pf-property-drilldown__faq-item ${isExpanded
                            ? "pf-property-drilldown__faq-item--expanded"
                            : ""
                            }`}
                        >
                          <Box
                            className="pf-property-drilldown__faq-question"
                            onClick={() => handleToggleFAQ(item.id)}
                            sx={{ cursor: "pointer" }}
                          >
                            <Typography className="pf-property-drilldown__faq-question-text">
                              {item.question}
                            </Typography>
                            <Box className="pf-property-drilldown__faq-icon">
                              {isExpanded ? (
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M5 10H15"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M10 5V15M5 10H15"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              )}
                            </Box>
                          </Box>
                          {isExpanded && item.answer && (
                            <Box className="pf-property-drilldown__faq-answer">
                              <Typography className="pf-property-drilldown__faq-answer-text">
                                {item.answer}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {recommendedList.length > 0 ? (
                  <Box
                    id="recommendedSection"
                    className="pf-property-drilldown__recommended"
                  >
                    <Box className="pf-property-drilldown__recommended-header">
                      <Typography className="pf-property-drilldown__recommended-title">
                        Recommended for you
                      </Typography>
                      <Box className="pf-property-drilldown__recommended-arrows">
                        <IconButton
                          className="pf-property-drilldown__recommended-arrow"
                          disableRipple
                          disableFocusRipple
                          disableTouchRipple
                          aria-label="Previous recommended property"
                          onClick={() => scrollRecommended("left")}
                          disabled={!canScrollRecommendedLeft}
                        >
                          <LeftArrowIcon width="20" height="20" fill="#222222" />
                        </IconButton>
                        <IconButton
                          className="pf-property-drilldown__recommended-arrow"
                          disableRipple
                          disableFocusRipple
                          disableTouchRipple
                          aria-label="Next recommended property"
                          onClick={() => scrollRecommended("right")}
                          disabled={!canScrollRecommendedRight}
                        >
                          <RightArrowIcon width="20" height="20" fill="#222222" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box
                      className="pf-property-drilldown__recommended-grid"
                      ref={recommendedRef}
                    >
                      {recommendedList.map((item, idx) => (
                        <RecommendedCard
                          key={`${item.title}-${idx}`}
                          property={item}
                          onClick={() => {
                            if (!item.projectId) return;
                            navigate(`/newprojectdrilldown/${encodeURIComponent(item.projectId)}`, {
                              state: { projectId: item.projectId },
                            });
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : null}
              </Box>
            </Box>

            {/* Right Column - Property Info */}
            <Box className="pf-property-drilldown__right-column">
              <Box className="pf-property-drilldown__right-content">
                {/* Main Property Card (up to agent) */}
                <Box className="pf-property-drilldown__card">
                  <Box className="pf-property_box">
                    {/* Header: Verified + actions */}
                    <Box className="pf-property-drilldown__card-header">
                      {apiProject?.isVerified ? (
                        <Box className="pf-property-drilldown__verified-pill">
                          <VerifiedBadgeIcon width={12} height={12} />
                          <Typography className="pf-property-drilldown__verified-text">
                            VERIFIED
                          </Typography>
                        </Box>
                      ) : (
                        <Box />
                      )}
                      <Box className="pf-property-drilldown__card-actions">
                        <IconButton
                          className="pf-property-drilldown__icon-btn"
                          aria-label="More options"
                          onClick={handleActionsClick}
                        >
                          {actionsMenuOpen ? (
                            <ModalCloseIcon width={14} height={14} />
                          ) : (
                            <ThreeDotIcon width={16} height={16} />
                          )}
                        </IconButton>
                        <Menu
                          id="property-drilldown-menu"
                          anchorEl={actionsAnchorEl}
                          open={actionsMenuOpen}
                          onClose={handleActionsClose}
                          className="pf-property-listing-card__menu"
                          MenuListProps={{
                            "aria-labelledby": "property-menu-button",
                          }}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                          }}
                        >
                          <MenuItem
                            onClick={handleReport}
                            className="pf-property-listing-card__menu-item"
                          >
                            <ReportFlagIcon width={20} height={18} />
                            <Typography
                              variant="body2"
                              className="pf-property-listing-card__menu-text"
                            >
                              Report
                            </Typography>
                          </MenuItem>
                          <MenuItem
                            onClick={handleShare}
                            className="pf-property-listing-card__menu-item"
                          >
                            <ShareIcon width={20} height={25} />
                            <Typography
                              variant="body2"
                              className="pf-property-listing-card__menu-text"
                            >
                              Share
                            </Typography>
                          </MenuItem>
                        </Menu>
                      </Box>
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h1"
                      className="pf-property-drilldown__title"
                    >
                      {projectDisplayName}
                    </Typography>

                    {/* Location */}
                    <Box className="pf-property-drilldown__location">
                      <LocationIcon width={14} height={14} />
                      <Typography className="pf-property-drilldown__location-text">
                        {locationLine}
                      </Typography>
                    </Box>

                    {/* Ribbons */}
                    <Box className="pf-property-drilldown__ribbon-row">
                      <Box className="pf-property-drilldown__ribbon-stack">
                        {projectRibbons.map((ribbon) => (
                          <span
                            key={ribbon.label}
                            className={`pf-ribbon pf-ribbon--${ribbon.type}`}
                          >
                            {ribbon.label}
                          </span>
                        ))}
                      </Box>
                    </Box>



                    {/* Amenities bar */}
                    <Button
                      className="pf-new-project-drilldown__amenities-bar"
                      onClick={() => {
                        setActiveHeaderTab("amenities");
                        handleTabClick("amenities");
                      }}
                    >
                      {amenitiesBarLabel}
                    </Button>

                    <Box className="pf-property-drilldown__launch-price-card">
                      <Typography className="pf-property-drilldown__launch-price-label">
                        Launching price
                      </Typography>
                      <Typography className="pf-property-drilldown__launch-price-value">
                        {launchPriceLine}
                      </Typography>
                      <Divider className="pf-footer__divider" />
                      <Typography className="pf-property-drilldown__launch-price-note">
                        *Prices, availability, and purchase conditions may change
                        frequently. Contact a representative for the latest
                        availability and pricing.
                      </Typography>
                    </Box>


                  </Box>
                  {/* Developer row */}
                </Box>

                {/* CTA buttons (separate section, still within 400px column) */}
                <Box className={`${isCtaScrolled && !stopCtaScroll
                  ? "pf-property-drilldown__cta-row--scrolled"
                  : ""
                  }`}>
                  <Box className="pf-property-drilldown__agent-row">
                    <Box className="pf-property-drilldown__agent-info">
                      <Box className="pf-property-drilldown__developer-pill">
                        <img
                          src={developerLogoUrl || developerLogo}
                          alt="Developer logo"
                        />
                      </Box>
                      <Box className="pf-property-drilldown__agent-text">
                        <Typography className="pf-property-drilldown__developer">
                          Developer
                        </Typography>
                        <Box className="pf-property-drilldown__rating-row">
                          <Typography className="pf-property-drilldown__developer-name">
                            {developerName}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <IconButton
                      type="button"
                      aria-label={`View ${developerName} developer profile`}
                      onClick={handleDeveloperDetailsClick}
                      disabled={!developerId}
                    >
                      <RightArrowRoundFillIcon width={20} height={20} />
                    </IconButton>
                  </Box>
                  <Box
                    className="pf-property-drilldown__cta-row"
                  >
                    <Button
                      className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--mail"
                      startIcon={
                        <MailIcon width={20} height={20} fill="#ffffff" />
                      }
                      onClick={handleMailOpen}
                    >
                      Mail us
                    </Button>
                    <Button
                      className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--whatsapp"
                      startIcon={<WhatsappIcon width={20} height={20} />}
                      onClick={handleDeveloperWhatsappClick}
                      disabled={!developerWhatsappDigits}
                    >
                      Whatsapp
                    </Button>
                  </Box>
                  {hasBrochure ? (
                    <Box className="pf-property-drilldown__cta-row">
                      <Button
                        className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--download"
                        startIcon={<DownLoadArrowIcon width={20} height={20} />}
                        onClick={handleBrochureDownload}
                      >
                        Download brochure
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              </Box>


              <MailusModal
                open={isMailModalOpen}
                onClose={handleMailClose}
                agentName={
                  authorizedAgenciesList[0]?.name ?? providedAgent.name
                }
                initialName={isLoggedIn ? initialUserName : guestDraft?.name || ""}
                initialEmail={isLoggedIn ? initialUserEmail : guestDraft?.email || ""}
                initialPhone={normalizePhoneForDial(
                  isLoggedIn ? initialUserPhone : guestDraft?.phoneNumber || ""
                )}
                title={isGuestDetailsMode ? "Enter your details to continue" : undefined}
                submitLabel={isGuestDetailsMode ? "Continue to WhatsApp" : "Send"}
                showComments={!isGuestDetailsMode}
                onSubmit={isGuestDetailsMode ? handleGuestProjectInquirySubmit : undefined}
              />
            </Box>
          </Box>
        </Box>
      </PFContainer>
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
    </div >
  );
}

export default NewProjectDrilldown;
