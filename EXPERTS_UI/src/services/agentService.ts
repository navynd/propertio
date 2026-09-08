// AGENT SERVICE
// -------------
// This file is a **small wrapper** around all Agent-specific API calls.
// Example:
// - `AgentDashboard.tsx` calls `agentService.getDashboard()`
// - `agentService` calls our shared `apiClient`
// - `apiClient` actually does the HTTP request with auth headers, etc.
//
// Why this extra layer is useful:
// - If the backend path or response shape changes, you only update **here**
//   (components do not need to know the low-level details).
// - It keeps components clean and focused on **UI**, not URL strings.
import { apiClient } from "./apiClient";

// This matches the `stats` object from `GET /agents/dashboard`.
// Each stat can either be a `count` or an `amount` (for money stats),
// plus `change` and `direction` for the percentage badge.
export type DashboardStatCard = {
  count?: number;
  amount?: number;
  currency?: string;
  change: number;
  direction: "up" | "down";
};

export type AgentDashboardStats = {
  totalRevenueSalesAndRent: DashboardStatCard;
  activeListings: DashboardStatCard;
  totalListings: DashboardStatCard;
  totalRentProperties: DashboardStatCard;
  totalSaleProperties: DashboardStatCard;
  totalInquiries: DashboardStatCard;
  newInquiries: DashboardStatCard;
  dealsClosed: DashboardStatCard;
};

export type AgentListingTypeMasterItem = {
  _id: string;
  name: string;
  slug?: string;
  transaction?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
};

/** Master: property kinds (`GET /master-data?type=propertytypes` → `data.propertyTypes`). */
export type AgentPropertyTypeMasterItem = {
  _id: string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  icon?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
};

export type AgentAmenityMasterItem = {
  _id: string;
  name: string;
  slug?: string;
  category?: string;
  icon?: string;
  image?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
};

export type AgentSortByPropertyMasterItem = {
  name: string;
  value: string;
};

export type AgentSortByProjectMasterItem = {
  name: string;
  value: string;
};

export type AgentInquiryTypeMasterItem = {
  name: string;
  value: string;
};

export type AgentInquiryStatusMasterItem = {
  name: string;
  value: string;
};

export type AgentProjectLeadItem = {
  id: string;
  inquiryType?: "call" | "email" | "whatsapp";
  status?: "new" | "attended" | "closed";
  projectLeadStatus?: string | null;
  statusExpiresAt?: string | null;
  inquiredAt?: string;
  attendedAt?: string | null;
  closedAt?: string | null;
  project?: {
    id?: string;
    title?: string;
    slug?: string;
    image?: string | null;
    location?: {
      address?: string;
      city?: string;
      zone?: string;
      fullAddress?: string;
    } | null;
    receivedOn?: string;
  } | null;
  layoutType?: {
    id?: string;
    layoutName?: string;
    bedrooms?: number;
    propertyType?: string;
  } | null;
  unit?: {
    id?: string;
    unitId?: string;
    unitNumber?: string;
    status?: string;
  } | null;
  customer?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
    profilePicture?: string | null;
  } | null;
  agent?: {
    id?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    profilePicture?: string | null;
    agentType?: string;
  } | null;
  dealClosed?: {
    dealType?: "sale" | "rent";
    dealAmount?: number;
    closedDate?: string;
  } | null;
  dealApproval?: {
    isWaiting?: boolean;
    submittedAt?: string | null;
    declinedAt?: string | null;
    declinedReason?: string | null;
  } | null;
};

export type AgentProjectLeadsResponse = {
  inquiries: AgentProjectLeadItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts?: {
    new: number;
    attended: number;
    closed: number;
    closedDeal: number;
  };
};

export type UpdateProjectLeadStatusBody = {
  type: "attend" | "set-project-status" | "close-inquiry";
  projectLeadStatus?: "available" | "reserved" | "in-progress" | "follow-up" | "pre-close";
  unitId?: string;
  notes?: string;
};

export type AgentProjectLeadAvailableUnit = {
  id?: string;
  unitId?: string;
  unitNumber?: string;
  floor?: number | null;
};

