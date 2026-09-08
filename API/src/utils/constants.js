const USER_ROLES = {
  USER: 'user',
  AGENT: 'agent',
  AGENCY: 'agency',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
};

const AUTH_PROVIDERS = {
  EMAIL: 'email',
  GOOGLE: 'google',
  APPLE: 'apple',
  PHONE: 'phone',
};

const LISTING_TYPES = {
  BUY: 'buy',
  RENT: 'rent',
  COMMERCIAL_BUY: 'commercial-buy',
  COMMERCIAL_RENT: 'commercial-rent',
};

const AGENT_TYPES = [

  {
    name: 'Agent',
    value: 'agent',
  },
  {
    name: 'Superagent',
    value: 'superagent',
  }
  // {
  //   name: 'New Agent',
  //   value: 'new-agent',
  // },
];

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

const SEARCH_ALERT_FREQUENCIES = [
  {
    name: 'Hourly',
    value: 'hourly',
  },
  {
    name: 'Daily',
    value: 'daily',
  },
  {
    name: 'Every 3 Days',
    value: 'every-3-days',
  },
  {
    name: "Weekly",
    value: 'weekly',
  },
  {
    name: "Off",
    value: 'off',
  }
];

const SERVICES_NEEDED = [
  {
    name: 'Residential Sale',
    value: 'residential-sale',
  },
  {
    name: 'Residential Rent',
    value: 'residential-rent',
  },
  {
    name: 'Commercial Sale',
    value: 'commercial-sale',
  },
  {
    name: 'Commercial Rent',
    value: 'commercial-rent',
  },
];

const FURNISHED_STATUS = [
  {
    name: 'Fully Furnished',
    value: 'fully',
  },
  {
    name: 'Partially Furnished',
    value: 'partially',
  },
  {
    name: 'Unfurnished',
    value: 'unfurnished',
  }
];

const ALLOCATED_PROPERTY_STATUS = [
  {
    name: 'New',
    value: 'pending',
  },
  {
    name: 'Uploaded',
    value: 'completed',
  }
];

const POSTED_BY = [
  {
    name: 'Agent',
    value: 'agent',
  },
  {
    name: 'Super Agent',
    value: 'superagent',
  }
];

const COMPLETION_STATUS = [
  {
    name: 'Any',
    value: 'any',
  },
  {
    name: 'Off-Plan',
    value: 'off-plan',
  },
  {
    name: 'Ready',
    value: 'ready',
  }
];

const PROJECT_TYPE_STATUS = [
  {
    name: 'New project',
    value: 'ready',
  },
  {
    name: 'Off-plan project',
    value: 'off-plan',
  }
];

const SORT_BY_PROPERTY = [
  {
    name: 'Featured',
    value: 'featured',
  },
  {
    name: 'Newest',
    value: 'newest',
  },
  {
    name: 'Price(high)',
    value: 'price-high',
  },
  {
    name: 'Price(low)',
    value: 'price-low',
  },
  {
    name: 'Beds(least)',
    value: 'beds-least',
  },
  {
    name: 'Beds(most)',
    value: 'beds-most',
  },
];

const SORT_BY_PROJECT = [
  {
    name: 'Featured',
    value: 'featured',
  },
  {
    name: 'Newest',
    value: 'newest',
  },
  {
    name: 'Price(high)',
    value: 'price-high',
  },
  {
    name: 'Price(low)',
    value: 'price-low',
  },
  {
    name: 'Delivery date(earliest)',
    value: 'delivery-date-earliest',
  },
  {
    name: 'Delivery date(latest)',
    value: 'delivery-date-latest',
  },
];


