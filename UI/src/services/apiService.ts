import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://propertio-apiservices.onrender.com/api").replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token (if any) to authenticated requests.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    const existingHeaders = config.headers as unknown as Record<
      string,
      string | undefined
    >;
    config.headers = {
      ...existingHeaders,
      Authorization: `Bearer ${token}`,
    } as unknown as typeof config.headers;
  }
  return config;
});

export type VerificationChannel = "email" | "phone";

export interface SignupRequestPayload {
  firstName?: string;
  lastName?: string;
  password: string;
  country?: string;
  email?: string;
  phoneNumber?: string;
}

interface SignupResponseData {
  verificationId: string;
  expiresInMinutes: number;
  channel: VerificationChannel;
}

interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface VerifySignupPayload {
  verificationId: string;
  code?: string;
  firebaseIdToken?: string;
}

export interface VerifySignupResponseData {
  user: unknown;
  token: string;
}

export const requestSignup = (
  payload: SignupRequestPayload
): Promise<ApiResponse<SignupResponseData>> => {
  return apiClient
    .post<ApiResponse<SignupResponseData>>("/auth/signup/request", payload)
    .then((response) => response.data);
};

export const verifySignup = (
  payload: VerifySignupPayload
): Promise<ApiResponse<VerifySignupResponseData>> => {
  return apiClient
    .post<ApiResponse<VerifySignupResponseData>>("/auth/signup/verify", payload)
    .then((response) => response.data);
};

type ApiEnvelope<T> = {
  success?: boolean;
  status?: boolean;
  message?: string;
  data: T;
};

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";
const IS_LOGGED_IN_KEY = "isLoggedIn";

/** Dispatched when `authUser` in localStorage is updated (header, badges, avatar). */
export const AUTH_USER_UPDATED_EVENT = "pf-auth-user-updated";

function dispatchAuthUserUpdated(user: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_USER_UPDATED_EVENT, { detail: user })
  );
}

export const mergeAuthUser = (
  patch: Record<string, unknown>
): Record<string, unknown> | null => {
  const current = getAuthUser<Record<string, unknown>>();
  if (!current) return null;
  const next = { ...current, ...patch };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
  dispatchAuthUserUpdated(next);
  return next;
};

type SavedPropertyEntry =
  | string
  | { property?: string | { toString(): string }; savedAt?: string };

function savedPropertyEntryId(entry: SavedPropertyEntry): string {
  if (typeof entry === "string") return entry;
  const prop = entry?.property;
  if (prop == null) return "";
  return typeof prop === "string" ? prop : String(prop);
}

/** Keep header wishlist badge in sync after save/unsave APIs. */
export const syncAuthUserSavedProperty = (
  propertyId: string,
  saved: boolean
): void => {
  const current = getAuthUser<{ savedProperties?: SavedPropertyEntry[] }>();
  if (!current) return;

  const id = String(propertyId).trim();
  if (!id) return;

  const list = Array.isArray(current.savedProperties)
    ? [...current.savedProperties]
    : [];
  const index = list.findIndex((entry) => savedPropertyEntryId(entry) === id);

  if (saved) {
    if (index < 0) {
      list.push({ property: id, savedAt: new Date().toISOString() });
    }
  } else if (index >= 0) {
    list.splice(index, 1);
  } else {
    return;
  }

  mergeAuthUser({ savedProperties: list });
};

export const clearAuthUserSavedProperties = (): void => {
  mergeAuthUser({ savedProperties: [] });
};

/** Sync profile fields returned from profile / picture APIs into stored auth user. */
export const syncAuthUserFromProfileApi = (
  user: Record<string, unknown> | null | undefined
): void => {
  if (!user || typeof user !== "object") return;
  const patch: Record<string, unknown> = {};
  if ("profilePicture" in user) patch.profilePicture = user.profilePicture;
  if ("firstName" in user) patch.firstName = user.firstName;
  if ("lastName" in user) patch.lastName = user.lastName;
  if ("fullName" in user) patch.fullName = user.fullName;
  if ("phoneNumber" in user) patch.phoneNumber = user.phoneNumber;
  if ("phoneCode" in user) patch.phoneCode = user.phoneCode;
  if ("country" in user) patch.country = user.country;
  if (Array.isArray(user.savedProperties)) {
    patch.savedProperties = user.savedProperties;
  }
  if (Object.keys(patch).length > 0) {
    mergeAuthUser(patch);
  }
};

export const setAuthSession = (
  tokens: UserTokens,
  user?: unknown
) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem(IS_LOGGED_IN_KEY, "true");
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    dispatchAuthUserUpdated(user);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(IS_LOGGED_IN_KEY);
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getAuthUser = <T = unknown>(): T | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const shouldCollectPhoneAndCountry = (user: unknown): boolean => {
  const u = user as {
    phoneNumber?: string | null;
    country?: string | { _id?: string; id?: string } | null;
  } | null;

  const hasPhone = Boolean(u?.phoneNumber && `${u.phoneNumber}`.trim());
  const country = u?.country;
  const hasCountry =
    Boolean(typeof country === "string" && country.trim()) ||
    Boolean(
      country &&
      typeof country === "object" &&
      (((country as { _id?: string })._id || "").trim() ||
        ((country as { id?: string }).id || "").trim())
    );

  return !hasPhone || !hasCountry;
};

// ============================ USER AUTH API START ============================
// Includes:
// - Email/phone login
// - User registration
// - Social login (Google/Apple)
// - OTP send/verify
// - Password reset
// - Token refresh (rotation)
// - Logout

export interface UserLoginRequest {
  email?: string;
  phoneNumber?: string;
  password: string;
  rememberMe?: boolean;
}

export const userLogin = (
  payload: UserLoginRequest
): Promise<
  ApiEnvelope<{
    user: unknown;
    tokens: UserTokens;
  }>
> => {
  return apiClient.post("/auth/users/login", payload).then((r) => r.data);
};

export interface UserRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  authProvider?: "email" | "google" | "apple";
}

export const userRegister = (
  payload: UserRegisterRequest
): Promise<ApiEnvelope<{ user: unknown }>> => {
  return apiClient.post("/auth/users/register", payload).then((r) => r.data);
};

export interface UserSocialLoginRequest {
  provider: "google" | "apple";
  token: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  user?: unknown;
}

export const userSocialLogin = (
  payload: UserSocialLoginRequest
): Promise<
  ApiEnvelope<{
    user: unknown;
    tokens: UserTokens;
  }>
> => {
  return apiClient.post("/auth/users/social-login", payload).then((r) => r.data);
};

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  countryId?: string;
  phoneCode?: string;
}

export type UserProfileCountry = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  phoneCode?: string;
  flag?: string;
  isActive?: boolean;
};

export type UserProfile = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** Full E.164-style number stored by the API (includes dial code). */
  phoneNumber?: string;
  /** Dial code only, e.g. +971 */
  phoneCode?: string | null;
  /** Local number digits without country code — use for profile input display. */
  phoneNumberWithoutCode?: string | null;
  country?: UserProfileCountry | string | null;
  profilePicture?: string | null;
};

export const userGetProfile = (): Promise<
  ApiEnvelope<{ user: UserProfile; hasUnreadNotifications?: boolean }>
> => {
  return apiClient.get("/users/profile").then((r) => r.data);
};

export const userUpdateProfile = (
  payload: UpdateUserProfileRequest
): Promise<ApiEnvelope<{ user: unknown }>> => {
  return apiClient.put("/users/profile", payload).then((r) => r.data);
};

