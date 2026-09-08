import { useRef, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Divider,
  Skeleton,
  Snackbar,
  Alert,
} from "@mui/material";
import MailusModal from "./MailusModal";
import ContactusModal from "./ContactusModal";
import {
  VerifiedBadgeIcon,
  SuperAgentStarIcon,
  BoldLocationIcon,
  ImageIcon,
  BedRoomIcon,
  BathRoomIcon,
  SqftIcon,
  TelephoneIcon,
  MailIcon,
  WhatsappIcon,
  HeartIcon02,
  HeartIcon02Filled,
  ModalCloseIcon,
  ThreeDotIcon,
  LocationIcon,
  ReportFlagIcon,
  ShareIcon,
} from "../../../Components/parts/icon";
import { useNavigate } from "react-router-dom";
import { DownArrowIconBlack } from "../../../Components/parts/icon";
import {
  addSavedProperty,
  removeSavedProperty,
  syncAuthUserSavedProperty,
  createInquiry,
  getAuthUser,
  type CreateInquiryResponseData,
} from "../../../services/apiService";
import {
  normalizePhoneForDial,
  normalizePhoneForWhatsapp,
} from "../../../utils/phoneWhatsapp";
import ReportsModal from "./ReportsModal";

/** Same as `limit` sent with `/properties/search` in SearchListing. */
export const PROPERTY_LISTING_PAGE_SIZE = 10;

/** Placeholder row count while property search / saved list is loading. */
export const PROPERTY_LISTING_SKELETON_COUNT = 5;

export type ListingTransactionKind = "rent" | "sale";

/** Use API `listingType.transaction` when set; otherwise the page filter default (e.g. search “Property for”). */
export function resolveListingTransactionForProperty(
  property: { listingType?: { transaction?: string } | null | undefined },
  pageDefault: ListingTransactionKind
): ListingTransactionKind {
  const tx = String(property.listingType?.transaction ?? "")
    .toLowerCase()
    .trim();
  if (tx === "rent" || tx === "rental") return "rent";
  if (tx === "sale" || tx === "buy" || tx === "sell") return "sale";
  return pageDefault;
}