const SQFT_AREA_SIZES = [
  {
    name: '500',
    value: '500',
  },
  {
    name: '600',
    value: '600',
  },
  {
    name: '700',
    value: '700',
  },
  {
    name: '800',
    value: '800',
  },
  {
    name: '900',
    value: '900',
  },
  {
    name: '1000',
    value: '1000',
  },
  {
    name: '1100',
    value: '1100',
  },
  {
    name: '1200',
    value: '1200',
  },
  {
    name: '1300',
    value: '1300',
  },
  {
    name: '1400',
    value: '1400',
  },
  {
    name: '1500',
    value: '1500',
  },
  {
    name: '1600',
    value: '1600',
  },
  {
    name: '1800',
    value: '1800',
  },
  {
    name: '2000',
    value: '2000',
  },
  {
    name: '2200',
    value: '2200',
  },
  {
    name: '2400',
    value: '2400',
  },
  {
    name: '2600',
    value: '2600',
  },
  {
    name: '2800',
    value: '2800',
  },
  {
    name: '3000',
    value: '3000',
  },
  {
    name: '3200',
    value: '3200',
  },
  {
    name: '3400',
    value: '3400',
  },
  {
    name: '3600',
    value: '3600',
  },
  {
    name: '3800',
    value: '3800',
  },
  {
    name: '4200',
    value: '4200',
  },
  {
    name: '4600',
    value: '4600',
  },
  {
    name: '5000',
    value: '5000',
  },
  {
    name: '5400',
    value: '5400',
  },
  {
    name: '5800',
    value: '5800',
  },
  {
    name: '6200',
    value: '6200',
  },
  {
    name: '6600',
    value: '6600',
  },
  {
    name: '7000',
    value: '7000',
  },
  {
    name: '7400',
    value: '7400',
  },
  {
    name: '7800',
    value: '7800',
  },
  {
    name: '8200',
    value: '8200',
  },
  {
    name: '9000',
    value: '9000',
  }
];

const VIRTUAL_VIEWING_TYPES = [
  {
    name: '360 Tours',
    value: '360-tour',
  },
  {
    name: 'Video Tours',
    value: 'video-tour',
  },
  {
    name: 'All Virtual Viewing',
    value: 'all',
  }
];

const INQUIRY_STATUS = [
  {
    name: 'New Inquiries',
    value: 'new',
  },
  {
    name: 'Attended Inquiries',
    value: 'attended',
  },
  {
    name: 'Closed Inquiries',
    value: 'closed',
  },
  {
    name: 'Closed Sale/Rent',
    value: 'closed-sale-rent',
  }
]

const INQUIRY_TYPE = [
  {
    name: 'Call Inquiry',
    value: 'call',
  },
  {
    name: 'Email Inquiry',
    value: 'email',
  },
  {
    name: 'Whatsapp Inquiry',
    value: 'whatsapp',
  }
];

const INQUIRY_DEAL_TYPES = [
  {
    name: 'Sale',
    value: 'sale',
  },
  {
    name: 'Rent',
    value: 'rent',
  }
];

// Generate delivery date options dynamically based on current year
const getCurrentYear = () => new Date().getFullYear();
const generateDeliveryDates = () => {
  const currentYear = getCurrentYear();
  return [
    {
      name: "All dates",
      value: "all-dates",
    },
    {
      name: String(currentYear),
      value: String(currentYear)
    },
    {
      name: "Later",
      value: "later"
    }
  ];
};

const DELIVERY_DATE = generateDeliveryDates();


const PRICE_RANGE = [
  { "name": "300,000", "value": "300000" },
  { "name": "400,000", "value": "400000" },
  { "name": "500,000", "value": "500000" },
  { "name": "600,000", "value": "600000" },
  { "name": "700,000", "value": "700000" },
  { "name": "800,000", "value": "800000" },
  { "name": "900,000", "value": "900000" },
  { "name": "1,000,000", "value": "1000000" },
  { "name": "1,100,000", "value": "1100000" },
  { "name": "1,200,000", "value": "1200000" },
  { "name": "1,300,000", "value": "1300000" },
  { "name": "1,400,000", "value": "1400000" },
  { "name": "1,500,000", "value": "1500000" },
  { "name": "1,600,000", "value": "1600000" },
  { "name": "1,700,000", "value": "1700000" },
  { "name": "1,800,000", "value": "1800000" },
  { "name": "1,900,000", "value": "1900000" },
  { "name": "2,000,000", "value": "2000000" },
  { "name": "2,100,000", "value": "2100000" },
  { "name": "2,200,000", "value": "2200000" },
  { "name": "2,300,000", "value": "2300000" },
  { "name": "2,400,000", "value": "2400000" },
  { "name": "2,500,000", "value": "2500000" },
  { "name": "2,600,000", "value": "2600000" },
  { "name": "2,700,000", "value": "2700000" },
  { "name": "2,800,000", "value": "2800000" },
  { "name": "2,900,000", "value": "2900000" },
  { "name": "3,000,000", "value": "3000000" },

  { "name": "3,250,000", "value": "3250000" },
  { "name": "3,500,000", "value": "3500000" },
  { "name": "3,750,000", "value": "3750000" },
  { "name": "4,000,000", "value": "4000000" },
  { "name": "4,250,000", "value": "4250000" },
  { "name": "4,500,000", "value": "4500000" },
  { "name": "4,750,000", "value": "4750000" },
  { "name": "5,000,000", "value": "5000000" },

  { "name": "6,000,000", "value": "6000000" },
  { "name": "7,000,000", "value": "7000000" },
  { "name": "8,000,000", "value": "8000000" },
  { "name": "9,000,000", "value": "9000000" },
  { "name": "10,000,000", "value": "10000000" },

  { "name": "25,000,000", "value": "25000000" },
  { "name": "50,000,000", "value": "50000000" }
];

