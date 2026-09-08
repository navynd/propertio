import {
  DownArrowIcon,
  PfOrangeLogoIcon,
  HeaderLogoIcon,
  SearchIcon as SearchSvgIcon,
  HeartIcon,
  RightArrowBlackIcon,
  SearchIcon,
  LocationIcon,
  LeftArrowIcon,
  DownArrowIconBlack,
  SearchFilterIcon,
  MobileMenuIcon,
  MobileCloseIcon,
  BoldLocationIcon,
  RightArrowIcon,
  ModalCloseIcon,
} from "./parts/icon";
import {
  type AmenityMaster,
  type FurnishedStatusMaster,
  type ListingTypeMaster,
  type PropertyTypeMaster,
  AUTH_USER_UPDATED_EVENT,
  clearAuthSession,
  getAuthUser,
  getRefreshToken,
  getAmenitiesAndFurnishedStatusMasterData,
  getListingTypesMasterData,
  getPropertyTypesMasterData,
  getSupportedUrlsMasterData,
  userLogout,
} from "../services/apiService";
import PFContainer from "./container/PFContainer";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Stack,
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Collapse,
  useMediaQuery,
  Typography,
  Badge,
  Select,
  FormControl,
  Switch,
} from "@mui/material";
import "../assets/styles/Header.scss";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import LoggedinPersonImage from "../assets/img/profileless.png";

type ExploreItem = { label: string; href?: string } | string;

type SearchProperty = {
  id: number;
  name: string;
  location: string;
  price: string;
  category?: string;
  position?: { lat: number; lng: number };
  image: string;
};

type LanguageOption = {
  code: string;
  label: string;
};

const languageOptions: LanguageOption[] = [
  { code: "EN", label: "English" },
  // { code: "AR", label: "العربية" },
];

type AuthUser = {
  id?: string;
  _id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string | null;
  savedProperties?: unknown[];
};

type SupportedUrlMap = Record<string, unknown>;