export type AgentProjectLeadDetailResponse = {
  inquiry?: {
    id?: string;
    inquiryType?: "call" | "email" | "whatsapp";
    message?: string | null;
    status?: "new" | "attended" | "closed";
    projectLeadStatus?: string | null;
    statusExpiresAt?: string | null;
    statusHelperText?: string | null;
    statusBadge?: string | null;
    panelState?: string | null;
    inquiredAt?: string;
    attendedAt?: string | null;
    closedAt?: string | null;
    source?: string | null;
    notes?: Array<Record<string, unknown>>;
    statusHistory?: Array<Record<string, unknown>>;
    projectTitle?: string | null;
    dealClosed?: {
      isClosed?: boolean;
      dealType?: "sale" | "rent";
      dealAmount?: number;
      closedDate?: string;
    } | null;
    dealApproval?: {
      isWaiting?: boolean;
      dealAmount?: number | null;
      currency?: string | null;
      document?: {
        url?: string;
        filename?: string;
        uploadedAt?: string;
      } | null;
      submittedAt?: string | null;
      approvedAt?: string | null;
      declinedAt?: string | null;
      declinedReason?: string | null;
    } | null;
  };
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    userId?: string | { _id?: string; profilePicture?: string | null } | null;
    profilePicture?: string | null;
    inquiredAt?: string;
    unitNumber?: string | null;
    dealAmount?: number | null;
    preClosedDate?: string | null;
    closedDate?: string | null;
    leadSource?: string | null;
  };
  agency?: {
    id?: string;
    agencyName?: string;
    logo?: string | null;
  } | null;
  project?: {
    id?: string;
    projectName?: string;
    slug?: string;
    description?: string | null;
    aboutProject?: string | null;
    location?: {
      address?: string | null;
      city?: string | null;
      zone?: string | null;
    } | null;
    governmentFees?: number | null;
    launchPrice?: {
      startingFrom?: number;
      currency?: string;
    } | null;
    brochure?: string | null;
    paymentPlans?: Array<Record<string, unknown>>;
    authorizedAgencies?: Array<{ id?: string; agencyName?: string; logo?: string | null }>;
    amenities?: Array<{ id?: string; name?: string; icon?: string | null }>;
    virtualTour360?: string | null;
    videoTour?: string | null;
    images?: Array<{ url?: string; isPrimary?: boolean; order?: number; caption?: string | null }>;
    masterPlan?: string[];
    faqs?: Array<{ question?: string; answer?: string }>;
  } | null;
  layoutInfo?: {
    id?: string;
    buildingName?: string | null;
    layoutName?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaSqft?: number | null;
    areaSqm?: number | null;
    propertyType?: string | null;
    startingPrice?: { amount?: number; currency?: string } | null;
    floorPlan?: string | null;
    floorPlans?: string[];
    totalUnits?: number | null;
    availableUnits?: number | null;
    reservedUnits?: number | null;
    soldUnits?: number | null;
    unitsAssigned?: number | null;
  } | null;
  assignedUnit?: {
    id?: string;
    unitId?: string;
    unitNumber?: string;
    floor?: number | null;
    status?: string;
  } | null;
  units?: Array<{
    id?: string;
    unitId?: string;
    unitNumber?: string;
    floor?: number | null;
    status?: string;
    displayState?: "sold-by-your-agent" | "sold-by-other" | "agent-working-on" | "available" | "unavailable";
  }>;
};

export type AgentProjectLeadSubTabMasterItem = {
  name: string;
  value: string;
};

export type AgentProjectLeadStatusMasterItem = {
  name: string;
  value: string;
};

export type AgentInquiryListItem = {
  id: string;
  inquiryCategory: string;
  inquiryType: "call" | "email" | "whatsapp";
  message?: string | null;
  status: "new" | "attended" | "closed";
  inquiredAt?: string;
  attendedAt?: string;
  closedAt?: string;
  customer?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  subject?: {
    type?: "property" | "project";
    id?: string;
    title?: string;
    slug?: string;
    listingType?: string | { name?: string; slug?: string };
    images?: Array<{ url?: string; isPrimary?: boolean; order?: number }>;
    location?: {
      fullAddress?: string;
      city?: string;
      zone?: string;
    };
    price?: number;
  } | null;
  dealClosed?: {
    dealType?: "sale" | "rent";
    dealAmount?: number;
    closedDate?: string;
  } | null;
};

export type AgentInquiryListResponse = {
  inquiries: AgentInquiryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts?: {
    new: number;
    attended: number;
    closed: number;
    closedSaleRent: number;
  };
};

export type AgentInquiryDetailResponse = {
  inquiry: {
    id: string;
    inquiryCategory: string;
    inquiryType: "call" | "email" | "whatsapp";
    message?: string | null;
    status: "new" | "attended" | "closed";
    inquiredAt?: string;
    attendedAt?: string;
    closedAt?: string;
    source?: string;
    dealClosed?: {
      isClosed?: boolean;
      dealType?: "sale" | "rent";
      dealAmount?: number;
      closedDate?: string;
    } | null;
    propertyTitle?: string;
    listingType?: { _id?: string; name?: string; slug?: string } | string;
  };
  customer: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    userId?: string;
    profilePicture?: string | null;
    image?: string | null;
  };
  property?: {
    _id?: string;
    title?: string;
    description?: string;
    listingType?: { _id?: string; name?: string; slug?: string } | string;
    propertyType?: { _id?: string; name?: string; slug?: string } | string;
    bedrooms?: number;
    maidBedroom?: boolean;
    bathrooms?: number;
    area?: { sqm?: number; sqft?: number };
    amenities?: Array<{ _id?: string; name?: string; icon?: string; image?: string }>;
    price?: number;
    currency?: string;
    images?: Array<{ url?: string; isPrimary?: boolean; order?: number }>;
    virtualTour360?: string | null;
    videoTour?: string | null;
    location?: { fullAddress?: string; city?: string; zone?: string };
    dldPermitNumber?: string;
    dldPermitUrl?: string;
    maintenanceFees?: number | null;
    serviceCharges?: number | null;
  };
};