const LOAN_TYPE = [
  {
    name: 'Buy a house',
    value: 'buy',
  },
  {
    name: 'Want to refinance',
    value: 'refinance',
  }
];

const RESIDENCY_STATUS = [
  {
    name: 'UAE National',
    value: 'uae-national',
  },
  {
    name: 'UAE Resident',
    value: 'uae-resident',
  },
  {
    name: 'Non-Resident',
    value: 'non-resident',
  }
];

const BUYING_PROCESS = [
  {
    name: 'Found a property',
    value: 'found-property',
  },
  {
    name: 'Looking for a property',
    value: 'looking-for-property',
  },
  {
    name: 'Just exploring',
    value: 'just-exploring',
  }
];

const EMPLOYMENT_STATUS = [
  {
    name: 'Salaried',
    value: 'salaried',
  },
  {
    name: 'I am self employed',
    value: 'self-employed',
  }
];


const DOC_EXTENSIONS = ['pdf', 'doc', 'docx'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/** Agency inquiry list filters — inquiryCategory */
const INQUIRY_CATEGORIES = [
  { name: 'Property', value: 'property' },
  { name: 'Project', value: 'project' },
];

/** Agency generic inquiry status actions (property + project list) */
const INQUIRY_STATUS_ACTIONS = [
  { name: 'Attend', value: 'attend' },
  { name: 'Close inquiry', value: 'close-inquiry' },
];

/** Project leads list tabs */
const PROJECT_LEAD_TABS = [
  { name: 'Customer requests', value: 'customer-requests' },
  { name: 'Close deal request', value: 'close-deal-request' },
  { name: 'Closed deal', value: 'closed-deal' },
];

/** Sub-tabs when tab = customer-requests */
const PROJECT_LEAD_SUBTABS = [
  { name: 'New inquiry', value: 'new' },
  { name: 'Attended inquiry', value: 'attended' },
  { name: 'Closed inquiry', value: 'closed' },
];

/** Global project unit + lead workflow statuses */
const PROJECT_LEAD_STATUSES = [
  { name: 'Available', value: 'available' },
  { name: 'Reserved', value: 'reserved' },
  { name: 'In progress', value: 'in-progress' },
  { name: 'Follow up', value: 'follow-up' },
  { name: 'Pre-close', value: 'pre-close' },
];

/** Project lead POST /status action types */
const PROJECT_LEAD_STATUS_ACTIONS = [
  { name: 'Attend', value: 'attend' },
  { name: 'Set project status', value: 'set-project-status' },
  { name: 'Close inquiry', value: 'close-inquiry' },
];

/** Days until projectLeadStatus expires on inquiry/unit; null = no expiry */
const PROJECT_LEAD_STATUS_EXPIRY_DAYS = {
  reserved: 7,
  'in-progress': 10,
  'follow-up': 20,
  'pre-close': null,
  available: null,
};

/** projectLeadStatus values that require a unitId when setting status */
const PROJECT_LEAD_STATUSES_REQUIRING_UNIT = ['reserved', 'in-progress', 'follow-up', 'pre-close'];

/** UI helper copy for attended lead statuses (null = no banner) */
const PROJECT_LEAD_STATUS_HELPER_TEXT = {
  reserved: 'This Reserved status will be kept for 7 days',
  'in-progress': 'This In-Progress status will be kept for 10 days',
  'follow-up': 'This Follow up status will be kept for 20 days',
  'pre-close': null,
  available: null,
};

const INQUIRY_CATEGORY_VALUES = INQUIRY_CATEGORIES.map((c) => c.value);
const INQUIRY_STATUS_ACTION_VALUES = INQUIRY_STATUS_ACTIONS.map((a) => a.value);
const PROJECT_LEAD_TAB_VALUES = PROJECT_LEAD_TABS.map((t) => t.value);
const PROJECT_LEAD_SUBTAB_VALUES = PROJECT_LEAD_SUBTABS.map((t) => t.value);
const PROJECT_LEAD_STATUS_VALUES = PROJECT_LEAD_STATUSES.map((s) => s.value);
const PROJECT_LEAD_STATUS_ACTION_VALUES = PROJECT_LEAD_STATUS_ACTIONS.map((a) => a.value);

const NOTIFICATION_STATUS = [
  { name: 'All', value: 'all' },
  { name: 'Today', value: 'today' },
  { name: 'Yesterday', value: 'yesterday' },
  { name: 'Last 7 Days', value: 'last-7-days' },
  { name: 'Last 30 Days', value: 'last-30-days' }
]

const HELP_FAQ_CATEGORIES = [
  {
    name: 'All',
    value: 'all'
  },
  {
    name: 'Properties',
    value: 'properties'
  },
  {
    name: 'Buying',
    value: 'buy'
  },
  {
    name: 'Mortgages',
    value: 'mortgages'
  },
  {
    name: 'Account',
    value: 'account'
  }
];

const PROJECT_PROGRESS_STATUS = [
  {
    name: 'Project Announced',
    value: 'project-announced',
  },
  {
    name: 'Booking Open',
    value: 'booking-open',
  },
  {
    name: 'Construction Started',
    value: 'construction-started',
  },
  {
    name: 'Finished',
    value: 'finished',
  }
];

const AGENT_EXPERIENCE = [
  {
    name: '0-1 years',
    value: '1',
  },
  {
    name: '2 years',
    value: '2',
  },
  {
    name: '3 years',
    value: '3',
  },
  {
    name: '4 years',
    value: '4',
  },
  {
    name: '5 years',
    value: '5',
  },
  {
    name: '6 years',
    value: '6',
  },
  {
    name: '7 years',
    value: '7',
  },
  {
    name: '8 years',
    value: '8',
  },
  {
    name: '9 years',
    value: '9',
  },
  {
    name: '10 years',
    value: '10',
  },
  {
    name: '10+ years',
    value: '10+',
  }
];

const PROPERTY_STATUS = [
  {
    name: 'Active',
    value: 'active',
  },
  {
    name: 'Inactive',
    value: 'inactive',
  },
  {
    name: 'Sold',
    value: 'sold',
  },
  {
    name: 'Rented',
    value: 'rented',
  },
  {
    name: 'Pending',
    value: 'pending',
  }
];

module.exports = {
  USER_ROLES,
  AUTH_PROVIDERS,
  LISTING_TYPES,
  AGENT_TYPES,
  SUBSCRIPTION_STATUS,
  INQUIRY_STATUS,
  ERROR_CODES,
  DOC_EXTENSIONS,
  IMAGE_EXTENSIONS,
  SEARCH_ALERT_FREQUENCIES,
  SERVICES_NEEDED,
  FURNISHED_STATUS,
  COMPLETION_STATUS,
  SORT_BY_PROPERTY,
  SQFT_AREA_SIZES,
  VIRTUAL_VIEWING_TYPES,
  SORT_BY_PROJECT,
  DELIVERY_DATE,
  PRICE_RANGE,
  POSTED_BY,
  ALLOCATED_PROPERTY_STATUS,
  INQUIRY_TYPE,
  INQUIRY_DEAL_TYPES,
  LOAN_TYPE,
  RESIDENCY_STATUS,
  BUYING_PROCESS,
  EMPLOYMENT_STATUS,
  INQUIRY_CATEGORIES,
  INQUIRY_STATUS_ACTIONS,
  INQUIRY_CATEGORY_VALUES,
  INQUIRY_STATUS_ACTION_VALUES,
  PROJECT_LEAD_TABS,
  PROJECT_LEAD_SUBTABS,
  PROJECT_LEAD_STATUSES,
  PROJECT_LEAD_STATUS_ACTIONS,
  PROJECT_LEAD_STATUS_EXPIRY_DAYS,
  PROJECT_LEAD_STATUSES_REQUIRING_UNIT,
  PROJECT_LEAD_STATUS_HELPER_TEXT,
  PROJECT_LEAD_TAB_VALUES,
  PROJECT_LEAD_SUBTAB_VALUES,
  PROJECT_LEAD_STATUS_VALUES,
  PROJECT_LEAD_STATUS_ACTION_VALUES,
  NOTIFICATION_STATUS,
  HELP_FAQ_CATEGORIES,
  PROJECT_TYPE_STATUS,
  PROJECT_PROGRESS_STATUS,
  AGENT_EXPERIENCE,
  PROPERTY_STATUS
};

