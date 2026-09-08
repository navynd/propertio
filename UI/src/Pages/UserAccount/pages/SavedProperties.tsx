import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Snackbar, Tab, Tabs, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PropertyListingCard, {
  PropertyListingCardSkeleton,
  PROPERTY_LISTING_PAGE_SIZE,
  PROPERTY_LISTING_SKELETON_COUNT,
  type PropertyListingCardData,
  resolveListingTransactionForProperty,
} from "../../Search/components/PropertyListingCard";
import PFPagination from "../../../Components/pagination/PFPagination";
import companyLogo1 from "../../../assets/img/company_logos/1.png";
import companyLogo2 from "../../../assets/img/company_logos/2.png";
import {
  getCompletionStatusMasterData,
  getSavedProperties,
  removeAllSavedProperties,
  getSupportedUrlsMasterData,
  syncAuthUserSavedProperty,
  clearAuthUserSavedProperties,
  type NamedValueMaster,
  type PropertySearchApiProperty,
} from "../../../services/apiService";

type SavedRow = {
  card: PropertyListingCardData;
  /** Lowercase `completionStatus` from API for tab filter (matches master `value`). */
  completionFilterValue: string;
};

/** Mirrors API `COMPLETION_STATUS` when master fetch fails. */
const FALLBACK_COMPLETION_STATUS: NamedValueMaster[] = [
  { name: "Any", value: "any" },
  { name: "Off-Plan", value: "off-plan" },
  { name: "Ready", value: "ready" },
];

type ViewTypeTab = { label: string; filterValue: string | null };

type SupportedUrlMap = Record<string, unknown>;

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