export type UploadProfilePictureResponseData = {
  baseUrl?: string;
  baseUrls?: { images?: string };
  uploads?: { images?: Array<{ url?: string; filename?: string; path?: string }> };
  user?: UserProfile;
};

export const userUploadProfilePicture = (
  file: File
): Promise<ApiEnvelope<UploadProfilePictureResponseData>> => {
  const formData = new FormData();
  formData.append("profilePicture", file);
  return apiClient
    .post<ApiEnvelope<UploadProfilePictureResponseData>>(
      "/users/upload-profile-picture",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    .then((r) => r.data);
};

export const userRemoveProfilePicture = (): Promise<
  ApiEnvelope<UploadProfilePictureResponseData>
> => {
  const formData = new FormData();
  formData.append("removeProfilePicture", "true");
  return apiClient
    .post<ApiEnvelope<UploadProfilePictureResponseData>>(
      "/users/upload-profile-picture",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    .then((r) => r.data);
};

export interface MasterCountry {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  phoneCode?: string;
  dialCode?: string;
  flag?: string;
}

export const getCountriesMasterData = (): Promise<ApiEnvelope<{ items: MasterCountry[] }>> => {
  return apiClient
    .get("/master-data", { params: { type: "countries" } })
    .then((r) => {
      const raw = r.data;
      // Handle a few possible shapes:
      // - { data: { items: [...] } }
      // - { data: { countries: [...] } }
      // - { data: [...] }
      const maybeData = raw?.data;
      const countries =
        maybeData?.items ||
        maybeData?.countries ||
        maybeData ||
        [];
      return {
        ...raw,
        data: { items: countries as MasterCountry[] },
      } as ApiEnvelope<{ items: MasterCountry[] }>;
    });
};

/** `GET /master-data?types=services` — matches API `SERVICES_NEEDED` entries. */
export type ServiceNeededMaster = { name: string; value: string };

export type MasterLanguageRow = {
  _id?: string;
  name?: string;
  code?: string;
  nativeName?: string;
};

export type AgentSearchApiItem = {
  _id: string;
  name?: string;
  profilePicture?: string | null;
  agentType?: string;
  /** Populated JobTitles (API `specialization` ref). */
  specialization?: { _id?: string; title?: string | null; description?: string | null } | null;
  ratings?: { average?: number; totalCount?: number };
  nationality?: {
    _id?: string;
    name?: string;
  } | null;
  languages?: Array<{
    _id?: string;
    name?: string;
    code?: string;
    nativeName?: string | null;
  }>;
  responseTime?: string;
  statistics?: { totalSaleProperties?: number; totalRentProperties?: number };
  agency?: { _id?: string; name?: string; logo?: string | null } | null;
};

export type AgentSearchPagination = {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

/** Services, languages, countries, and supported URL bases for agent/company images. */
export const getAgentSearchMasterBundle = (): Promise<
  ApiEnvelope<{
    services: ServiceNeededMaster[];
    languages: MasterLanguageRow[];
    countries: MasterCountry[];
    supportedUrls: SupportedUrls;
  }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "services,languages,countries,supportedurls" } })
    .then((r) => {
      const raw = r.data;
      const d = (raw?.data ?? {}) as Record<string, unknown>;
      const su =
        (d.supportedUrls as SupportedUrls | undefined) ??
        (d.items as SupportedUrls | undefined) ??
        {};
      const countriesRaw = (d.countries ?? d.items ?? []) as MasterCountry[] | unknown;
      const countries = Array.isArray(countriesRaw) ? countriesRaw : [];
      const servicesRaw = d.services as ServiceNeededMaster[] | unknown;
      const languagesRaw = d.languages as MasterLanguageRow[] | unknown;
      return {
        ...raw,
        data: {
          services: Array.isArray(servicesRaw) ? servicesRaw : [],
          languages: Array.isArray(languagesRaw) ? languagesRaw : [],
          countries,
          supportedUrls: su,
        },
      } as ApiEnvelope<{
        services: ServiceNeededMaster[];
        languages: MasterLanguageRow[];
        countries: MasterCountry[];
        supportedUrls: SupportedUrls;
      }>;
    });
};