export type UpdateInquiryStatusBody = {
  type: "attend" | "close-inquiry";
  notes?: string;
  reason?: string;
};

export type CloseInquiryDealBody = {
  dealType: "sale" | "rent";
  dealAmount: number;
  currency?: string;
  commission?: number;
  closedDate?: string;
  notes?: string;
};

/** Master: listing status (`GET /master-data?type=propertystatus` → `data.propertyStatus`). */
export type AgentPropertyStatusMasterItem = {
  name: string;
  value: string;
};

export type AgentSupportedUrlsMasterData = {
  supportedUrls?: Record<string, unknown>;
  supportedurls?: Record<string, unknown>;
  items?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type AgentUploadPropertyMediaResponse = {
  uploads?: {
    images?: Array<{ url?: string; filename?: string; path?: string }>;
    videos?: Array<{ url?: string; filename?: string; path?: string }>;
  };
  baseUrls?: {
    images?: string;
    videos?: string;
  };
};

export type CreateAgentPropertyPayload = {
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  bedrooms: number;
  maidBedroom?: boolean;
  bathrooms: number;
  area: {
    sqm: number;
    sqft?: number;
  };
  price: number;
  currency?: string;
  dldPermitNumber: string;
  dldPermitUrl?: string;
  amenities: string[];
  images: string[];
  videoTour?: string;
  virtualTour360?: string;
  maintenanceFees?: number;
  serviceCharges?: number;
  location: {
    fullAddress?: string;
    city: string;
    zone: string;
    googlePlaceId?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
};

export type UpdateAgentPropertyPayload = Partial<CreateAgentPropertyPayload>;

export type AgentDashboardPropertyItem = {
  propertyId: string;
  title: string;
  image: string | null;
  location: {
    city: string | null;
    zone: string | null;
  };
  listingTypeId: string | null;
  listingLabel: string | null;
  transaction: string | null;
  category: string | null;
  beds: number;
  baths: number;
  price: number;
  currency: string;
  status: string;
  isFeatured: boolean;
};

export type AgentDashboardInquiryItem = {
  inquiryId: string;
  inquiredAt: string;
  property: {
    title: string | null;
    image: string | null;
    location: {
      city: string | null;
      zone: string | null;
    };
  };
  customer: {
    name: string | null;
  };
  inquiryType: string;
  contactDetail: string | null;
};

export type AgentDashboardResponse = {
  stats: AgentDashboardStats;
  properties?: {
    items: AgentDashboardPropertyItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  recentInquiries?: AgentDashboardInquiryItem[];
  isVerified?: boolean;
};

export type AgentProfileSocialLinks = {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
};

/** GET/PUT `/agents/profile` — `data` payload. Job title is stored as `specialization` (JobTitles ObjectId). */
export type AgentProfileData = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string | null;
  phoneCode?: string | null;
  phoneNumberWithoutCode?: string | null;
  whatsappNumber?: string;
  isWhatsappPrimary?: boolean;
  specialization?: string | { _id?: string } | null;
  experience?: string | number | null;
  languages?: Array<string | { _id?: string }>;
  nationality?: AgentCountryMasterItem | string | null;
  brokerLicenseNumber?: string;
  description?: string;
  aboutMe?: string;
  socialLinks?: AgentProfileSocialLinks;
  profilePicture?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isVerified?: boolean;
  agentType?: string;
  unreadNotificationCount?: number;
  hasUnreadNotifications?: boolean;
  responseTime?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentNotificationMetadata = {
  allocationId?: string;
  title?: string;
  mode?: string;
  projectId?: string;
  projectName?: string;
  propertyId?: string;
  propertyName?: string;
  image?: string;
  dealAmount?: number;
  currency?: string;
  unitsAssigned?: number;
  totalUnits?: number;
  addedUnits?: number;
  removedUnits?: number;
  approvalStatus?: string;
  decision?: string;
  inquiryId?: string;
  inquiryCategory?: "project" | "property";
  dealType?: string;
  [key: string]: unknown;
};

export type AgentNotificationItem = {
  id: string;
  title?: string;
  message?: string;
  notificationType?: string;
  priority?: string;
  isRead?: boolean;
  readAt?: string | null;
  relatedItem?: { itemType?: string; itemId?: string } | null;
  actionUrl?: string | null;
  actionText?: string | null;
  metadata?: AgentNotificationMetadata | null;
  createdAt?: string;
};

export type AgentNotificationsResponse = {
  notifications: AgentNotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

/** PUT `/agents/profile` request body (matches `agentsController.updateProfile`). */
export type AgentUpdateProfileBody = {
  fullName?: string;
  phoneNumber?: string;
  phoneCode?: string;
  phoneNumberWithoutCode?: string;
  whatsappNumber?: string;
  isWhatsappPrimary?: boolean;
  specialization?: string;
  experience?: number;
  brokerLicenseNumber?: string;
  nationality?: string;
  languages?: string[];
  linkedin?: string;
  description?: string;
  profilePicture?: string;
};

/** Single image entry from `uploadService.buildStandardResponse` */
export type AgentUploadProfilePictureImage = {
  url?: string;
  path?: string;
  filename?: string;
  size?: number;
  mimetype?: string;
  thumbnail?: string;
};

/**
 * POST `/auth/agents/upload-profile-picture` — envelope `data`.
 *
 * Multipart (multer field **`profilePicture`** — image only):
 * - **`agentId`** or **`id`**: Mongo agent id (existing account).
 * - **`invitationToken`**: alternative for pending invitations (optional query **`token`**).
 * - **`removeProfilePicture`**: `true` / `1` / `yes` / `on` (case-insensitive) with **no file** removes the picture.
 *
 * Response merges `buildStandardResponse(upload, { images: "agent" }, { agent })` — includes **`agent`** (sanitized).
 */
export type AgentUploadProfilePictureResponse = {
  baseUrl?: string;
  baseUrls?: { images?: string; videos?: string; documents?: string };
  uploads?: {
    images?: AgentUploadProfilePictureImage[];
    videos?: unknown[];
    documents?: unknown[];
  };
  agent?: AgentProfileData;
};

/** Master: countries (phone flag + nationality) */
export type AgentCountryMasterItem = {
  _id: string;
  name: string;
  code: string;
  phoneCode?: string;
  flag?: string;
  isActive?: boolean;
  displayOrder?: number;
};

/** Master: job titles (DB uses `title`) */
export type AgentJobTitleMasterItem = {
  _id: string;
  title: string;
  description?: string;
  isActive?: boolean;
};

/** Master: agent experience (static list name/value) */
export type AgentExperienceMasterItem = {
  name: string;
  value: string;
};

/** Master: languages */
export type AgentLanguageMasterItem = {
  _id: string;
  name: string;
  code?: string;
  nativeName?: string;
  isActive?: boolean;
};
export type GetAgentDashboardParams = {
  listingType?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  inquiriesLimit?: number;
};

export type AgentPropertyListItem = {
  _id: string;
  title: string;
  images?: Array<{ url?: string; isPrimary?: boolean; order?: number }>;
  location?: {
    city?: string;
    zone?: string;
    fullAddress?: string;
  };
  listingType?: {
    _id?: string;
    name?: string;
    slug?: string;
    transaction?: "buy" | "rent";
    category?: string;
  };
  area?: {
    sqm?: number;
    sqft?: number;
  };
  price?: number;
  /** Present for rent listings; `yearly` aligns with stored price, `monthly` is derived for display. */
  rentPricing?: {
    yearly?: number;
    monthly?: number;
  } | null;
  currency?: string;
  status?: string;
  isFeatured?: boolean;
};

export type AgentPropertiesResponse = {
  items: AgentPropertyListItem[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  statusCounts: {
    active: number;
    inactive: number;
    sold: number;
    rented: number;
    pending: number;
  };
};

export type GetAgentPropertiesParams = {
  transaction?: "sale" | "buy" | "rent";
  tab?: "sale" | "buy" | "rent";
  listingType?: string;
  search?: string;
  status?: "active" | "inactive" | "sold" | "rented" | "pending";
  sortBy?: string;
  page?: number;
  limit?: number;
};

/** Single-property payload from `GET /agents/properties?propertyId=...` (same shape as list item + populated relations). */
export type AgentPropertyDetailAmenity = {
  _id?: string;
  name?: string;
  slug?: string;
  icon?: string;
  image?: string;
};

export type AgentPropertyDetail = {
  _id: string;
  title?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  area?: { sqm?: number; sqft?: number };
  location?: { fullAddress?: string; city?: string; zone?: string };
  featured?: { isFeatured?: boolean; priority?: number };
  listingType?: {
    _id?: string;
    name?: string;
    slug?: string;
    transaction?: string;
    category?: string;
  };
  propertyType?: { _id?: string; name?: string; slug?: string; category?: string };
  agent?: {
    _id?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  agency?: { _id?: string; agencyName?: string; profilePicture?: string };
  bedrooms?: number;
  maidBedroom?: boolean;
  bathrooms?: number;
  amenities?: AgentPropertyDetailAmenity[];
  price?: number;
  maintenanceFees?: number;
  serviceCharges?: number;
  currency?: string;
  images?: Array<{ url?: string; isPrimary?: boolean; order?: number; _id?: string }>;
  virtualTour360?: string | null;
  videoTour?: string | null;
  floorPlan?: Array<{ url?: string } | string>;
  dldPermitNumber?: string;
  dldPermitUrl?: string;
  completionStatus?: string;
  furnishedStatus?: string;
  isPetFriendly?: boolean;
  isWaterfront?: boolean;
  isFeatured?: boolean;
  rentPricing?: { yearly?: number; monthly?: number } | null;
  /** Public listing URL from API (`GET /agents/properties`) */
  propertyUrl?: string | null;
};

export type ChangePropertyStatusDealCustomer = {
  name: string;
  email?: string;
  phone?: string;
};

export type ChangePropertyStatusBody = {
  status: "active" | "inactive" | "sold" | "rented";
  dealInfo?: {
    dealAmount: number;
    dealClosedDate?: string;
    customer: ChangePropertyStatusDealCustomer;
    currency?: string;
    commission?: number;
    notes?: string;
  };
};

export type AgentAllocatedPropertyItem = {
  id: string;
  title: string;
  document?: string | null;
  documentType?: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  sentAt?: string;
  completedAt?: string | null;
  listingLink?: string | null;
};

export type AgentAllocatedPropertiesResponse = {
  allocations: AgentAllocatedPropertyItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AgentAllocatedProjectListItem = {
  projectId: string;
  projectName?: string;
  slug?: string;
  image?: { url?: string; isPrimary?: boolean; order?: number } | null;
  location?: { city?: string; zone?: string };
  projectStatus?: string;
  announcedDate?: string | null;
  progressStatus?: string | null;
  expectedCompletionDate?: string | null;
  isFeatured?: boolean;
  availableUnits?: number;
};

export type AgentAllocatedProjectsResponse = {
  projects: AgentAllocatedProjectListItem[];
  tabs: {
    all: number;
    new: number;
    offPlan: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalProjects: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type AgentAllocatedProjectDetail = {
  projectId: string;
  projectName?: string;
  description?: string;
  aboutProject?: string;
  projectLocation?: {
    address?: string;
    city?: string;
    zone?: string;
    googlePlaceId?: string;
    coordinates?: { type?: string; coordinates?: number[] };
  };
  projectStatus?: string;
  areaSqm?: string | number | null;
  areaSqft?: string | number | null;
  governmentFees?: number | null;
  zoneLocation?: string | null;
  propertyPrice?: { startingFrom?: number; currency?: string };
  brochure?: string | null;
  coordinates?: { type?: string; coordinates?: number[] };
  paymentPlans?: Array<{
    planName?: string;
    downPayment?: { percentage?: number; amount?: number };
    duringConstruction?: {
      percentage?: number;
      amount?: number;
      installments?: Array<{ percentage?: number; date?: string; amount?: number }>;
    };
    onHandover?: { percentage?: number; amount?: number };
  }>;
  authorizedAgencies?: Array<{
    _id?: string;
    agencyName?: string;
    isVerified?: boolean;
    profilePicture?: string;
  }>;
  amenities?: Array<{ _id?: string; name?: string; icon?: string }>;
  virtualTour360?: string | null;
  images?: Array<{ _id?: string; url?: string; isPrimary?: boolean; order?: number; caption?: string; uploadedAt?: string }>;
  masterPlan?: Array<string | { _id?: string; url?: string }>;
  videoTour?: string | null;
  projectTimeline?: Array<{ milestone?: string; date?: string; status?: string }>;
  developer?: { _id?: string; name?: string; logo?: string };
  faqs?: Array<{ question?: string; answer?: string }>;
  allocationInfo?: { allocationId?: string; allocatedAt?: string; unitsCount?: number; status?: string };
};

 export type AgentAllocatedProjectUnitsLayout = {
  layoutId: string;
  buildingName?: string | null;
  propertyType?: string | null;
  layoutName?: string;
  unitsAssigned?: number;
  unitsSold?: number;
};

export type AgentAllocatedProjectUnitsResponse = {
  projectName?: string | null;
  totalUnits: number;
  soldUnits: number;
  remainingUnits: number;
  propertyTypeFilters: Array<{ id: string; name: string; count: number }>;
  layouts: AgentAllocatedProjectUnitsLayout[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalLayouts: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type AgentAllocatedProjectUnitDetailResponse = {
  buildingName?: string | null;
  layoutName?: string;
  beds?: number;
  baths?: number;
  propertyType?: string | null;
  areaSqft?: number;
  areaSqm?: number;
  price?: { amount?: number; currency?: string } | number | null;
  maidBedroom?: boolean;
  unitsAvailable?: number;
  unitsAssigned?: number;
  floorPlans?: Array<{ url?: string } | string>;
  floorPlan?: { url?: string } | string | null;
  unitGrid?: Array<{
    id?: string;
    unitId?: string;
    unitNumber?: string;
    floor?: number;
    status?: string;
    displayState?: string;
  }>;
  statusCounts?: Record<string, number>;
  units?: Array<{
    id?: string;
    unitId?: string;
    unitNumber?: string;
    assignedDate?: string;
    handlingBy?: string;
    unitStatus?: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalUnits: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export const agentService = {
  // 1) Dashboard stats for Agent
  //
  // This calls backend route:
  //   GET /agents/dashboard
  //
  // Full response (from backend) looks like:
  //   { status, message, data: { stats, properties, recentInquiries, isVerified } }
  //
  // Here we only care about:
  //   `data.stats`  →  typed above as `AgentDashboardStats`
  getDashboard(params?: GetAgentDashboardParams) {
    const search = new URLSearchParams();
    if (params?.listingType?.trim()) search.set("listingType", params.listingType.trim());
    if (params?.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (typeof params?.inquiriesLimit === "number") {
      search.set("inquiriesLimit", String(params.inquiriesLimit));
    }
    const query = search.toString();
    const url = query ? `/agents/dashboard?${query}` : "/agents/dashboard";
    return apiClient.get<AgentDashboardResponse>(url);
  },

  getListingTypesMasterData() {
    return apiClient.get<{
      listingTypes?: AgentListingTypeMasterItem[];
      listingtypes?: AgentListingTypeMasterItem[];
    }>("/master-data?type=listingtypes", { auth: false });
  },

  getPropertyTypesMasterData() {
    return apiClient.get<{
      propertyTypes?: AgentPropertyTypeMasterItem[];
      propertytypes?: AgentPropertyTypeMasterItem[];
    }>("/master-data?type=propertytypes", { auth: false });
  },

  /** Single round-trip for add-property step (listing + property types). */
  getListingAndPropertyTypesMasterData() {
    return apiClient.get<{
      listingTypes?: AgentListingTypeMasterItem[];
      listingtypes?: AgentListingTypeMasterItem[];
      propertyTypes?: AgentPropertyTypeMasterItem[];
      propertytypes?: AgentPropertyTypeMasterItem[];
    }>("/master-data?types=listingtypes,propertytypes", { auth: false });
  },

  getAmenitiesMasterData() {
    return apiClient.get<{
      amenities?: AgentAmenityMasterItem[];
    }>("/master-data?type=amenities", { auth: false });
  },

  getSortByPropertyMasterData() {
    return apiClient.get<{
      sortByProperty?: AgentSortByPropertyMasterItem[];
      sortbyproperty?: AgentSortByPropertyMasterItem[];
    }>("/master-data?type=sortbyproperty", { auth: false });
  },

  getSortByProjectMasterData() {
    return apiClient.get<{
      sortByProject?: AgentSortByProjectMasterItem[];
      sortbyproject?: AgentSortByProjectMasterItem[];
    }>("/master-data?type=sortbyproject", { auth: false });
  },

  getInquiryMasterData() {
    return apiClient.get<{
      inquiryTypes?: AgentInquiryTypeMasterItem[];
      inquirytypes?: AgentInquiryTypeMasterItem[];
      inquiryStatus?: AgentInquiryStatusMasterItem[];
      inquirystatus?: AgentInquiryStatusMasterItem[];
    }>("/master-data?types=inquirystatus,inquirytypes", { auth: false });
  },

  getProjectLeadMasterData() {
    return apiClient.get<{
      projectLeadSubTabs?: AgentProjectLeadSubTabMasterItem[];
      projectleadsubtabs?: AgentProjectLeadSubTabMasterItem[];
      projectLeadStatuses?: AgentProjectLeadStatusMasterItem[];
      projectleadstatuses?: AgentProjectLeadStatusMasterItem[];
    }>("/master-data?types=projectleadsubtabs,projectleadstatuses", { auth: false });
  },

  getProjectLeads(params?: {
    tab?: "customer-requests" | "closed-deal";
    subTab?: "new" | "attended" | "closed";
    projectLeadStatus?: string;
    projectId?: string;
    layoutId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    counts?: boolean;
  }) {
    const search = new URLSearchParams();
    if (params?.tab) search.set("tab", params.tab);
    if (params?.subTab) search.set("subTab", params.subTab);
    if (params?.projectLeadStatus?.trim()) search.set("projectLeadStatus", params.projectLeadStatus.trim());
    if (params?.projectId?.trim()) search.set("projectId", params.projectId.trim());
    if (params?.layoutId?.trim()) search.set("layoutId", params.layoutId.trim());
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.startDate?.trim()) search.set("startDate", params.startDate.trim());
    if (params?.endDate?.trim()) search.set("endDate", params.endDate.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (typeof params?.counts === "boolean") search.set("counts", String(params.counts));
    return apiClient.get<AgentProjectLeadsResponse>(`/agents/project-leads?${search.toString()}`);
  },

  getProjectLeadById(id: string) {
    return apiClient.get<AgentProjectLeadDetailResponse>(`/agents/project-leads/${id.trim()}`);
  },

  updateProjectLeadStatus(id: string, body: UpdateProjectLeadStatusBody) {
    return apiClient.post<{
      inquiry?: {
        id?: string;
        status?: "new" | "attended" | "closed";
        projectLeadStatus?: string;
        statusExpiresAt?: string | null;
        statusHelperText?: string | null;
        attendedAt?: string | null;
        closedAt?: string | null;
        panelState?: string;
        unit?: { id?: string; unitId?: string } | null;
      };
    }>(`/agents/project-leads/${id.trim()}/status`, body);
  },

  getProjectLeadAvailableUnits(id: string) {
    return apiClient.get<{ units?: AgentProjectLeadAvailableUnit[] }>(
      `/agents/project-leads/${id.trim()}/available-units`
    );
  },

  uploadProjectCloseDealDocument(formData: FormData) {
    return apiClient.post<{ document?: { url?: string; filename?: string; uploadedAt?: string } }>(
      "/agents/project-leads/close-deal-document",
      formData
    );
  },

  submitProjectLeadDeal(
    id: string,
    body: {
      dealAmount: number;
      currency?: string;
      document: { url: string; filename: string; uploadedAt?: string };
      notes?: string;
    }
  ) {
    return apiClient.post<{
      inquiry?: {
        id?: string;
        status?: string;
        projectLeadStatus?: string;
        statusBadge?: string;
        panelState?: string;
        dealApproval?: {
          isWaiting?: boolean;
          dealAmount?: number;
          currency?: string;
          document?: { url?: string; filename?: string; uploadedAt?: string };
          submittedAt?: string;
        };
      };
    }>(`/agents/project-leads/${id.trim()}/submit-deal`, body);
  },

  getInquiries(params?: {
    status?: "new" | "attended" | "closed" | "closed-sale-rent";
    type?: "call" | "email" | "whatsapp";
    transactionType?: "sale" | "rent";
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    counts?: boolean;
  }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.type) search.set("type", params.type);
    if (params?.transactionType) search.set("transactionType", params.transactionType);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.startDate?.trim()) search.set("startDate", params.startDate.trim());
    if (params?.endDate?.trim()) search.set("endDate", params.endDate.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (typeof params?.counts === "boolean") search.set("counts", String(params.counts));
    return apiClient.get<AgentInquiryListResponse>(`/agents/inquiries?${search.toString()}`);
  },

  getInquiryById(inquiryId: string) {
    return apiClient.get<AgentInquiryDetailResponse>(`/agents/inquiries/${inquiryId.trim()}`);
  },

  updateInquiryStatus(inquiryId: string, body: UpdateInquiryStatusBody) {
    return apiClient.post<{ inquiry?: AgentInquiryListItem }>(`/agents/inquiries/${inquiryId.trim()}/status`, body);
  },

  closeInquiryDeal(inquiryId: string, body: CloseInquiryDealBody) {
    return apiClient.post<{ inquiry?: AgentInquiryListItem; dealClosureId?: string }>(
      `/agents/inquiries/${inquiryId.trim()}/close-deal`,
      body
    );
  },

  getPropertyStatusMasterData() {
    return apiClient.get<{
      propertyStatus?: AgentPropertyStatusMasterItem[];
      propertystatus?: AgentPropertyStatusMasterItem[];
    }>("/master-data?type=propertystatus", { auth: false });
  },

  getSupportedUrlsMasterData() {
    return apiClient.get<AgentSupportedUrlsMasterData>("/master-data?type=supportedurls", {
      auth: false,
    });
  },

  getCountriesMasterData() {
    return apiClient.get<{
      countries?: AgentCountryMasterItem[];
    }>("/master-data?type=countries", { auth: false });
  },

  getJobTitlesMasterData() {
    return apiClient.get<{
      jobTitles?: AgentJobTitleMasterItem[];
      jobtitles?: AgentJobTitleMasterItem[];
    }>("/master-data?type=jobtitles", { auth: false });
  },

  getAgentExperienceMasterData() {
    return apiClient.get<{
      agentExperience?: AgentExperienceMasterItem[];
      agentexperience?: AgentExperienceMasterItem[];
    }>("/master-data?type=agentexperience", { auth: false });
  },

  getLanguagesMasterData() {
    return apiClient.get<{
      languages?: AgentLanguageMasterItem[];
    }>("/master-data?type=languages", { auth: false });
  },

  getNotificationStatusMasterData() {
    return apiClient.get<{
      notificationStatus?: { name: string; value: string }[];
    }>("/master-data?type=notificationstatus", { auth: false });
  },

  getNotifications(params?: {
    tab?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.tab) search.set("tab", params.tab);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    const query = search.toString();
    const url = query ? `/agents/notifications?${query}` : "/agents/notifications";
    return apiClient.get<AgentNotificationsResponse>(url);
  },

  markNotificationAsRead(id: string) {
    return apiClient.put<{ id?: string; isRead?: boolean; readAt?: string }>(
      `/agents/notifications/${encodeURIComponent(id.trim())}/read`,
    );
  },

  deleteNotifications(ids: string[]) {
    return apiClient.delete<{ deletedCount?: number }>("/agents/notifications", {
      body: { ids },
    });
  },

  getProperties(params?: GetAgentPropertiesParams) {
    const search = new URLSearchParams();
    if (params?.transaction) search.set("transaction", params.transaction);
    if (params?.tab) search.set("tab", params.tab);
    if (params?.listingType?.trim()) search.set("listingType", params.listingType.trim());
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.status) search.set("status", params.status);
    if (params?.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    const query = search.toString();
    const url = query ? `/agents/properties?${query}` : "/agents/properties";
    return apiClient.get<AgentPropertiesResponse>(url);
  },

  /** `GET /agents/properties?propertyId=...` — returns one property (agent-owned). */
  getPropertyById(propertyId: string) {
    const search = new URLSearchParams();
    search.set("propertyId", propertyId.trim());
    search.set("page", "1");
    search.set("limit", "20");
    return apiClient.get<AgentPropertyDetail>(`/agents/properties?${search.toString()}`);
  },

  getAllocatedProperties(params?: {
    status?: "pending" | "in-progress" | "completed" | "cancelled";
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    return apiClient.get<AgentAllocatedPropertiesResponse>(`/agents/allocated-properties?${search.toString()}`);
  },

  getAllocatedProjects(params?: {
    subTab?: "all" | "new" | "off-plan";
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.subTab) search.set("subTab", params.subTab);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    return apiClient.get<AgentAllocatedProjectsResponse>(`/agents/projects?${search.toString()}`);
  },

  getAllocatedProjectById(projectId: string) {
    const search = new URLSearchParams();
    search.set("projectId", projectId.trim());
    return apiClient.get<AgentAllocatedProjectDetail>(`/agents/projects?${search.toString()}`);
  },

  getAllocatedProjectUnits(params: {
    projectId: string;
    page?: number;
    limit?: number;
    subTab?: string;
    search?: string;
  }) {
    const search = new URLSearchParams();
    search.set("projectId", params.projectId.trim());
    if (typeof params.page === "number") search.set("page", String(params.page));
    if (typeof params.limit === "number") search.set("limit", String(params.limit));
    if (params.subTab?.trim()) search.set("subTab", params.subTab.trim());
    if (params.search?.trim()) search.set("search", params.search.trim());
    return apiClient.get<AgentAllocatedProjectUnitsResponse>(`/agents/projects/units?${search.toString()}`);
  },

  getAllocatedProjectUnitDetail(params: {
    projectId: string;
    layoutId: string;
    statusFilter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    search.set("projectId", params.projectId.trim());
    search.set("layoutId", params.layoutId.trim());
    if (params.statusFilter?.trim()) search.set("statusFilter", params.statusFilter.trim());
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (typeof params.page === "number") search.set("page", String(params.page));
    if (typeof params.limit === "number") search.set("limit", String(params.limit));
    return apiClient.get<AgentAllocatedProjectUnitDetailResponse>(`/agents/projects/units?${search.toString()}`);
  },

  completeAllocatedProperty(allocationId: string, body: { listingLink?: string; notes?: string }) {
    return apiClient.post<{ allocation: AgentAllocatedPropertyItem }>(
      `/agents/allocated-properties/${allocationId.trim()}/complete`,
      body
    );
  },

  uploadPropertyMedia(formData: FormData) {
    return apiClient.post<AgentUploadPropertyMediaResponse>("/agents/properties/upload-media", formData);
  },

  createProperty(body: CreateAgentPropertyPayload) {
    return apiClient.post<AgentPropertyDetail>("/agents/properties/create", body);
  },

  updateProperty(propertyId: string, body: UpdateAgentPropertyPayload) {
    return apiClient.put<AgentPropertyDetail>(`/agents/properties/${propertyId.trim()}`, body);
  },

  /** `PUT /agents/properties/:id/status` — `dealInfo` required when `status` is `sold` or `rented`. */
  changePropertyStatus(propertyId: string, body: ChangePropertyStatusBody) {
    return apiClient.put<AgentPropertyDetail>(`/agents/properties/${propertyId.trim()}/status`, body);
  },

  // 2) Agent profile (used by profile screen)
  getProfile() {
    return apiClient.get<AgentProfileData>("/agents/profile");
  },

  // 3) Update Agent profile (JSON body — not multipart)
  updateProfile(body: AgentUpdateProfileBody) {
    return apiClient.put<AgentProfileData>("/agents/profile", body);
  },

  /**
   * POST `/auth/agents/upload-profile-picture` (multipart).
   * Typical FormData: `agentId` + `id` (same value), `profilePicture` (file);
   * or `agentId` + `id` + `removeProfilePicture`=`true` with no file.
   */
  uploadProfilePicture(formData: FormData) {
    return apiClient.post<AgentUploadProfilePictureResponse>("/auth/agents/upload-profile-picture", formData);
  },
};