function propertyCompletionFilterValue(property: PropertySearchApiProperty): string {
  const raw = (property as { completionStatus?: string }).completionStatus;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function mapSavedApiToCard(
  property: PropertySearchApiProperty,
  propertyImageBaseUrl?: string | null,
  agentImageBaseUrl?: string | null,
  developerLogoBaseUrl?: string | null,
  agencyLogoBaseUrl?: string | null
): PropertyListingCardData {
  const images = property.images ?? [];
  const primaryImageUrlRaw =
    images.find((i) => i?.isPrimary)?.url ?? images[0]?.url ?? "";
  const primaryImageUrl = resolveSupportedUrlPath(
    primaryImageUrlRaw,
    propertyImageBaseUrl
  );

  const locationText =
    property.location?.fullAddress ??
    [
      property.location?.building,
      property.location?.zone,
      property.location?.city,
    ]
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
  const hasBadges =
    !!badges.verified || !!badges.superAgent || !!badges.propertyType;
  const agentLanguagesLabel = Array.isArray(property.agent?.languages)
    ? property.agent.languages
        .map((lang) => String(lang?.name ?? lang?.nativeName ?? "").trim())
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    id: property._id ?? property.title ?? `${property.price ?? ""}`,
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
        agencyLogoBaseUrl
      );
      return resolved || undefined;
    })(),
    developerLogo: (() => {
      const resolved = resolveSupportedUrlPath(
        property.developer?.logo as unknown,
        developerLogoBaseUrl
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
    isSaved: true,
    propertyReference:
      (typeof property.referenceId === "string" && property.referenceId.trim()) ||
      (typeof property._id === "string" && property._id.trim()) ||
      undefined,
    agent: {
      name: property.agent?.fullName ?? "",
      image: (() => {
        const resolved = resolveSupportedUrlPath(
          property.agent?.profilePicture as unknown,
          agentImageBaseUrl
        );
        return resolved || (property.agent?.profilePicture as string) || companyLogo2;
      })(),
      listedDaysAgo,
      email: property.agent?.email ?? undefined,
      phoneNumber: property.agent?.phoneNumber ?? undefined,
      languagesLabel: agentLanguagesLabel || undefined,
      brokerLicenseNumber: property.agent?.brokerLicenseNumber ?? undefined,
    },
  };
}

function SavedProperties() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<string>("Any");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [savedRaw, setSavedRaw] = useState<PropertySearchApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(null);
  const [completionStatusMaster, setCompletionStatusMaster] = useState<NamedValueMaster[]>([]);
  const [hasLoadedSavedOnce, setHasLoadedSavedOnce] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllSuccessOpen, setDeleteAllSuccessOpen] = useState(false);
  const [deleteAllSuccessMessage, setDeleteAllSuccessMessage] = useState(
    "Deleted successfully"
  );

  const loadSaved = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const aggregated: PropertySearchApiProperty[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const resp = await getSavedProperties({
          page,
          limit: PROPERTY_LISTING_PAGE_SIZE,
          signal,
        });
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Failed to load saved properties"
          );
        }
        const list = resp?.data?.properties ?? [];
        if (Array.isArray(list)) aggregated.push(...list);
        const p = resp?.data?.pagination;
        totalPages =
          typeof p?.totalPages === "number" && Number.isFinite(p.totalPages) && p.totalPages >= 1
            ? p.totalPages
            : 1;
        page += 1;
      } while (page <= totalPages && !signal?.aborted);

      if (signal?.aborted) return;
      setSavedRaw(aggregated);
      setHasLoadedSavedOnce(true);
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
      setSavedRaw([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getCompletionStatusMasterData()
      .then((resp) => {
        if (!mounted) return;
        const list = resp.data?.completionStatus ?? [];
        setCompletionStatusMaster(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setCompletionStatusMaster([]);
      });
    return () => {
      mounted = false;
    };
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
    void loadSaved(ac.signal);
    return () => ac.abort();
  }, [loadSaved]);

  const propertyImageBaseUrl = (supportedUrls as { propertyUrl?: { img?: string } } | null)
    ?.propertyUrl?.img;
  const agentImageBaseUrl = (supportedUrls as { agentUrl?: { img?: string } } | null)?.agentUrl
    ?.img;
  const developerLogoBaseUrl = (supportedUrls as { developerUrl?: { img?: string } } | null)
    ?.developerUrl?.img;
  const agencyLogoBaseUrl = (supportedUrls as { agencyUrl?: { img?: string } } | null)?.agencyUrl
    ?.img;

  const viewTypeTabs: ViewTypeTab[] = useMemo(() => {
    const cleaned = completionStatusMaster.filter(
      (o) => String(o?.name ?? "").trim() && String(o?.value ?? "").trim()
    );
    const source = cleaned.length > 0 ? cleaned : FALLBACK_COMPLETION_STATUS;
    return source.map((o) => {
      const v = String(o.value).trim().toLowerCase();
      const nameLower = String(o.name).trim().toLowerCase();
      const isAny = v === "any" || nameLower === "any";
      return {
        label: String(o.name).trim(),
        filterValue: isAny ? null : v,
      };
    });
  }, [completionStatusMaster]);

  useEffect(() => {
    const idx = viewTypeTabs.findIndex((t) => t.label === activeStatus);
    if (idx < 0) setActiveStatus(viewTypeTabs[0]?.label ?? "Any");
  }, [viewTypeTabs, activeStatus]);

  const rows: SavedRow[] = useMemo(() => {
    return savedRaw.map((p) => ({
      card: mapSavedApiToCard(
        p,
        propertyImageBaseUrl,
        agentImageBaseUrl,
        developerLogoBaseUrl,
        agencyLogoBaseUrl
      ),
      completionFilterValue: propertyCompletionFilterValue(p),
    }));
  }, [
    savedRaw,
    propertyImageBaseUrl,
    agentImageBaseUrl,
    developerLogoBaseUrl,
    agencyLogoBaseUrl,
  ]);

  const filteredRows = useMemo(() => {
    const tab = viewTypeTabs.find((t) => t.label === activeStatus);
    if (!tab || tab.filterValue === null) return rows;
    return rows.filter((r) => r.completionFilterValue === tab.filterValue);
  }, [rows, activeStatus, viewTypeTabs]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PROPERTY_LISTING_PAGE_SIZE)
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * PROPERTY_LISTING_PAGE_SIZE;
  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + PROPERTY_LISTING_PAGE_SIZE
  );

  const shouldShowSkeleton =
    loading && (!hasLoadedSavedOnce || savedRaw.length === 0);

  const handleFavoriteChange = useCallback((nextSaved: boolean, propertyId: string) => {
    if (!nextSaved) {
      setSavedRaw((prev) => prev.filter((p) => String(p._id) !== propertyId));
    } else {
      void loadSaved();
    }
  }, [loadSaved]);

  const hasProperties = filteredRows.length > 0;

  const handleDeleteAll = useCallback(async () => {
    if (!hasProperties || deletingAll) return;
    setDeleteAllError(null);
    setDeletingAll(true);
    try {
      const resp = await removeAllSavedProperties();
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string"
            ? resp.message
            : "Failed to remove saved properties"
        );
      }
      setSavedRaw([]);
      clearAuthUserSavedProperties();
      setCurrentPage(1);
      setDeleteAllSuccessMessage(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "Deleted successfully"
      );
      setDeleteAllSuccessOpen(true);
    } catch (error) {
      setDeleteAllError(
        error instanceof Error ? error.message : "Failed to remove saved properties"
      );
    } finally {
      setDeletingAll(false);
    }
  }, [hasProperties, deletingAll]);

  return (
    <div className="pf-account__page pf-saved-properties">
      <Box className="pf-saved-properties__header">
        <Typography variant="h2" className="pf-saved-properties__title">
          Saved properties
        </Typography>

        <Box className="pf-saved-properties__header-actions">
          <Box className="pf-saved-properties__tabs">
            <Tabs
              value={Math.max(0, viewTypeTabs.findIndex((t) => t.label === activeStatus))}
              onChange={(_event, newIndex) => {
                const tab = viewTypeTabs[newIndex];
                if (tab) {
                  setActiveStatus(tab.label);
                  setCurrentPage(1);
                }
              }}
              className="pf-search-listing__tabsComponent pf-saved-properties__tabsComponent"
              TabIndicatorProps={{ style: { display: "none" } }}
              variant="standard"
            >
              {viewTypeTabs.map((tab) => (
                <Tab
                  key={tab.label}
                  label={tab.label}
                  className="pf-search-listing__tab"
                  disableRipple
                  disableFocusRipple
                />
              ))}
            </Tabs>
          </Box>

          <Button
            variant="outlined"
            className="pf-saved-properties__delete-btn"
            disabled={!hasProperties || loading || deletingAll}
            onClick={() => void handleDeleteAll()}
          >
            Delete all properties
          </Button>
        </Box>
      </Box>

      {deleteAllError ? (
        <Box py={1}>
          <Typography variant="body2" color="error">
            {deleteAllError}
          </Typography>
        </Box>
      ) : null}

      <Snackbar
        open={deleteAllSuccessOpen}
        autoHideDuration={3000}
        onClose={() => setDeleteAllSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setDeleteAllSuccessOpen(false)}
          sx={{ width: "100%" }}
        >
          {deleteAllSuccessMessage}
        </Alert>
      </Snackbar>

      {shouldShowSkeleton ? (
        <Box className="pf-saved-properties__list pf-search-listing__property-list">
          {Array.from({ length: PROPERTY_LISTING_SKELETON_COUNT }).map((_, index) => (
            <PropertyListingCardSkeleton key={`saved-skeleton-${index}`} />
          ))}
        </Box>
      ) : loadError ? (
        <Box className="pf-saved-properties__empty" py={4}>
          <Typography variant="body1" color="error" gutterBottom>
            {loadError}
          </Typography>
          <Button variant="contained" onClick={() => void loadSaved()}>
            Try again
          </Button>
        </Box>
      ) : hasProperties ? (
        <>
          <Box className="pf-saved-properties__list">
            {paginatedRows.map(({ card }) => (
              <PropertyListingCard
                key={String(card.id)}
                property={card}
                onPropertyClick={() =>
                  navigate(`/propertydrilldown/${encodeURIComponent(String(card.id))}`, {
                    state: { propertyId: String(card.id) },
                  })
                }
                defaultFavorite
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </Box>

          <PFPagination
            className="pf-saved-properties__pagination"
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <Box className="pf-saved-properties__empty">
          <Typography variant="h6" className="pf-saved-properties__empty-title">
            {savedRaw.length > 0
              ? "No saved properties match this filter."
              : "You haven’t saved anything yet."}
          </Typography>
          {savedRaw.length === 0 ? (
            <Button
              variant="contained"
              className="pf-saved-properties__save-btn"
              onClick={() => navigate("/searchlisting")}
            >
              Save a property
            </Button>
          ) : null}
        </Box>
      )}
    </div>
  );
}

export default SavedProperties;
