import { useCallback, useEffect, useRef, useState } from "react";
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
  TextField,
  Snackbar,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import {
  VerifiedBadgeIcon,
  LocationIcon,
  HeartIcon02,
  HeartIcon02Filled,
  ThreeDotIcon,
  BedRoomIcon,
  BathRoomIcon,
  SqftIcon,
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
import { useNavigate, useLocation, useParams } from "react-router-dom";
import MortgageDonutChart from "./components/mortgageDonutChart";
import qrImg from "../../assets/img/qrimg.png";
import RecommendedCard, {
  type RecommendedProperty,
} from "../../Components/cards/RecommendedCard";
import UpfrontCostModal from "./components/upfrontCostModal";
import MortgageQuoteModal from "../Mortgage/MortgageQuoteModal";
import ContactusModal from "../Search/components/ContactusModal";
import MailusModal from "../Search/components/MailusModal";
import ReportModal from "./components/ReportModal";
import { resolveListingTransactionForProperty } from "../Search/components/PropertyListingCard";
import {
  getPropertyById,
  getPropertyPriceInsights,
  getSupportedUrlsMasterData,
  type PropertyPriceInsightsData,
  addSavedProperty,
  removeSavedProperty,
  syncAuthUserSavedProperty,
  createInquiry,
  getAuthUser,
  postMortgageCalculate,
  postMortgageUpfrontCosts,
  getResidencyStatusMasterData,
  type CreateInquiryResponseData,
  type MortgageCalculateResponseData,
  type MortgageUpfrontCostsResponseData,
  type MortgageResidencyStatus,
} from "../../services/apiService";
import {
  normalizePhoneForDial,
  normalizePhoneForWhatsapp,
} from "../../utils/phoneWhatsapp";

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

type PropertyDrilldownEnvelope = {
  data?: {
    property?: any;
    agent?: any;
    agency?: any;
    relatedProperties?: any[];
    nearbyPlaces?: Record<string, Array<{ name?: string; vicinity?: string; distance?: string }>>;
    areaPropertiesCount?: number;
    agentListingsCount?: number;
    isSaved?: boolean;
    mortgageDefaults?: any;
  };
};

type InquiryActionType = "call" | "email" | "whatsapp";
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



function PropertyDrilldown() {
  const MIN_MORTGAGE_PURCHASE_PRICE = 330000;
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ propertyId?: string }>();
  const locationState = (location.state ?? {}) as { propertyId?: string };
  const propertyId = String(params.propertyId ?? locationState.propertyId ?? "").trim();

  const [isDrilldownLoading, setIsDrilldownLoading] = useState(
    () => Boolean(propertyId)
  );
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);
  const [drilldownEnvelope, setDrilldownEnvelope] =
    useState<PropertyDrilldownEnvelope | null>(null);
  const [priceInsightsData, setPriceInsightsData] =
    useState<PropertyPriceInsightsData | null>(null);
  const [mortgageCalc, setMortgageCalc] =
    useState<MortgageCalculateResponseData | null>(null);
  const [residencyOptions, setResidencyOptions] = useState<
    Array<{ name: string; value: MortgageResidencyStatus }>
  >([]);
  const [selectedResidencyStatus, setSelectedResidencyStatus] =
    useState<MortgageResidencyStatus>("uae-resident");

  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [locationCardIndex, setLocationCardIndex] = useState(0);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const actionsMenuOpen = Boolean(actionsAnchorEl);

  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  const [priceInsightsTab, setPriceInsightsTab] = useState(0);
  const [priceTrendFilter, setPriceTrendFilter] = useState("Last 1 year");
  const [showSectionTabs, setShowSectionTabs] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(1908000);
  const [downPayment, setDownPayment] = useState(44);
  const [loanAmount, setLoanAmount] = useState(56);
  const [loanPeriod, setLoanPeriod] = useState(10);
  const [interestRate, setInterestRate] = useState(3.75);
  const [interestRateInput, setInterestRateInput] = useState("3.75");
  const [isUpfrontCostOpen, setIsUpfrontCostOpen] = useState(false);
  const [isMortgageQuoteModalOpen, setIsMortgageQuoteModalOpen] = useState(false);
  const [upfrontCostsData, setUpfrontCostsData] =
    useState<MortgageUpfrontCostsResponseData | null>(null);
  const [upfrontCostsLoading, setUpfrontCostsLoading] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [pendingInquiryAction, setPendingInquiryAction] =
    useState<InquiryActionType>("email");
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);
  const [isCtaScrolled, setIsCtaScrolled] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
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
        const items = (resp.data?.items ?? {}) as any;
        const map = Array.isArray(items)
          ? (items.reduce((acc: SupportedUrlMap, cur: Record<string, unknown>) => {
            return { ...acc, ...cur };
          }, {}) as SupportedUrlMap)
          : (items as SupportedUrlMap);
        if (mounted) setSupportedUrls(map);
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
    getResidencyStatusMasterData()
      .then((resp) => {
        if (!mounted) return;
        const opts = (resp.data?.residencyStatus ?? [])
          .map((o) => ({
            name: String(o?.name ?? "").trim(),
            value: o?.value as MortgageResidencyStatus,
          }))
          .filter((o) => o.name && o.value);
        setResidencyOptions(opts);
      })
      .catch(() => {
        if (mounted) setResidencyOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!propertyId) {
      setIsDrilldownLoading(false);
      setDrilldownEnvelope(null);
      return;
    }
    const abortController = new AbortController();
    setIsDrilldownLoading(true);
    getPropertyById(propertyId, abortController.signal)
      .then((resp) => {
        setDrilldownEnvelope(resp as PropertyDrilldownEnvelope);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        console.error("[property drilldown] request failed", err);
        setDrilldownEnvelope(null);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsDrilldownLoading(false);
        }
      });
    return () => {
      abortController.abort();
    };
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) {
      setPriceInsightsData(null);
      return;
    }
    const abortController = new AbortController();
    getPropertyPriceInsights(propertyId, abortController.signal)
      .then((resp) => {
        if (resp?.data) {
          setPriceInsightsData(resp.data);
        } else {
          setPriceInsightsData(null);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("[property price insights] request failed", err);
          setPriceInsightsData(null);
        }
      });
    return () => abortController.abort();
  }, [propertyId]);

  useEffect(() => {
    const next = Boolean((drilldownEnvelope as any)?.data?.property?.isSaved);
    setIsFavorite(next);
  }, [drilldownEnvelope]);

  const apiProperty = (drilldownEnvelope as any)?.data?.property ?? null;
  // Backend returns agent/agency nested inside property (data.property.agent/agency)
  const apiAgent =
    (apiProperty as any)?.agent ?? (drilldownEnvelope as any)?.data?.agent ?? null;
  const apiAgency =
    (apiProperty as any)?.agency ?? (drilldownEnvelope as any)?.data?.agency ?? null;
  const areaPropertiesCount = Number(
    (apiProperty as any)?.areaPropertiesCount ??
    (drilldownEnvelope as any)?.data?.areaPropertiesCount ??
    0
  );
  const apiRelated = ((drilldownEnvelope as any)?.data?.relatedProperties ?? []) as any[];
  const apiNearby = ((drilldownEnvelope as any)?.data?.nearbyPlaces ?? {}) as Record<
    string,
    Array<{ name?: string; vicinity?: string; distance?: string }>
  >;
  const apiAmenities = (apiProperty?.amenities ?? []) as any[];

  const propertyUrlBase = ((supportedUrls as any)?.propertyUrl?.img as string | undefined) ?? null;
  const propertyVideoUrlBase = ((supportedUrls as any)?.propertyUrl?.vid as string | undefined) ?? null;
  const agentUrlBase = ((supportedUrls as any)?.agentUrl?.img as string | undefined) ?? null;
  const developerUrlBase = ((supportedUrls as any)?.developerUrl?.img as string | undefined) ?? null;
  const agencyUrlBase = ((supportedUrls as any)?.agencyUrl?.img as string | undefined) ?? null;
  const amenityUrlBase = ((supportedUrls as any)?.amenityUrl?.img as string | undefined) ?? null;

  const apiImages = (apiProperty?.images ?? []) as Array<{ url?: string }>;
  const drilldownImages = apiImages
    .map((i) => resolveSupportedUrlPath(i?.url, propertyUrlBase))
    .filter((u) => u);
  const drilldownImagesCount =
    typeof apiProperty?.imagesCount === "number"
      ? apiProperty.imagesCount
      : drilldownImages.length;
  const virtualTour360Url = String((apiProperty as any)?.virtualTour360 ?? "").trim();
  const videoTourUrl = resolveSupportedUrlPath(
    (apiProperty as any)?.videoTour,
    propertyVideoUrlBase
  );
  const handleLocationMapClick = useCallback(() => {
    const listingTypeId = String((apiProperty as any)?.listingType?._id ?? "").trim();
    const propertyName = String((apiProperty as any)?.title ?? "").trim();
    const propertyIdStr = String((apiProperty as any)?._id ?? propertyId ?? "").trim();
    const coords = (apiProperty as any)?.location?.coordinates?.coordinates;
    const lng =
      Array.isArray(coords) && coords.length >= 2 ? Number(coords[0]) : NaN;
    const lat =
      Array.isArray(coords) && coords.length >= 2 ? Number(coords[1]) : NaN;
    const pos =
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    const payload =
      listingTypeId && pos
        ? {
            focus: {
              ...(propertyIdStr ? { id: propertyIdStr } : {}),
              lat: pos.lat,
              lng: pos.lng,
            },
            initialPropertySearch: {
              listingType: listingTypeId,
              nearLat: pos.lat,
              nearLng: pos.lng,
              nearRadiusKm: 0.05,
              ...(propertyName ? { keyword: propertyName } : {}),
              page: 1,
              limit: 20,
            },
          }
        : listingTypeId
          ? {
              initialPropertySearch: {
                listingType: listingTypeId,
                ...(propertyName ? { keyword: propertyName } : {}),
                page: 1,
                limit: 20,
              },
            }
          : pos
            ? {
                focus: {
                  ...(propertyIdStr ? { id: propertyIdStr } : {}),
                  lat: pos.lat,
                  lng: pos.lng,
                },
              }
            : undefined;

    navigate("/mapview", payload ? { state: payload } : undefined);
  }, [apiProperty, propertyId, navigate]);

  const propertyTitle = (apiProperty?.title ?? "").trim();
  const propertyTypeName = (apiProperty?.propertyType?.name ?? "").trim();
  const propertyDisplayTitle = (() => {
    if (!propertyTitle) return "";
    if (!propertyTypeName) return propertyTitle;
    const baseTitle = propertyTitle.split("|")[0]?.trim() || propertyTitle;
    return `${baseTitle} | ${propertyTypeName}`;
  })();
  const listingTypeId = String((apiProperty as any)?.listingType?._id ?? "").trim();
  const listingTransaction = resolveListingTransactionForProperty(
    apiProperty ?? {},
    "sale"
  );
  const breadcrumbLocationLabel = (() => {
    const city = String((apiProperty as any)?.location?.city ?? "").trim();
    const country = String((apiProperty as any)?.location?.country ?? "").trim();
    return city || country || "Worldwide";
  })();
  const breadcrumbSubTitle1 = `Property for ${listingTransaction} in ${breadcrumbLocationLabel}`;
  const breadcrumbSubTitle2 =
    propertyDisplayTitle || propertyTitle || "Property details";
  const propertyLocation =
    (apiProperty?.location?.fullAddress ??
      [
        apiProperty?.location?.building,
        apiProperty?.location?.zone,
        apiProperty?.location?.city,
      ]
        .filter(Boolean)
        .join(", ")) ?? "";
  const beds = apiProperty?.bedrooms ?? 0;
  const baths = apiProperty?.bathrooms ?? 0;
  const sqft = apiProperty?.area?.sqft ?? 0;
  const sqm = apiProperty?.area?.sqm ?? 0;
  const price = apiProperty?.price ?? 0;
  const currency = apiProperty?.currency ?? "AED";
  const isVerified = Boolean(apiProperty?.isVerified);
  const isSuperagentListing = Boolean(apiProperty?.isSuperagentListing);
  const developerLogoUrl =
    resolveSupportedUrlPath(apiProperty?.developer?.logo, developerUrlBase) ||
    developerLogo;
  const agentAvatarUrl = resolveSupportedUrlPath(apiAgent?.profilePicture, agentUrlBase);
  const agencyLogoUrl = resolveSupportedUrlPath(apiAgency?.profilePicture, agencyUrlBase);

  const apiDescription = String(apiProperty?.description ?? "").trim();
  const derivedFeatures = (() => {
    const list: string[] = [];
    if (propertyTypeName) list.push(`It's a ${propertyTypeName.toLowerCase()}`);
    list.push(`${beds} bedrooms`);
    list.push(`${baths} bathrooms`);
    if (sqft) list.push(`${sqft.toLocaleString("en-US")} sqft`);
    if (sqm) list.push(`${sqm.toLocaleString("en-US")} sqm`);
    if (apiProperty?.completionStatus)
      list.push(`Completion: ${String(apiProperty.completionStatus)}`);
    if (apiProperty?.furnishedStatus)
      list.push(`Furnishing: ${String(apiProperty.furnishedStatus)}`);
    if (apiProperty?.location?.zone) list.push(String(apiProperty.location.zone));
    if (apiProperty?.location?.city) list.push(String(apiProperty.location.city));
    if (isVerified) list.push("Verified");
    if (isSuperagentListing) list.push("Superagent listing");
    return list.filter(Boolean).slice(0, 12);
  })();

  const mortgageDefaults = ((drilldownEnvelope as any)?.data
    ?.mortgageCalculatorDefaults ??
    (drilldownEnvelope as any)?.data?.mortgageDefaults ??
    null) as
    | {
      purchasePrice?: number;
      residencyStatus?: MortgageResidencyStatus;
      downPayment?: number;
      downPaymentPct?: number;
      loanAmount?: number;
      loanAmountPct?: number;
      loanPeriod?: number;
      interestRate?: number;
    }
    | null;
  const effectiveMortgageBasePrice = Number(
    mortgageDefaults?.purchasePrice ?? price
  );
  const shouldShowMortgageSection =
    Number.isFinite(effectiveMortgageBasePrice) &&
    effectiveMortgageBasePrice >= MIN_MORTGAGE_PURCHASE_PRICE;

  useEffect(() => {
    if (!mortgageDefaults) return;
    const pp = Number(mortgageDefaults.purchasePrice);
    const dpPct = Number(mortgageDefaults.downPaymentPct);
    const laPct = Number(mortgageDefaults.loanAmountPct);
    const lp = Number(mortgageDefaults.loanPeriod);
    const ir = Number(mortgageDefaults.interestRate);
    const rs = mortgageDefaults.residencyStatus;

    if (Number.isFinite(pp) && pp > 0) setPurchasePrice(pp);
    if (Number.isFinite(dpPct) && dpPct > 0) setDownPayment(dpPct);
    if (Number.isFinite(laPct) && laPct > 0) setLoanAmount(laPct);
    if (Number.isFinite(lp) && lp > 0) setLoanPeriod(lp);
    if (Number.isFinite(ir) && ir > 0) {
      setInterestRate(ir);
      setInterestRateInput(String(ir));
    }
    if (rs) setSelectedResidencyStatus(rs);
    if (!Number.isFinite(pp) || pp < MIN_MORTGAGE_PURCHASE_PRICE) {
      setMortgageCalc(null);
      return;
    }

    const abortController = new AbortController();
    postMortgageCalculate(
      {
        purchasePrice: Number.isFinite(pp) ? pp : purchasePrice,
        residencyStatus: rs ?? "uae-resident",
        downPayment:
          typeof mortgageDefaults.downPayment === "number"
            ? mortgageDefaults.downPayment
            : undefined,
        loanPeriod: Number.isFinite(lp) ? lp : loanPeriod,
        interestRate: Number.isFinite(ir) ? ir : interestRate,
      },
      abortController.signal
    )
      .then((resp) => {
        console.log("[mortgage calculate] response", resp);
        setMortgageCalc(resp.data ?? null);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        console.error("[mortgage calculate] request failed", err);
      });
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(mortgageDefaults)]);

  useEffect(() => {
    // Recalculate whenever calculator inputs change.
    if (!shouldShowMortgageSection) return;
    if (!Number.isFinite(purchasePrice) || purchasePrice < MIN_MORTGAGE_PURCHASE_PRICE)
      return;
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return;
    if (!Number.isFinite(interestRate) || interestRate <= 0) return;
    if (!Number.isFinite(loanPeriod) || loanPeriod <= 0) return;

    const abortController = new AbortController();
    const downPaymentAed = Math.round((purchasePrice * downPayment) / 100);
    postMortgageCalculate(
      {
        purchasePrice,
        residencyStatus: selectedResidencyStatus,
        downPayment: downPaymentAed,
        loanPeriod,
        interestRate,
      },
      abortController.signal
    )
      .then((resp) => {
        console.log("[mortgage calculate] response", resp);
        const data = resp.data ?? null;
        setMortgageCalc(data);
        // Keep sliders consistent with backend enforcement (min downpayment etc.)
        if (data?.calculated?.downPaymentPct != null) {
          setDownPayment(data.calculated.downPaymentPct);
        }
        if (data?.calculated?.loanAmountPct != null) {
          setLoanAmount(data.calculated.loanAmountPct);
        }
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        console.error("[mortgage calculate] request failed", err);
      });
    return () => abortController.abort();
  }, [
    shouldShowMortgageSection,
    purchasePrice,
    downPayment,
    loanPeriod,
    interestRate,
    selectedResidencyStatus,
  ]);

  useEffect(() => {
    if (!isUpfrontCostOpen) return;
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return;
    if (!Number.isFinite(interestRate) || interestRate <= 0) return;
    if (!Number.isFinite(loanPeriod) || loanPeriod <= 0) return;

    const downPaymentAed = Math.round((purchasePrice * downPayment) / 100);
    const loanAmountAed = Math.round((purchasePrice * loanAmount) / 100);
    if (downPaymentAed <= 0 || loanAmountAed <= 0) return;

    const abortController = new AbortController();
    setUpfrontCostsLoading(true);
    postMortgageUpfrontCosts(
      {
        purchasePrice,
        downPayment: downPaymentAed,
        loanAmount: loanAmountAed,
        loanPeriod,
        interestRate,
        residencyStatus: selectedResidencyStatus,
      },
      abortController.signal
    )
      .then((resp) => {
        setUpfrontCostsData(resp.data ?? null);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        console.error("[mortgage upfront costs] request failed", err);
        setUpfrontCostsData(null);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setUpfrontCostsLoading(false);
      });

    return () => abortController.abort();
  }, [
    isUpfrontCostOpen,
    purchasePrice,
    downPayment,
    loanAmount,
    loanPeriod,
    interestRate,
    selectedResidencyStatus,
  ]);

  const monthlyPaymentText =
    mortgageCalc?.output?.monthlyPayment != null
      ? `${Number(mortgageCalc.output.monthlyPayment).toLocaleString("en-US")} AED/month`
      : "47,686 AED/month";

  const rentPricing = (apiProperty?.rentPricing ?? null) as
    | { yearly?: number; monthly?: number }
    | null;
  const hasRentPricing =
    !!rentPricing &&
    typeof rentPricing.yearly === "number" &&
    typeof rentPricing.monthly === "number" &&
    Number.isFinite(rentPricing.yearly) &&
    Number.isFinite(rentPricing.monthly) &&
    rentPricing.yearly > 0 &&
    rentPricing.monthly > 0;
  const priceText = hasRentPricing
    ? `${rentPricing.yearly!.toLocaleString("en-US")} ${currency}/year`
    : `${(price ? price.toLocaleString("en-US") : 0)} ${currency}`;
  const monthlyText = hasRentPricing
    ? `${rentPricing.monthly!.toLocaleString("en-US")} ${currency}/month`
    : monthlyPaymentText;

  // (Replaced by `selectedResidencyStatus` master-driven tabs)
  const [residencyTab] = useState("Citizen");

  // Amenities (API if available; otherwise fallback static list)
  const amenities =
    apiAmenities.length > 0
      ? apiAmenities.map((a) => ({
        name: String(a?.name ?? ""),
        icon:
          resolveSupportedUrlPath(a?.image, amenityUrlBase) ||
          resolveSupportedUrlPath(a?.icon, amenityUrlBase) ||
          gymIcon,
        alt: String(a?.name ?? "Amenity"),
      }))
      : [
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

  const features = [
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

  type PriceInsightRow = {
    title: string;
    subtitle: string;
    date: string;
    price: string;
    area: string;
  };

  const mapPriceInsightRows = (
    rows: PropertyPriceInsightsData["sold"]["transactions"] | undefined
  ): PriceInsightRow[] =>
    (rows ?? []).map((row) => ({
      title: row.title,
      subtitle: row.subtitle,
      date: row.date,
      price: row.priceFormatted,
      area: row.areaFormatted,
    }));

  const priceInsightsSold = mapPriceInsightRows(priceInsightsData?.sold?.transactions);
  const priceInsightsRented = mapPriceInsightRows(priceInsightsData?.rent?.transactions);
  const priceTrends = priceInsightsData?.trends;

  const handlePriceInsightsTabChange = (
    _event: SyntheticEvent,
    newValue: number
  ) => {
    setPriceInsightsTab(newValue);
  };

  const nearbyPlaces = (() => {
    const iconFor = (key: string) => {
      const k = key.toLowerCase();
      if (k.includes("school")) return schoolIcon;
      if (k.includes("hospital")) return hospitalIcon;
      if (k.includes("restaurant")) return restaurantIcon;
      if (k.includes("transport")) return restaurantIcon;
      if (k.includes("shopping")) return restaurantIcon;
      if (k.includes("hotel")) return restaurantIcon;
      return restaurantIcon;
    };
    const fromApi = Object.entries(apiNearby)
      .flatMap(([key, places]) =>
        (places ?? []).map((p) => ({
          type: key,
          name: p?.name ?? "",
          distance: p?.distance ?? "",
          icon: iconFor(key),
        }))
      )
      .filter((p) => p.name);
    return fromApi;
  })();

  const hasNearbyPlaces = nearbyPlaces.length > 0;

  const visibleLocationCards = 3;
  const maxLocationIndex =
    nearbyPlaces.length > visibleLocationCards
      ? nearbyPlaces.length - visibleLocationCards
      : 0;

  const canLocationScrollLeft = locationCardIndex > 0;
  const canLocationScrollRight = locationCardIndex < maxLocationIndex;

  const handleNextLocationCard = () => {
    if (!canLocationScrollRight) return;
    setLocationCardIndex((prev) =>
      prev >= maxLocationIndex ? maxLocationIndex : prev + 1
    );
  };

  const handlePrevLocationCard = () => {
    if (!canLocationScrollLeft) return;
    setLocationCardIndex((prev) => (prev <= 0 ? 0 : prev - 1));
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

  const handleFavoriteClick = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (isFavoriteLoading) return;

    if (!isLoggedIn) {
      setToast({
        open: true,
        message: "Please log in to add to your wishlist",
        severity: "info",
      });
      return;
    }

    const propertyMongoId = String((apiProperty as any)?._id ?? "");
    if (!propertyMongoId) {
      console.warn("[saved-properties] missing property _id");
      return;
    }

    const previous = isFavorite;
    const next = !previous;

    // Optimistic UI
    setIsFavorite(next);
    setIsFavoriteLoading(true);

    try {
      if (next) {
        const resp = await addSavedProperty(propertyMongoId);
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string"
              ? resp.message
              : "Failed to save property"
          );
        }
      } else {
        const resp = await removeSavedProperty(propertyMongoId);
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string"
              ? resp.message
              : "Failed to remove property"
          );
        }
      }
      syncAuthUserSavedProperty(propertyMongoId, next);
    } catch (err) {
      setIsFavorite(previous);
      console.error("[saved-properties] toggle failed", err);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleReport = () => {
    setIsReportModalOpen(true);
    handleActionsClose();
  };

  const propertyMongoId = String((apiProperty as any)?._id ?? "").trim();
  const handleShare = async () => {
    const propertyMongoId = String((apiProperty as any)?._id ?? "").trim();
    const apiShareLink = String((apiProperty as any)?.shareLink ?? "").trim();
    const shareUrl =
      apiShareLink ||
      (propertyMongoId
        ? `${window.location.origin}/propertydrilldown/${encodeURIComponent(propertyMongoId)}`
        : window.location.href);

    if (navigator.share) {
      void navigator
        .share({
          title: String((apiProperty as any)?.title ?? "").trim() || "Property",
          text: String((apiProperty as any)?.title ?? "").trim() || "Check this property",
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

  const agentName = String(apiAgent?.fullName ?? "").trim();
  const agentRatingValue = Number(apiAgent?.ratings?.average ?? 0);
  const ratingValueSafe = Number.isFinite(agentRatingValue) ? agentRatingValue : 0;
  const ratingFillPercent =
    Math.max(0, Math.min(1, ratingValueSafe / 5)) * 100;

  const callNumber =
    normalizePhoneForDial(apiAgent?.phoneNumber) ||
    normalizePhoneForDial(apiAgency?.phoneNumber);
  const whatsappNumber =
    normalizePhoneForWhatsapp(apiAgent?.phoneNumber) ||
    normalizePhoneForWhatsapp(apiAgency?.phoneNumber);

  const submitInquiry = async (params: {
    inquiryType: InquiryActionType;
    name?: string;
    email?: string;
    phoneNumber?: string;
    comments?: string;
  }): Promise<CreateInquiryResponseData> => {
    const propertyMongoId = String((apiProperty as any)?._id ?? "").trim();
    if (!propertyMongoId) {
      throw new Error("Property details are missing.");
    }

    const response = await createInquiry({
      propertyId: propertyMongoId,
      inquiryType: params.inquiryType,
      ...(params.name ? { name: params.name } : {}),
      ...(params.email ? { email: params.email } : {}),
      ...(params.phoneNumber ? { phoneNumber: params.phoneNumber } : {}),
      ...(params.comments ? { message: params.comments } : {}),
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

  const openWhatsappUrl = (data?: CreateInquiryResponseData) => {
    const apiUrl = String(data?.whatsappUrl ?? "").trim();
    if (apiUrl) {
      window.open(apiUrl, "_blank", "noreferrer");
      return;
    }
    const digits = normalizePhoneForWhatsapp(
      data?.agent?.whatsappNumber || data?.agent?.phoneNumber || whatsappNumber
    );
    if (!digits) return;
    window.open(`https://wa.me/${digits}`, "_blank", "noreferrer");
  };

  const handleMailOpen = () => {
    setPendingInquiryAction("email");
    setIsMailModalOpen(true);
  };

  const handleCallClick = () => {
    if (!isLoggedIn) {
      const cached = readGuestInquiryDraft();
      if (cached) {
        setIsContactModalOpen(true);
        setIsInquirySubmitting(true);
        void submitInquiry({
          inquiryType: "call",
          name: cached.name,
          email: cached.email,
          phoneNumber: cached.phoneNumber,
        })
          .catch((err) => {
            console.error("[inquiry] guest call failed", err);
          })
          .finally(() => {
            setIsInquirySubmitting(false);
          });
        return;
      }
      setPendingInquiryAction("call");
      setIsMailModalOpen(true);
      return;
    }

    setIsContactModalOpen(true);
    setIsInquirySubmitting(true);
    void submitInquiry({ inquiryType: "call" })
      .catch((err) => {
        console.error("[inquiry] call failed", err);
      })
      .finally(() => {
        setIsInquirySubmitting(false);
      });
  };

  const handleWhatsappClick = async () => {
    if (!whatsappNumber || isInquirySubmitting) return;
    if (!isLoggedIn) {
      const cached = readGuestInquiryDraft();
      if (cached) {
        try {
          setIsInquirySubmitting(true);
          const data = await submitInquiry({
            inquiryType: "whatsapp",
            name: cached.name,
            email: cached.email,
            phoneNumber: cached.phoneNumber,
          });
          openWhatsappUrl(data);
        } catch (err) {
          console.error("[inquiry] guest whatsapp failed", err);
        } finally {
          setIsInquirySubmitting(false);
        }
        return;
      }
      setPendingInquiryAction("whatsapp");
      setIsMailModalOpen(true);
      return;
    }

    try {
      setIsInquirySubmitting(true);
      const data = await submitInquiry({ inquiryType: "whatsapp" });
      openWhatsappUrl(data);
    } catch (err) {
      console.error("[inquiry] whatsapp failed", err);
    } finally {
      setIsInquirySubmitting(false);
    }
  };

  const handleMailSubmit = async (payload: {
    name: string;
    email: string;
    phoneNumber: string;
    comments: string;
  }) => {
    if (isInquirySubmitting) return;
    setIsInquirySubmitting(true);

    if (!isLoggedIn) {
      saveGuestInquiryDraft({
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
      });
    }

    if (pendingInquiryAction === "call") {
      setIsContactModalOpen(true);
      void submitInquiry({
        inquiryType: "call",
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
      })
        .catch((err) => {
          console.error("[inquiry] guest call failed", err);
        })
        .finally(() => {
          setIsInquirySubmitting(false);
        });
      return;
    }

    try {
      if (pendingInquiryAction === "email") {
        await submitInquiry({
          inquiryType: "email",
          name: payload.name,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          comments: payload.comments,
        });
      } else {
        const data = await submitInquiry({
          inquiryType: "whatsapp",
          name: payload.name,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          comments: payload.comments,
        });
        openWhatsappUrl(data);
      }
    } finally {
      setIsInquirySubmitting(false);
    }
  };

  const agentLanguages = Array.isArray(apiAgent?.languages)
    ? apiAgent.languages
      .map((l: any) => String(l?.name ?? l?.nativeName ?? l?.code ?? "").trim())
      .filter(Boolean)
      .join(", ")
    : String(apiAgent?.languages ?? "").trim();

  const providedAgent = {
    name: agentName || " ",
    rating: ratingValueSafe || 0,
    responseTime: String(apiAgent?.responseTime ?? "").trim() || " ",
    closedDeals: Number(apiAgent?.closedDeals ?? 0),
    languages: agentLanguages || " ",
    agentProperties: Number(
      (apiProperty as any)?.agentListingsCount ??
      (drilldownEnvelope as any)?.data?.agentListingsCount ??
      apiAgent?.statistics?.activeListings ??
      apiAgent?.statistics?.totalListings ??
      0
    ),
  };

  const providedAgency = {
    name: String(apiAgency?.agencyName ?? "").trim() || " ",
    agencyProperties: Number(apiAgency?.statistics?.totalActiveListings ?? 0),
    logo: agencyLogoUrl || developerLogoUrl || developerLogo,
  };

  const agentId = String(apiAgent?._id ?? apiAgent?.id ?? "").trim();
  const agencyId = String(apiAgency?._id ?? apiAgency?.id ?? "").trim();

  const handleSeeAgentPropertiesClick = () => {
    if (!agentId) return;
    navigate(`/agentdetails/${encodeURIComponent(agentId)}`, {
      state: { agentId },
    });
  };

  const handleSeeAgencyPropertiesClick = () => {
    if (!agencyId) return;
    navigate(`/companydetails/${encodeURIComponent(agencyId)}`, {
      state: { companyId: agencyId },
    });
  };

  const recommendedList: RecommendedProperty[] = (Array.isArray(apiRelated) ? apiRelated : [])
    .map((p: any) => {
      const pImages = (p?.images ?? []) as Array<{ url?: string; isPrimary?: boolean }>;
      const primary =
        pImages.find((i) => i?.isPrimary)?.url ??
        pImages[0]?.url ??
        "";
      const image = resolveSupportedUrlPath(primary, propertyUrlBase);

      const typeName = String(p?.propertyType?.name ?? "").trim();
      const titleRaw = String(p?.title ?? "").trim();
      const titleBase = titleRaw ? titleRaw.split("|")[0]?.trim() || titleRaw : "";
      const title = typeName && titleBase ? `${titleBase} | ${typeName}` : titleBase || " ";

      const location =
        String(p?.location?.fullAddress ?? "").trim() ||
        [p?.location?.zone, p?.location?.city].filter(Boolean).join(", ") ||
        " ";

      const beds = `${Number(p?.bedrooms ?? 0)} Bed`;
      const baths = `${Number(p?.bathrooms ?? 0)} Bath`;
      const sqft = Number(p?.area?.sqft ?? 0);
      const area = sqft ? `${sqft.toLocaleString("en-US")} sqft` : "0 sqft";

      const priceNumber = Number(p?.price ?? 0);
      const currencySafe = String(p?.currency ?? "AED").trim() || "AED";
      const price = `${priceNumber.toLocaleString("en-US")} ${currencySafe}`;

      const relatedId = String(p?._id ?? "").trim();

      return {
        id: relatedId,
        image,
        title,
        location,
        beds,
        baths,
        area,
        price,
        ribbons: {
          verified: Boolean(p?.isVerified),
          superAgent: Boolean(p?.isSuperagentListing),
          label: typeName ? typeName.toUpperCase() : undefined,
        },
      } satisfies RecommendedProperty;
    })
    .filter(
      (p: RecommendedProperty) =>
        Boolean(p.id) && Boolean(p.image || p.title.trim())
    );

  const handleRecommendedPropertyClick = useCallback(
    (relatedPropertyId: string) => {
      const id = relatedPropertyId.trim();
      if (!id) return;
      navigate(`/propertydrilldown/${encodeURIComponent(id)}`, {
        state: { propertyId: id },
      });
    },
    [navigate]
  );

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
  }, [updateRecommendedScrollState]);

  const headerTabs = [
    { label: "Description", id: "description" },
    { label: "Amenities", id: "amenities" },
    { label: "Location", id: "location" },
    { label: "Provided by", id: "provided" },
    { label: "Price Insights", id: "price-insights" },
    ...(shouldShowMortgageSection
      ? [{ label: "Mortgage calculator", id: "mortgage" }]
      : []),
  ];
  const [activeHeaderTab, setActiveHeaderTab] = useState("description");
  const [stopCtaScroll, setStopCtaScroll] = useState(false);
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
  const totalLoanCost = Math.max(principalAmount + totalInterestPaid, 1);
  // const principalShare = principalAmount / totalLoanCost;
  // const interestShare = totalInterestPaid / totalLoanCost;
  const boost = 1.4; // increase interest size

  const principalShare =
    principalAmount /
    (principalAmount + totalInterestPaid * boost);

  const interestShare =
    (totalInterestPaid * boost) /
    (principalAmount + totalInterestPaid * boost);
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const principalStroke = principalShare * donutCircumference;
  const interestStroke = interestShare * donutCircumference;
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
        if (rect.bottom < window.innerHeight - 450) {
          setStopCtaScroll(true);
        } else {
          setStopCtaScroll(false);
        }
      }
    };

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // useEffect(() => {
  //   const onScroll = () => {
  //     const scrollY = window.scrollY;
  //     setShowSectionTabs(scrollY > 240);
  //     setIsCtaScrolled(scrollY > 320);
  //   };
  //   window.addEventListener("scroll", onScroll, { passive: true });
  //   onScroll();
  //   return () => window.removeEventListener("scroll", onScroll);
  // }, []);

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
  if (propertyId && isDrilldownLoading) {
    return <DrilldownLayoutSkeleton />;
  }
  return (
    <div className="pf-property-drilldown">
      <PFContainer>
        {/* Breadcrumbs Section */}
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1={breadcrumbSubTitle1}
          breadcrumbSubTitle2={breadcrumbSubTitle2}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/searchlisting"
          breadcrumbLinkSubTitle1State={
            listingTypeId ? { propertyFor: [listingTypeId] } : undefined
          }
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
                  images={drilldownImages}
                  imagesCount={drilldownImagesCount}
                  virtualTour360Url={virtualTour360Url}
                  videoTourUrl={videoTourUrl}
                  onLocationClick={handleLocationMapClick}
                />
                <Box className="pf-property-drilldown__right-content-mobile">
                  {/* Main Property Card (up to agent) */}
                  <Box className="pf-property-drilldown__card">
                    <Box className="pf-property_box">
                      {/* Header: Verified + actions */}
                      <Box className="pf-property-drilldown__card-header">
                        <Box className="pf-property-drilldown__verified-pill">
                          <VerifiedBadgeIcon width={12} height={12} />
                          <Typography className="pf-property-drilldown__verified-text">
                            {isVerified ? "VERIFIED" : "UNVERIFIED"}
                          </Typography>
                        </Box>
                        <Box className="pf-property-drilldown__card-actions">
                          <IconButton
                            className="pf-property-drilldown__icon-btn"
                            aria-label="Favorite"
                            aria-pressed={isFavorite}
                            onClick={handleFavoriteClick}
                            disabled={isFavoriteLoading}
                            sx={{
                              backgroundColor: isFavorite ? "#FF46A2" : "#ffffff",
                              "&:hover": {
                                backgroundColor: isFavorite ? "#FF46A2" : "#ffffff",
                              },
                            }}
                          >
                            {isFavorite ? (
                              <HeartIcon02Filled
                                width={18}
                                height={15}
                                fill="#ffffff"
                              />
                            ) : (
                              <HeartIcon02 width={18} height={15} fill="#222222" />
                            )}
                          </IconButton>
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
                        {propertyDisplayTitle || " "}
                      </Typography>

                      {/* Location */}
                      <Box className="pf-property-drilldown__location">
                        <LocationIcon width={14} height={14} />
                        <Typography className="pf-property-drilldown__location-text">
                          {propertyLocation || " "}
                        </Typography>
                      </Box>

                      {/* Specs row */}
                      <Box className="pf-property-drilldown__specs">
                        <Box className="pf-property-drilldown__spec-item">
                          <Box className="pf-property-drilldown__spec-icon">
                            <BedRoomIcon width={22} height={22} />
                          </Box>
                          <Box className="pf-property-drilldown__spec-text">
                            <Typography className="pf-property-drilldown__spec-label">
                              {beds}
                            </Typography>
                            <Typography className="pf-property-drilldown__spec-caption">
                              Beds
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          className="pf-property-drilldown__spec-divider"
                          aria-hidden
                        />
                        <Box className="pf-property-drilldown__spec-item">
                          <Box className="pf-property-drilldown__spec-icon">
                            <BathRoomIcon width={22} height={22} />
                          </Box>
                          <Box className="pf-property-drilldown__spec-text">
                            <Typography className="pf-property-drilldown__spec-label">
                              {baths}
                            </Typography>
                            <Typography className="pf-property-drilldown__spec-caption">
                              Baths
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          className="pf-property-drilldown__spec-divider"
                          aria-hidden
                        />
                        <Box className="pf-property-drilldown__spec-item">
                          <Box className="pf-property-drilldown__spec-icon">
                            <SqftIcon width={22} height={22} />
                          </Box>
                          <Box className="pf-property-drilldown__spec-text">
                            <Typography className="pf-property-drilldown__spec-label">
                              {sqft ? sqft.toLocaleString("en-US") : 0}
                            </Typography>
                            <Typography className="pf-property-drilldown__spec-caption">
                              sqft
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Amenities bar */}
                      <Button
                        className="pf-property-drilldown__amenities-bar"
                        onClick={() => {
                          setActiveHeaderTab("amenities");
                          handleTabClick("amenities");
                        }}
                      >
                        {apiAmenities.length > 0
                          ? `${apiAmenities.length}+ Amenities`
                          : "0 Amenities"}
                      </Button>

                      {/* Price + monthly + upfront costs */}
                      <Box className="pf-property-drilldown__price-row">
                        <Box>
                          <Typography className="pf-property-drilldown__price">
                            {priceText}
                          </Typography>
                          {hasRentPricing && (
                            <Typography className="pf-property-drilldown__monthly">
                              Own this from just{" "}
                              <span className="pf-property-drilldown__monthly-value">
                                {monthlyText}
                              </span>
                            </Typography>
                          )}
                        </Box>
                        <Button
                          className="pf-property-drilldown__upfront-btn"
                          onClick={() => setIsUpfrontCostOpen(true)}
                        >
                          Upfront costs
                        </Button>
                      </Box>
                    </Box>
                    {/* Agent row */}
                  </Box>

                  {/* CTA buttons (separate section, still within 400px column) */}
                  <Box
                    className={`${isCtaScrolled && !stopCtaScroll
                      ? " pf-property-drilldown__cta-row--scrolled"
                      : ""
                      }`}
                  >
                    <Box className="pf-property-drilldown__agent-row">
                      <Box className="pf-property-drilldown__agent-info">
                        <Avatar
                          src={agentAvatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"}
                          alt={agentName || "Agent"}
                          className="pf-property-drilldown__agent-avatar"
                        />
                        <Box className="pf-property-drilldown__agent-text">
                          <Typography className="pf-property-drilldown__agent-name">
                            {agentName || " "}
                          </Typography>
                          <Box className="pf-property-drilldown__rating-row">
                            <Box className="pf-property-drilldown__rating-stars">
                              <StarIcon
                                width="86"
                                height="14"
                                starColor="#E5E7EB"
                              />
                              <Box
                                className="pf-property-drilldown__rating-stars-fill"
                                style={{ width: `${ratingFillPercent}%` }}
                              >
                                <StarIcon
                                  width="86"
                                  height="14"
                                  starColor="#FFCB2B"
                                />
                              </Box>
                            </Box>
                            <Typography className="pf-property-drilldown__rating-value">
                              {ratingValueSafe.toFixed(1)}/5
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box className="pf-property-drilldown__developer-pill">
                        <img src={agencyLogoUrl || developerLogoUrl} alt="Agency logo" />
                      </Box>
                    </Box>
                    <Box
                      className={`pf-property-drilldown__cta-row`}
                    >
                      <Button
                        className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--call"
                        startIcon={
                          <TelephoneIcon width={20} height={20} fill="#ffffff" />
                        }
                        onClick={handleCallClick}
                      >
                        Call us
                      </Button>
                      <Button
                        className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--whatsapp"
                        startIcon={
                          <span className="pf-property-drilldown__cta-whatsapp-icon">
                            <WhatsappIcon width={20} height={20} />
                          </span>
                        }
                        onClick={handleWhatsappClick}
                      >
                        Whatsapp
                      </Button>
                    </Box>
                  </Box>
                </Box>
                {/* Project Details Section */}
                <Box
                  className="pf-property-drilldown__project-details"
                  id="description"
                >
                  <Typography className="pf-property-drilldown__project-title">
                    Project details
                  </Typography>

                  {/* First Paragraph */}
                  {apiDescription ? (
                    <Typography className="pf-property-drilldown__project-paragraph"
                      dangerouslySetInnerHTML={{ __html: apiDescription }}
                    />
                  ) : (
                    <Typography className="pf-property-drilldown__project-paragraph">
                      Project description will appear here when available from the
                      developer.
                    </Typography>
                  )
                  }
                  {/* Features List */}
                  <ul className="pf-property-drilldown__features-list">
                    {(derivedFeatures.length ? derivedFeatures : features).map(
                      (feature, index) => (
                        <li
                          key={index}
                          className="pf-property-drilldown__feature-item"
                        >
                          <Typography className="pf-property-drilldown__feature-text">
                            {feature}
                          </Typography>
                        </li>
                      )
                    )}
                  </ul>

                  {/* Second Paragraph */}
                  {/* <Typography className="pf-property-drilldown__project-paragraph">
                    Vivamus ac cursus diam. Proin cursus neque eu laoreet
                    iaculis. Maecenas lobortis venenatis orci. Maecenas lorem
                    risus, efficitur imperdiet consectetur sit amet, luctus non
                    tellus. Curabitur tincidunt est sit amet pulvinar porta.
                    Aenean ut laoreet tellus. Sed sodales sagittis enim, non
                    faucibus augue viverra sed.
                  </Typography> */}

                  {/* Third Paragraph */}
                  {/* <Typography className="pf-property-drilldown__project-paragraph">
                    Vestibulum scelerisque, nisl gravida condimentum mattis,
                    lectus augue rhoncus ipsum, quis ornare nulla nulla et nibh.
                    Ut malesuada nisi nec lorem blandit tristique. Sed laoreet
                    nibh ut aliquet tincidunt.
                  </Typography> */}
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
                {/* Location Section */}
                <Box
                  className="pf-property-drilldown__location-section"
                  id="location"
                >
                  <Box className="pf-property-drilldown__location-header">
                    <Box className="pf-property-drilldown__location-header-left">
                      <Box className="pf-property-drilldown__location-pin">
                        <LocationHomeIcon width={33} height={44} />
                      </Box>
                      <Box>
                        <Typography className="pf-property-drilldown__location-label">
                          Property Location
                        </Typography>
                        <Typography className="pf-property-drilldown__location-main">
                          {propertyLocation || " "}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {/* Around this property cards */}
                  <Box className="pf-property-drilldown__location-body-wrapper">
                    <Box className="pf-property-drilldown__location-body">
                      <Box className="pf-property-drilldown__location-body-top">
                        <Typography className="pf-property-drilldown__location-around-label">
                          Around this property
                        </Typography>
                        {hasNearbyPlaces && (
                          <Box className="pf-property-drilldown__recommended-arrows">
                            <IconButton
                              className="pf-property-drilldown__recommended-arrow"
                              disableRipple
                              disableFocusRipple
                              disableTouchRipple
                              aria-label="Previous nearby place"
                              onClick={handlePrevLocationCard}
                              disabled={!canLocationScrollLeft}
                            >
                              <LeftArrowIcon width="24" height="24" fill="#222222" />
                            </IconButton>
                            <IconButton
                              className="pf-property-drilldown__recommended-arrow"
                              disableRipple
                              disableFocusRipple
                              disableTouchRipple
                              aria-label="Next nearby place"
                              onClick={handleNextLocationCard}
                              disabled={!canLocationScrollRight}
                            >
                              <RightArrowIcon width="24" height="24" fill="#222222" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>

                      <Box className="pf-property-drilldown__location-cards-wrapper">
                        {hasNearbyPlaces ? (
                          <Box className="pf-property-drilldown__location-cards-track">
                            {nearbyPlaces
                              .slice(
                                locationCardIndex,
                                locationCardIndex + visibleLocationCards
                              )
                              .map((place) => (
                                <Box
                                  key={`${place.type}-${place.name}`}
                                  className="pf-property-drilldown__location-card"
                                >
                                  <Box className="pf-property-drilldown__location-card-top">
                                    <Box className="pf-property-drilldown__location-card-icon-wrapper">
                                      <img
                                        src={place.icon}
                                        alt={place.type}
                                        className="pf-property-drilldown__location-card-icon"
                                      />
                                    </Box>
                                    <Typography className="pf-property-drilldown__location-card-type">
                                      {place.type}
                                    </Typography>
                                  </Box>
                                  <Box className="pf-property-drilldown__location-card-bottom">
                                    <Typography className="pf-property-drilldown__location-card-name">
                                      {place.name}
                                    </Typography>
                                    <Typography className="pf-property-drilldown__location-card-distance">
                                      {place.distance}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                          </Box>
                        ) : (
                          <Typography className="pf-property-drilldown__location-empty">
                            No nearby facilities found.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>


                  <Box className="pf-property-drilldown__location-footer">
                    <Button
                      className="pf-property-drilldown__view-map-btn"
                      onClick={handleLocationMapClick}
                    >
                      <ViewOnMapIcon width={16} height={16} />
                      <Typography className="pf-property-drilldown__view-map-text">
                        View on map
                      </Typography>
                    </Button>
                    <Typography className="pf-property-drilldown__location-more-text">
                      See{" "}
                      <span className="pf-property-drilldown__location-more-count">
                        {Number.isFinite(areaPropertiesCount) && areaPropertiesCount > 0
                          ? `${areaPropertiesCount} more properties`
                          : "more properties"}
                      </span>{" "}
                      are available in this area
                    </Typography>
                  </Box>
                </Box>

                {/* Provided By Section */}
                <Box
                  className="pf-property-drilldown__provided-by"
                  id="provided"
                >
                  <Box className="pf-property-drilldown__provided-by-content">
                    <Box className="pf-property-drilldown__provided-by-left-column">
                      <Typography className="pf-property-drilldown__provided-by-title">
                        Provided by
                      </Typography>
                      <Box className="pf-property-drilldown__provided-by-agent-panel">
                        <Box className="pf-property-drilldown__provided-by-agent">
                          <Avatar
                            src={
                              agentAvatarUrl ||
                              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                            }
                            alt={providedAgent.name}
                            className="pf-property-drilldown__provided-by-avatar"
                          />
                          <Box className="pf-property-drilldown__provided-by-agent-details">
                            <Box className="pf-property-drilldown__provided-by-agent-heading">
                              {isSuperagentListing && (
                                <Box className="pf-property-listing-card__badge pf-property-listing-card__badge--superagent">
                                  <SuperAgentStarIcon width={12} height={12} />
                                  <Typography variant="caption">SUPERAGENT</Typography>
                                </Box>
                              )}
                              <Typography className="pf-property-drilldown__provided-by-agent-name">
                                {providedAgent.name}
                              </Typography>
                            </Box>
                            <Box className="pf-property-drilldown__provided-by-rating-row">
                              <Box className="pf-property-drilldown__rating-stars">
                                <StarIcon
                                  width="86"
                                  height="14"
                                  starColor="#E5E7EB"
                                />
                                <Box
                                  className="pf-property-drilldown__rating-stars-fill"
                                  style={{
                                    width: `${providedRatingFillPercent}%`,
                                  }}
                                >
                                  <StarIcon
                                    width="86"
                                    height="14"
                                    starColor="#FFCB2B"
                                  />
                                </Box>
                              </Box>
                              <Typography className="pf-property-drilldown__rating-value">
                                {providedAgent.rating.toFixed(1)}/5
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {/* <Box className="pf-property-drilldown__provided-by-divider" /> */}
                        <Box className="pf-property-drilldown__provided-by-stats">
                          {providedStats.map((stat) => (
                            <Box
                              key={stat.label}
                              className="pf-property-drilldown__provided-by-stat"
                            >
                              <Typography className="pf-property-drilldown__provided-by-stat-label">
                                {stat.label}
                              </Typography>
                              <Typography className="pf-property-drilldown__provided-by-stat-value">
                                {stat.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        <Button
                          className="pf-property-drilldown__provided-by-agent-btn"
                          onClick={handleSeeAgentPropertiesClick}
                          disabled={!agentId}
                        >
                          See agent properties ({providedAgent.agentProperties})
                        </Button>
                      </Box>
                    </Box>

                    <Box className="pf-property-drilldown__provided-by-agency-panel">
                      <Box
                        className="pf-property-drilldown__provided-by-agency-top"
                        style={{
                          backgroundImage: `url(${drilldownBg})`,
                        }}
                      >
                        <Box className="pf-property-drilldown__provided-by-agency-pill">
                          <img
                            src={agencyLogoUrl}
                            alt="Agency logo"
                            className="pf-property-drilldown__provided-by-agency-pill-logo"
                          />
                        </Box>
                      </Box>
                      <Box className="pf-property-drilldown__provided-by-agency-body">
                        <Typography className="pf-property-drilldown__provided-by-agency-name">
                          {providedAgency.name}
                        </Typography>
                        <Box className="pf-property-drilldown__provided-by-agency-buttons">
                          <Button
                            className="pf-property-drilldown__provided-by-agency-action"
                            startIcon={
                              <TelephoneIcon
                                width={18}
                                height={18}
                                fill="#222222"
                              />
                            }
                            onClick={handleCallClick}
                          >
                            Call us
                          </Button>
                          <Button
                            className="pf-property-drilldown__provided-by-agency-action"
                            startIcon={
                              <MailIcon width={18} height={18} fill="#222222" />
                            }
                            onClick={handleMailOpen}
                          >
                            Mail us
                          </Button>
                        </Box>
                        <Button
                          className="pf-property-drilldown__provided-by-agency-cta"
                          onClick={handleSeeAgencyPropertiesClick}
                          disabled={!agencyId}
                        >
                          See agency properties (
                          {providedAgency.agencyProperties})
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Price Insights Section */}
                <Box
                  className="pf-property-drilldown__price-insights"
                  id="price-insights"
                >
                  <Box className="pf-property-drilldown__price-insights-header">
                    <Typography className="pf-property-drilldown__price-insights-title">
                      Price insights
                    </Typography>
                    <Typography className="pf-property-drilldown__price-insights-subtitle">
                      Transactions for Similar Properties
                    </Typography>
                  </Box>
                  <Tabs
                    value={priceInsightsTab}
                    onChange={handlePriceInsightsTabChange}
                    className="pf-property-drilldown__price-tabs"
                    TabIndicatorProps={{
                      className: "pf-property-drilldown__price-tabs-indicator",
                    }}
                    variant="fullWidth"
                  >
                    <Tab
                      className="pf-property-drilldown__price-tab"
                      label="Sold for"
                    />
                    <Tab
                      className="pf-property-drilldown__price-tab"
                      label="Rented for"
                    />
                    <Tab
                      className="pf-property-drilldown__price-tab"
                      label="Price trends"
                    />
                  </Tabs>

                  <Box className="pf-property-drilldown__price-insights-content">
                    {priceInsightsTab !== 2 && (
                      <>
                        <Box className="pf-property-drilldown__price-table-wrapper">
                          <table className="pf-property-drilldown__price-table">
                            <thead>
                              <tr>
                                <th>Location</th>
                                <th>Date</th>
                                <th>AED</th>
                                <th>Area (SQFT)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(priceInsightsTab === 0
                                ? priceInsightsSold
                                : priceInsightsRented
                              ).length === 0 ? (
                                <tr>
                                  <td colSpan={4}>
                                    <Typography className="pf-property-drilldown__location-empty">
                                      No similar transactions found in this area.
                                    </Typography>
                                  </td>
                                </tr>
                              ) : (
                              (priceInsightsTab === 0
                                ? priceInsightsSold
                                : priceInsightsRented
                              ).map((row, index) => (
                                <tr key={`${row.title}-${index}`}>
                                  <td>
                                    <Box className="pf-property-drilldown__price-location-cell">
                                      <Typography className="pf-property-drilldown__price-location-title">
                                        {row.title}
                                      </Typography>
                                      <Box className="pf-property-drilldown__price-location-meta">
                                        <LocationIcon width={10} height={15} />
                                        <Typography className="pf-property-drilldown__price-location-subtitle">
                                          {row.subtitle}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </td>
                                  <td>
                                    <Typography className="pf-property-drilldown__price-date">
                                      {row.date}
                                    </Typography>
                                  </td>
                                  <td>
                                    <Typography className="pf-property-drilldown__price-value">
                                      {row.price}
                                    </Typography>
                                  </td>
                                  <td>
                                    <Typography className="pf-property-drilldown__price-area">
                                      {row.area}
                                    </Typography>
                                  </td>
                                </tr>
                              ))
                              )}
                            </tbody>
                          </table>
                        </Box>
                        <Box className="pf-property-drilldown__price-table-cta-wrapper">
                          <Button className="pf-property-drilldown__price-table-cta" onClick={() => navigate('/transaction')}>
                            See all transaction in this Location
                          </Button>
                        </Box>
                      </>
                    )}

                    {priceInsightsTab === 2 && (
                      <Box className="pf-property-drilldown__price-trends-content">
                        <Box className="pf-property-drilldown__price-trends-header">
                          <Box>
                            <Typography className="pf-property-drilldown__price-trends-title">
                              {priceTrends?.summaryTitle ||
                                "Price trends in this area"}
                            </Typography>
                            <Typography className="pf-property-drilldown__price-trends-average">
                              {priceTrends?.dealType === "rent"
                                ? "Average Rent Price is"
                                : "Average Sale Price is"}
                            </Typography>
                            <Typography className="pf-property-drilldown__price-trends-value">
                              {priceTrends?.averagePriceFormatted || "—"}
                            </Typography>
                            {priceTrends?.priceCompareNote ? (
                              <Typography className="pf-property-drilldown__price-trends-note">
                                {priceTrends.priceCompareNote}
                              </Typography>
                            ) : null}

                            <Box className="sqft_label">
                              <Typography className=" pf-property-drilldown__price-trends-value">
                                AED/Sqft
                              </Typography>
                            </Box>
                          </Box>
                          <Select
                            value={
                              priceTrends?.periodOptions?.includes(priceTrendFilter)
                                ? priceTrendFilter
                                : priceTrends?.period ?? priceTrendFilter
                            }
                            onChange={(event) =>
                              setPriceTrendFilter(event.target.value as string)
                            }
                            className="pf-property-drilldown__price-trends-select pf-footer__languageSelect"
                            variant="outlined"
                            IconComponent={() => (
                              <svg
                                width="30"
                                height="20"
                                className="pf-footer__languageSelectIcon pf-property-drilldown__price-trends-select-icon"
                                viewBox="0 0 14 10"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M5.77889 5.78035C5.64974 5.90949 5.47792 5.98706 5.29564 5.99852C5.11337 6.00998 4.93318 5.95454 4.78887 5.8426L4.71837 5.78035L0.218293 1.28027L0.156042 1.20977L0.115541 1.15202L0.0750404 1.08002L0.0622898 1.05302L0.0420404 1.00277L0.0180393 0.921767L0.0105405 0.882016L0.00303986 0.837016L3.95992e-05 0.794265L-0.00146053 0.750014L3.95915e-05 0.705763L0.00378944 0.662263L0.0105405 0.617262L0.0180392 0.578261L0.0420403 0.49726L0.0622897 0.447009L0.114791 0.348007L0.163541 0.280506L0.218293 0.219755L0.288794 0.157504L0.346546 0.117003L0.418546 0.0765027L0.445548 0.0637521L0.495798 0.0435013L0.576799 0.0195011L0.61655 0.0120009L0.661551 0.00450077L0.704301 0.00150099L0.748553 8.52499e-07L9.74871 6.56799e-08C10.3877 9.8158e-09 10.7215 0.739513 10.336 1.21727L10.279 1.28027L5.77889 5.78035Z"
                                  fill="#222222"
                                />
                              </svg>
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
                            {(priceTrends?.periodOptions?.length
                              ? priceTrends.periodOptions
                              : ["Last 1 year"]
                            ).map((option) => (
                              <MenuItem
                                value={option}
                                key={option}
                                className="pf-dropdown__item"
                              >
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </Box>
                        <Box className="pf-property-drilldown__price-trends-chart">
                          <SplineChart
                            categories={priceTrends?.chart?.categories}
                            series={priceTrends?.chart?.series}
                            yAxisMax={priceTrends?.chart?.yAxisMax}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
                {/* Mortgage Section */}
                {shouldShowMortgageSection && (
                  <Box className="pf-property-drilldown__mortgage" id="mortgage">
                    <Box className="pf-property-drilldown__mortgage-body">
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 12, lg: 6, xl: 6 }}>
                          <Box className="pf-property-drilldown__mortgage-panel pf-property-drilldown__mortgage-panel--left">
                            <Typography className="pf-property-drilldown__mortgage-title">
                              Get the right mortgage
                            </Typography>

                            <Typography className="pf-property-drilldown__mortgage-field-label">
                              Purchase price
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                              <Box className="pf-property-drilldown__mortgage-slider-row">
                                {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                {formatNumber(purchasePrice)}
                              </Typography> */}
                                {/* Editable input */}
                                <TextField
                                  value={purchasePrice}
                                  onChange={(e) =>
                                    setPurchasePrice(Number(e.target.value))
                                  }
                                  size="small"
                                  className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                  value={purchasePrice}
                                  onChange={(_e, value) =>
                                    setPurchasePrice(value as number)
                                  }
                                  min={300000}
                                  max={200000000}
                                  className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – {formatAED(300000)}</Typography>
                                <Typography>
                                  Max – {formatAED(200000000)}
                                </Typography>
                              </Box>
                            </Box>

                            <Box className="pf-property-drilldown__mortgage-residency-section">
                              <Typography className="pf-property-drilldown__mortgage-field-label">
                                Residency status
                              </Typography>
                              <Box className="pf-property-drilldown__mortgage-residency">
                                {(residencyOptions.length
                                  ? residencyOptions
                                  : [
                                    { name: "Citizen", value: "uae-national" as const },
                                    { name: "Resident", value: "uae-resident" as const },
                                    { name: "International Buyer", value: "non-resident" as const },
                                  ]
                                ).map((opt) => (
                                  <Button
                                    key={opt.value}
                                    className={`pf-property-drilldown__mortgage-residency-btn ${selectedResidencyStatus === opt.value
                                      ? "pf-property-drilldown__mortgage-residency-btn--active"
                                      : ""
                                      }`}
                                    onClick={() => setSelectedResidencyStatus(opt.value)}
                                  >
                                    {opt.name}
                                  </Button>
                                ))}
                              </Box>
                            </Box>

                            <Typography className="pf-property-drilldown__mortgage-field-label">
                              Down payment
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                              <Box className="pf-property-drilldown__mortgage-slider-row">
                                <Box className="pf-property-drilldown__mortgage-heading-values">
                                  <Typography className="pf-property-drilldown__mortgage-percentage">
                                    {downPayment}%
                                  </Typography>
                                  {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                  {formatNumber(downPaymentAmount)}
                                </Typography> */}
                                  <TextField
                                    value={downPayment}
                                    onChange={(e) =>
                                      setDownPayment(Number(e.target.value))
                                    }
                                    size="small"
                                    className="pf-property-drilldown__mortgage-input"
                                  />
                                </Box>
                                <Slider
                                  value={downPayment}
                                  onChange={(_e, value) =>
                                    setDownPayment(value as number)
                                  }
                                  min={20}
                                  max={60}
                                  className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – {formatAED(390000)}</Typography>
                                <Typography>
                                  Max – {formatAED(200000000)}
                                </Typography>
                              </Box>
                            </Box>

                            <Typography className="pf-property-drilldown__mortgage-field-label">
                              Loan amount
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                              <Box className="pf-property-drilldown__mortgage-slider-row">
                                <Box className="pf-property-drilldown__mortgage-heading-values">
                                  <Typography className="pf-property-drilldown__mortgage-percentage">
                                    {loanAmount}%
                                  </Typography>
                                  {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                  {formatNumber(loanAmountValue)}
                                </Typography> */}
                                  <TextField
                                    value={loanAmount}
                                    onChange={(e) =>
                                      setLoanAmount(Number(e.target.value))
                                    }
                                    size="small"
                                    className="pf-property-drilldown__mortgage-input"
                                  />
                                </Box>
                                <Slider
                                  value={loanAmount}
                                  onChange={(_e, value) =>
                                    setLoanAmount(value as number)
                                  }
                                  min={30}
                                  max={90}
                                  className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – {formatAED(390000)}</Typography>
                                <Typography>
                                  Max – {formatAED(200000000)}
                                </Typography>
                              </Box>
                            </Box>

                            <Typography className="pf-property-drilldown__mortgage-field-label">
                              Loan period
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                              <Box className="pf-property-drilldown__mortgage-slider-row">
                                {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                {loanPeriod} years
                              </Typography> */}
                                <TextField
                                  value={loanPeriod}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, "");

                                    setLoanPeriod(raw ? Number(raw) : 0);
                                  }}
                                  size="small"
                                  className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                  value={loanPeriod}
                                  onChange={(_e, value) =>
                                    setLoanPeriod(value as number)
                                  }
                                  min={1}
                                  max={25}
                                  className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – 1 year</Typography>
                                <Typography>Max – 25 years</Typography>
                              </Box>
                            </Box>

                            <Typography className="pf-property-drilldown__mortgage-field-label">
                              Interest rate
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                              <Box className="pf-property-drilldown__mortgage-slider-row">
                                {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                {interestRate.toFixed(2)}%
                              </Typography> */}
                                <TextField
                                  value={interestRateInput}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9.]/g, "");

                                    setInterestRateInput(raw);

                                    const numeric = parseFloat(raw);
                                    if (!Number.isNaN(numeric)) {
                                      setInterestRate(numeric);
                                    }
                                  }}
                                  size="small"
                                  className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                  value={interestRate}
                                  onChange={(_e, value) => {
                                    const numeric = value as number;
                                    setInterestRate(numeric);
                                    setInterestRateInput(numeric.toFixed(2));
                                  }}
                                  min={1}
                                  max={10}
                                  step={0.25}
                                  className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – 1%</Typography>
                                <Typography>Max – 10%</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                        {/* Chart Section */}
                        <Grid size={{ xs: 12, md: 12, lg: 6, xl: 6 }}>
                          <Box className="pf-property-drilldown__mortgage-panel pf-property-drilldown__mortgage-panel--right">
                            <Box className="pf-property-drilldown__mortgage-summary">
                              <Box className="pf-property-drilldown__mortgage-summary-chart-container">
                                <Box className="pf-property-drilldown__mortgage-summary-legend">
                                  <Box className="pf-property-drilldown__mortgage-summary-legend-item">
                                    <span className="pf-property-drilldown__mortgage-summary-dot pf-property-drilldown__mortgage-summary-dot--principal" />
                                    <Typography className="pf-property-drilldown__mortgage-summary-legend-item-text">Principal</Typography>
                                  </Box>
                                  <Box className="pf-property-drilldown__mortgage-summary-legend-item">
                                    <span className="pf-property-drilldown__mortgage-summary-dot pf-property-drilldown__mortgage-summary-dot--interest" />
                                    <Typography className="pf-property-drilldown__mortgage-summary-legend-item-text">Interest</Typography>
                                  </Box>
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-summary-chart">
                                  {/* <MortgageDonutChart
                                  principalAmount={principalAmount}
                                  interestAmount={totalInterestPaid}
                                  formatValue={formatNumber}
                                /> */}
                                  <Box className="pf-property-drilldown__mortgage-summary-chart-inner">
                                    <svg
                                      viewBox="0 0 120 120"
                                      className="pf-property-drilldown__mortgage-summary-chart-svg"
                                    >
                                      {/* Track */}
                                      <circle
                                        cx="60"
                                        cy="60"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#F4F5F7"
                                        strokeWidth="18"
                                        strokeLinecap="round"
                                        transform="rotate(-90 60 60)"
                                      />
                                      {/* Principal */}
                                      <circle
                                        cx="60"
                                        cy="60"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#F13A32"
                                        strokeWidth="18"
                                        strokeLinecap="round"
                                        strokeDasharray={`${principalStroke} ${donutCircumference}`}
                                        strokeDashoffset={0}
                                        transform="rotate(-90 60 60)"
                                      />
                                      {/* Interest */}
                                      <circle
                                        cx="60"
                                        cy="60"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#1F3D51"
                                        strokeWidth="18"
                                        strokeLinecap="round"
                                        strokeDasharray={`${interestStroke} ${donutCircumference}`}
                                        strokeDashoffset={-principalStroke}
                                        transform="rotate(-90 60 60)"
                                      />
                                    </svg>
                                    <Box className="pf-property-drilldown__mortgage-summary-chart-center">
                                      <Typography className="pf-property-drilldown__mortgage-summary-center-label">
                                        Principal
                                      </Typography>
                                      <Typography className="pf-property-drilldown__mortgage-summary-center-value">
                                        {formatNumber(principalAmount)} AED
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                              <Box className="pf-property-drilldown__mortgage-summary-body">
                                <Typography className="pf-property-drilldown__mortgage-summary-heading">
                                  Estimate your monthly mortgage<br></br> payment
                                </Typography>

                                <Box className="pf-property-drilldown__mortgage-summary-breakdown">
                                  <Box className="pf-property-drilldown__mortgage-summary-breakdown-item">
                                    <Typography className="pf-property-drilldown__mortgage-summary-label">
                                      Monthly payment
                                    </Typography>
                                    <Typography className="pf-property-drilldown__mortgage-summary-value">
                                      {formatNumber(Math.round(monthlyPayment))}{" "}
                                      AED
                                    </Typography>
                                  </Box>

                                  <Box className="pf-property-drilldown__mortgage-summary-divider" />

                                  <Box className="pf-property-drilldown__mortgage-summary-breakdown-item">
                                    <Typography className="pf-property-drilldown__mortgage-summary-label">
                                      Interest ({interestRate.toFixed(2)}%)
                                    </Typography>
                                    <Typography className="pf-property-drilldown__mortgage-summary-value">
                                      {formatNumber(
                                        Math.round(totalInterestPaid)
                                      )}{" "}
                                      AED
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box className="pf-property-drilldown__mortgage-summary-actions">
                                  <Button
                                    type="button"
                                    className="pf-property-drilldown__mortgage-summary-btn--secondary"
                                    onClick={() => setIsUpfrontCostOpen(true)}
                                  >
                                    View upfront costs
                                  </Button>
                                  <Button
                                    className="pf-property-drilldown__mortgage-summary-btn--primary"
                                    onClick={() => setIsMortgageQuoteModalOpen(true)}
                                  >
                                    Get a mortgage Quote
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                )}
                {/* Regulatory Section */}
                <Box
                  className="pf-property-drilldown__regulatory"
                  id="regulatory"
                >
                  <Typography className="pf-property-drilldown__regulatory-title">
                    Regulatory information
                  </Typography>

                  <Box className="pf-property-drilldown__regulatory-content">
                    <Box className="pf-property-drilldown__regulatory-details">
                      <Box className="pf-property-drilldown__regulatory-row">
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            Reference
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {String(
                              apiProperty?.regulatoryInformation?.referenceId ??
                              apiProperty?._id ??
                              ""
                            ) || "N/A"}
                          </Typography>
                        </Box>
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            Agency name
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {String(
                              apiProperty?.regulatoryInformation?.agencyName ??
                              apiAgency?.agencyName ??
                              ""
                            ) || "N/A"}
                          </Typography>
                        </Box>
                      </Box>

                      <Box className="pf-property-drilldown__regulatory-row">
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            Broker License
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {String(
                              apiProperty?.regulatoryInformation?.brokerLicenseNumber ??
                              apiAgent?.brokerLicenseNumber ??
                              ""
                            ) || "N/A"}
                          </Typography>
                        </Box>
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            Zone name
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {String(
                              apiProperty?.regulatoryInformation?.zoneName ??
                              apiProperty?.location?.zone ??
                              ""
                            ) || "N/A"}
                          </Typography>
                        </Box>
                      </Box>

                      <Box className="pf-property-drilldown__regulatory-row">
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            DLD Permit Number:
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {String(
                              apiProperty?.regulatoryInformation?.dldPermitNumber ??
                              ""
                            ) || "N/A"}
                          </Typography>
                        </Box>
                        <Box className="pf-property-drilldown__regulatory-field">
                          <Typography className="pf-property-drilldown__regulatory-label">
                            Listed timing
                          </Typography>
                          <Typography className="pf-property-drilldown__regulatory-value">
                            {apiProperty?.publishedAt
                              ? new Date(apiProperty.publishedAt).toLocaleDateString(
                                "en-US",
                                { year: "numeric", month: "short", day: "2-digit" }
                              )
                              : "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box className="pf-property-drilldown__regulatory-qr">
                      <img
                        src={qrImg}
                        alt="DLD permit QR code"
                        className="pf-property-drilldown__regulatory-qr-img"
                      />
                      <Typography className="pf-property-drilldown__regulatory-qr-caption">
                        {apiProperty?.regulatoryInformation?.dldPermitUrl ? (
                          <a
                            href={String(apiProperty.regulatoryInformation.dldPermitUrl)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "inherit" }}
                          >
                            Scan to check DLD permit number
                          </a>
                        ) : (
                          "Scan to check DLD permit number"
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Recommended Section */}
                {recommendedList.length > 0 && (
                  <Box className="pf-property-drilldown__recommended" id="recommendedSection">
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
                          <LeftArrowIcon width="24" height="24" fill="#222222" />
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
                          <RightArrowIcon width="24" height="24" fill="#222222" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box
                      className="pf-property-drilldown__recommended-grid"
                      ref={recommendedRef}
                    >
                      {recommendedList.map((item) => (
                        <RecommendedCard
                          key={item.id}
                          property={item}
                          onClick={() =>
                            item.id && handleRecommendedPropertyClick(item.id)
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                )}
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
                      <Box className="pf-property-drilldown__verified-pill">
                        <VerifiedBadgeIcon width={12} height={12} />
                        <Typography className="pf-property-drilldown__verified-text">
                          VERIFIED
                        </Typography>
                      </Box>
                      <Box className="pf-property-drilldown__card-actions">
                        <IconButton
                          className="pf-property-drilldown__icon-btn"
                          aria-label="Favorite"
                          aria-pressed={isFavorite}
                          onClick={handleFavoriteClick}
                          disabled={isFavoriteLoading}
                          sx={{
                            backgroundColor: isFavorite ? "#FF46A2" : "#ffffff",
                            "&:hover": {
                              backgroundColor: isFavorite ? "#FF46A2" : "#ffffff",
                            },
                          }}
                        >
                          {isFavorite ? (
                            <HeartIcon02Filled
                              width={18}
                              height={15}
                              fill="#ffffff"
                            />
                          ) : (
                            <HeartIcon02 width={18} height={15} fill="#222222" />
                          )}
                        </IconButton>
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
                            onClick={() => { setIsReportModalOpen(true); handleActionsClose(); }}
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
                      {propertyDisplayTitle || " "}
                    </Typography>

                    {/* Location */}
                    <Box className="pf-property-drilldown__location">
                      <LocationIcon width={14} height={14} />
                      <Typography className="pf-property-drilldown__location-text">
                        {propertyLocation || " "}
                      </Typography>
                    </Box>

                    {/* Specs row */}
                    <Box className="pf-property-drilldown__specs">
                      <Box className="pf-property-drilldown__spec-item">
                        <Box className="pf-property-drilldown__spec-icon">
                          <BedRoomIcon width={22} height={22} />
                        </Box>
                        <Box className="pf-property-drilldown__spec-text">
                          <Typography className="pf-property-drilldown__spec-label">
                            {beds}
                          </Typography>
                          <Typography className="pf-property-drilldown__spec-caption">
                            Beds
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        className="pf-property-drilldown__spec-divider"
                        aria-hidden
                      />
                      <Box className="pf-property-drilldown__spec-item">
                        <Box className="pf-property-drilldown__spec-icon">
                          <BathRoomIcon width={22} height={22} />
                        </Box>
                        <Box className="pf-property-drilldown__spec-text">
                          <Typography className="pf-property-drilldown__spec-label">
                            {baths}
                          </Typography>
                          <Typography className="pf-property-drilldown__spec-caption">
                            Baths
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        className="pf-property-drilldown__spec-divider"
                        aria-hidden
                      />
                      <Box className="pf-property-drilldown__spec-item">
                        <Box className="pf-property-drilldown__spec-icon">
                          <SqftIcon width={22} height={22} />
                        </Box>
                        <Box className="pf-property-drilldown__spec-text">
                          <Typography className="pf-property-drilldown__spec-label">
                            {sqft ? sqft.toLocaleString("en-US") : 0}
                          </Typography>
                          <Typography className="pf-property-drilldown__spec-caption">
                            sqft
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Amenities bar */}
                    <Button
                      className="pf-property-drilldown__amenities-bar"
                      onClick={() => {
                        setActiveHeaderTab("amenities");
                        handleTabClick("amenities");
                      }}
                    >
                      {apiAmenities.length > 0
                        ? `${apiAmenities.length}+ Amenities`
                        : "40+ Amenities"}
                    </Button>

                    {/* Price + monthly + upfront costs */}
                    <Box className="pf-property-drilldown__price-row">
                      <Box>
                        <Typography className="pf-property-drilldown__price">
                          {priceText}
                        </Typography>
                        {hasRentPricing && (
                          <Typography className="pf-property-drilldown__monthly">
                            Own this from just{" "}
                            <span className="pf-property-drilldown__monthly-value">
                              {monthlyText}
                            </span>
                          </Typography>
                        )}
                      </Box>
                      <Button
                        className="pf-property-drilldown__upfront-btn"
                        onClick={() => setIsUpfrontCostOpen(true)}
                      >
                        Upfront costs
                      </Button>
                    </Box>
                  </Box>
                  {/* Agent row */}
                </Box>

                {/* CTA buttons (separate section, still within 400px column) */}
                <Box
                  className={`${isCtaScrolled && !stopCtaScroll
                    ? " pf-property-drilldown__cta-row--scrolled"
                    : ""
                    }`}
                >
                  <Box className="pf-property-drilldown__agent-row">
                    <Box className="pf-property-drilldown__agent-info">
                      <Avatar
                        src={agentAvatarUrl}
                        alt={agentName}
                        className="pf-property-drilldown__agent-avatar"
                      />
                      <Box className="pf-property-drilldown__agent-text">
                        <Typography className="pf-property-drilldown__agent-name">
                          {agentName}
                        </Typography>
                        <Box className="pf-property-drilldown__rating-row">
                          <Box className="pf-property-drilldown__rating-stars">
                            <StarIcon
                              width="86"
                              height="14"
                              starColor="#E5E7EB"
                            />
                            <Box
                              className="pf-property-drilldown__rating-stars-fill"
                              style={{ width: `${ratingFillPercent}%` }}
                            >
                              <StarIcon
                                width="86"
                                height="14"
                                starColor="#FFCB2B"
                              />
                            </Box>
                          </Box>
                          <Typography className="pf-property-drilldown__rating-value">
                            {ratingValueSafe.toFixed(1)}/5
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box className="pf-property-drilldown__developer-pill">
                      <img src={agencyLogoUrl} alt="Developer logo" />
                    </Box>
                  </Box>
                  <Box
                    className={`pf-property-drilldown__cta-row`}
                  >
                    <Button
                      className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--call"
                      startIcon={
                        <TelephoneIcon width={20} height={20} fill="#ffffff" />
                      }
                      onClick={handleCallClick}
                    >
                      Call us
                    </Button>
                    <Button
                      className="pf-property-drilldown__cta-btn pf-property-drilldown__cta-btn--whatsapp"
                      startIcon={
                        <span className="pf-property-drilldown__cta-whatsapp-icon">
                          <WhatsappIcon width={20} height={20} className='pf-property-drilldown__ctainside' />
                        </span>
                      }
                      onClick={handleWhatsappClick}
                    >
                      Whatsapp
                    </Button>
                  </Box>
                </Box>
              </Box>
              <UpfrontCostModal
                open={isUpfrontCostOpen}
                onClose={() => setIsUpfrontCostOpen(false)}
                data={upfrontCostsData}
                loading={upfrontCostsLoading}
              />
              <MortgageQuoteModal
                open={isMortgageQuoteModalOpen}
                onClose={() => setIsMortgageQuoteModalOpen(false)}
                defaultResidencyStatus={selectedResidencyStatus}
                calculatorSnapshot={{
                  purchasePrice,
                  residencyStatus: selectedResidencyStatus,
                  downPayment: downPaymentAmount,
                  downPaymentPct: downPayment,
                  loanAmount: loanAmountValue,
                  loanPeriod,
                  interestRate,
                  monthlyPayment: Math.round(monthlyPayment),
                  totalInterest: Math.round(totalInterestPaid),
                }}
              />
              <ContactusModal
                open={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                agentName={agentName || " "}
                agentImage={
                  agentAvatarUrl ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                }
                agentEmail={String(apiAgent?.email ?? "").trim() || undefined}
                languages={agentLanguages.trim() ? agentLanguages : undefined}
                referenceNumber={String(
                  apiProperty?.regulatoryInformation?.referenceId ??
                  apiProperty?._id ??
                  ""
                ).trim()}
                contactNumber={callNumber.trim() ? callNumber : undefined}
                brokerLicenseNumber={
                  String(apiAgent?.brokerLicenseNumber ?? "").trim() || undefined
                }
              />
              <MailusModal
                open={isMailModalOpen}
                onClose={() => setIsMailModalOpen(false)}
                agentName={agentName || " "}
                agentEmail={String(apiAgent?.email ?? "").trim() || undefined}
                initialName={isLoggedIn ? initialUserName : guestDraft?.name || ""}
                initialEmail={isLoggedIn ? initialUserEmail : guestDraft?.email || ""}
                initialPhone={normalizePhoneForDial(
                  isLoggedIn ? initialUserPhone : guestDraft?.phoneNumber || ""
                )}
                title={
                  pendingInquiryAction === "email"
                    ? undefined
                    : "Enter your details to continue"
                }
                submitLabel={
                  pendingInquiryAction === "email"
                    ? "Send"
                    : pendingInquiryAction === "call"
                      ? "Continue to call"
                      : "Continue to WhatsApp"
                }
                showComments={pendingInquiryAction === "email"}
                onSubmit={handleMailSubmit}
              />
              <ReportModal
                open={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportedItemId={propertyMongoId}
                isLoggedIn={isLoggedIn}
                initialEmail={initialUserEmail}
                onSuccess={(message) => {
                  setIsReportModalOpen(false);
                  setToast({
                    open: true,
                    message,
                    severity: "success",
                  });
                }}
                onError={(message) => {
                  setToast({
                    open: true,
                    message,
                    severity: "error",
                  });
                }}
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

export default PropertyDrilldown;
{/* <Box className="pf-property-drilldown__location-cards-wrapper">
                        <Box
                          className="pf-property-drilldown__location-cards-track"
                          style={{
                            transform: `translateX(-${(locationCardIndex / visibleLocationCards) * 100
                              }%)`,
                          }}
                        >
                          {nearbyPlaces.map((place, index) => (
                            <Box
                              key={`${place.type}-${place.name}-${index}`}
                              className="pf-property-drilldown__location-card"
                            >
                              <Box className="pf-property-drilldown__location-card-top">
                                <Box className="pf-property-drilldown__location-card-icon-wrapper">
                                  <img
                                    src={place.icon}
                                    alt={place.type}
                                    className="pf-property-drilldown__location-card-icon"
                                  />
                                </Box>
                                <Typography className="pf-property-drilldown__location-card-type">
                                  {place.type}
                                </Typography>
                              </Box>

                              <Box className="pf-property-drilldown__location-card-bottom">
                                <Typography className="pf-property-drilldown__location-card-name">
                                  {place.name}
                                </Typography>
                                <Typography className="pf-property-drilldown__location-card-distance">
                                  {place.distance}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>

                        {nearbyPlaces.length > visibleLocationCards && (
                          <IconButton
                            className="pf-property-drilldown__location-arrow-btn"
                            onClick={handleNextLocationCard}
                            aria-label="Next nearby place"
                          >
                            <RightArrowRoundFillIcon
                              width={24}
                              height={24}
                              roundFill="#ffffff"
                              fill="#222222"
                            />
                          </IconButton>
                        )}
                      </Box> */}