export function PropertyListingCardSkeleton() {
  return (
    <Box className="pf-property-listing-card" sx={{ cursor: "default" }}>
      <Box className="pf-property-listing-card__image-section">
        <Skeleton
          variant="rectangular"
          className="pf-property-listing-card__image"
          animation="wave"
          sx={{ height: "100%" }}
        />
      </Box>

      <Box className="pf-property-listing-card__content">
        <Box className="pf-property-listing-card__actions">
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
        </Box>

        <Skeleton
          variant="text"
          width="70%"
          height={28}
          animation="wave"
          sx={{ mt: 2 }}
        />

        <Box className="pf-property-listing-card__location" sx={{ mt: 1 }}>
          <Skeleton variant="circular" width={18} height={18} animation="wave" />
          <Skeleton variant="text" width="55%" height={18} animation="wave" />
        </Box>

        <Box className="pf-property-listing-card__features" sx={{ mt: 2 }}>
          <Skeleton variant="text" width="25%" height={22} animation="wave" />
          <Skeleton variant="text" width="25%" height={22} animation="wave" />
          <Skeleton variant="text" width="25%" height={22} animation="wave" />
        </Box>

        <Box className="pf-property-listing-card__price" sx={{ mt: 2 }}>
          <Skeleton variant="text" width="25%" height={16} animation="wave" />
          <Skeleton variant="text" width="60%" height={32} animation="wave" />
        </Box>

        <Divider className="pf-property-listing-card__divider" />

        <Box className="pf-property-listing-card__contact-agent-row" sx={{ mt: -2 }}>
          <Box className="pf-property-listing-card__contact">
            <Skeleton variant="rectangular" width={120} height={30} animation="wave" />
            <Skeleton variant="rectangular" width={120} height={30} animation="wave" />
            <Skeleton variant="rectangular" width={100} height={30} animation="wave" />
          </Box>

          <Box className="pf-property-listing-card__agent">
            <Skeleton variant="circular" width={40} height={40} animation="wave" />
            <Skeleton variant="text" width="60%" height={18} animation="wave" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export type PropertyListingCardData = {
  id: string | number;
  /** ListingType ObjectId used for focused map/property search payloads. */
  listingTypeId?: string;
  image: string;
  /** Optional for map view centering */
  position?: { lat: number; lng: number };
  agencyLogo?: string;
  developerLogo?: string;
  badges?: {
    verified?: boolean;
    superAgent?: boolean;
    propertyType?: string;
  };
  photoCount?: number;
  title: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  currency?: string;
  /** From search filter or API `listingType`; drives rent vs sale price formatting. */
  listingTransaction?: ListingTransactionKind;
  rentPricing?: { yearly?: number; monthly?: number } | null;
  isSaved?: boolean;
  shareLink?: string;
  /** Property listing reference (e.g. referenceId or _id) for contact modal. */
  propertyReference?: string;
  agent: {
    name: string;
    image: string;
    listedDaysAgo: number;
    email?: string;
    phoneNumber?: string;
    /** Comma-separated language names from API. */
    languagesLabel?: string;
    brokerLicenseNumber?: string;
  };
};

type PropertyListingCardProps = {
  property: PropertyListingCardData;
  onPropertyClick: () => void;
  defaultFavorite?: boolean;
  /** Called after a successful add/remove API call. */
  onFavoriteChange?: (nextSaved: boolean, propertyId: string) => void;
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
    // Ignore storage failures (private mode/quota/etc.)
  }
};

function PropertyListingCard({
  property,
  onPropertyClick,
  defaultFavorite,
  onFavoriteChange,
}: PropertyListingCardProps) {
  const navigate = useNavigate();
  const {
    image,
    agencyLogo,
    developerLogo,
    badges,
    photoCount,
    title,
    location,
    beds,
    baths,
    sqft,
    price,
    currency = "AED",
    listingTransaction = "sale",
    rentPricing: rentPricingProp,
    propertyReference,
    agent,
  } = property;

  const rentPricing = rentPricingProp ?? null;
  const hasRentPricing =
    listingTransaction === "rent" &&
    !!rentPricing &&
    typeof rentPricing.yearly === "number" &&
    typeof rentPricing.monthly === "number" &&
    Number.isFinite(rentPricing.yearly) &&
    Number.isFinite(rentPricing.monthly) &&
    rentPricing.yearly > 0 &&
    rentPricing.monthly > 0;

  const whatsappDigits = normalizePhoneForWhatsapp(agent.phoneNumber);

  const initialFavorite =
    typeof defaultFavorite === "boolean"
      ? defaultFavorite
      : Boolean(property.isSaved);

  const handlePropertyClick = () => {
    onPropertyClick();
  };

  const [openReportModal, setOpenReportModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);
  const [pendingInquiryAction, setPendingInquiryAction] =
    useState<InquiryActionType>("email");
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClose = () => {
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();

    setOpenReportModal(true);
    setIsDropdownOpen(false);
  };

  const handleShare = async () => {
    const propertyId = String(property?.id ?? "").trim();
    const apiShareLink = String(property?.shareLink ?? "").trim();
    const shareUrl =
      apiShareLink ||
      (propertyId
        ? `${window.location.origin}/propertydrilldown/${encodeURIComponent(propertyId)}`
        : window.location.href);

    if (navigator.share) {
      void navigator
        .share({
          title: title || "Property",
          text: title || "Check this property",
          url: shareUrl,
        })
        .catch(() => {
          // user cancelled or browser blocked the share sheet
        });
      handleClose();
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
    handleClose();
  };

  const stopClickPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
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

    const propertyId = property?.id;
    if (!propertyId && propertyId !== 0) return;

    const previous = isFavorite;
    const next = !previous;

    // Optimistic UI
    setIsFavorite(next);
    setIsFavoriteLoading(true);

    try {
      if (next) {
        const resp = await addSavedProperty(String(propertyId));
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string"
              ? resp.message
              : "Failed to save property"
          );
        }
      } else {
        const resp = await removeSavedProperty(String(propertyId));
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string"
              ? resp.message
              : "Failed to remove property"
          );
        }
      }
      syncAuthUserSavedProperty(String(propertyId), next);
      onFavoriteChange?.(next, String(propertyId));
    } catch (err) {
      setIsFavorite(previous);
      console.error("[saved-properties] toggle failed", err);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleMailOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingInquiryAction("email");
    setIsMailModalOpen(true);
  };

  const handleMailClose = () => {
    setIsMailModalOpen(false);
  };

  const submitInquiry = async (params: {
    inquiryType: InquiryActionType;
    name?: string;
    email?: string;
    phoneNumber?: string;
    comments?: string;
  }): Promise<CreateInquiryResponseData> => {
    const propertyId = String(property.id ?? "").trim();
    if (!propertyId) {
      throw new Error("Property details are missing.");
    }

    const body = {
      propertyId,
      inquiryType: params.inquiryType,
      ...(params.name ? { name: params.name } : {}),
      ...(params.email ? { email: params.email } : {}),
      ...(params.phoneNumber ? { phoneNumber: params.phoneNumber } : {}),
      ...(params.comments ? { message: params.comments } : {}),
    } as const;

    const response = await createInquiry(body);
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

    const fallbackWhatsappDigits = normalizePhoneForWhatsapp(
      data?.agent?.whatsappNumber || data?.agent?.phoneNumber || agent.phoneNumber
    );
    if (!fallbackWhatsappDigits) return;
    window.open(`https://wa.me/${fallbackWhatsappDigits}`, "_blank", "noreferrer");
  };

  const handleContactOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Guest must enter details first; only then show contact modal.
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

    if (isInquirySubmitting) {
      setIsContactModalOpen(true);
      return;
    }

    // Open Contact modal first; inquiry runs in background.
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
      // Show contact details immediately, create inquiry in background.
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

  const handleContactModalClose = () => {
    setIsContactModalOpen(false);
  };

  const handleWhatsappClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!whatsappDigits || isInquirySubmitting) return;

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
          window.alert(
            err instanceof Error ? err.message : "Failed to create WhatsApp inquiry."
          );
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
      window.alert(
        err instanceof Error ? err.message : "Failed to create WhatsApp inquiry."
      );
    } finally {
      setIsInquirySubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US");
  };

  const pricePrimaryText = hasRentPricing
    ? `${Number(rentPricing.yearly).toLocaleString("en-US")} ${currency}/year`
    : `${formatPrice(price)} ${currency}`;
  const priceSecondaryText = hasRentPricing
    ? `${Number(rentPricing.monthly).toLocaleString("en-US")} ${currency}/month`
    : null;

  return (
    <Box className="pf-property-listing-card" onClick={handlePropertyClick} style={{ cursor: "pointer" }}>
      {/* Image Section */}
      <Box className="pf-property-listing-card__image-section">
        <img
          src={image}
          alt={title}
          className="pf-property-listing-card__image"
        />

        {/* Developer Logo - Top Left */}
        {(agencyLogo || developerLogo) && (
          <Box className="pf-property-listing-card__developer-logo">
            <img src={agencyLogo || developerLogo} alt="logo" />
          </Box>
        )}

        {/* Badges - Top Right */}
        {badges && (
          <Box className="pf-property-listing-card__badges">
            {badges.verified && (
              <Box className="pf-property-listing-card__badge pf-property-listing-card__badge--verified">
                <VerifiedBadgeIcon width={12} height={12} />
                <Typography variant="caption">VERIFIED</Typography>
              </Box>
            )}
            {badges.superAgent && (
              <Box className="pf-property-listing-card__badge pf-property-listing-card__badge--superagent">
                <SuperAgentStarIcon width={12} height={12} />
                <Typography variant="caption">SUPERAGENT</Typography>
              </Box>
            )}
            {badges.propertyType && (
              <Box className="pf-property-listing-card__badge pf-property-listing-card__badge--property-type">
                <Typography variant="caption">{badges.propertyType}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Bottom Buttons Container */}
        <Box className="pf-property-listing-card__bottom-buttons">
          <Button
            className="pf-property-listing-card__location-btn"
            startIcon={<BoldLocationIcon width={15} height={18} stroke="#222222" strokeWidth="2" />}
            onClick={(e) => {
              e.stopPropagation();
              const pos = (property as PropertyListingCardData).position;
              const listingTypeId = String(property.listingTypeId ?? "").trim();
              const titleKeyword = String(property.title ?? "").trim();
              const payload =
                listingTypeId && pos
                  ? {
                    focus: { id: String(property.id), lat: pos.lat, lng: pos.lng },
                    initialPropertySearch: {
                      listingType: listingTypeId,
                      nearLat: pos.lat,
                      nearLng: pos.lng,
                      nearRadiusKm: 0.05,
                      ...(titleKeyword ? { keyword: titleKeyword } : {}),
                      page: 1,
                      limit: 20,
                    },
                  }
                  : listingTypeId
                    ? {
                      initialPropertySearch: {
                        listingType: listingTypeId,
                        ...(titleKeyword ? { keyword: titleKeyword } : {}),
                        page: 1,
                        limit: 20,
                      },
                    }
                    : pos
                      ? {
                        focus: {
                          id: String(property.id),
                          lat: pos.lat,
                          lng: pos.lng,
                        },
                      }
                      : undefined;

              navigate("/mapview", payload ? { state: payload } : undefined);
            }}
          >
            Location
          </Button>

          {/* Photo Count - Bottom Right */}
          {photoCount && (
            <Button
              className="pf-property-listing-card__photo-count-btn"
              startIcon={<ImageIcon width={15} height={18} fill="#ffffff" strokeWidth="2" />}
            >
              {photoCount}
            </Button>
          )}
        </Box>
      </Box>

      {/* Content Section */}
      <Box className="pf-property-listing-card__content">
        {/* Top Right Icons */}
        <Box className="pf-property-listing-card__actions" onClick={stopClickPropagation}>
          <IconButton
            className="pf-property-listing-card__action-icon"
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
              <HeartIcon02Filled width={18} height={15} fill="#ffffff" />
            ) : (
              <HeartIcon02 width={18} height={15} fill="#222222" />
            )}
          </IconButton>

          <Box ref={dropdownRef} style={{ position: "relative" }}>
            <IconButton
              className="pf-property-listing-card__action-icon"
              aria-label="More options"
              onClick={handleClick}
              sx={{
                backgroundColor: "#ffffff",
                "&:hover": {
                  backgroundColor: "#ffffff",
                },
              }}
            >
              {isDropdownOpen ? (
                <ModalCloseIcon width={14} height={14} />
              ) : (
                <ThreeDotIcon width={16} height={16} />
              )}
            </IconButton>

            {/* Custom Dropdown */}
            {isDropdownOpen && (
              <Box
                className="pf-property-listing-card__dropdown"
                onClick={stopClickPropagation}
              >
                <Box
                  className="pf-property-listing-card__dropdown-item"
                  onClick={handleReport}
                >
                  <ReportFlagIcon width={16} height={16} />
                  <Typography
                    variant="body2"
                    className="pf-property-listing-card__dropdown-text"
                  >
                    Report
                  </Typography>
                </Box>
                <Box
                  className="pf-property-listing-card__dropdown-item"
                  onClick={handleShare}
                >
                  <ShareIcon width={16} height={16} />
                  <Typography
                    variant="body2"
                    className="pf-property-listing-card__dropdown-text"
                  >
                    Share
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Title */}
        <Typography variant="h3" className="pf-property-listing-card__title">
          {title}
        </Typography>

        {/* Location */}
        <Box className="pf-property-listing-card__location">
          <LocationIcon width={14} height={14} />
          <Typography variant="body2" className="pf-property-listing-card__location-text">
            {location}
          </Typography>
        </Box>

        {/* Features */}
        <Box className="pf-property-listing-card__features">
          <Box className="pf-property-listing-card__feature">
            <BedRoomIcon width={16} height={16} />
            <Typography variant="body2" className="pf-property-listing-card__feature-text">{beds} Bed</Typography>
          </Box>
          <Box className="pf-property-listing-card__feature">
            <BathRoomIcon width={16} height={16} />
            <Typography variant="body2" className="pf-property-listing-card__feature-text">{baths} Bath</Typography>
          </Box>
          <Box className="pf-property-listing-card__feature">
            <SqftIcon width={16} height={16} />
            <Typography variant="body2" className="pf-property-listing-card__feature-text">{sqft.toLocaleString()} sqft</Typography>
          </Box>
        </Box>

        {/* Price */}
        <Box className="pf-property-listing-card__price">
          <Typography variant="caption" className="pf-property-listing-card__price-label">
            Price
          </Typography>
          <Typography variant="h4" className="pf-property-listing-card__price-value">
            {pricePrimaryText}
          </Typography>
          {/* {priceSecondaryText ? (
            <Typography
              variant="body2"
              className="pf-property-listing-card__price-secondary"
              sx={{ mt: 0.25, color: "text.secondary", fontWeight: 500 }}
            >
              {priceSecondaryText}
            </Typography>
          ) : null} */}
        </Box>
        <Divider className="pf-property-listing-card__divider" />
        {/* Contact Buttons and Agent Info - Same Line */}
        <Box className="pf-property-listing-card__contact-agent-row">
          {/* Contact Buttons */}
          <Box className="pf-property-listing-card__contact">
            <Button
              className="pf-property-listing-card__contact-btn"
              startIcon={<TelephoneIcon width={16} height={16} />}
              onClick={handleContactOpen}
              disabled={isInquirySubmitting}
            >
              Contact
            </Button>
            <Button
              className="pf-property-listing-card__contact-btn"
              startIcon={<MailIcon width={16} height={16} />}
              onClick={handleMailOpen}
              disabled={isInquirySubmitting}
            >
              Mail us
            </Button>
            <Button
              className="pf-property-listing-card__contact-btn pf-property-listing-card__contact-btn--whatsapp"
              startIcon={<WhatsappIcon width={16} height={16} />}
              onClick={handleWhatsappClick}
              disabled={!whatsappDigits || isInquirySubmitting}
            >
              Whatsapp
            </Button>
          </Box>

          {/* Agent Info */}
          <Box className="pf-property-listing-card__agent">
            <Avatar
              src={agent.image}
              alt={agent.name}
              className="pf-property-listing-card__agent-avatar"
            />
            <Box className="pf-property-listing-card__agent-details">
              <Typography variant="body2" className="pf-property-listing-card__agent-name">
                {agent.name}
              </Typography>
              <Typography variant="caption" className="pf-property-listing-card__agent-date">
                Listed {agent.listedDaysAgo} days ago
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <ReportsModal
        open={openReportModal}
        onClose={() => setOpenReportModal(false)}
        reportedItemId={String(property.id ?? "").trim()}
        isLoggedIn={isLoggedIn}
        initialEmail={initialUserEmail}
        onSuccess={(message) => {
          setOpenReportModal(false);
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
      <MailusModal
        open={isMailModalOpen}
        onClose={handleMailClose}
        agentName={agent.name}
        agentEmail={agent.email}
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
      <ContactusModal
        open={isContactModalOpen}
        onClose={handleContactModalClose}
        agentName={agent.name}
        agentImage={agent.image}
        agentEmail={agent.email}
        languages={agent.languagesLabel}
        referenceNumber={propertyReference}
        contactNumber={agent.phoneNumber}
        brokerLicenseNumber={agent.brokerLicenseNumber}
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
    </Box>
  );
}

export default PropertyListingCard;