export const searchAgents = (params: {
  name?: string;
  location?: string;
  serviceNeeded?: string;
  language?: string;
  nationality?: string;
  agentType?: "agent" | "superagent" | "all";
  agencyId?: string;
  minRating?: number;
  propertyType?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ApiEnvelope<{ items: AgentSearchApiItem[]; pagination: AgentSearchPagination }>> => {
  return apiClient
    .get<ApiEnvelope<{ items: AgentSearchApiItem[]; pagination: AgentSearchPagination }>>(
      "/agents/search",
      {
        params: {
          name: params.name,
          location: params.location,
          serviceNeeded: params.serviceNeeded,
          language: params.language,
          nationality: params.nationality,
          agentType: params.agentType ?? "all",
          agencyId: params.agencyId,
          minRating: params.minRating,
          propertyType: params.propertyType,
          page: params.page,
          limit: params.limit,
        },
        signal: params.signal,
      }
    )
    .then((res) => res.data);
};

/** `GET /agents/:id` — public agent profile (`data` payload). */
export type AgentProfileApiAward = {
  title?: string;
  description?: string;
  awardedBy?: string;
  year?: number;
  image?: string | null;
  addedAt?: string;
};

export type AgentProfileApiTrackRecord = {
  /** Property or project name (table title). */
  propertyName?: string;
  /** City / zone line under the title. */
  locationArea?: string;
  /** @deprecated Use propertyName — kept for older API responses. */
  location?: string;
  dealClosedDate?: string;
  dealType?: string;
  bedrooms?: number;
  propertyType?: { name?: string; slug?: string } | null;
};

export type AgentProfileApiExpertiseArea = {
  location?: string;
  locationName?: string;
  description?: string;
  totalDeals?: number;
  rentDeals?: number;
  saleDeals?: number;
  averageRating?: number;
  ratingsCount?: number;
  totalRevenue?: number;
  listingImage?: string | null;
  locationDetails?: {
    name?: string;
    slug?: string;
    coverImage?: string | null;
    gallery?: string[];
    stats?: unknown;
  } | null;
};

export type AgentProfileApiAgency = {
  _id?: string;
  name?: string;
  logo?: string | null;
  description?: string;
  website?: string;
  address?: unknown;
  ratings?: { average?: number; totalCount?: number };
};

export type AgentProfileApiData = {
  _id: string;
  shareLink?: string | null;
  name?: string;
  profilePicture?: string | null;
  agentType?: string;
  specialization?: { _id?: string; title?: string | null; description?: string | null } | null;
  experience?: string | number | null;
  experienceSince?: string | null;
  brokerLicenseNumber?: string | null;
  ratings?: { average?: number; totalCount?: number; breakdown?: Record<string, number> };
  responseTime?: string | null;
  nationality?: { _id?: string; name?: string | null } | null;
  languages?: Array<{ _id?: string; name?: string; code?: string; nativeName?: string | null }>;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  isWhatsappPrimary?: boolean;
  description?: string | null;
  aboutMe?: string | null;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  statistics?: {
    totalDealsClosed?: number;
    totalRevenue?: number;
    totalSaleProperties?: number;
    totalRentProperties?: number;
    dealsClosedSales?: number;
    dealsClosedRent?: number;
    totalRevenueSales?: number;
    totalRevenueRent?: number;
    [key: string]: unknown;
  };
  /** Award objects or image filename / full URL strings from API. */
  awards?: Array<AgentProfileApiAward | string>;
  trackRecords?: AgentProfileApiTrackRecord[];
  expertiseAreas?: AgentProfileApiExpertiseArea[];
  agency?: AgentProfileApiAgency | null;
  // properties?: {...................................................................................................................................................................................................................................................................................................................................................................................................................................................................
  //   items: unknown[];
  //   pagination?: { total?: number; totalPages?: number; page?: number; limit?: number };
  // };
};

export const getAgentProfile = (
  id: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<AgentProfileApiData>> => {
  return apiClient
    .get<ApiEnvelope<AgentProfileApiData>>(`/agents/${encodeURIComponent(id)}`, {
      signal,
    })
    .then((res) => res.data);
};

export type AgencySearchApiItem = {
  _id: string;
  name?: string;
  logo?: string | null;
  orn?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  statistics?: {
    totalActiveListings?: number;
    totalInactiveListings?: number;
    totalSaleListings?: number;
    totalRentListings?: number;
  };
  totalAgents?: number;
  totalSuperAgents?: number;
  ratings?: { average?: number; totalCount?: number };
  nationality?: {
    _id?: string;
    name?: string;
    code?: string;
    flag?: string;
    phoneCode?: string | null;
  } | null;
};

export const searchAgencies = (params: {
  name?: string;
  location?: string;
  serviceNeeded?: string;
  nationality?: string;
  minRating?: number;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ApiEnvelope<{ items: AgencySearchApiItem[]; pagination: AgentSearchPagination }>> => {
  return apiClient
    .get<ApiEnvelope<{ items: AgencySearchApiItem[]; pagination: AgentSearchPagination }>>(
      "/agency/search",
      {
        params: {
          name: params.name,
          location: params.location,
          serviceNeeded: params.serviceNeeded,
          nationality: params.nationality,
          minRating: params.minRating,
          page: params.page,
          limit: params.limit,
        },
        signal: params.signal,
      }
    )
    .then((res) => res.data);
};

export type AgencyProfileApiData = {
  _id: string;
  shareLink?: string | null;
  name?: string;
  logo?: string | null;
  orn?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  email?: string;
  phoneNumber?: string;
  description?: string | null;
  website?: string | null;
  foundedYear?: number | null;
  aboutUs?: string | null;
  statistics?: {
    totalActiveListings?: number;
    totalInactiveListings?: number;
    totalAgents?: number;
    totalSuperAgents?: number;
    [key: string]: unknown;
  };
  ratings?: { average?: number; totalCount?: number };
  nationality?: unknown;
  totalAgents?: number;
  totalSuperAgents?: number;
  awards?: unknown[];
  listingsByLocation?: unknown[];
};

export const getAgencyProfile = (
  id: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<AgencyProfileApiData>> => {
  return apiClient
    .get<ApiEnvelope<AgencyProfileApiData>>(`/agency/${encodeURIComponent(id)}`, {
      signal,
    })
    .then((r) => r.data);
};

export interface ListingTypeMaster {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  transaction?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export const getListingTypesMasterData = (): Promise<
  ApiEnvelope<{ items: ListingTypeMaster[] }>
> => {
  return apiClient
    .get("/master-data", { params: { type: "listingtypes" } })
    .then((r) => {
      const raw = r.data;
      const maybeData = raw?.data;
      const listingTypes =
        maybeData?.items ||
        maybeData?.listingTypes ||
        maybeData?.listingtypes ||
        maybeData ||
        [];
      return {
        ...raw,
        data: { items: listingTypes as ListingTypeMaster[] },
      } as ApiEnvelope<{ items: ListingTypeMaster[] }>;
    });
};

export interface PropertyTypeMaster {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  image?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  displayOrder?: number;
  totalListings?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export const getPropertyTypesMasterData = (): Promise<
  ApiEnvelope<{ items: PropertyTypeMaster[] }>
> => {
  return apiClient
    .get("/master-data", { params: { type: "propertytypes" } })
    .then((r) => {
      const raw = r.data;
      const maybeData = raw?.data;
      const propertyTypes =
        maybeData?.items ||
        maybeData?.propertyTypes ||
        maybeData?.propertytypes ||
        maybeData ||
        [];
      return {
        ...raw,
        data: { items: propertyTypes as PropertyTypeMaster[] },
      } as ApiEnvelope<{ items: PropertyTypeMaster[] }>;
    });
};

export interface FurnishedStatusMaster {
  name: string;
  value: string;
}

export interface AmenityMaster {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  category?: string;
  icon?: string;
  image?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface NamedValueMaster {
  name: string;
  value: string;
}

export const getAmenitiesAndFurnishedStatusMasterData = (): Promise<
  ApiEnvelope<{ amenities: AmenityMaster[]; furnishedStatus: FurnishedStatusMaster[] }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "amenities,furnishedstatus" } })
    .then((r) => {
      const raw = r.data;
      const maybeData = raw?.data ?? {};
      return {
        ...raw,
        data: {
          amenities: (maybeData.amenities ?? []) as AmenityMaster[],
          furnishedStatus: (maybeData.furnishedStatus ??
            maybeData.furnishedstatus ??
            []) as FurnishedStatusMaster[],
        },
      } as ApiEnvelope<{
        amenities: AmenityMaster[];
        furnishedStatus: FurnishedStatusMaster[];
      }>;
    });
};

export const getListingFilterMasterData = (): Promise<
  ApiEnvelope<{
    listingTypes: ListingTypeMaster[];
    propertyTypes: PropertyTypeMaster[];
    postedBy: NamedValueMaster[];
    furnishedStatus: FurnishedStatusMaster[];
    amenities: AmenityMaster[];
    sqftAreaSizes: NamedValueMaster[];
    virtualViewingTypes: NamedValueMaster[];
    priceRange: NamedValueMaster[];
    deliveryDates: NamedValueMaster[];
  }>
> => {
  return apiClient
    .get("/master-data", {
      params: {
        types:
          "listingtypes,propertytypes,postedby,furnishedstatus,amenities,sqftareasizes,virtualviewingtypes,pricerange,deliverydates",
      },
    })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          listingTypes: (data.listingTypes ?? data.listingtypes ?? []) as ListingTypeMaster[],
          propertyTypes: (data.propertyTypes ?? data.propertytypes ?? []) as PropertyTypeMaster[],
          postedBy: (data.postedBy ?? data.postedby ?? []) as NamedValueMaster[],
          furnishedStatus: (data.furnishedStatus ?? data.furnishedstatus ?? []) as FurnishedStatusMaster[],
          amenities: (data.amenities ?? []) as AmenityMaster[],
          sqftAreaSizes: (data.sqftAreaSizes ?? data.sqftareasizes ?? []) as NamedValueMaster[],
          virtualViewingTypes: (data.virtualViewingTypes ??
            data.virtualviewingtypes ??
            []) as NamedValueMaster[],
          priceRange: (data.priceRange ?? data.pricerange ?? []) as NamedValueMaster[],
          deliveryDates: (data.deliveryDates ?? data.deliverydates ?? []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{
        listingTypes: ListingTypeMaster[];
        propertyTypes: PropertyTypeMaster[];
        postedBy: NamedValueMaster[];
        furnishedStatus: FurnishedStatusMaster[];
        amenities: AmenityMaster[];
        sqftAreaSizes: NamedValueMaster[];
        virtualViewingTypes: NamedValueMaster[];
        priceRange: NamedValueMaster[];
        deliveryDates: NamedValueMaster[];
      }>;
    });
};

/** Completion status only (`GET /master-data?type=completionstatus`). */
export const getCompletionStatusMasterData = (): Promise<
  ApiEnvelope<{ completionStatus: NamedValueMaster[] }>
> => {
  return apiClient
    .get("/master-data", { params: { type: "completionstatus" } })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          completionStatus: (data.completionStatus ?? data.completionstatus ?? []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{ completionStatus: NamedValueMaster[] }>;
    });
};

/** Master data for property search listing (sort + completion tabs). */
export const getPropertySearchListingMasterData = (): Promise<
  ApiEnvelope<{
    sortByProperty: NamedValueMaster[];
    completionStatus: NamedValueMaster[];
  }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "sortbyproperty,completionstatus" } })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          sortByProperty: (data.sortByProperty ?? data.sortbyproperty ?? []) as NamedValueMaster[],
          completionStatus: (data.completionStatus ?? data.completionstatus ?? []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{
        sortByProperty: NamedValueMaster[];
        completionStatus: NamedValueMaster[];
      }>;
    });
};