const resolveProfilePictureUrl = (
  profilePicture: string | null | undefined,
  supportedUrls: SupportedUrlMap | null
) => {
  if (!profilePicture) return undefined;
  if (/^https?:\/\//i.test(profilePicture)) return profilePicture;

  const base = (supportedUrls as { userUrl?: { img?: unknown } } | null)
    ?.userUrl?.img;
  const baseStr = typeof base === "string" ? base.trim() : "";

  if (!baseStr) return profilePicture;
  const baseNormalized = baseStr.replace(/\/$/, "");
  const pathNormalized = profilePicture.replace(/^\//, "");
  return `${baseNormalized}/${pathNormalized}`;
};

type SearchListingLocationState = {
  appliedFilters: string[];
  propertyFor: string[];
  propertyTypes: string[];
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  amenities: string[];
  nearbySearchEnabled: boolean;
  onlyCommercialProperties: boolean;
  category: string;
  /** Free-text for API `keyword` on /properties/search and /projects/search. */
  keyword?: string;
};

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

function findNewProjectsListingType(
  options: ListingTypeMaster[]
): ListingTypeMaster | null {
  return options.find((o) => isNewProjectsListingType(o)) ?? null;
}

function resolveListingTypeForNavLabel(
  label: string,
  options: ListingTypeMaster[]
): ListingTypeMaster | null {
  if (!options.length) return null;
  const norm = (s?: string) => (s ?? "").toLowerCase().trim();
  const key = label.toLowerCase().trim();

  if (key === "buy") {
    return (
      options.find(
        (o) => norm(o.slug) === "buy" && norm(o.category) !== "commercial"
      ) ??
      options.find((o) => norm(o.name) === "buy") ??
      options[0]
    );
  }

  if (key === "rent") {
    return (
      options.find(
        (o) =>
          norm(o.slug) === "rent" && !norm(o.name).includes("commercial")
      ) ??
      options.find((o) => norm(o.name) === "rent") ??
      options[0]
    );
  }

  if (key === "commercial") {
    return (
      options.find((o) => norm(o.slug) === "commercial-buy") ??
      options.find((o) => norm(o.slug) === "commercial-rent") ??
      options.find((o) => norm(o.category) === "commercial") ??
      options.find((o) => norm(o.name).includes("commercial")) ??
      options[0]
    );
  }

  return options[0];
}

function findCommercialBuyListingType(
  options: ListingTypeMaster[]
): ListingTypeMaster | null {
  if (!options.length) return null;
  const norm = (s?: string) => (s ?? "").toLowerCase().trim();
  return (
    options.find((o) => norm(o.slug) === "commercial-buy") ??
    options.find((o) => norm(o.slug) === "commercial_buy") ??
    options.find(
      (o) =>
        norm(o.name).includes("commercial") && norm(o.name).includes("buy")
    ) ??
    options.find(
      (o) =>
        norm(o.category) === "commercial" &&
        (norm(o.slug).includes("buy") || norm(o.name).includes("buy"))
    ) ??
    null
  );
}

function buildSearchListingNavigationState(
  params: {
    listingType: ListingTypeMaster | null;
    propertyTypeId: string;
    bedrooms: number;
    bathrooms: number;
    furnishingValue: string;
    amenityId: string;
    onlyCommercial: boolean;
    nearbySearch: boolean;
    category?: string;
    keyword?: string;
  },
  ctx: {
    propertyTypeOptions: PropertyTypeMaster[];
    furnishingOptions: FurnishedStatusMaster[];
    amenitiesOptions: AmenityMaster[];
  }
): SearchListingLocationState {
  const isProj = isNewProjectsListingType(params.listingType);
  const appliedFilters: string[] = [];

  if (params.listingType?.name) {
    appliedFilters.push(params.listingType.name);
  }

  if (params.propertyTypeId) {
    const pt = ctx.propertyTypeOptions.find(
      (o) => (o._id || o.id) === params.propertyTypeId
    );
    if (pt?.name) appliedFilters.push(pt.name);
  }

  if (params.bedrooms > 0) {
    appliedFilters.push(`${params.bedrooms} bedroom`);
  }

  if (params.bathrooms > 0) {
    appliedFilters.push(`${params.bathrooms} bathroom`);
  }

  if (!isProj && params.furnishingValue) {
    const fname =
      ctx.furnishingOptions.find((o) => o.value === params.furnishingValue)
        ?.name ?? params.furnishingValue;
    appliedFilters.push(fname);
  }

  if (params.amenityId) {
    const am = ctx.amenitiesOptions.find((o) => o._id === params.amenityId);
    if (am?.name) appliedFilters.push(am.name);
  }

  if (params.nearbySearch) {
    appliedFilters.push("Search near by");
  }

  if (params.onlyCommercial) {
    appliedFilters.push("Only commercial properties");
  }

  const category = params.category ?? "All";
  if (category && category !== "All") {
    appliedFilters.push(category);
  }

  const listingId =
    params.listingType?._id || params.listingType?.id
      ? String(params.listingType._id || params.listingType.id)
      : "";

  const keyword = params.keyword?.trim();

  return {
    appliedFilters,
    propertyFor: listingId ? [listingId] : [],
    propertyTypes: params.propertyTypeId ? [params.propertyTypeId] : [],
    bedrooms: params.bedrooms,
    bathrooms: params.bathrooms,
    furnishing: isProj ? "" : params.furnishingValue,
    amenities: params.amenityId ? [params.amenityId] : [],
    nearbySearchEnabled: params.nearbySearch,
    onlyCommercialProperties: params.onlyCommercial,
    category,
    ...(keyword ? { keyword } : {}),
  };
}

const defaultMobileSearchProperties: SearchProperty[] = [
  {
    id: 1,
    name: "Albero",
    location: "Dubai, Dubai Creek Harbour",
    price: "9M AED",
    category: "Rent",
    image:
      "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Vida Residences Hillside",
    location: "Dubai, Dubai Hills Estate",
    price: "8.5M AED",
    category: "Buy",
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Rosehill by Emaar",
    location: "Dubai, Dubai Hills Estate",
    price: "7.2M AED",
    category: "New projects",
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=600&auto=format&fit=crop",
  },
];

type HeaderProps = {
  exploreItems?: ExploreItem[];
  searchProperties?: SearchProperty[];
};

function Header({ exploreItems, searchProperties = [] }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Check if we're on home page - only show white header on scroll
  const isHomePage = location.pathname === "/" || location.pathname === "/about";
  // On all other pages (except home), always show white sticky header
  const shouldShowWhiteHeader = !isHomePage || isSticky;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [supportedUrls, setSupportedUrls] = useState<SupportedUrlMap | null>(
    null
  );
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    languageOptions[0]
  );
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState<string>("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [mobileFilterPropertyFor, setMobileFilterPropertyFor] =
    useState<string>("");
  const [mobileFilterPropertyType, setMobileFilterPropertyType] =
    useState<string>("");
  const [mobileFilterBedsBaths, setMobileFilterBedsBaths] = useState<
    number | ""
  >("");
  const [mobileFilterFurnishing, setMobileFilterFurnishing] =
    useState<string>("");
  const [mobileFilterAmenities, setMobileFilterAmenities] =
    useState<string>("");
  const [isMobileAdvancedFiltersOpen, setIsMobileAdvancedFiltersOpen] =
    useState<boolean>(false);
  const isMobile = useMediaQuery("(max-width:960px)");
  const [
    isMobileOnlyCommercialProperties,
    setIsMobileOnlyCommercialProperties,
  ] = useState<boolean>(false);
  const isMobileViewport = useMediaQuery("(max-width:960px)");
  const isMenuOpen = Boolean(anchorEl);
  const isProfileMenuOpen = Boolean(profileAnchorEl);
  const showMobileSearch = isMobileViewport && isMobileSearchOpen;
  const isLanguageMenuOpen = Boolean(languageAnchorEl);

  const [propertyForOptions, setPropertyForOptions] = useState<
    ListingTypeMaster[]
  >([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<
    PropertyTypeMaster[]
  >([]);
  const bedsBathsOptions = [1, 2, 3, 4, 5, 6, 7];
  const [furnishingOptions, setFurnishingOptions] = useState<
    FurnishedStatusMaster[]
  >([]);
  const [amenitiesOptions, setAmenitiesOptions] = useState<AmenityMaster[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadListingTypes = async () => {
      try {
        const resp = await getListingTypesMasterData();
        const options = (resp.data.items ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        if (!mounted) return;
        setPropertyForOptions(options);
        const firstId = options[0]?._id || options[0]?.id;
        if (firstId) setMobileFilterPropertyFor(String(firstId));
      } catch {
        // leave dropdown empty
      }
    };

    loadListingTypes();

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
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );
        if (!mounted) return;
        setPropertyTypeOptions(options);
      } catch {
        // leave dropdown empty
      }
    };

    loadPropertyTypes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAmenitiesAndFurnishedStatus = async () => {
      try {
        const resp = await getAmenitiesAndFurnishedStatusMasterData();
        const furnishedOptions = (resp.data.furnishedStatus ?? []).filter(
          (item) => !!item?.name?.trim() && !!item?.value?.trim()
        );
        const amenityOptions = (resp.data.amenities ?? []).filter(
          (item) => !!item?._id?.trim() && !!item?.name?.trim()
        );

        if (!mounted) return;
        setFurnishingOptions(furnishedOptions);
        setAmenitiesOptions(amenityOptions);
      } catch {
        // leave dropdown empty
      }
    };

    loadAmenitiesAndFurnishedStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const effectiveSearchProperties =
    searchProperties.length > 0
      ? searchProperties
      : defaultMobileSearchProperties;

  const mobileSearchResults = useMemo(() => {
    const query = mobileSearchQuery.trim().toLowerCase();
    if (!query) {
      // Show all properties by default when no search query
      return effectiveSearchProperties;
    }
    // Filter properties when there's a search query
    return effectiveSearchProperties.filter((property) => {
      return (
        property.name.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query)
      );
    });
  }, [searchProperties, mobileSearchQuery]);

  const masterDataContext = useMemo(
    () => ({
      propertyTypeOptions,
      furnishingOptions,
      amenitiesOptions,
    }),
    [propertyTypeOptions, furnishingOptions, amenitiesOptions]
  );

  const handleNavigateToSearchList = () => {
    const listingType =
      propertyForOptions.find(
        (o) =>
          String(o._id || o.id || "") === String(mobileFilterPropertyFor)
      ) ?? null;
    const bedsBathsNum =
      mobileFilterBedsBaths === "" ? 0 : mobileFilterBedsBaths;
    const bedrooms = isMobileOnlyCommercialProperties ? 0 : bedsBathsNum;
    const bathrooms = isMobileOnlyCommercialProperties ? 0 : bedsBathsNum;
    const state = buildSearchListingNavigationState(
      {
        listingType,
        propertyTypeId: mobileFilterPropertyType,
        bedrooms,
        bathrooms,
        furnishingValue: mobileFilterFurnishing,
        amenityId: mobileFilterAmenities,
        onlyCommercial: isMobileOnlyCommercialProperties,
        nearbySearch: false,
        keyword: mobileSearchQuery,
      },
      masterDataContext
    );
    if (listingType && isNewProjectsListingType(listingType)) {
      navigate("/newprojectlisting", { state });
    } else {
      navigate("/searchlisting", { state });
    }
  };

  useEffect(() => {
    if (showMobileSearch) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileSearch]);

  useEffect(() => {
    if (!showMobileSearch) {
      setMobileSearchQuery("");
    }
  }, [showMobileSearch]);

  useEffect(() => {
    // On all pages except home, always set sticky to true
    if (!isHomePage) {
      setIsSticky(true);
      return;
    }

    // On home page, only set sticky on scroll
    const handleScroll = () => {
      setIsSticky(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage]);

  useEffect(() => {
    // Check if user is logged in (check URL params or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("showLoginSuccess") === "true") {
      setIsLoggedIn(true);
      // Store in localStorage for persistence
      localStorage.setItem("isLoggedIn", "true");
    }
    // Check localStorage for persistent login state
    const storedLogin = localStorage.getItem("isLoggedIn");
    if (storedLogin === "true") {
      setIsLoggedIn(true);
    }

    const syncAuthUserFromStorage = () => {
      const storedUser = getAuthUser<AuthUser>();
      setAuthUser(storedUser);
    };

    syncAuthUserFromStorage();
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncAuthUserFromStorage);
    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncAuthUserFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await getSupportedUrlsMasterData();
        const items = resp.data.items;
        const map = Array.isArray(items)
          ? (items.reduce((acc, cur) => ({ ...acc, ...cur }), {}) as SupportedUrlMap)
          : (items as SupportedUrlMap);
        if (!mounted) return;
        setSupportedUrls(map);
      } catch {
        // optional; header falls back to default image
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const displayName =
    authUser?.fullName ||
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
    "Account";
  const displayEmail = authUser?.email || "";
  const avatarSrc =
    resolveProfilePictureUrl(authUser?.profilePicture, supportedUrls) ||
    LoggedinPersonImage;
  const savedPropertiesCount = authUser?.savedProperties?.length ?? 0;

  function handleExploreClick(event: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleMenuClose() {
    setAnchorEl(null);
  }

  function handleExploreNavItemClick(item: { label: string; href?: string }) {
    if (item.href) navigate(item.href);
  }

  function handleProfileClick(event: React.MouseEvent<HTMLElement>) {
    setProfileAnchorEl(event.currentTarget);
  }

  function handleProfileMenuClose() {
    setProfileAnchorEl(null);
  }

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    const authUser = getAuthUser<{ id?: string; _id?: string; email?: string }>();

    if (refreshToken) {
      try {
        await userLogout({
          refreshToken,
          email: authUser?.email,
          userId: authUser?.id || authUser?._id,
        });
      } catch {
        // Clear local session even if server-side logout fails.
      }
    }

    setIsLoggedIn(false);
    setProfileAnchorEl(null);
    clearAuthSession();
    navigate("/");
  }

  function handleLanguageClick(event: React.MouseEvent<HTMLButtonElement>) {
    setLanguageAnchorEl(event.currentTarget);
  }

  function handleLanguageMenuClose() {
    setLanguageAnchorEl(null);
  }

  function handleLanguageSelect(language: LanguageOption) {
    setSelectedLanguage(language);
    handleLanguageMenuClose();
  }

  const items: { label: string; href?: string }[] = (
    exploreItems ?? [
      { label: "Find Developers", href: "/finddevelopers" },
      { label: "Neighborhood guides", href: "/allcommunities" },
      { label: "Market trends", href: "/areainsight" },
      { label: "Blogs & tips", href: "/blog" },
      { label: "Price calculator", href: "/rentbuycal" },
    ]
  ).map((it) => (typeof it === "string" ? { label: it } : it));

  const navLinks = useMemo(
    () => [
      { label: "Buy", href: "/searchlisting" },
      { label: "Rent", href: "/searchlisting" },
      { label: "Commercial", href: "/searchlisting" },
      { label: "New projects", href: "/newprojectlisting" },
      { label: "Find agents", href: "/findagentorcompany" },
      { label: "Mortgages", href: "/mortgagecal" },
    ],
    []
  );

  const handleNavLinkClick = (link: { label: string; href: string }) => {
    if (link.href === "/findagentorcompany") {
      navigate(link.href);
      return;
    }

    if (link.href === "/newprojectlisting" || link.label === "New projects") {
      const lt = findNewProjectsListingType(propertyForOptions);
      const state = buildSearchListingNavigationState(
        {
          listingType: lt,
          propertyTypeId: "",
          bedrooms: 0,
          bathrooms: 0,
          furnishingValue: "",
          amenityId: "",
          onlyCommercial: false,
          nearbySearch: false,
        },
        masterDataContext
      );
      navigate("/newprojectlisting", { state });
      return;
    }

    if (link.href === "/searchlisting") {
      const lt = resolveListingTypeForNavLabel(
        link.label,
        propertyForOptions
      );
      const state = buildSearchListingNavigationState(
        {
          listingType: lt,
          propertyTypeId: "",
          bedrooms: 0,
          bathrooms: 0,
          furnishingValue: "",
          amenityId: "",
          onlyCommercial: false,
          nearbySearch: false,
        },
        masterDataContext
      );
      navigate("/searchlisting", { state });
      return;
    }

    if(link.href === "/mortgagecal") {
      navigate(link.href);
      return;
    }

    navigate(link.href);
  };

  const handleNavigateToLogin = () => {
    navigate("/login");
  };

  const handleNavigateToHome = () => {
    navigate("/");
  };

  const isExploreActive = items.some((item) => item.href === location.pathname);

  const isNavLinkActive = (link: { label: string; href: string }) => {
    if (location.pathname !== link.href) {
      if (link.href === "/newprojectlisting" && location.pathname === "/newprojectlisting") return true;
      return false;
    }
    if (link.href === "/searchlisting") {
      const state = location.state as SearchListingLocationState | undefined;
      if (!state) return link.label === "Buy";
      const filters = state.appliedFilters || [];
      const hasCommercial = state.onlyCommercialProperties || filters.some(f => f.toLowerCase().includes("commercial"));
      if (hasCommercial) return link.label === "Commercial";
      if (filters.some(f => f.toLowerCase() === "rent")) return link.label === "Rent";
      if (filters.some(f => f.toLowerCase() === "buy")) return link.label === "Buy";
      return link.label === "Buy";
    }
    return true;
  };


  return (
    <AppBar
      position="fixed"
      className={`pf-header${shouldShowWhiteHeader ? " pf-header--sticky" : ""
        }`}
      elevation={0}
      sx={{
        backgroundColor: shouldShowWhiteHeader ? "#ffffff" : "transparent",
        color: shouldShowWhiteHeader ? "#111827" : "#ffffff",
        transition:
          "background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
        boxShadow: shouldShowWhiteHeader
          ? "0 18px 40px rgba(15, 23, 42, 0.08)"
          : "none",
        borderBottom: shouldShowWhiteHeader
          ? "1px solid transparent"
          : "1px solid transparent",
      }} //1px solid rgba(226, 232, 240, 0.7)"
    >
      <Toolbar className="pf-header__toolbar" aria-label="Primary">
        <PFContainer className="pf-header__container">
          <Box
            className="pf-header__brand"
            component="a"
            href="#"
            sx={{ textDecoration: "none" }}
            aria-label="Estatehub Home"
            onClick={handleNavigateToHome}
          >
            {shouldShowWhiteHeader ? (
              <PfOrangeLogoIcon width={112} height={43} />
            ) : (
              <HeaderLogoIcon width={112} height={43} />
            )}
          </Box>

          {!isMobile && (
            <Stack
              direction="row"
              spacing={2}
              className="pf-header__nav"
              component="nav"
              aria-label="Site"
            >
              {navLinks.slice(0, 5).map((link) => {
                const active = isNavLinkActive(link);
                return (
                  <Button
                    key={link.label}
                    className="pf-header__navItem"
                    disableRipple
                    onClick={() => handleNavLinkClick(link)}
                    sx={active ? { color: "#EA3934 !important" } : {}}
                  >
                    {link.label}
                  </Button>
                );
              })}
              <Button
                className="pf-header__navItem pf-header__exploreBtn"
                disableRipple
                aria-haspopup="true"
                aria-controls={isMenuOpen ? "pf-explore-menu" : undefined}
                aria-expanded={isMenuOpen ? "true" : undefined}
                onClick={handleExploreClick}
                sx={isExploreActive ? { color: "#EA3934 !important" } : {}}
              >
                <Box
                  display="inline-flex"
                  alignItems="center"
                  gap={0.5}
                  sx={{
                    "--arrow-fill": shouldShowWhiteHeader ? "#111827" : "white",
                  }}
                >
                  <span>Explore</span>
                  <DownArrowIcon
                    width={10}
                    height={6}
                    className={`pf-downarrow-icon${isMenuOpen ? " pf-downarrow-icon--open" : ""
                      }`}
                    fill={shouldShowWhiteHeader ? (isExploreActive ? "#EA3934" : "#111827") : (isExploreActive ? "#EA3934" : "white")}
                  />
                </Box>
              </Button>
              <Menu
                id="pf-explore-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                MenuListProps={{ "aria-labelledby": "pf-explore-button" }}
                PaperProps={{
                  className: "pf-dropdown",
                  elevation: 0,
                }}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                disableScrollLock
              >
                {items.map((item) => (
                  <MenuItem
                    key={item.label}
                    onClick={() => {
                      handleMenuClose();
                      handleExploreNavItemClick(item);
                    }}
                    className="pf-dropdown__item"
                    sx={item.href === location.pathname ? { color: "#EA3934", fontWeight: "bold" } : {}}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                key="Mortgages"
                className="pf-header__navItem"
                disableRipple
                onClick={() => handleNavLinkClick({ label: "Mortgages", href: "/mortgagecal" })}
                sx={isNavLinkActive({ label: "Mortgages", href: "/mortgagecal" }) ? { color: "#EA3934 !important" } : {}}
              >
                {navLinks[5].label}
              </Button>
            </Stack>
          )}

          {!isMobile && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              className="pf-header__actions"
            >
              {!isLoggedIn ? (
                <Button
                  className="pf-header__cta"
                  variant="contained"
                  disableElevation
                  onClick={handleNavigateToLogin}
                >
                  Login your account
                </Button>
              ) : (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  className="pf-header__userSection"
                >
                  <IconButton className="pf-header__wishlist" disableRipple onClick={() => navigate("/account/savedproperties")}>
                    <Badge
                      badgeContent={savedPropertiesCount || 0}
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: "#EA3934",
                          color: "#ffffff",
                          fontSize: "10px",
                          minWidth: "18px",
                          height: "18px",
                          borderRadius: "9px",
                          padding: "0 4px",
                        },
                      }}
                    >
                      <HeartIcon
                        width={18}
                        height={15}
                        fill={shouldShowWhiteHeader ? "#222222" : "#ffffff"}
                      />
                    </Badge>
                  </IconButton>
                  <Button
                    className="pf-header__profile"
                    onClick={handleProfileClick}
                    disableRipple
                    sx={{
                      textTransform: "none",
                      color: "#111827",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      minWidth: "auto",
                      backgroundColor: "#F5F5F5",
                      "&:hover": {
                        backgroundColor: "#F5F5F5",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={avatarSrc}
                      alt={displayName}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        marginRight: 1,
                        objectFit: "cover",
                        border: "3px solid #ffffff",
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: "SemiBold, sans-serif",
                        fontSize: "13px",
                        marginRight: 0.5,
                      }}
                    >
                      {displayName}
                    </Typography>
                    <DownArrowIcon width={10} height={6} fill="#111827" />
                  </Button>
                </Stack>
              )}
              <Button
                className="pf-header__langSelect"
                id="pf-lang-button"
                aria-controls={isLanguageMenuOpen ? "pf-lang-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={isLanguageMenuOpen ? "true" : undefined}
                disableElevation
                onClick={handleLanguageClick}
                aria-label="Select language"
              >
                <span>{selectedLanguage.code}</span>
                <DownArrowIcon
                  width={10}
                  height={6}
                  fill={shouldShowWhiteHeader ? "#111827" : "#ffffff"}
                />
              </Button>
            </Stack>
          )}

          {/* Profile Menu - Desktop only */}
          {isLoggedIn && !isMobile && (
            <Menu
              anchorEl={profileAnchorEl}
              open={isProfileMenuOpen}
              onClose={handleProfileMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{
                className: "pf-header__profileMenu",
                sx: {
                  marginTop: "8px",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                  minWidth: "280px",
                },
              }}
            >
              <Box className="pf-header__profileMenuHeader">
                <Typography className="pf-header__profileName">
                  {displayName}
                </Typography>
                <Typography className="pf-header__profileEmail">
                  {displayEmail}
                </Typography>
              </Box>
              <Divider />
              <Box className="pf-header__profileMenuSection">
                <Typography className="pf-header__profileMenuSectionTitle">
                  My Activity
                </Typography>
                <MenuItem
                  className="pf-header__profileMenuItem"
                  onClick={() => {
                    navigate("/account/savedproperties");
                    handleProfileMenuClose();
                  }}
                >
                  <ListItemText primary="Saved properties" />
                  <RightArrowBlackIcon width={12} height={12} />
                </MenuItem>
                <MenuItem
                  className="pf-header__profileMenuItem"
                  onClick={() => {
                    navigate("/account/savedalerts");
                    handleProfileMenuClose();
                  }}
                >
                  <ListItemText primary="Search alerts" />
                  <RightArrowBlackIcon width={12} height={12} />
                </MenuItem>
                <MenuItem
                  className="pf-header__profileMenuItem"
                  onClick={() => {
                    navigate("/account/contactedproperties");
                    handleProfileMenuClose();
                  }}
                >
                  <ListItemText primary="Contacted properties" />
                  <RightArrowBlackIcon width={12} height={12} />
                </MenuItem>
              </Box>
              <Divider />
              <Box className="pf-header__profileMenuSection">
                <Typography className="pf-header__profileMenuSectionTitle">
                  Account
                </Typography>
                <MenuItem
                  className="pf-header__profileMenuItem"
                  onClick={() => {
                    navigate("/account/myprofile");
                    handleProfileMenuClose();
                  }}
                >
                  <ListItemText primary="My Profile" />
                  <RightArrowBlackIcon width={12} height={12} />
                </MenuItem>
                <MenuItem
                  className="pf-header__profileMenuItem pf-header__profileMenuItem--logout"
                  onClick={handleLogout}
                >
                  <ListItemText
                    primary="Logout"
                    primaryTypographyProps={{
                      sx: { color: "#EA3934" },
                    }}
                  />
                </MenuItem>
              </Box>
            </Menu>
          )}

          <Menu
            id="pf-lang-menu"
            anchorEl={languageAnchorEl}
            open={isLanguageMenuOpen}
            onClose={handleLanguageMenuClose}
            MenuListProps={{ "aria-label": "Language options" }}
            PaperProps={{
              className: "pf-dropdown",
              elevation: 0,
            }}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            disableScrollLock
          >
            {languageOptions.map((language) => (
              <MenuItem
                key={language.code}
                onClick={() => handleLanguageSelect(language)}
                className="pf-dropdown__item"
                selected={selectedLanguage.code === language.code}
              >
                {language.label}
              </MenuItem>
            ))}
          </Menu>

          {isMobile && (
            <Box className="pf-header__utilities">
              <IconButton
                className={`pf-header__searchToggle${shouldShowWhiteHeader
                  ? " pf-header__searchToggle--sticky"
                  : ""
                  }${isMobileSearchOpen ? " pf-header__searchToggle--active" : ""
                  }`}
                aria-label="Open search"
                onClick={() => setIsMobileSearchOpen(true)}
              >
                <SearchSvgIcon
                  width={24}
                  height={24}
                  fill={
                    isMobileSearchOpen
                      ? "#111827"
                      : shouldShowWhiteHeader
                        ? "#111827"
                        : "#ffffff"
                  }
                />
              </IconButton>
              <Button
                className="pf-header__mobileLangSelect"
                aria-label="Select language"
                onClick={handleLanguageClick}
                disableElevation
              // aria-controls={isLanguageMenuOpen ? "pf-lang-menu" : undefined}
              // aria-haspopup="true"
              // aria-expanded={isLanguageMenuOpen ? "true" : undefined}
              >
                <span>{selectedLanguage.code}</span>
                <DownArrowIcon
                  width={10}
                  height={6}
                  fill={shouldShowWhiteHeader ? "#111827" : "#ffffff"}
                  className="pf-header__mobileLangSelectIcon"
                />
              </Button>
              <IconButton
                className={`pf-header__mobileToggle${shouldShowWhiteHeader
                  ? " pf-header__mobileToggle--sticky"
                  : ""
                  }`}
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open navigation menu"
              >
                <MobileMenuIcon width={23} height={23} fill="#ffffff" />
              </IconButton>
            </Box>
          )}
        </PFContainer>
      </Toolbar>

      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{ className: "pf-header__drawer" }}
      >
        <Box className="pf-boxdrawer">
          <Box className="pf-header__drawerHeader">
            <HeaderLogoIcon width={110} height={40} />
            <Box className="pf-header__drawerControls">
              <IconButton
                className="pf-header__drawerSearch"
                aria-label="Open search"
                onClick={() => {
                  setIsMobileSearchOpen(true);
                  setIsDrawerOpen(false);
                }}
              >
                <SearchSvgIcon width={24} height={24} fill="#ffffff" />
              </IconButton>
              <Button
                className="pf-header__mobileLangSelect"
                aria-label="Select language"
                onClick={handleLanguageClick}
                disableElevation
                aria-controls={isLanguageMenuOpen ? "pf-lang-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={isLanguageMenuOpen ? "true" : undefined}
              >
                <span>{selectedLanguage.code}</span>
                <DownArrowIcon
                  width={10}
                  height={6}
                  fill="#ffffff"
                  // fill={shouldShowWhiteHeader ? "#111827" : "#ffffff"}
                  className="pf-header__mobileLangSelectIcon"
                />
              </Button>
              <IconButton
                className="pf-header__drawerClose"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close navigation menu"
              >
                <MobileCloseIcon width={24} height={24} fill="#ffffff" />
              </IconButton>
            </Box>
          </Box>
          {isLoggedIn && (
            <Box
              className="pf-header__drawerProfile"
              onClick={() => {
                navigate("/account/myprofile");
                setIsDrawerOpen(false);
              }}
            >
              <img
                src={avatarSrc}
                alt={displayName}
                className="pf-header__drawerProfileImage"
              />
              <Typography className="pf-header__drawerProfileName">
                {displayName}
              </Typography>
              <RightArrowIcon
                width={25}
                height={25}
                className="pf-header__drawerProfileArrow"
              />
            </Box>
          )}

          <Box className="pf-header__drawerNav">
            <List disablePadding>
              {navLinks.slice(0, 5).map((link) => {
                const active = isNavLinkActive(link);
                return (
                  <ListItem disablePadding key={link.label}>
                    <ListItemButton
                      className="pf-header__drawerItem"
                      onClick={() => {
                        setIsDrawerOpen(false);
                        handleNavLinkClick(link);
                      }}
                    >
                      <ListItemText 
                        primary={link.label} 
                        primaryTypographyProps={active ? { sx: { color: "#EA3934", fontWeight: "bold" } } : {}}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              <ListItem className="pf-header__explore" disablePadding>
                <ListItemButton
                  className={`pf-header__drawerHeading${isMobileExploreOpen
                    ? " pf-header__drawerHeading--expanded"
                    : ""
                    }`}
                  onClick={() => setIsMobileExploreOpen((prev) => !prev)}
                >
                  <ListItemText
                    primary="Explore"
                    primaryTypographyProps={{ fontWeight: 600, sx: isExploreActive ? { color: "#EA3934" } : {} }}
                  />
                  <DownArrowIcon
                    width={12}
                    height={7}
                    fill={isExploreActive ? "#EA3934" : "#ffffff"}
                    className={`pf-header-explore-icon pf-header__drawerHeadingIcon${isMobileExploreOpen
                      ? " pf-header__drawerHeadingIcon--open"
                      : ""
                      }`}
                  />
                </ListItemButton>
              </ListItem>
              <Collapse in={isMobileExploreOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {items.map((item) => (
                    <ListItem disablePadding key={item.label}>
                      <ListItemButton
                        className="pf-header__drawerSubItem"
                        onClick={() => {
                          setIsDrawerOpen(false);
                          handleExploreNavItemClick(item);
                        }}
                      >
                        <ListItemText 
                          primary={item.label} 
                          primaryTypographyProps={item.href === location.pathname ? { sx: { color: "#EA3934", fontWeight: "bold" } } : {}}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
              {/* <Divider className="pf-header__drawerDivider" /> */}

              <ListItem disablePadding key="Mortgages">
                <ListItemButton
                  className="pf-header__drawerItem"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleNavLinkClick({ label: "Mortgages", href: "/mortgagecal" });
                  }}
                >
                  <ListItemText 
                    primary={navLinks[5].label} 
                    primaryTypographyProps={isNavLinkActive({ label: "Mortgages", href: "/mortgagecal" }) ? { sx: { color: "#EA3934", fontWeight: "bold" } } : {}}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>

          {/* <Divider className="pf-header__drawerDivider pf-header__drawerDivider--end" /> */}

          <Box className="pf-header__drawerFooter">
            {isLoggedIn ? (
              <Button
                variant="contained"
                fullWidth
                className="pf-header__drawerCta"
                onClick={handleLogout}
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="contained"
                fullWidth
                className="pf-header__drawerCta"
                onClick={handleNavigateToLogin}
              >
                Login your account
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      {showMobileSearch && (
        <div className="pf-mobile-search" role="dialog" aria-modal="true">
          <div className="pf-mobile-search__panel">
            <div className="pf-mobile-search__controls">
              <button
                type="button"
                className="pf-mobile-search__back"
                onClick={() => setIsMobileSearchOpen(false)}
                aria-label="Go back"
              >
                <LeftArrowIcon width="27" height="27" />
              </button>

              <div className="pf-mobile-search__searchFieldWrapper">
                <div className="pf-mobile-search__searchField">
                  <SearchIcon className="pf-mobile-search__searchFieldIcon" />
                  <input
                    className="pf-mobile-search__input"
                    type="text"
                    placeholder="Search by city, community or building"
                    value={mobileSearchQuery}
                    onChange={(event) =>
                      setMobileSearchQuery(event.target.value)
                    }
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  className="pf-mobile-search__filter"
                  onClick={() => setMobileFilterOpen(true)}
                  aria-label="Open filters"
                >
                  <SearchFilterIcon width={16} height={16} />
                </button>
              </div>
            </div>

            <div className="pf-mobile-search__results">
              {mobileSearchResults.length === 0 ? (
                <Typography className="pf-mobile-search__empty">
                  No matches found. Try a different search.
                </Typography>
              ) : (
                mobileSearchResults.map((property) => (
                  <div
                    key={property.id}
                    className="pf-mobile-search__result"
                    onClick={() => {
                      handleNavigateToSearchList();
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    <img
                      src={property.image}
                      alt={property.name}
                      className="pf-mobile-search__resultImage"
                    />
                    <div className="pf-mobile-search__resultBody">
                      <Typography className="pf-mobile-search__resultTitle">
                        {property.name}
                      </Typography>
                      <div className="pf-mobile-search__resultLocation">
                        <LocationIcon width="14" height="14" />
                        <Typography className="pf-mobile-search__resultLocationText">
                          {property.location}
                        </Typography>
                      </div>
                      <Typography className="pf-mobile-search__resultLabel">
                        Launch price
                      </Typography>
                      <Typography className="pf-mobile-search__resultPrice">
                        {property.price}
                      </Typography>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* <button type="button" className="pf-mobile-search__submit">
            <SearchIcon className="pf-mobile-search__submitIcon" />
            <span>Search</span>
          </button> */}
        </div>
      )}

      {mobileFilterOpen && (
        <div className="pf-mobile-filter" role="dialog" aria-modal="true">
          <div
            className="pf-mobile-filter__overlay"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="pf-mobile-filter__panel">
            <div className="pf-mobile-filter__header">
              <Typography className="pf-mobile-filter__title">
                Filters
              </Typography>
              <button
                type="button"
                className="pf-mobile-filter__close"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <ModalCloseIcon width={15} height={15} fill="#111827" />
              </button>
            </div>

            <div className="pf-mobile-filter__content">
              <FormControl className="pf-mobile-filter__field" fullWidth>
                <Select
                  value={mobileFilterPropertyFor}
                  onChange={(e) =>
                    setMobileFilterPropertyFor(e.target.value as string)
                  }
                  displayEmpty
                  className="pf-mobile-filter__select"
                  renderValue={(value) => {
                    const label = propertyForOptions.find(
                      (opt) =>
                        String(opt._id || opt.id || "") === String(value)
                    )?.name;
                    return (
                      <Box className="pf-mobile-filter__selectValue">
                        <span className="pf-mobile-filter__selectLabel">
                          Property for
                        </span>
                        <span className="pf-mobile-filter__selectText">
                          {label?.trim() || "Select"}
                        </span>
                      </Box>
                    );
                  }}
                  IconComponent={() => (
                    <DownArrowIconBlack className="pf-mobile-filter__selectIcon" />
                  )}
                  MenuProps={{
                    PaperProps: {
                      className: "pf-mobile-filter__dropdown",
                    },
                  }}
                >
                  {propertyForOptions.map((opt) => (
                    <MenuItem
                      key={opt._id || opt.id || opt.slug || opt.name}
                      value={String(opt._id || opt.id || "")}
                    >
                      {opt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl className="pf-mobile-filter__field" fullWidth>
                <Select
                  value={mobileFilterPropertyType}
                  onChange={(e) =>
                    setMobileFilterPropertyType(e.target.value as string)
                  }
                  displayEmpty
                  className="pf-mobile-filter__select"
                  renderValue={(value) => (
                    <Box className="pf-mobile-filter__selectValue">
                      <span className="pf-mobile-filter__selectLabel">
                        Property type
                      </span>
                      <span className="pf-mobile-filter__selectText">
                        {propertyTypeOptions.find(
                          (opt) =>
                            String(opt._id || opt.id || "") === String(value)
                        )?.name || (value ? "" : "Select")}
                      </span>
                    </Box>
                  )}
                  IconComponent={() => (
                    <DownArrowIconBlack className="pf-mobile-filter__selectIcon" />
                  )}
                  MenuProps={{
                    PaperProps: {
                      className: "pf-mobile-filter__dropdown",
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select</em>
                  </MenuItem>
                  {propertyTypeOptions.map((opt) => (
                    <MenuItem
                      key={opt._id || opt.id || opt.slug || opt.name}
                      value={String(opt._id || opt.id || "")}
                    >
                      {opt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Beds & Baths */}
              <FormControl
                className="pf-mobile-filter__field pf-mobile-filter__field--beds-baths"
                fullWidth
                sx={{
                  display: isMobileOnlyCommercialProperties ? "none" : "flex",
                }}
              >
                <Select
                  value={
                    mobileFilterBedsBaths === ""
                      ? ""
                      : String(mobileFilterBedsBaths)
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setMobileFilterBedsBaths(
                      v === "" ? "" : Number(v)
                    );
                  }}
                  displayEmpty
                  className="pf-mobile-filter__select"
                  renderValue={(value) => (
                    <Box className="pf-mobile-filter__selectValue">
                      <span className="pf-mobile-filter__selectLabel">
                        Beds & Baths
                      </span>
                      <span className="pf-mobile-filter__selectText">
                        {value === "" || value === undefined
                          ? "Select"
                          : `${value} Bed | ${value} Bath`}
                      </span>
                    </Box>
                  )}
                  IconComponent={() => (
                    <DownArrowIconBlack className="pf-mobile-filter__selectIcon" />
                  )}
                  MenuProps={{
                    PaperProps: {
                      className: "pf-mobile-filter__dropdown",
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select</em>
                  </MenuItem>
                  {bedsBathsOptions.map((opt) => (
                    <MenuItem key={opt} value={String(opt)}>
                      {`${opt} Bed | ${opt} Bath`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <div className="pf-search__filterToggle pf-search__filterToggle--popular">
                <Switch
                  checked={isMobileOnlyCommercialProperties}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsMobileOnlyCommercialProperties(checked);
                    if (!propertyForOptions.length) return;
                    if (checked) {
                      const lt = findCommercialBuyListingType(
                        propertyForOptions
                      );
                      const id = lt?._id || lt?.id;
                      if (id) setMobileFilterPropertyFor(String(id));
                    } else {
                      const lt = resolveListingTypeForNavLabel(
                        "buy",
                        propertyForOptions
                      );
                      const id = lt?._id || lt?.id;
                      if (id) setMobileFilterPropertyFor(String(id));
                    }
                  }}
                  className="pf-search__commercial-switch"
                />
                <span className="pf-search__filterLabel pf-search__filterLabel--toggle">
                  Only commercial properties
                </span>
              </div>

              <div className="pf-mobile-filter__advanced-container">
                <button
                  type="button"
                  className="pf-mobile-filter__advanced-toggle"
                  onClick={() =>
                    setIsMobileAdvancedFiltersOpen((prev) => !prev)
                  }
                >
                  <span>Advanced filters</span>
                  <DownArrowIcon
                    width={12}
                    height={7}
                    className={`pf-mobile-filter__advanced-icon${isMobileAdvancedFiltersOpen
                      ? " pf-mobile-filter__advanced-icon--open"
                      : ""
                      }`}
                    fill="#0832ae"
                  />
                </button>
                {isMobileAdvancedFiltersOpen && (
                  <div className="pf-mobile-filter__advanced">
                    <div className="pf-mobile-filter__advanced-row">
                      <Typography className="pf-mobile-filter__advanced-label">
                        Furnishing
                      </Typography>
                      <FormControl
                        className="pf-mobile-filter__advanced-control"
                        fullWidth
                      >
                        <Select
                          value={mobileFilterFurnishing}
                          onChange={(e) =>
                            setMobileFilterFurnishing(e.target.value as string)
                          }
                          displayEmpty
                          className="pf-mobile-filter__advanced-select"
                          renderValue={(value) => {
                            if (!value) return "Select";
                            const selected = furnishingOptions.find(
                              (opt) => opt.value === value
                            );
                            return selected?.name || "";
                          }}
                          IconComponent={() => (
                            <DownArrowIconBlack className="pf-mobile-filter__selectIcon" />
                          )}
                          MenuProps={{
                            PaperProps: {
                              className: "pf-mobile-filter__dropdown",
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Select</em>
                          </MenuItem>
                          {furnishingOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    <div className="pf-mobile-filter__advanced-row">
                      <Typography className="pf-mobile-filter__advanced-label">
                        Amenities
                      </Typography>
                      <FormControl
                        className="pf-mobile-filter__advanced-control"
                        fullWidth
                      >
                        <Select
                          value={mobileFilterAmenities}
                          onChange={(e) =>
                            setMobileFilterAmenities(e.target.value as string)
                          }
                          displayEmpty
                          className="pf-mobile-filter__advanced-select"
                          renderValue={(value) => {
                            if (!value) return "Select";
                            const selected = amenitiesOptions.find(
                              (opt) => opt._id === value
                            );
                            return selected?.name || "";
                          }}
                          IconComponent={() => (
                            <DownArrowIconBlack className="pf-mobile-filter__selectIcon" />
                          )}
                          MenuProps={{
                            PaperProps: {
                              className: "pf-mobile-filter__dropdown",
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Select</em>
                          </MenuItem>
                          {amenitiesOptions.map((opt) => (
                            <MenuItem key={opt._id} value={opt._id}>
                              {opt.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    <button
                      type="button"
                      className="pf-mobile-filter__nearby-btn"
                    >
                      <BoldLocationIcon
                        width={14}
                        height={14}
                        stroke="#222222"
                      />
                      Search near by
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="contained"
                className="pf-mobile-filter__apply"
                onClick={() => {
                  handleNavigateToSearchList();
                  setMobileFilterOpen(false);
                  setIsMobileSearchOpen(false);
                  setIsDrawerOpen(false);
                }}
              >
                Apply filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppBar>
  );
}

export default Header;
