import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Skeleton, Snackbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ContactedPropertyCard from "../components/ContactedPropertyCard";
import type { ContactedProperty } from "../components/ContactedPropertyCard";
import ContactusModal from "../../Search/components/ContactusModal";
import companyLogo1 from "../../../assets/img/company_logos/1.png";
import { normalizePhoneForDial, normalizePhoneForWhatsapp } from "../../../utils/phoneWhatsapp";
import {
  deleteContactedProperties,
  getContactedProperties,
  getSupportedUrlsMasterData,
  type ContactedPropertyApiEntry,
} from "../../../services/apiService";

const CONTACTED_FETCH_LIMIT = 100;
const CONTACTED_SKELETON_COUNT = 6;

type SupportedUrlMap = Record<string, unknown>;

type ToastState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
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

function mapContactedEntryToCard(
  entry: ContactedPropertyApiEntry,
  propertyImageBaseUrl?: string | null
): ContactedProperty {
  const prop =
    entry.property && typeof entry.property === "object" ? entry.property : null;
  const agent =
    entry.agent && typeof entry.agent === "object" ? entry.agent : null;

  const images = prop?.images ?? [];
  const primaryImageUrlRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const primaryImageUrl = resolveSupportedUrlPath(
    primaryImageUrlRaw,
    propertyImageBaseUrl
  );

  const locationText =
    prop?.location?.fullAddress ??
    [prop?.location?.building, prop?.location?.zone, prop?.location?.city]
      .filter((v): v is string => !!v && v.trim().length > 0)
      .join(", ");

  const listingType = prop?.listingType;
  const propertyTypeLabel = (() => {
    if (typeof listingType === "string" && listingType.trim()) {
      return listingType.replace(/-/g, " ");
    }
    if (
      listingType &&
      typeof listingType === "object" &&
      typeof listingType.name === "string" &&
      listingType.name.trim()
    ) {
      return listingType.name.trim();
    }
    return undefined;
  })();

  const propExtras = prop as {
    _id?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: { sqft?: number };
  };
  const agentExtras = agent as {
    profilePicture?: string;
    brokerLicenseNumber?: string;
    languages?: Array<{ name?: string; code?: string; nativeName?: string }>;
  } | null;
  const agentLanguagesLabel = Array.isArray(agentExtras?.languages)
    ? agentExtras.languages
        .map((lang) => String(lang?.name ?? lang?.nativeName ?? lang?.code ?? "").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    id: String(entry._id),
    title: prop?.title?.trim() || "Property unavailable",
    propertyType: propertyTypeLabel,
    location: locationText || "—",
    image: primaryImageUrl || companyLogo1,
    beds: typeof propExtras.bedrooms === "number" ? propExtras.bedrooms : 0,
    baths: typeof propExtras.bathrooms === "number" ? propExtras.bathrooms : 0,
    sqft:
      typeof propExtras.area?.sqft === "number" && Number.isFinite(propExtras.area.sqft)
        ? propExtras.area.sqft
        : 0,
    agent: agent
      ? {
          name: agent.fullName,
          phone: agent.phoneNumber,
          email: agent.email,
          whatsapp: agent.whatsappNumber,
          image:
            resolveSupportedUrlPath(agentExtras?.profilePicture, propertyImageBaseUrl) ||
            companyLogo1,
          languagesLabel: agentLanguagesLabel || undefined,
          brokerLicenseNumber: agentExtras?.brokerLicenseNumber,
        }
      : undefined,
  };
}