export const getAlertFrequenciesMasterData = (): Promise<
  ApiEnvelope<{ alertFrequencies: NamedValueMaster[] }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "alertfrequencies" } })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          alertFrequencies: (data.alertFrequencies ??
            data.alertfrequencies ??
            []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{ alertFrequencies: NamedValueMaster[] }>;
    });
};

export type CreateSearchAlertRequestBody = {
  alertName?: string;
  /** ListingType ObjectId */
  alertType: string;
  searchCriteria: {
    location?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    priceRange?: { min?: number; max?: number };
    amenities?: string[];
    furnished?: string;
    completionStatus?: "off-plan" | "ready" | "all";
    petFriendly?: boolean;
    waterfront?: boolean;
  };
  /** Examples: daily, hourly, every-3-days, weekly, off */
  frequency?: string;
};

export type CreateSearchAlertResponseData = {
  _id: string;
  alertName?: string;
  alertType: string;
  searchCriteria: Record<string, unknown>;
  frequency: string;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
};

export const createSearchAlert = (
  body: CreateSearchAlertRequestBody
): Promise<ApiEnvelope<CreateSearchAlertResponseData>> => {
  return apiClient
    .post<ApiEnvelope<CreateSearchAlertResponseData>>("/users/alerts/create", body)
    .then((r) => r.data);
};

export type SearchAlertListItem = {
  _id: string;
  alertName?: string;
  alertType: string;
  searchCriteria: Record<string, unknown>;
  frequency: string;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
  newMatchesCount?: number;
};

export type SearchAlertsListResponse = {
  items: SearchAlertListItem[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
};

export const getSearchAlerts = (params?: {
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ApiEnvelope<SearchAlertsListResponse>> => {
  return apiClient
    .get<ApiEnvelope<SearchAlertsListResponse>>("/users/alerts", {
      params: { page: params?.page, limit: params?.limit },
      signal: params?.signal,
    })
    .then((r) => r.data);
};

export const updateSearchAlert = (
  alertId: string,
  body: { frequency?: string; alertName?: string; isActive?: boolean }
): Promise<ApiEnvelope<CreateSearchAlertResponseData>> => {
  return apiClient
    .put<ApiEnvelope<CreateSearchAlertResponseData>>(
      `/users/alerts/${encodeURIComponent(alertId)}`,
      body
    )
    .then((r) => r.data);
};

export const deleteSearchAlert = (
  alertId: string
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .delete<ApiEnvelope<unknown>>(`/users/alerts/${encodeURIComponent(alertId)}`)
    .then((r) => r.data);
};

export const deleteAllSearchAlerts = (): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .delete<ApiEnvelope<unknown>>("/users/alerts/delete-all")
    .then((r) => r.data);
};

/** Master data for project search listing (sort only; type = `sortbyproject`). */
export const getProjectSearchListingMasterData = (): Promise<
  ApiEnvelope<{
    sortByProject: NamedValueMaster[];
  }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "sortbyproject" } })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          sortByProject: (data.sortByProject ?? data.sortbyproject ?? []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{
        sortByProject: NamedValueMaster[];
      }>;
    });
};

export const getResidencyStatusMasterData = (): Promise<
  ApiEnvelope<{
    residencyStatus: NamedValueMaster[];
  }>
> => {
  return apiClient
    .get("/master-data", { params: { types: "residencystatus" } })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          residencyStatus: (data.residencyStatus ??
            data.residencystatus ??
            []) as NamedValueMaster[],
        },
      } as ApiEnvelope<{ residencyStatus: NamedValueMaster[] }>;
    });
};

export const getMortgageQuoteMasterData = (): Promise<
  ApiEnvelope<{
    loanType: NamedValueMaster[];
    residencyStatus: NamedValueMaster[];
    buyingProcess: NamedValueMaster[];
    employmentStatus: NamedValueMaster[];
    countries: MasterCountry[];
  }>
> => {
  return apiClient
    .get("/master-data", {
      params: {
        types: "loantype,residencystatus,buyingprocess,employmentstatus,countries",
      },
    })
    .then((r) => {
      const raw = r.data;
      const data = raw?.data ?? {};
      return {
        ...raw,
        data: {
          loanType: (data.loanType ?? data.loantype ?? []) as NamedValueMaster[],
          residencyStatus: (data.residencyStatus ??
            data.residencystatus ??
            []) as NamedValueMaster[],
          buyingProcess: (data.buyingProcess ??
            data.buyingprocess ??
            []) as NamedValueMaster[],
          employmentStatus: (data.employmentStatus ??
            data.employmentstatus ??
            []) as NamedValueMaster[],
          countries: (data.countries ?? []) as MasterCountry[],
        },
      } as ApiEnvelope<{
        loanType: NamedValueMaster[];
        residencyStatus: NamedValueMaster[];
        buyingProcess: NamedValueMaster[];
        employmentStatus: NamedValueMaster[];
        countries: MasterCountry[];
      }>;
    });
};

/** Cities from `propertylocations` / `projectlocations` master (ListingSearchCity documents). */
export type ListingSearchCityMaster = {
  _id: string;
  cityKey?: string;
  displayName: string;
  projectCount?: number;
  propertyCount?: number;
};

export const getListingSearchCityMasterData = (
  kind: "property" | "project"
): Promise<ApiEnvelope<{ cities: ListingSearchCityMaster[] }>> => {
  const types = kind === "project" ? "projectlocations" : "propertylocations";
  return apiClient.get("/master-data", { params: { types } }).then((r) => {
    const raw = r.data;
    const data = raw?.data ?? {};
    const cities =
      kind === "project"
        ? (data.projectLocations ?? data.projectlocations ?? [])
        : (data.propertyLocations ?? data.propertylocations ?? []);
    return {
      ...raw,
      data: {
        cities: (Array.isArray(cities) ? cities : []) as ListingSearchCityMaster[],
      },
    } as ApiEnvelope<{ cities: ListingSearchCityMaster[] }>;
  });
};

export type DeveloperSearchApiItem = {
  _id: string;
  name: string;
  logo?: string | null;
  foundedYear?: number | null;
  description?: string | null;
  totalProjects?: number;
  completedProjects?: number;
};

