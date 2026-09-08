import { apiClient } from "./apiClient";

export type DeveloperDashboardStatCard = {
  count?: number;
  amount?: number;
  currency?: string;
  change: number;
  direction: "up" | "down";
};

export type DeveloperDashboardProjectItem = {
  projectId: string;
  projectName: string;
  image: string | null;
  location: {
    city: string | null;
    zone: string | null;
  };
  projectStatus: "ready" | "off-plan";
  progressStatus: string | null;
  expectedCompletionDate: string | null;
  isFeatured: boolean;
};

export type DeveloperDashboardResponse = {
  stats: {
    totalProjects: DeveloperDashboardStatCard;
    totalReadyProjects: DeveloperDashboardStatCard;
    offPlanProjects: DeveloperDashboardStatCard;
    totalRevenue: DeveloperDashboardStatCard;
  };
  projects: {
    tabs: {
      active: number;
      soldout: number;
    };
    items: DeveloperDashboardProjectItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  locationBasedProjects: Array<{
    location: string;
    count: number;
  }>;
  isVerified: boolean;
};

export type SortByProjectMasterItem = {
  name: string;
  value: string;
};

export type ProjectTypeStatusMasterItem = {
  name: string;
  value: "ready" | "off-plan";
};

export type ProjectProgressStatusMasterItem = {
  name: string;
  value: string;
};

export type AmenityMasterItem = {
  _id: string;
  name: string;
  slug?: string;
  category?: string;
  icon?: string;
  image?: string;
};

export type PropertyTypeMasterItem = {
  _id?: string;
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
};

export type SupportedUrlsMasterData = {
  supportedUrls?: Record<string, unknown>;
  supportedurls?: Record<string, unknown>;
  items?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type CountryMasterDataItem = {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
  flag?: string;
  isActive?: boolean;
  displayOrder?: number;
};

export type GetDeveloperDashboardParams = {
  projectTab?: "active" | "soldout";
  sortBy?: string;
  page?: number;
  limit?: number;
};

export type DeveloperProfileResponse = Record<string, unknown>;
export type UploadDeveloperProfilePictureResponse = Record<string, unknown>;

export type DeveloperNotificationMetadata = {
  inquiryId?: string;
  projectId?: string;
  projectName?: string;
  image?: string;
  dealType?: string;
  dealAmount?: number;
  currency?: string;
  decision?: string;
};

export type DeveloperNotificationItem = {
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
  metadata?: DeveloperNotificationMetadata | null;
  createdAt?: string;
};

export type DeveloperNotificationsResponse = {
  notifications: DeveloperNotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type DeveloperProjectListItem = {
  _id: string;
  projectName: string;
  slug?: string;
  projectType?: string;
  completionStatus?: "ready" | "off-plan";
  publishStatus?: "draft" | "unpublished" | "published" | "soldout";
  isFeatured?: boolean;
  images?: Array<{ url?: string; isPrimary?: boolean; order?: number }>;
  location?: {
    city?: string;
    zone?: string;
  };
  launchPrice?: {
    startingFrom?: number;
    currency?: string;
  };
  totalUnits?: number;
  availableUnits?: number;
  soldUnits?: number;
  reservedUnits?: number;
  progressStatus?: string;
  expectedCompletionDate?: string | null;
  createdAt?: string;
  lastModifiedAt?: string;
  draftProgress?: {
    totalSteps: number;
    completedSteps: number;
    remainingSteps: number;
    progressPercentage: number;
    message: string;
  };
};

export type DeveloperProjectsResponse = {
  projects: DeveloperProjectListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  counts: {
    draft: number;
    unpublished: number;
    published: number;
    soldout: number;
  };
};

export type DeveloperProjectDetailsResponse = {
  project: Record<string, unknown>;
  unitProperties?: Array<Record<string, unknown>>;
  agencyCount?: number;
  unitSummary?: {
    total?: number;
    available?: number;
    sold?: number;
    reserved?: number;
  };
  draftProgress?: Record<string, unknown>;
  canPublish?: boolean;
};

export type GetDeveloperProjectsParams = {
  publishStatus?: "draft" | "unpublished" | "published" | "soldout";
  projectType?: "off-plan" | "ready";
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
};

export type CreateProjectPayload = {
  publishStatus: "draft" | "unpublished";
  projectType: "ready" | "off-plan";
  projectTitle?: string;
  address?: string;
  googlePlaceId?: string;
  aboutProject?: string;
  description?: string;
  amenities?: string[];
  [key: string]: unknown;
};

export type CreateProjectResponse = {
  project: {
    _id: string;
    projectName?: string;
    publishStatus?: string;
  };
  nextSteps?: {
    message?: string;
    projectId?: string;
    currentStatus?: string;
    assignAgenciesUrl?: string;
  };
};

export type UpdateLayoutPayload = {
  projectId: string;
  layoutId: string;
  floorPlans?: string[];
};

export type UploadedMediaItem = {
  url?: string;
  path?: string;
  filename?: string;
  mimetype?: string;
  type?: string;
};

export type UploadProjectMediaResponse = {
  baseUrl?: string;
  baseUrls?: {
    images?: string;
    videos?: string;
    documents?: string;
    floorPlans?: string;
  };
  uploads?: {
    images?: UploadedMediaItem[];
    videos?: UploadedMediaItem[];
    documents?: UploadedMediaItem[];
    floorPlans?: UploadedMediaItem[];
  };
  project?: {
    id?: string;
    totalImages?: number;
    masterPlan?: string | null;
    brochure?: string | null;
    videoTour?: string | null;
  };
};

export type ProjectFaqPayload = {
  question?: string;
  answer?: string;
  order?: number;
};

export type ProjectFaqResponse = {
  _id: string;
  question: string;
  answer: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DeveloperAgencyListResponse = {
  agencies: Array<{
    id: string;
    name: string;
  }>;
};

export type AssignAgenciesPayload = {
  projectId: string;
  assignments: Array<{
    agencyId: string;
    unitIds: string[];
  }>;
  publish?: boolean;
};

export type AssignAgenciesResponse = {
  projectId: string;
  agenciesAssigned: number;
  published: boolean;
  summary: Array<{
    agencyId: string;
    unitsAssigned: number;
  }>;
};

export type UpdateAssignedAgencyUnitsPayload = {
  projectId: string;
  allocationId: string;
  unitIds: string[];
};

export type UpdateProjectProgressPayload = {
  projectId: string;
  progressStatus?: string;
  projectAnnouncement?: string | null;
  expectedCompletionDate?: string | null;
  expectedCompletion?: string | null;
  bookingOpen?: string | null;
  constructionStarted?: string | null;
  launchDate?: string | null;
  deliveryDate?: string | null;
  constructionProgress?: number;
  completionStatus?: string;
  markAsSoldOut?: boolean;
};

export type GetDeveloperRevenueParams = {
  projectId?: string;
  buildingId?: string;
  propertyType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "featured" | "newest" | "oldest" | "highest" | "lowest";
  page?: number;
  limit?: number;
};

export type DeveloperRevenueListResponse = {
  projectName?: string;
  totalUnits?: number;
  soldUnits?: number;
  remainingUnits?: number;
  totalRevenue?: number;
  currency?: string;
  buildingTabs?: Array<{ id: string; name: string }>;
  propertyTypeTabs?: Array<{ id: string; name: string }>;
  deals: Array<{
    dealId: string;
    project: {
      id: string;
      projectName: string;
      slug?: string;
      image?: {
        url?: string;
        isPrimary?: boolean;
        order?: number;
        uploadedAt?: string;
        _id?: string;
      } | null;
      location?: {
        city?: string;
        zone?: string;
      };
    };
    agencies: {
      display: Array<{
        id: string;
        agencyName?: string;
        name?: string;
        logo?: string;
      }>;
      remainingCount: number;
      total: number;
    };
    buildingName?: string;
    propertyType?: string;
    layoutName?: string;
    unitNumber?: string;
    agency?: {
      id: string;
      agencyName?: string;
      name?: string;
      logo?: string;
    };
    closedDate?: string;
    dealAmount?: number;
    currency?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalDeals: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type RevenueDropdownType = "projects" | "agencies" | "layouts" | "units";

export type RevenueDropdownProjectItem = {
  id: string;
  projectName: string;
  slug?: string;
  image?: { url?: string; isPrimary?: boolean; order?: number } | null;
  location?: { city?: string; zone?: string };
};

export type RevenueDropdownAgencyItem = {
  id: string;
  agencyName: string;
  logo?: string | null;
};

export type RevenueDropdownLayoutItem = {
  id: string;
  layoutName: string;
  buildingName?: string | null;
  propertyType?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
};

export type RevenueDropdownUnitItem = {
  id: string;
  unitId?: string;
  unitNumber?: string | null;
  floor?: number | null;
  status?: string;
  assignedAgent?: {
    agentId?: string;
    agentName?: string | null;
  } | null;
};

export type RevenueDropdownResponse = {
  type: RevenueDropdownType;
  items: Array<
    RevenueDropdownProjectItem |
    RevenueDropdownAgencyItem |
    RevenueDropdownLayoutItem |
    RevenueDropdownUnitItem
  >;
};

export type CreateRevenuePayload = {
  projectId: string;
  agencyId: string;
  layoutId: string;
  unitId: string;
  dealAmount: number;
  closedDate: string;
  currency?: string;
  notes?: string;
  customer?: {
    userId?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
};

export type DeveloperProjectUnitsLayoutItem = {
  layoutId: string;
  layoutName: string;
  building: { id: string; name: string } | null;
  propertyType: { _id: string; name: string; slug?: string } | null;
  bedrooms: number;
  areaSqft: number;
  totalUnits: number;
  floorPlans?: string[];
  availableUnits?: number;
  assignedUnits: number;
  unassignedUnits: number;
  units?: Array<{
    _id: string;
    unitId?: string;
    unitNumber?: string;
    status?: "available" | "reserved" | "in-progress" | "follow-up" | "pre-close" | "closed";
    isAssigned?: boolean;
  }>;
};

export type DeveloperProjectUnitsResponse = {
  summary: {
    totalUnits: number;
    sold: number;
    remaining: number;
  };
  propertyTypeFilters?: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  layouts: DeveloperProjectUnitsLayoutItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetDeveloperProjectUnitsParams = {
  projectId: string;
  assigned?: boolean;
  bulk?: boolean;
  layoutId?: string;
  allocationId?: string;
  unitStatus?: "available" | "reserved" | "in-progress" | "follow-up" | "pre-close" | "closed";
  propertyType?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type DeveloperProjectUnitDetailResponse = {
  layout: {
    _id: string;
    layoutName: string;
    building: { id: string; name: string } | null;
    propertyType: { _id: string; name: string; slug?: string } | null;
    bedrooms: number;
    maidBedroom?: boolean;
    bathrooms: number;
    areaSqft: number;
    areaSqm?: number;
    startingPrice?: { amount?: number; currency?: string };
    floorPlans?: string[];
    totalUnits: number;
    availableUnits: number;
    assignedUnits: number;
    unassignedUnits: number;
  };
  agencies: Array<{
    allocationId: string;
    agency: {
      _id: string;
      agencyName?: string;
      name?: string;
      profilePicture?: string;
      logo?: string;
    } | null;
    status: string;
    totalUnitsInProject: number;
    unitsInThisLayout: number;
    units: Array<{ _id: string; unitId?: string; unitNumber?: string }>;
    allocatedAt?: string;
  }>;
  unitStatus: {
    units: Array<{
      _id: string;
      unitId?: string;
      unitNumber?: string;
      status: "available" | "reserved" | "in-progress" | "follow-up" | "pre-close" | "closed";
      isAssigned: boolean;
      assignedAgencies: Array<{
        id: string;
        agencyName?: string;
        name?: string;
        profilePicture?: string;
        logo?: string;
      }>;
      handlingAgent?: {
        id?: string;
        fullName?: string;
        profilePicture?: string;
      };
    }>;
    counts: {
      available: number;
      reserved: number;
      "in-progress": number;
      "follow-up": number;
      "pre-close": number;
      closed: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
};

export const developerService = {
  getDashboard(params?: GetDeveloperDashboardParams) {
    const search = new URLSearchParams();
    if (params?.projectTab) search.set("projectTab", params.projectTab);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));

    const queryString = search.toString();
    const url = queryString
      ? `/developers/dashboard?${queryString}`
      : "/developers/dashboard";
    return apiClient.get<DeveloperDashboardResponse>(url);
  },

  getSortByProjectMasterData() {
    return apiClient.get<{
      sortByProject?: SortByProjectMasterItem[];
      sortbyproject?: SortByProjectMasterItem[];
    }>("/master-data?type=sortbyproject", { auth: false });
  },

  getProjectTypeStatusMasterData() {
    return apiClient.get<{
      projectTypeStatus?: ProjectTypeStatusMasterItem[];
      projecttypestatus?: ProjectTypeStatusMasterItem[];
    }>("/master-data?type=projecttypestatus", { auth: false });
  },

  getProjectProgressStatusMasterData() {
    return apiClient.get<{
      projectProgressStatus?: ProjectProgressStatusMasterItem[];
      projectprogressstatus?: ProjectProgressStatusMasterItem[];
    }>("/master-data?type=projectprogressstatus", { auth: false });
  },

  getAmenitiesMasterData() {
    return apiClient.get<{
      amenities?: AmenityMasterItem[];
    }>("/master-data?type=amenities", { auth: false });
  },

  getPropertyTypesMasterData() {
    return apiClient.get<{
      propertyTypes?: PropertyTypeMasterItem[];
      propertytypes?: PropertyTypeMasterItem[];
    }>("/master-data?type=propertytypes", { auth: false });
  },

  getSupportedUrlsMasterData() {
    return apiClient.get<SupportedUrlsMasterData>("/master-data?type=supportedurls", {
      auth: false,
    });
  },

  getCountriesMasterData() {
    return apiClient.get<{
      countries?: CountryMasterDataItem[];
    }>("/master-data?type=countries", { auth: false });
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
    const url = query ? `/developers/notifications?${query}` : "/developers/notifications";
    return apiClient.get<DeveloperNotificationsResponse>(url);
  },

  markNotificationAsRead(id: string) {
    return apiClient.put<{ id?: string; isRead?: boolean; readAt?: string }>(
      `/developers/notifications/${encodeURIComponent(id.trim())}/read`,
    );
  },

  deleteNotifications(ids: string[]) {
    return apiClient.delete<{ deletedCount?: number }>("/developers/notifications", {
      body: { ids },
    });
  },

  getProjects(params?: GetDeveloperProjectsParams) {
    const search = new URLSearchParams();
    if (params?.publishStatus) search.set("publishStatus", params.publishStatus);
    if (params?.projectType) search.set("projectType", params.projectType);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (params?.sortBy) search.set("sortBy", params.sortBy);

    const queryString = search.toString();
    const url = queryString ? `/developers/projects?${queryString}` : "/developers/projects";
    return apiClient.get<DeveloperProjectsResponse>(url);
  },

  deleteProject(projectId: string) {
    return apiClient.delete<{ projectId?: string }>("/developers/projects", {
      body: { projectId },
    });
  },

  getProjectDetails(projectId: string) {
    const search = new URLSearchParams();
    search.set("projectId", projectId);
    return apiClient.get<DeveloperProjectDetailsResponse>(
      `/developers/projects?${search.toString()}`
    );
  },

  getAgencies() {
    return apiClient.get<DeveloperAgencyListResponse>("/developers/agency");
  },

  assignAgencies(body: AssignAgenciesPayload) {
    return apiClient.post<AssignAgenciesResponse>("/developers/projects/assign-agencies", body);
  },

  getProjectUnits(params: GetDeveloperProjectUnitsParams) {
    const search = new URLSearchParams();
    search.set("projectId", params.projectId);
    if (typeof params.assigned === "boolean") search.set("assigned", String(params.assigned));
    if (typeof params.bulk === "boolean") search.set("bulk", String(params.bulk));
    if (params.layoutId) search.set("layoutId", params.layoutId);
    if (params.allocationId) search.set("allocationId", params.allocationId);
    if (params.unitStatus) search.set("unitStatus", params.unitStatus);
    if (params.propertyType) search.set("propertyType", params.propertyType);
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (typeof params.page === "number") search.set("page", String(params.page));
    if (typeof params.limit === "number") search.set("limit", String(params.limit));
    return apiClient.get<DeveloperProjectUnitsResponse>(`/developers/projects/units?${search.toString()}`);
  },

  getProjectUnitDetail(params: { projectId: string; layoutId: string; allocationId?: string; page?: number; limit?: number; unitStatus?: GetDeveloperProjectUnitsParams["unitStatus"]; assigned?: boolean }) {
    const search = new URLSearchParams();
    search.set("projectId", params.projectId);
    search.set("layoutId", params.layoutId);
    if (params.allocationId) search.set("allocationId", params.allocationId);
    if (typeof params.assigned === "boolean") search.set("assigned", String(params.assigned));
    if (typeof params.page === "number") search.set("page", String(params.page));
    if (typeof params.limit === "number") search.set("limit", String(params.limit));
    if (params.unitStatus) search.set("unitStatus", params.unitStatus);
    return apiClient.get<DeveloperProjectUnitDetailResponse>(`/developers/projects/units?${search.toString()}`);
  },

  updateAssignedAgencyUnits(body: UpdateAssignedAgencyUnitsPayload) {
    return apiClient.put<{ message?: string; data?: Record<string, unknown> }>(
      "/developers/projects/assign-agencies",
      body
    );
  },

  createProject(body: CreateProjectPayload) {
    return apiClient.post<CreateProjectResponse>("/developers/projects/create", body);
  },

  updateProject(projectId: string, body: Record<string, unknown>) {
    return apiClient.put<CreateProjectResponse>(`/developers/projects/${projectId}`, body);
  },

  updateProjectLayout(body: UpdateLayoutPayload) {
    return apiClient.put<{ layoutId: string; projectId: string }>("/developers/projects/layout", body);
  },

  uploadProjectMedia(formData: FormData) {
    return apiClient.post<UploadProjectMediaResponse>("/developers/projects/upload-media", formData);
  },

  addProjectFaq(projectId: string, body: ProjectFaqPayload) {
    return apiClient.post<ProjectFaqResponse>(`/developers/projects/${projectId}/faqs`, body);
  },

  updateProjectFaq(projectId: string, faqId: string, body: ProjectFaqPayload) {
    return apiClient.put<ProjectFaqResponse>(`/developers/projects/${projectId}/faqs/${faqId}`, body);
  },

  deleteProjectFaq(projectId: string, faqId: string) {
    return apiClient.delete<{ deletedFAQ?: ProjectFaqResponse; totalFAQs?: number }>(
      `/developers/projects/${projectId}/faqs/${faqId}`
    );
  },

  updateProjectProgress(body: UpdateProjectProgressPayload) {
    return apiClient.put<{ project?: Record<string, unknown> }>("/developers/projects/progress", body);
  },

  getRevenue(params?: GetDeveloperRevenueParams) {
    const search = new URLSearchParams();
    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.buildingId) search.set("buildingId", params.buildingId);
    if (params?.propertyType) search.set("propertyType", params.propertyType);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (typeof params?.page === "number") search.set("page", String(params.page));
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    return apiClient.get<DeveloperRevenueListResponse>(`/developers/revenue?${search.toString()}`);
  },

  getRevenueDropdown(params: {
    type: RevenueDropdownType;
    projectId?: string;
    agencyId?: string;
    layoutId?: string;
  }) {
    const search = new URLSearchParams();
    search.set("type", params.type);
    if (params.projectId) search.set("projectId", params.projectId);
    if (params.agencyId) search.set("agencyId", params.agencyId);
    if (params.layoutId) search.set("layoutId", params.layoutId);
    return apiClient.get<RevenueDropdownResponse>(`/developers/revenue/dropdown?${search.toString()}`);
  },

  createRevenue(body: CreateRevenuePayload) {
    return apiClient.post<{ deal?: Record<string, unknown>; message?: string }>("/developers/revenue", body);
  },

  getProfile() {
    return apiClient.get<DeveloperProfileResponse>("/developers/profile");
  },

  updateProfile(body: Record<string, unknown>) {
    return apiClient.put<DeveloperProfileResponse>("/developers/profile", body);
  },

  uploadProfilePicture(formData: FormData) {
    return apiClient.post<UploadDeveloperProfilePictureResponse>("/auth/developers/upload-profile-picture", formData);
  },
};
