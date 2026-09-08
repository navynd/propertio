import { apiClient } from "./apiClient";

/* ================= TYPES ================= */

export type AgencyDashboardStat = {
  count?: number;
  amount?: number;
  currency?: string;
  change: number;
  direction: "up" | "down";
};

export type AgencyDashboardProjectItem = {
  projectId: string;
  projectName: string;
  image: string | null;
  location: {
    city: string | null;
    zone: string | null;
  };
  projectStatus: "new" | "off-plan";
  progressStatus: string | null;
  expectedCompletionDate: string | null;
  isFeatured: boolean;
  announcedDate?: string | null;
  expectedFinishDate?: string | null;
};

export type GetAgentPropertiesResponse = {
  items: any[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  statusCounts: Record<string, number>;
};
export type AgencyDashboardResponse = {
  stats: {
    totalActiveListings: AgencyDashboardStat;
    totalAgents: AgencyDashboardStat;
    totalSuperAgents: AgencyDashboardStat;
    totalRevenueBySales: AgencyDashboardStat;
    totalRevenueByRent: AgencyDashboardStat;
    thisMonthRevenueSalesAndRent: AgencyDashboardStat;
    totalLeads: AgencyDashboardStat;
    thisMonthLeads: AgencyDashboardStat;
  };

  projects: {
    items: AgencyDashboardProjectItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };

  listingsByLocation: Array<{
    location: string;
    count: number;
  }>;

  isVerified: boolean;
};

export type GetAgentByIdResponse = {
  agent: any;
  statistics: any;
  listings: {
    items: any[];
    pagination?: any;
  };
};
export type SortByProjectMasterItem = {
  name: string;
  value: string;
};

export type ListingType = {
  _id: string;
  name: string;
  slug: string;
  transaction: string;
  category: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
};
export type AgentType = {
  _id: string;
  name: string;
  value: string;
  isActive?: boolean;
};

export type JobTitle = {
  _id: string;
  title: string;
  description: string;
  isActive?: boolean;
};

type Language = {
  _id: string;
  name: string;
  code?: string;
  nativeName?: string;
  isActive?: boolean;
};

export type country = {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
  flag: string;
  currency: string;
  displayOrder?: Number;
  isActive?: boolean;
};

export type agentExperience = {
  name: string;
  value: string;
};

export type MasterDataResponse = {
  sortByProject?: SortByProjectMasterItem[];
  sortByProperty?: SortByProjectMasterItem[];
  listingTypes?: ListingType[];
  agentTypes?: AgentType[];
  jobTitles?: JobTitle[];
  languages?: Language[];
  countries?: country[];
  agentExperience?: agentExperience[];
  projectLeadStatuses?: {
    name: string;
    value: string;
  }[];
  projectLeadSubTabs?: {
    name: string;
    value: string;
  }[];
  projectLeadTabs?: {
    name: string;
    value: string;
  }[];
  notificationStatus?: {
    name: string;
    value: string;
  }[];
  supportedUrls?: {
    projectUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    propertyUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    agencyUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    agentUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    developerUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    userUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
    amenityUrl?: {
      img?: string;
      vid?: string;
      doc?: string;
    };
  };
  propertyLocations?: Array<{
    _id?: string;
    cityKey?: string;
    displayName?: string;
    propertyCount?: number;
    updatedAt?: string;
  }>;
};

export type GetAgencyDashboardParams = {
  projectTab?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
};

export type AgentsResponse = {
  agents: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
export type AgencyProfileResponse = {
  status: boolean;
  message: string;
  data: AgencyProfile;
};

export type AgencyNotificationMetadata = {
  inquiryId?: string;
  projectId?: string;
  projectName?: string;
  image?: string;
  dealType?: string;
  dealAmount?: number;
  currency?: string;
  agentName?: string;
  approvalStatus?: string;
  unitsAssigned?: number;
  totalUnits?: number;
  addedUnits?: number;
  removedUnits?: number;
  decision?: string;
};

export type AgencyNotificationItem = {
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
  metadata?: AgencyNotificationMetadata | null;
  createdAt?: string;
};

export type AgencyNotificationsResponse = {
  notifications: AgencyNotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
export type AgencyProfile = {
  _id: string;
  agencyName: string;
  email: string;
  phoneNumber: string;
  /** Dialing code from API, e.g. `+971` */
  phoneCode?: string;
  /** Local subscriber number without country code */
  phoneNumberWithoutCode?: string;
  orn: string;
  profilePicture: string;
  nationality: string;

  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    fullAddress: string;
  };

  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  /** Platform / agency verification (shown in shell header). */
  isVerified?: boolean;
  unreadNotificationCount?: number;
  hasUnreadNotifications?: boolean;

  foundedYear: number;
  description: string;
  aboutUs: string;

  createdAt: string;
  updatedAt: string;
};

export type GetProjectsResponse = {
  projects: any[];
  pagination: {
    page: number;
    limit: number;
    totalProjects: number;
    totalPages: number;
  };
  tabs: {
    unallocated: number;
    allocated: number;
  };
};

export type ProjectLeadsResponse = {
  inquiries: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
  };
  counts?: {
    new: number;
    attended: number;
    closed: number;
    closeDealRequest: number;
    closedDeal: number;
  };
};

export type ProjectUnitsResponse = {
  totalUnits: number;
  soldUnits: number;
  remainingUnits: number;

  propertyTypeFilters: {
    id: string;
    name: string;
    count: number;
  }[];

  tabs: {
    unassigned: number;
    assigned: number;
  };

  layouts: {
    layoutId: string;
    buildingName: string;
    propertyType: string;
    layoutName: string;
    beds: number;
    totalAvailableUnits: number;

    /** Present when `tab=assigned` — matches API `assignedAgents` on each layout row */
    assignedAgents?: {
      agentId: string;
      fullName: string;
      profilePicture?: string | null;
      agentType?: string;
      unitsAssigned: number;
      specialization?: { title?: string; description?: string } | null;
    }[];

    /** @deprecated API uses `assignedAgents`; kept for older responses */
    agentName?: string;
    agentTitle?: string;
    agentAvatar?: string;
    unitsAssigned?: number;
  }[];

  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalLayouts: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type ProjectUnitDetailResponse = {
  buildingName: string | null;
  layoutName: string;
  beds: number;
  maidBedroom: boolean;
  baths: number;
  unitsAvailable: number;
  unitsAssigned: number;
  propertyType: string;
  areaSqft: number;
  areaSqm: number;

  price: {
    amount: number;
    currency: string;
  };

  floorPlans: string[];

  unitGrid: {
    unitId: string;
    unitNumber: string;
    floor?: number | null;
    isAssigned: boolean;
    status: string;
    displayState?:
      | "sold-by-your-agent"
      | "sold-by-other"
      | "agent-working-on"
      | "available"
      | "unavailable";
  }[];

  activeTab: string;
  statusCounts?: Record<string, number>;
  units?: {
    unitId: string;
    unitNumber: string;
    assignedAgencies: { agencyId: string; agencyName: string }[];
    yourAgent: {
      agentId: string;
      fullName: string;
      profilePicture?: string;
      agencyName?: string;
      specialization?: { title?: string; description?: string };
    } | null;
    handlingAgent: {
      agentId: string;
      fullName: string;
      profilePicture?: string;
      agencyName?: string;
      specialization?: { title?: string; description?: string };
    } | null;
    unitStatus: string;
  }[];
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalUnits: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  assignedAgents?: {
    allocationId: string;
    agentId: string;
    fullName: string;
    profilePicture: string;
    agentType: string;
    ratings: number;
    status: string;
    unitsCount: number;
    layoutSummary?: {
      layoutName?: string;
      buildingName?: string | null;
      propertyType?: string | null;
      areaSqft?: number;
      bedrooms?: number;
      totalUnits?: number;
      units?: Array<{
        _id?: string;
        unitId?: string;
        unitNumber?: string;
      }>;
    };
  }[];
};

/** `GET /agency/projects/units?projectId=&bulk=true` — bulk assign screen */
export type AgencyBulkAssignUnit = {
  unitId: string;
  unitNumber: string;
  isAssigned: boolean;
  status: string;
};

export type AgencyBulkAssignLayout = {
  layoutId: string;
  layoutName: string;
  beds: number;
  areaSqft: number;
  totalUnits: number;
  selectedCount: number;
  units: AgencyBulkAssignUnit[];
};

export type AgencyBulkAssignBuilding = {
  buildingId: string | null;
  buildingName: string | null;
  propertyType: string | null;
  layouts: AgencyBulkAssignLayout[];
};

export type AgencyBulkAssignUnitsResponse = {
  buildings: AgencyBulkAssignBuilding[];
  totalUnits: number;
  legendType: string;
};

export type AssignProjectAgentsBody = {
  projectId: string;
  assignments: Array<{
    agentId: string;
    unitIds: string[];
  }>;
};

export type UpdateProjectAgentAllocationBody = {
  projectId: string;
  allocationId: string;
  unitIds: string[];
};

/* ================= SERVICE ================= */

export const agencyService = {
  getDashboard(params?: GetAgencyDashboardParams) {
    const search = new URLSearchParams();

    if (params?.projectTab) search.set("projectTab", params.projectTab);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (typeof params?.page === "number")
      search.set("page", String(params.page));
    if (typeof params?.limit === "number")
      search.set("limit", String(params.limit));

    const queryString = search.toString();

    const url = queryString
      ? `/agency/dashboard?${queryString}`
      : "/agency/dashboard";

    return apiClient.get<AgencyDashboardResponse>(url);
  },
  getMasterData(types?: string[]) {
    const query = types?.length ? `?types=${types.join(",")}` : "";

    return apiClient.get<MasterDataResponse>(`/master-data${query}`, {
      auth: false,
    });
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
    const url = query ? `/agency/notifications?${query}` : "/agency/notifications";
    return apiClient.get<AgencyNotificationsResponse>(url);
  },

  markNotificationAsRead(id: string) {
    return apiClient.put<{ id?: string; isRead?: boolean; readAt?: string }>(
      `/agency/notifications/${encodeURIComponent(id.trim())}/read`,
    );
  },

  deleteNotifications(ids: string[]) {
    return apiClient.delete<{ deletedCount?: number }>("/agency/notifications", {
      body: { ids },
    });
  },

  getProfile() {
    return apiClient.get<AgencyProfile>("/agency/profile");
  },

  updateProfile(body: Record<string, unknown>) {
    return apiClient.put<AgencyProfile>("/agency/profile", body);
  },

  getAgents(params?: {
    tab?: string;
    isActive?: string;
    sortBy?: string;
    isDropdown?: boolean;
    /** e.g. `agent` | `superagent` — used with `isDropdown` */
    agentType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams();

    if (params?.tab) search.set("tab", params.tab);
    if (params?.isActive) search.set("isActive", params.isActive);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (params?.isDropdown) search.set("isDropdown", "true");
    if (params?.agentType) search.set("agentType", params.agentType);
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));

    return apiClient.get(`/agency/agents?${search.toString()}`);
  },

  inviteAgent(body: { fullName: string; email: string }) {
    return apiClient.post<{
      status: boolean;
      message: string;
      data: {
        email: string;
        invitationToken: string;
        expiresAt: string;
        invitationLink: string;
      };
    }>("/agency/invite", body);
  },

  getProjects(params?: {
    projectId?: string;
    tab?: string;
    subTab?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
    /** Case-insensitive match on project name, city, zone, address (API). */
    search?: string;
  }): Promise<GetProjectsResponse> {
    const search = new URLSearchParams();

    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.tab) search.set("tab", params.tab);
    if (params?.subTab) search.set("subTab", params.subTab);
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    search.set("page", String(params?.page ?? 1));
    search.set("limit", String(params?.limit ?? 10));
    if (params?.search != null && String(params.search).trim() !== "") {
      search.set("search", String(params.search).trim());
    }

    return apiClient
      .get<GetProjectsResponse>(`/agency/projects?${search.toString()}`)
      .then((res) => res);
  },

  getProperties(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
    /** Case-insensitive partial match on allocation title (API). */
    search?: string;
  }) {
    const search = new URLSearchParams();

    if (params?.status) search.set("status", params.status);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (params?.search != null && String(params.search).trim() !== "") {
      search.set("search", String(params.search).trim());
    }

    return apiClient.get<{
      allocations: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/agency/allocation/list?${search.toString()}`);
  },

  getAgentById(
    id: string,
    params?: { listPage?: number; listLimit?: number },
  ): Promise<GetAgentByIdResponse> {
    const search = new URLSearchParams();

    if (params?.listPage) search.set("listPage", String(params.listPage));
    if (params?.listLimit) search.set("listLimit", String(params.listLimit));

    return apiClient.get<GetAgentByIdResponse>(
      `/agency/agents/${id}?${search.toString()}`,
    );
  },

  verifyAgent(
    id: string,
    body: {
      action: "approve" | "decline";
      specializationId?: string;
      agentType?: string;
      isActive?: boolean;
      reason?: string;
    },
  ): Promise<{ agent: any }> {
    return apiClient.post<{ agent: any }>(`/agency/agents/${id}/verify`, body);
  },

  updateAgent(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      brokerLicenseNumber?: string;
      aboutMe?: string;

      isActive?: boolean;
      agentType?: string;
      jobTitle?: string;
      experience?: string;
      languages?: string[];

      nationality?: string;

      linkedinUrl?: string;
    },
  ): Promise<any> {
    return apiClient.put(`/agency/agents/${id}`, data);
  },

  uploadAgentProfilePicture(
    agentId: string,
    data: {
      file?: File;
      removeProfilePicture?: boolean;
    },
  ) {
    const formData = new FormData();

    if (data.file) {
      formData.append("profilePicture", data.file);
    }

    if (data.removeProfilePicture) {
      formData.append("removeProfilePicture", "true");
    }

    return apiClient.post(
      `/agency/agents/${agentId}/upload-profile-picture`,
      formData,
    );
  },

  uploadAgencyProfilePicture(
    agencyId: string,
    data: {
      file?: File;
      removeProfilePicture?: boolean;
    },
  ) {
    const formData = new FormData();

    // REQUIRED
    formData.append("agencyId", agencyId);

    // OPTIONAL (ONLY if backend requires it)
    formData.append("invitationToken", "");

    if (data?.file) {
      formData.append("profilePicture", data.file);
    }

    if (data?.removeProfilePicture) {
      formData.append("removeProfilePicture", "true");
    }

    return apiClient.post("/auth/agency/upload-profile-picture", formData);
  },
  getAgentProperties(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    status?: string;
    search?: string;
    listingType?: string;
    agentId?: string;
    propertyId?: string;
    /** Same value often sent as both city + zone per API contract (e.g. `cityKey`). */
    city?: string;
    zone?: string;
    /** ISO date YYYY-MM-DD — filters publishedAt (API). */
    startDate?: string;
    endDate?: string;
  }): Promise<GetAgentPropertiesResponse> {
    const search = new URLSearchParams();
    if (params?.agentId) search.set("agentId", params.agentId);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.sortBy) search.set("sortBy", params.sortBy);
    if (params?.status) search.set("status", params.status);
    if (params?.search) search.set("search", params.search);
    if (params?.propertyId) search.set("propertyId", params.propertyId);
    if (params?.listingType) search.set("listingType", params.listingType);
    if (params?.city?.trim()) search.set("city", params.city.trim());
    if (params?.zone?.trim()) search.set("zone", params.zone.trim());
    if (params?.startDate?.trim()) search.set("startDate", params.startDate.trim());
    if (params?.endDate?.trim()) search.set("endDate", params.endDate.trim());

    return apiClient.get(`/agency/properties?${search.toString()}`);
  },

  getProjectLeads(params?: {
    id?: string;
    tab?: string;
    subTab?: string;
    projectLeadStatus?: string;
    agentId?: string;
    projectId?: string;
    layoutId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    counts?: boolean;
  }): Promise<ProjectLeadsResponse> {
    const search = new URLSearchParams();
    if (params?.id) search.set("id", params.id);
    if (params?.tab) search.set("tab", params.tab);
    if (params?.subTab) search.set("subTab", params.subTab);
    if (params?.projectLeadStatus?.trim()) {
      search.set("projectLeadStatus", params.projectLeadStatus.trim());
    }
    if (params?.agentId) search.set("agentId", params.agentId);
    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.layoutId) search.set("layoutId", params.layoutId);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.startDate?.trim()) search.set("startDate", params.startDate.trim());
    if (params?.endDate?.trim()) search.set("endDate", params.endDate.trim());
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.counts === true) search.set("counts", "true");

    return apiClient.get(`/agency/project-leads?${search.toString()}`);
  },

  getProjectLeadById(id: string) {
    return apiClient.get(`/agency/project-leads/${id}`);
  },

  getProjectLeadAvailableUnits(id: string) {
    return apiClient.get<{
      units?: Array<{
        id?: string;
        unitId?: string;
        unitNumber?: string;
        floor?: number | null;
        status?: string;
      }>;
    }>(`/agency/project-leads/${String(id).trim()}/available-units`);
  },

  updateAgencyProjectLeadStatus(
    id: string,
    body: {
      type: "attend" | "set-project-status" | "close-inquiry";
      projectLeadStatus?: "available" | "reserved" | "in-progress" | "follow-up" | "pre-close";
      unitId?: string;
      notes?: string;
    },
  ) {
    return apiClient.post(`/agency/project-leads/${String(id).trim()}/status`, body);
  },

  uploadAgencyProjectCloseDealDocument(formData: FormData) {
    return apiClient.post<{
      document?: { url?: string; filename?: string; uploadedAt?: string };
    }>("/agency/project-leads/close-deal-document", formData);
  },

  submitAgencyProjectLeadDeal(
    id: string,
    body: {
      dealAmount: number;
      currency?: string;
      dealType?: "sale" | "rent";
      commission?: number;
      document: { url: string; filename: string; uploadedAt?: string };
      notes?: string;
    },
  ) {
    return apiClient.post(`/agency/project-leads/${String(id).trim()}/submit-deal`, body);
  },

  approveAgencyProjectLeadDeal(
    id: string,
    body: {
      action: "approve" | "decline";
      dealType?: "sale" | "rent";
      commission?: number;
      declinedReason?: string;
      notes?: string;
    },
  ) {
    return apiClient.post(`/agency/project-leads/${String(id).trim()}/approve-deal`, body);
  },

  getProjectUnits(params?: {
    projectId?: string;
    layoutId?: string;
    tab?: string;
    subTab?: string;
    unitStatusTab?: string;
    statusFilter?: string;
    /** Server-side filter (layouts, units, assigned agents) on units list */
    search?: string;
    page?: number;
    limit?: number;
    bulk?: boolean;
  }): Promise<ProjectUnitDetailResponse | AgencyBulkAssignUnitsResponse> {
    const search = new URLSearchParams();

    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.layoutId) search.set("layoutId", params.layoutId);
    if (params?.tab) search.set("tab", params.tab);
    if (params?.subTab) search.set("subTab", params.subTab);

    if (params?.unitStatusTab) {
      search.set("unitStatusTab", params.unitStatusTab);
    }

    if (params?.statusFilter) {
      search.set("statusFilter", params.statusFilter);
    }

    if (params?.search?.trim()) {
      search.set("search", params.search.trim());
    }

    if (params?.page) {
      search.set("page", String(params.page));
    }

    if (params?.limit) {
      search.set("limit", String(params.limit));
    }

    if (params?.bulk === true) {
      search.set("bulk", "true");
    }

    return apiClient.get(
      `/agency/projects/units?${search.toString()}`,
    );
  },

  assignProjectAgents(body: AssignProjectAgentsBody) {
    return apiClient.post("/agency/projects/assign-agents", body);
  },

  updateProjectAgentAllocation(body: UpdateProjectAgentAllocationBody) {
    return apiClient.put("/agency/projects/assign-agents", body);
  },

  getPropertyLeads(params?: {
    status?: "new" | "attended" | "closed" | "closed-sale-rent";
    transactionType?: "sale" | "rent";
    search?: string;
    startDate?: string;
    endDate?: string;
    counts?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const search = new URLSearchParams();

    if (params?.status) search.set("status", params.status);
    if (params?.transactionType) search.set("transactionType", params.transactionType);
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.counts) search.set("counts", "true");
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));

    return apiClient.get(`/agency/inquiries?${search.toString()}`);
  },

  getPropertyLeadById(id: string) {
    return apiClient.get(`/agency/inquiries/${id}`);
  },

  allocateProperty(data: {
    agentId: string;
    title: string;
    document: File;
    location?: string;
    propertyType?: string;
    expectedPrice?: number;
    deadline?: string;
    notes?: string;
  }) {
    const formData = new FormData();

    formData.append("agentId", data.agentId);
    formData.append("title", data.title);
    formData.append("document", data.document);

    if (data.location) {
      formData.append("location", data.location);
    }

    if (data.propertyType) {
      formData.append("propertyType", data.propertyType);
    }

    if (data.expectedPrice) {
      formData.append("expectedPrice", String(data.expectedPrice));
    }

    if (data.deadline) {
      formData.append("deadline", data.deadline);
    }

    if (data.notes) {
      formData.append("notes", data.notes);
    }

    return apiClient.post("/agency/allocation/send", formData);
  },

  getAllocationById(id: string) {
    return apiClient.get(`/agency/allocation/${id}`);
  },

  updateAllocation(
    allocationId: string,
    data: {
      agentId: string;
      title: string;
      document?: File;
      location?: string;
      propertyType?: string;
      expectedPrice?: number;
      deadline?: string;
      notes?: string;
    },
  ) {
    // PUT /agency/allocation/:id does not have multipart middleware,
    // so when no document is uploaded we must send JSON.
    if (!data.document) {
      return apiClient.put(`/agency/allocation/${allocationId}`, {
        agentId: data.agentId,
        title: data.title,
        notes: data.notes,
        deadline: data.deadline,
      });
    }

    // Fallback: if document is provided we still send FormData.
    // (This endpoint currently doesn't mount multer for PUT, so this may require backend adjustment.)
    const formData = new FormData();
    formData.append("agentId", data.agentId);
    formData.append("title", data.title);
    formData.append("document", data.document);

    if (data.deadline) formData.append("deadline", data.deadline);
    if (data.notes) formData.append("notes", data.notes);

    return apiClient.put(`/agency/allocation/${allocationId}`, formData);
  },

  getListingTypesMasterData() {
    return apiClient.get<{
      listingTypes?: ListingType[];
      listingtypes?: ListingType[];
    }>("/master-data?type=listingtypes", { auth: false });
  },

  getPropertyTypesMasterData() {
    return apiClient.get<{
      propertyTypes?: Array<{ _id: string; name: string; slug?: string; isActive?: boolean; displayOrder?: number }>;
      propertytypes?: Array<{ _id: string; name: string; slug?: string; isActive?: boolean; displayOrder?: number }>;
    }>("/master-data?type=propertytypes", { auth: false });
  },

  getAmenitiesMasterData() {
    return apiClient.get<{
      amenities?: Array<{ _id: string; name: string; icon?: string; image?: string; isActive?: boolean; displayOrder?: number }>;
    }>("/master-data?type=amenities", { auth: false });
  },

  getSupportedUrlsMasterData() {
    return apiClient.get<{
      supportedUrls?: { propertyUrl?: { img?: string; vid?: string } };
      supportedurls?: { propertyUrl?: { img?: string; vid?: string } };
      propertyUrl?: { img?: string; vid?: string };
    }>("/master-data?type=supportedurls", { auth: false });
  },

  /** `GET /agency/properties?propertyId=...` — single property for agency-owned listing. */
  getPropertyById(propertyId: string) {
    const search = new URLSearchParams();
    search.set("propertyId", propertyId.trim());
    search.set("page", "1");
    search.set("limit", "1");
    return apiClient.get<Record<string, unknown>>(`/agency/properties?${search.toString()}`);
  },

  updateProperty(propertyId: string, body: Record<string, unknown>) {
    return apiClient.put<Record<string, unknown>>(
      `/agency/properties/${propertyId.trim()}`,
      body,
    );
  },

  uploadPropertyMedia(formData: FormData) {
    return apiClient.post<{
      uploads?: {
        images?: Array<{ url?: string; filename?: string; path?: string }>;
        videos?: Array<{ url?: string; filename?: string; path?: string }>;
      };
      baseUrls?: { images?: string; videos?: string };
    }>("/agency/properties/upload-media", formData);
  },
};