export type DeveloperSearchResponseData = {
  items: DeveloperSearchApiItem[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
};

export const searchDevelopers = (params: {
  name?: string;
  /** ListingSearchCity ObjectId from `projectlocations` master. */
  locationId?: string;
  /** Legacy free-text or ListingSearchCity ObjectId (API supports both). */
  location?: string;
  page?: number;
  limit?: number;
}): Promise<ApiEnvelope<DeveloperSearchResponseData>> => {
  return apiClient.get("/developers/search", { params }).then((r) => r.data);
};

export type DeveloperProfileApiData = {
  _id?: string;
  id?: string;
  name?: string;
  logo?: string | null;
  foundedYear?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  aboutUs?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  statistics?: {
    totalProjects?: number;
    completedProjects?: number;
    ongoingProjects?: number;
    offPlanProjects?: number;
  } | null;
};

export const getDeveloperProfile = (
  id: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<DeveloperProfileApiData>> => {
  return apiClient
    .get(`/developers/${encodeURIComponent(id)}`, { signal })
    .then((r) => r.data);
};

export type PropertySearchRequestBody = {
  listingType: string;
  /** Free-text search across title, description, slug, location fields (API `keyword`). */
  keyword?: string;
  /** ListingSearchCity ObjectId from `propertylocations` master, or legacy free-text city/zone/building. */
  location?: string;
  propertyType?: string | string[];
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string | string[];
  furnished?: string;
  completionStatus?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  isVerified?: string;
  isCommercial?: boolean;
  nearLat?: number;
  nearLng?: number;
  nearRadiusKm?: number;
  /** Full AED amounts (API `parseFloat`). */
  priceMin?: number;
  priceMax?: number;
  /** Sqft (API filters `area.sqft`). */
  areaMin?: number;
  areaMax?: number;
  /** API values e.g. `agent`, `superagent` (see POSTED_BY constants). */
  postedBy?: string;
  /** When true, API ignores optional filters and resets sort to featured (listingType still required). */
  clearAll?: boolean;
  /** Restrict results to a single agency's properties (API `agencyId`). */
  agencyId?: string;
  /** Restrict results to a single agent's properties (API `agentId`). */
  agentId?: string;
};

export type PropertySearchPagination = {
  page: number;
  limit: number;
  totalPages: number;
  totalProperties: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PropertySearchApiProperty = {
  _id?: string;
  title?: string;
  images?: Array<{ url?: string; isPrimary?: boolean; order?: number }>;
  /** Total number of images for this property (may be > sliced images.length). */
  imagesCount?: number;
  location?: {
    fullAddress?: string;
    city?: string;
    zone?: string;
    building?: string;
    coordinates?: { type?: string; coordinates?: number[] } | null;
  };
  bedrooms?: number;
  bathrooms?: number;
  area?: { sqft?: number; sqm?: number };
  price?: number;
  /** Present for rent listings; yearly/monthly amounts in AED (or listing currency). */
  rentPricing?: { yearly?: number; monthly?: number } | null;
  currency?: string;
  listingType?: { _id?: string; name?: string; transaction?: string } | null;
  isVerified?: boolean;
  isSuperagentListing?: boolean;
  publishedAt?: string;
  propertyType?: { name?: string } | null;
  developer?: { name?: string; logo?: string } | null;
  agency?: { agencyName?: string; profilePicture?: string } | null;
  /** Listing regulatory / display reference when present. */
  referenceId?: string;
  agent?: {
    _id?: string;
    fullName?: string;
    profilePicture?: string;
    phoneNumber?: string;
    email?: string;
    agentType?: string;
    ratings?: { average?: number; totalCount?: number };
    brokerLicenseNumber?: string;
    languages?: Array<{ _id?: string; name?: string; code?: string; nativeName?: string }>;
  } | null;
  isSaved?: boolean;
};

export type PropertySearchResponseData = {
  properties: PropertySearchApiProperty[];
  pagination: PropertySearchPagination;
  appliedFilters?: Record<string, unknown>;
};

export const postPropertySearch = (
  body: PropertySearchRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<PropertySearchResponseData>> => {
  return apiClient
    .post<ApiEnvelope<PropertySearchResponseData>>("/properties/search", body, {
      signal,
    })
    .then((r) => r.data);
};

export type ProjectSearchRequestBody = {
  /** Free-text search across project name, slug, descriptions, location text (API `keyword`). */
  keyword?: string;
  /** ListingSearchCity ObjectId from `projectlocations` master, or legacy free-text. */
  location?: string;
  nearLat?: number;
  nearLng?: number;
  nearRadiusKm?: number;
  projectName?: string;
  developerId?: string;
  propertyType?: string | string[];
  bedrooms?: string;
  bathrooms?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  amenities?: string | string[];
  hasPostHandover?: string;
  isDldRegistered?: string;
  isVerified?: string;
  completionStatus?: string;
  deliveryDate?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  clearAll?: boolean;
};

export type ProjectSearchPagination = {
  page: number;
  limit: number;
  totalPages: number;
  totalProjects: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ProjectSearchApiImage = {
  url?: string;
  isPrimary?: boolean;
  order?: number;
};

export type ProjectSearchApiProject = {
  _id?: string;
  projectName?: string;
  slug?: string;
  description?: string;
  projectType?: string;
  completionStatus?: string;
  propertyTypes?: Array<{ _id?: string; name?: string }> | null;
  bedroomOptions?: number[] | null;
  bedroomRange?: { min?: number; max?: number } | null;
  launchPrice?:
    | number
    | null
    | { startingFrom?: number | null; currency?: string | null };
  governmentFees?: number | null;
  deliveryDate?: string | null;
  deliveryQuarter?: string | null;
  saleStarted?: string | null;
  paymentPlansCount?: number | null;
  hasPostHandoverPayment?: boolean | null;
  isDldRegistered?: boolean | null;
  isVerified?: boolean | null;
  isFeatured?: boolean | null;
  location?: {
    city?: string;
    zone?: string;
    address?: string;
    coordinates?: { type?: string; coordinates?: number[] } | null;
  } | null;
  images?: ProjectSearchApiImage[];
  amenities?: Array<{ _id?: string; name?: string; icon?: string }> | null;
  developer?: {
    _id?: string;
    name?: string;
    logo?: string;
    email?: string;
    phoneNumber?: string;
  } | null;
  totalUnits?: number | null;
  availableUnits?: number | null;
  views?: number | null;
  publishedAt?: string | null;
};

export type ProjectSearchResponseData = {
  projects: ProjectSearchApiProject[];
  pagination: ProjectSearchPagination;
  countByCity?: Array<{ city?: string; count?: number }>;
  appliedFilters?: Record<string, unknown>;
};

export const postProjectSearch = (
  body: ProjectSearchRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<ProjectSearchResponseData>> => {
  return apiClient
    .post<ApiEnvelope<ProjectSearchResponseData>>("/projects/search", body, {
      signal,
    })
    .then((r) => r.data);
};

export const getProjectById = (
  id: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .get<ApiEnvelope<unknown>>(`/projects/${encodeURIComponent(id)}`, {
      signal,
    })
    .then((r) => r.data);
};

export const getPropertyById = (
  id: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .get<ApiEnvelope<unknown>>(`/properties/${id}`, { signal })
    .then((r) => r.data);
};

export type PropertyPriceInsightTransaction = {
  propertyId?: string;
  dealId?: string;
  title: string;
  subtitle: string;
  date: string;
  price: number;
  priceFormatted: string;
  areaSqft: number;
  areaFormatted: string;
  currency: string;
  source?: "deal" | "listing";
};

export type PropertyPriceInsightsTabData = {
  transactions: PropertyPriceInsightTransaction[];
  totalCount: number;
};

export type PropertyPriceInsightsTrendsChart = {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  yAxisMax: number;
};

export type PropertyPriceInsightsTrends = {
  dealType: "sale" | "rent";
  summaryTitle: string;
  averagePrice: number | null;
  averagePriceFormatted: string | null;
  averagePricePerSqft: number | null;
  currency: string;
  priceCompareNote: string | null;
  priceDifferencePercent: number | null;
  period: string;
  periodOptions: string[];
  chart: PropertyPriceInsightsTrendsChart;
};

export type PropertyPriceInsightsData = {
  propertyId: string;
  sold: PropertyPriceInsightsTabData;
  rent: PropertyPriceInsightsTabData;
  trends: PropertyPriceInsightsTrends;
};

export const getPropertyPriceInsights = (
  id: string,
  signal?: AbortSignal,
  limit = 10
): Promise<ApiEnvelope<PropertyPriceInsightsData>> => {
  return apiClient
    .get<ApiEnvelope<PropertyPriceInsightsData>>(
      `/properties/price-insights/${encodeURIComponent(id)}`,
      { signal, params: { limit } }
    )
    .then((r) => r.data);
};

export type HistoricalTransactionDealType = "rent" | "sale";
export type HistoricalTransactionTimeframe =
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "ytd"
  | "3y";
export type HistoricalTransactionSortBy =
  | "newest"
  | "oldest"
  | "price-high"
  | "price-low";

export type HistoricalTransactionRow = {
  id: string;
  dealId: string;
  propertyId: string | null;
  locationName: string;
  locationSub: string;
  amount: number;
  amountFormatted: string;
  amountPerSqft: number | null;
  amountPerSqftFormatted: string | null;
  date: string;
  dateFrom?: string;
  dateTo?: string | null;
  dateLabel: string;
  contractStatus: "new" | "renewed" | "ready" | "off-plan";
  propertyType: string;
  bedrooms: number;
  bedroomsLabel: string;
  sizeSqft: number;
  sizeSqftFormatted: string;
  currency: string;
  city?: string;
  zone?: string;
};

export type HistoricalTransactionsSummary = {
  avgDealAmount: number | null;
  avgDealAmountFormatted: string | null;
  transactionCount: number;
  transactionCountFormatted: string;
  transactionCountChangePercent: number | null;
  newRentals?: {
    count: number;
    avgDealAmount: number | null;
    avgDealAmountFormatted: string | null;
  };
  renewedRent?: {
    count: number;
    avgDealAmount: number | null;
    avgDealAmountFormatted: string | null;
  };
};

export type HistoricalTransactionsParams = {
  dealType?: HistoricalTransactionDealType | "rented" | "sold";
  city?: string;
  location?: string;
  agency?: string;
  propertyTypeId?: string;
  bedrooms?: "studio" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "7+";
  priceMin?: number;
  priceMax?: number;
  timeframe?: HistoricalTransactionTimeframe;
  sortBy?: HistoricalTransactionSortBy;
  page?: number;
  limit?: number;
};

export type HistoricalTransactionsData = {
  dealType: HistoricalTransactionDealType;
  timeframe: HistoricalTransactionTimeframe;
  sortBy: HistoricalTransactionSortBy;
  filters: {
    city: string;
    location: string | null;
    agency: string | null;
    propertyTypeId: string | null;
    bedrooms: string | null;
    priceMin: number | null;
    priceMax: number | null;
  };
  summary: HistoricalTransactionsSummary;
  transactions: HistoricalTransactionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const getHistoricalTransactions = (
  params: HistoricalTransactionsParams,
  signal?: AbortSignal
): Promise<ApiEnvelope<HistoricalTransactionsData>> => {
  return apiClient
    .get<ApiEnvelope<HistoricalTransactionsData>>("/transactions/historical", {
      signal,
      params,
    })
    .then((r) => r.data);
};

export type MortgageResidencyStatus =
  | "uae-national"
  | "uae-resident"
  | "non-resident";

export type MortgageCalculateRequestBody = {
  purchasePrice: number;
  residencyStatus: MortgageResidencyStatus;
  downPayment?: number;
  loanPeriod: number;
  interestRate: number;
};

export type MortgageCalculateResponseData = {
  input: {
    purchasePrice: number;
    residencyStatus: MortgageResidencyStatus;
    downPayment: number;
    loanPeriod: number;
    interestRate: number;
  };
  calculated: {
    downPaymentPct: number;
    loanAmount: number;
    loanAmountPct: number;
    minDownPayment: number;
    minDownPaymentPct: number;
  };
  output: {
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
    interestPct: number;
    principalPct: number;
    principal: number;
    propertiesInBudget?: number;
  };
  sliderConfig?: {
    purchasePrice?: { min: number; max: number };
    downPayment?: { min: number; max: number };
    loanAmount?: { min: number; max: number };
    loanPeriod?: { min: number; max: number };
    interestRate?: { min: number; max: number };
  };
};

export const postMortgageCalculate = (
  body: MortgageCalculateRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<MortgageCalculateResponseData>> => {
  return apiClient
    .post<ApiEnvelope<MortgageCalculateResponseData>>(
      "/mortgages/calculate",
      body,
      { signal }
    )
    .then((r) => r.data);
};

export type MortgageUpfrontCostsRequestBody = {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  loanPeriod: number;
  interestRate: number;
  residencyStatus?: MortgageResidencyStatus | null;
};

export type MortgageUpfrontCostsResponseData = {
  paymentBreakdown: {
    downPayment: number;
    totalPurchaseCosts: number;
    landDepartmentFee: number;
    registrationTrusteeFee: number;
    mortgageRegistrationFee: number;
    realEstateAgencyFee: number;
    mortgageArrangementFee: number;
    adminFee: number;
  };
  calculationsBasedOn: {
    monthlyPayment: number;
    interestRate: number;
    loanAmount: number;
    loanDuration: string;
    residencyStatus: MortgageResidencyStatus | null;
  };
  totalAmountRequiredUpfront: number;
};

export const postMortgageUpfrontCosts = (
  body: MortgageUpfrontCostsRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<MortgageUpfrontCostsResponseData>> => {
  return apiClient
    .post<ApiEnvelope<MortgageUpfrontCostsResponseData>>(
      "/mortgages/upfront-costs",
      body,
      { signal }
    )
    .then((r) => r.data);
};

export type MortgageQuoteCalculatorSnapshot = {
  purchasePrice?: number;
  residencyStatus?: MortgageResidencyStatus;
  downPayment?: number;
  downPaymentPct?: number;
  loanAmount?: number;
  loanPeriod?: number;
  interestRate?: number;
  monthlyPayment?: number;
  totalInterest?: number;
};

export type MortgageGetQuoteRequestBody = {
  loanType: "buy" | "refinance";
  residencyStatus: MortgageResidencyStatus;
  buyingProcess?: "found-property" | "looking-for-property" | "just-exploring";
  propertyPrice?: number;
  employmentStatus: "salaried" | "self-employed";
  monthlySalary?: number;
  name: string;
  email: string;
  countryCode?: string;
  mobileNumber: string;
  calculatorSnapshot?: MortgageQuoteCalculatorSnapshot;
};

export type MortgageGetQuoteResponseData = {
  quoteId: string;
  sentTo: string;
};

export const postMortgageGetQuote = (
  body: MortgageGetQuoteRequestBody
): Promise<ApiEnvelope<MortgageGetQuoteResponseData>> => {
  return apiClient
    .post<ApiEnvelope<MortgageGetQuoteResponseData>>("/mortgages/get-quote", body)
    .then((r) => r.data);
};

export type RentVsBuyResidencyStatus =
  | "uae-national"
  | "uae-resident"
  | "non-resident";

export type RentVsBuyRequestBody = {
  purchasePrice: number;
  residencyStatus: RentVsBuyResidencyStatus;
  downPayment?: number;
  loanPeriod: number;
  interestRate?: number;
  annualRent?: number;
  monthlyRent?: number;
  comparisonYears?: number;
  rentIncreaseAnnualPct?: number;
  advanced?: {
    fixedMortgagePeriod?: number;
    fixedInterestRate?: number;
    reversionRate?: number;
    annualRentGrowthRate?: number;
    annualHomePriceGrowthRate?: number;
    maintenancePctOfPricePerYear?: number;
    annualHomeInsurance?: number;
    annualServiceCharges?: number;
    annualRenterInsurance?: number;
    includePurchaseFees?: boolean;
    homeAppreciationPctPerYear?: number;
    sellingCostPctOfSale?: number;
    mortgageProtectionMonthly?: number;
    rentAgentFeeAed?: number;
    rentGovernmentFeeAed?: number;
  };
};

export type RentVsBuyResponseData = {
  input: {
    purchasePrice: number;
    residencyStatus: RentVsBuyResidencyStatus;
    downPayment: number;
    loanPeriod: number;
    interestRate: number | null;
    loanAmount: number;
    monthlyRent: number;
    annualRent: number;
    comparisonYears: number;
    rentIncreaseAnnualPct: number;
  };
  mortgage: {
    monthlyPayment: number;
    monthlyPaymentAfterReversion?: number;
    twoPhase: boolean;
  };
  totals: {
    cumulativeRent: number;
    cumulativeBuy: number;
    netBuyCostAfterSale: number;
    differenceRentMinusBuy: number;
    differenceRentMinusNetBuy: number;
  };
  yearlyComparison: Array<{
    year: number;
    cumulativeRent: number;
    cumulativeBuy: number;
    rentMonthlyBase: number;
    rentMonthlyTotal: number;
    mortgagePaymentMonthly: number;
    buyMonthlyTotal: number;
    buyMonthlyBreakdown: {
      maintenance: number;
      homeInsurance: number;
      serviceCharges: number;
      mortgageProtection: number;
    };
  }>;
  paymentBreakdown: {
    monthly: {
      rentPayment: number;
      mortgagePrincipal: number;
      mortgageInterest: number;
      mortgageTotalPI: number;
      maintenance: number;
      homeInsurance: number;
      serviceCharges: number;
      mortgageProtection: number;
      ownerOccupierTotal: number;
    };
    overHorizon?: {
      horizonYears: number;
      initial?: {
        rent?: {
          agentFees?: number;
          governmentFees?: number;
          total?: number;
        };
        buy?: {
          downPayment?: number;
          agentFees?: number;
          bankFees?: number;
          governmentFees?: number;
          total?: number;
        };
      };
      recurring?: {
        rent?: {
          rentPayments?: number;
          renterInsurance?: number;
          total?: number;
        };
        buy?: {
          principal?: number;
          interest?: number;
          homeInsurance?: number;
          mortgageProtection?: number;
          insurancesTotal?: number;
          communityServiceCosts?: number;
          maintenanceCosts?: number;
          total?: number;
        };
      };
      netSale?: {
        buyOnly?: {
          estimatedSellingPrice?: number;
          sellingFees?: number;
          netSalePriceBeforeLoanPayoff?: number;
          estimatedLoanBalanceEnd?: number;
          cashFromSaleAfterLoan?: number;
        };
      };
      summary?: {
        netCostRent: number;
        netCostBuyAfterSale: number;
        breakEvenYear?: number | null;
      };
    };
  };
};

export const postRentVsBuyCalculate = (
  body: RentVsBuyRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<RentVsBuyResponseData>> => {
  return apiClient
    .post<ApiEnvelope<RentVsBuyResponseData>>("/rent-vs-buy/calculate", body, {
      signal,
    })
    .then((r) => r.data);
};

export type RentVsBuyPaymentBreakdownResponseData = {
  input: RentVsBuyResponseData["input"];
  paymentBreakdown: RentVsBuyResponseData["paymentBreakdown"];
  saleAssumptions?: Record<string, unknown>;
  purchaseFees?: Record<string, unknown> | null;
};

export const postRentVsBuyPaymentBreakdown = (
  body: RentVsBuyRequestBody,
  signal?: AbortSignal
): Promise<ApiEnvelope<RentVsBuyPaymentBreakdownResponseData>> => {
  return apiClient
    .post<ApiEnvelope<RentVsBuyPaymentBreakdownResponseData>>(
      "/rent-vs-buy/payment-breakdown",
      body,
      { signal }
    )
    .then((r) => r.data);
};

export type SupportedUrls = Record<string, unknown> | Array<Record<string, unknown>>;

export const getSupportedUrlsMasterData = (): Promise<ApiEnvelope<{ items: SupportedUrls }>> => {
  return apiClient
    .get("/master-data", { params: { type: "supportedurls" } })
    .then((r) => {
      const raw = r.data;
      const maybeData = raw?.data;
      const supported =
        maybeData?.items ||
        maybeData?.supportedUrls ||
        maybeData?.supportedurls ||
        maybeData ||
        {};
      return {
        ...raw,
        data: { items: supported as SupportedUrls },
      } as ApiEnvelope<{ items: SupportedUrls }>;
    });
};

export interface UserSendOtpRequest {
  email?: string;
  phoneNumber?: string;
}

export const userSendOtp = (
  payload: UserSendOtpRequest
): Promise<ApiEnvelope<{ channel?: string }>> => {
  return apiClient.post("/auth/users/send-otp", payload).then((r) => r.data);
};

export interface UserVerifyOtpRequest {
  email?: string;
  phoneNumber?: string;
  otp: string;
}

export const userVerifyOtp = (
  payload: UserVerifyOtpRequest
): Promise<ApiEnvelope<{ user: unknown; tokens?: UserTokens }>> => {
  return apiClient
    .post("/auth/users/verify-otp", payload)
    .then((r) => r.data);
};

export interface UserResetPasswordRequest {
  email?: string;
  phoneNumber?: string;
  newPassword: string;
}

export const userResetPassword = (
  payload: UserResetPasswordRequest
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .post("/auth/users/reset-password", payload)
    .then((r) => r.data);
};

export const userRefreshTokens = (
  payload: { refreshToken: string }
): Promise<
  ApiEnvelope<{
    user: unknown;
    tokens: UserTokens;
  }>
> => {
  return apiClient.post("/auth/users/refresh", payload).then((r) => r.data);
};

export const userLogout = (
  payload: { refreshToken?: string; email?: string; userId?: string }
): Promise<ApiEnvelope<unknown>> => {
  return apiClient.post("/auth/users/logout", payload).then((r) => r.data);
};
// ============================= USER AUTH API END =============================

// ============================= USER SAVED PROPERTIES API START =============================
export type SavedPropertiesPagination = {
  page: number;
  limit: number;
  totalPages: number;
  totalProperties: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SavedPropertiesResponseData = {
  properties: PropertySearchApiProperty[];
  pagination: SavedPropertiesPagination;
};

export const getSavedProperties = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<ApiEnvelope<SavedPropertiesResponseData>> => {
  return apiClient
    .get<ApiEnvelope<SavedPropertiesResponseData>>("/users/saved-properties", {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
      },
      signal: params?.signal,
    })
    .then((r) => r.data);
};

export const addSavedProperty = (
  propertyId: string
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .post<ApiEnvelope<unknown>>("/users/saved-properties/add", { propertyId })
    .then((r) => r.data);
};

export const removeSavedProperty = (
  propertyId: string
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .delete<ApiEnvelope<unknown>>(
      `/users/saved-properties/remove/${encodeURIComponent(propertyId)}`
    )
    .then((r) => r.data);
};

export const removeAllSavedProperties = (): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .delete<ApiEnvelope<unknown>>("/users/saved-properties/remove-all")
    .then((r) => r.data);
};
// ============================= USER SAVED PROPERTIES API END =============================

// ============================= USER CONTACTED PROPERTIES API START =============================
/** Populated property on `GET /users/contacted-properties` (shape follows API populate select). */
export type ContactedPropertyApiProperty = {
  _id?: string;
  title?: string;
  price?: number;
  currency?: string;
  location?: PropertySearchApiProperty["location"];
  images?: PropertySearchApiProperty["images"];
  status?: string;
  listingType?: string | { _id?: string; name?: string; slug?: string };
  furnishedStatus?: string;
  completionStatus?: string;
};

export type ContactedPropertyApiAgent = {
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  agency?: string | { agencyName?: string } | null;
};

export type ContactedPropertyApiEntry = {
  _id: string;
  property?: ContactedPropertyApiProperty | string | null;
  project?: unknown;
  agent?: ContactedPropertyApiAgent | string | null;
  contactMethod?: string;
  contactedAt?: string;
  isReported?: boolean;
};

export type ContactedPropertiesPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ContactedPropertiesResponseData = {
  properties: ContactedPropertyApiEntry[];
  pagination: ContactedPropertiesPagination;
};

export const getContactedProperties = (params?: {
  page?: number;
  limit?: number;
  contactMethod?: "call" | "email" | "whatsapp";
  signal?: AbortSignal;
}): Promise<ApiEnvelope<ContactedPropertiesResponseData>> => {
  return apiClient
    .get<ApiEnvelope<ContactedPropertiesResponseData>>("/users/contacted-properties", {
      params: {
        page: params?.page,
        limit: params?.limit,
        contactMethod: params?.contactMethod,
      },
      signal: params?.signal,
    })
    .then((r) => r.data);
};

export const deleteContactedProperties = (
  ids: string[]
): Promise<ApiEnvelope<unknown>> => {
  return apiClient
    .delete<ApiEnvelope<unknown>>("/users/contacted-properties", {
      data: { ids },
    })
    .then((r) => r.data);
};
// ============================= USER CONTACTED PROPERTIES API END =============================

// ============================= PUBLIC INQUIRY API START =============================
export type CreateInquiryType = "call" | "email" | "whatsapp";

export type CreateInquiryRequestBody = {
  propertyId?: string;
  projectId?: string;
  layoutId?: string;
  inquiryType: CreateInquiryType;
  agentId?: string;
  message?: string;
  /** Required for guests, optional for logged-in users. */
  name?: string;
  /** Required for guests, optional for logged-in users. */
  email?: string;
  /** Required for guests, optional for logged-in users. */
  phoneNumber?: string;
};

export type CreateInquiryResponseData = {
  inquiryId: string;
  inquiryType: CreateInquiryType;
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  agent?: {
    email?: string | null;
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
  };
  whatsappUrl?: string;
};

export const createInquiry = (
  body: CreateInquiryRequestBody
): Promise<ApiEnvelope<CreateInquiryResponseData>> => {
  return apiClient
    .post<ApiEnvelope<CreateInquiryResponseData>>("/inquiries/create", body)
    .then((r) => r.data);
};
// ============================= PUBLIC INQUIRY API END =============================

// ============================= PUBLIC REPORT API START =============================
export type ReportUploadItem = {
  url?: string;
  filename?: string;
};

export type UploadReportAttachmentsData = {
  baseUrl?: string;
  uploads?: {
    images?: ReportUploadItem[];
    videos?: ReportUploadItem[];
    documents?: ReportUploadItem[];
  };
};

export type CreateReportRequestBody = {
  reportType?: "property" | "project" | "agent" | "agency" | "user" | "review";
  reportedItemId?: string;
  userType?: string;
  reason?: string;
  description: string;
  email?: string;
  attachments?: string[];
  priority?: "low" | "medium" | "high" | "urgent";
};

export type CreateReportResponseData = {
  reportId: string;
};

export const collectReportAttachmentUrls = (
  data: UploadReportAttachmentsData | undefined
): string[] => {
  if (!data?.uploads) return [];
  const urls: string[] = [];
  for (const key of ["images", "videos", "documents"] as const) {
    for (const item of data.uploads[key] ?? []) {
      const url = String(item?.url ?? "").trim();
      if (url) urls.push(url);
    }
  }
  return urls;
};

export const uploadReportAttachments = (
  files: File[]
): Promise<ApiEnvelope<UploadReportAttachmentsData>> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("attachments", file));
  return apiClient
    .post<ApiEnvelope<UploadReportAttachmentsData>>(
      "/reports/upload-attachments",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    )
    .then((r) => r.data);
};

export const createReport = (
  body: CreateReportRequestBody
): Promise<ApiEnvelope<CreateReportResponseData>> => {
  return apiClient
    .post<ApiEnvelope<CreateReportResponseData>>("/reports/create", body)
    .then((r) => r.data);
};

export function getReportApiErrorMessage(
  err: unknown,
  fallback: string
): string {
  const message = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

export async function submitPropertyReport(params: {
  propertyId: string;
  description: string;
  email?: string;
  files?: File[];
}): Promise<CreateReportResponseData> {
  const propertyId = String(params.propertyId ?? "").trim();
  if (!propertyId) {
    throw new Error("Property details are missing.");
  }

  const description = String(params.description ?? "").trim();
  if (!description) {
    throw new Error("Description is required.");
  }

  const files = (params.files ?? []).filter(Boolean);
  let attachments: string[] = [];

  if (files.length) {
    const uploadResponse = await uploadReportAttachments(files);
    if (uploadResponse?.status === false) {
      throw new Error(
        typeof uploadResponse.message === "string"
          ? uploadResponse.message
          : "Failed to upload attachments"
      );
    }
    attachments = collectReportAttachmentUrls(uploadResponse.data);
  }

  const email = String(params.email ?? "").trim();
  const isLoggedIn = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  if (!isLoggedIn && !email) {
    throw new Error("Email is required");
  }

  const body: CreateReportRequestBody = {
    reportType: "property",
    reportedItemId: propertyId,
    userType: "user",
    description,
    ...(email ? { email } : {}),
    ...(attachments.length ? { attachments } : {}),
  };

  const response = await createReport(body);
  if (response?.status === false) {
    throw new Error(
      typeof response.message === "string"
        ? response.message
        : "Failed to submit report"
    );
  }

  return response.data;
}
// ============================= PUBLIC REPORT API END =============================

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

const resolvePendingRequests = (token: string | null) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    const statusCode = error?.response?.status;
    const isRefreshCall =
      typeof originalRequest?.url === "string" &&
      originalRequest.url.includes("/auth/users/refresh");

    if (
      statusCode !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshCall
    ) {
      return Promise.reject(error);
    }

    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) {
      clearAuthSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((newAccessToken) => {
          if (!newAccessToken) {
            reject(error);
            return;
          }
          originalRequest._retry = true;
          originalRequest.headers = {
            ...(originalRequest.headers as Record<string, string | undefined>),
            Authorization: `Bearer ${newAccessToken}`,
          };
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const refreshResponse = await refreshClient.post("/auth/users/refresh", {
        refreshToken: storedRefreshToken,
      });
      const refreshedTokens = refreshResponse.data?.data?.tokens as
        | UserTokens
        | undefined;
      const refreshedUser = refreshResponse.data?.data?.user;

      if (!refreshedTokens?.accessToken || !refreshedTokens?.refreshToken) {
        throw new Error("Invalid refresh response");
      }

      setAuthSession(refreshedTokens, refreshedUser);
      resolvePendingRequests(refreshedTokens.accessToken);

      originalRequest.headers = {
        ...(originalRequest.headers as Record<string, string | undefined>),
        Authorization: `Bearer ${refreshedTokens.accessToken}`,
      };
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      resolvePendingRequests(null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