function ContactedPropertyCardSkeleton() {
  return (
    <Box className="pf-contacted-card">
      <Skeleton variant="rectangular" className="pf-contacted-card__image" height={190} />
      <Box className="pf-contacted-card__content">
        <Box className="pf-contacted-card__headline">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="55%" />
        </Box>
        <Box className="pf-contacted-card__details">
          <Box className="pf-contacted-card__chips">
            <Skeleton variant="rounded" width={76} height={24} />
            <Skeleton variant="rounded" width={76} height={24} />
            <Skeleton variant="rounded" width={96} height={24} />
          </Box>
          <Box className="pf-contacted-card__actions">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="rounded" width={110} height={32} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ContactedProperties() {
  const navigate = useNavigate();
  const [contactedRaw, setContactedRaw] = useState<ContactedPropertyApiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    severity: "success",
  });
  const [activeContactCardId, setActiveContactCardId] = useState<string | null>(null);

  const showToast = useCallback((message: string, severity: ToastState["severity"]) => {
    setToast({ open: true, message, severity });
  }, []);

  const loadContacted = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const aggregated: ContactedPropertyApiEntry[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const resp = await getContactedProperties({
          page,
          limit: CONTACTED_FETCH_LIMIT,
          signal,
        });
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string"
              ? resp.message
              : "Failed to load contacted properties"
          );
        }
        const list = resp?.data?.properties ?? [];
        if (Array.isArray(list)) aggregated.push(...list);
        const p = resp?.data?.pagination;
        totalPages =
          typeof p?.totalPages === "number" &&
          Number.isFinite(p.totalPages) &&
          p.totalPages >= 1
            ? p.totalPages
            : 1;
        page += 1;
      } while (page <= totalPages && !signal?.aborted);

      if (signal?.aborted) return;

      setContactedRaw(aggregated);
      setHasLoadedOnce(true);
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
      setContactedRaw([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getSupportedUrlsMasterData()
      .then((resp) => {
        if (!mounted) return;
        const items = (resp.data?.items ?? {}) as unknown;
        const map = Array.isArray(items)
          ? (items as Record<string, unknown>[]).reduce(
              (acc: SupportedUrlMap, cur: Record<string, unknown>) => ({ ...acc, ...cur }),
              {}
            )
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
    const ac = new AbortController();
    void loadContacted(ac.signal);
    return () => ac.abort();
  }, [loadContacted]);

  const propertyImageBaseUrl = (supportedUrls as { propertyUrl?: { img?: string } } | null)
    ?.propertyUrl?.img;

  const properties = useMemo(
    () =>
      contactedRaw.map((entry) => mapContactedEntryToCard(entry, propertyImageBaseUrl)),
    [contactedRaw, propertyImageBaseUrl]
  );

  const hasProperties = properties.length > 0;

  const handleDeleteAll = async () => {
    if (!properties.length) return;
    setMutationError(null);
    setActionBusy(true);
    try {
      const ids = properties.map((p) => p.id);
      const resp = await deleteContactedProperties(ids);
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Could not delete properties"
        );
      }
      setContactedRaw([]);
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "All contacted properties deleted",
        "success"
      );
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not delete properties");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMutationError(null);
    setActionBusy(true);
    try {
      const resp = await deleteContactedProperties([id]);
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Could not delete property"
        );
      }
      setContactedRaw((prev) => prev.filter((item) => String(item._id) !== id));
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "Property removed",
        "success"
      );
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not delete property");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReport = (id: string) => {
    console.info(`Report property ${id}`);
  };

  const handleShare = async (contactedId: string) => {
    const entry = contactedRaw.find((e) => String(e._id) === contactedId);
    const prop =
      entry?.property && typeof entry.property === "object" ? entry.property : null;
    const propertyMongoId = String(prop?._id ?? "").trim();
    const title = prop?.title?.trim() || "Property";
    const apiShareLink = String(
      (prop as { shareLink?: string } | null)?.shareLink ?? ""
    ).trim();
    const shareUrl =
      apiShareLink ||
      (propertyMongoId
        ? `${window.location.origin}/propertydrilldown/${encodeURIComponent(propertyMongoId)}`
        : window.location.href);

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url: shareUrl,
        });
      } catch {
        /* user cancelled or share unsupported */
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard", "success");
      } catch {
        showToast("Could not copy link", "error");
      }
    } else {
      showToast("Could not copy link", "error");
    }
  };

  const handleCall = (id: string) => {
    setActiveContactCardId(id);
  };

  const handleMail = (id: string) => {
    const property = properties.find((p) => p.id === id);
    const email = property?.agent?.email;
    if (!email?.trim()) return;
    const propertyId = String(property?.id ?? id).trim();
    const subject = `Interest in property ${propertyId}`;
    const body = `Hi ${property?.agent?.name ?? "Agent"},\n\nI'm interested in this property: ${property?.title ?? "Property"} (ID: ${propertyId}).`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email.trim()
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };

  const handleWhatsapp = (id: string) => {
    const property = properties.find((p) => p.id === id);
    const raw = property?.agent?.whatsapp || property?.agent?.phone;
    if (!raw?.trim()) return;
    const digits = normalizePhoneForWhatsapp(raw);
    if (!digits) return;
    const propertyId = String(property?.id ?? id).trim();
    const message = `Hi, I'm interested in this property: ${property?.title ?? "Property"} (ID: ${propertyId}).`;
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const activeContactCard = useMemo(
    () => properties.find((p) => p.id === activeContactCardId) ?? null,
    [properties, activeContactCardId]
  );

  const shouldShowLoader = useMemo(
    () => loading && (!hasLoadedOnce || properties.length === 0),
    [loading, hasLoadedOnce, properties.length]
  );

  return (
    <div className="pf-account__page pf-contacted">
      <Box className="pf-contacted__header">
        <Typography variant="h2" className="pf-contacted__title">
          Contacted properties
        </Typography>

        <Button
          variant="outlined"
          className="pf-contacted__delete-btn"
          onClick={() => void handleDeleteAll()}
          disabled={!hasProperties || loading || actionBusy}
        >
          Delete all properties
        </Button>
      </Box>

      {mutationError ? (
        <Box py={1}>
          <Typography variant="body2" color="error">
            {mutationError}
          </Typography>
        </Box>
      ) : null}

      {shouldShowLoader ? (
        <Box className="pf-contacted__grid">
          {Array.from({ length: CONTACTED_SKELETON_COUNT }).map((_, idx) => (
            <ContactedPropertyCardSkeleton key={`contacted-skeleton-${idx}`} />
          ))}
        </Box>
      ) : loadError ? (
        <Box className="pf-contacted__empty" py={4}>
          <Typography variant="body1" color="error" gutterBottom>
            {loadError}
          </Typography>
          <Button variant="contained" onClick={() => void loadContacted()}>
            Try again
          </Button>
        </Box>
      ) : hasProperties ? (
        <Box className="pf-contacted__grid">
          {properties.map((property) => (
            <ContactedPropertyCard
              key={property.id}
              property={property}
              onDelete={(pid) => void handleDelete(pid)}
              onReport={handleReport}
              onShare={(pid) => void handleShare(pid)}
              onCall={handleCall}
              onMail={handleMail}
              onWhatsapp={handleWhatsapp}
            />
          ))}
        </Box>
      ) : (
        <Box className="pf-contacted__empty">
          <Typography className="pf-contacted__empty-title">
            You haven’t contacted any properties yet
          </Typography>
          <Typography className="pf-contacted__empty-copy">
            Start exploring listings to contact agents and see them here.
          </Typography>
          <Button
            variant="contained"
            className="pf-contacted__empty-cta"
            onClick={() => navigate("/searchlisting")}
          >
            Browse properties
          </Button>
        </Box>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
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

      <ContactusModal
        open={Boolean(activeContactCard)}
        onClose={() => setActiveContactCardId(null)}
        agentName={activeContactCard?.agent?.name}
        agentImage={activeContactCard?.agent?.image || companyLogo1}
        agentEmail={activeContactCard?.agent?.email}
        languages={activeContactCard?.agent?.languagesLabel}
        referenceNumber={activeContactCard?.id}
        contactNumber={normalizePhoneForDial(activeContactCard?.agent?.phone)}
        brokerLicenseNumber={activeContactCard?.agent?.brokerLicenseNumber}
      />
    </div>
  );
}

export default ContactedProperties;
