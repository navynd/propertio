const { Types } = require('mongoose');

const DealClosure = require('../models/dealClosureModel');

const CLOSED_DEAL_STATUSES = ['approved', 'completed'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const VALID_DEAL_TYPES = new Set(['rent', 'sale']);
const VALID_TIMEFRAMES = new Set(['1w', '1m', '3m', '6m', '1y', 'ytd', '3y']);
const VALID_SORT = new Set(['newest', 'oldest', 'price-high', 'price-low']);
const VALID_BEDROOMS = new Set([
  'studio',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '7+',
]);

const escapeRegex = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatNumber = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString('en-US');
};

const formatCompactCount = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return formatNumber(v);
};

const formatTxDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeDealType = (raw) => {
  const v = String(raw ?? 'rent').toLowerCase().trim();
  if (v === 'rented' || v === 'rent') return 'rent';
  if (v === 'sold' || v === 'sale') return 'sale';
  return null;
};

const normalizeSortBy = (raw) => {
  const v = String(raw ?? 'newest').toLowerCase().trim();
  if (VALID_SORT.has(v)) return v;
  const map = {
    'price: high to low': 'price-high',
    'price: low to high': 'price-low',
    'price-high to low': 'price-high',
  };
  return map[v] || 'newest';
};

const normalizeTimeframe = (raw) => {
  const v = String(raw ?? '1w').toLowerCase().trim();
  const map = {
    '1 week': '1w',
    '1 month': '1m',
    '3 months': '3m',
    '6 months': '6m',
    '1 year': '1y',
    ytd: 'ytd',
    '3 years': '3y',
  };
  const key = map[v] || v;
  return VALID_TIMEFRAMES.has(key) ? key : '1w';
};

const resolveDateWindows = (timeframe) => {
  const now = new Date();
  const since = new Date(now);

  switch (timeframe) {
    case '1w':
      since.setDate(since.getDate() - 7);
      break;
    case '1m':
      since.setMonth(since.getMonth() - 1);
      break;
    case '3m':
      since.setMonth(since.getMonth() - 3);
      break;
    case '6m':
      since.setMonth(since.getMonth() - 6);
      break;
    case '1y':
      since.setFullYear(since.getFullYear() - 1);
      break;
    case 'ytd':
      since.setMonth(0, 1);
      since.setHours(0, 0, 0, 0);
      break;
    case '3y':
      since.setFullYear(since.getFullYear() - 3);
      break;
    default:
      since.setDate(since.getDate() - 7);
  }

  const durationMs = now.getTime() - since.getTime();
  const prevEnd = new Date(since.getTime());
  const prevSince = new Date(since.getTime() - durationMs);

  return { since, now, prevSince, prevEnd };
};

const parsePositiveInt = (value, fallback, max) => {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

const parsePriceBound = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * @param {Record<string, unknown>} query
 */
const parseHistoricalTransactionsQuery = (query = {}) => {
  const dealType = normalizeDealType(query.dealType);
  if (!dealType) {
    return { error: 'Invalid dealType. Use rent or sale.' };
  }

  const timeframe = normalizeTimeframe(query.timeframe);
  const sortBy = normalizeSortBy(query.sortBy);
  const page = parsePositiveInt(query.page, DEFAULT_PAGE, 10_000);
  const limit = parsePositiveInt(query.limit, DEFAULT_LIMIT, MAX_LIMIT);

  let propertyTypeId = null;
  if (query.propertyTypeId && Types.ObjectId.isValid(query.propertyTypeId)) {
    propertyTypeId = new Types.ObjectId(query.propertyTypeId);
  }

  let bedrooms = null;
  const bedRaw = String(query.bedrooms ?? '').toLowerCase().trim();
  if (bedRaw && VALID_BEDROOMS.has(bedRaw)) {
    bedrooms = bedRaw;
  }

  const priceMin = parsePriceBound(query.priceMin);
  const priceMax = parsePriceBound(query.priceMax);
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    return { error: 'priceMin cannot be greater than priceMax.' };
  }

  const city = String(query.city ?? 'Dubai').trim();
  const location = String(query.location ?? query.q ?? '').trim();
  const agency = String(query.agency ?? '').trim();

  return {
    dealType,
    timeframe,
    sortBy,
    page,
    limit,
    propertyTypeId,
    bedrooms,
    priceMin,
    priceMax,
    city,
    location,
    agency,
    windows: resolveDateWindows(timeframe),
  };
};

const buildBedroomsMatch = (bedrooms) => {
  if (!bedrooms) return null;
  if (bedrooms === 'studio') return { 'propertyDoc.bedrooms': 0 };
  if (bedrooms === '7+') return { 'propertyDoc.bedrooms': { $gte: 7 } };
  const n = Number(bedrooms);
  if (Number.isFinite(n)) return { 'propertyDoc.bedrooms': n };
  return null;
};

const buildPostLookupMatch = (filters) => {
  const clauses = [];

  if (filters.city) {
    clauses.push({
      'propertyDoc.location.city': new RegExp(`^${escapeRegex(filters.city)}$`, 'i'),
    });
  }

  if (filters.propertyTypeId) {
    clauses.push({ 'propertyDoc.propertyType': filters.propertyTypeId });
  }

  const bedMatch = buildBedroomsMatch(filters.bedrooms);
  if (bedMatch) clauses.push(bedMatch);

  if (filters.priceMin != null || filters.priceMax != null) {
    const amount = {};
    if (filters.priceMin != null) amount.$gte = filters.priceMin;
    if (filters.priceMax != null) amount.$lte = filters.priceMax;
    clauses.push({ dealAmount: amount });
  }

  const searchParts = [];
  if (filters.location) {
    const rx = new RegExp(escapeRegex(filters.location), 'i');
    searchParts.push(
      { 'propertyDoc.title': rx },
      { 'propertyDoc.location.zone': rx },
      { 'propertyDoc.location.city': rx },
      { 'propertyDoc.location.building': rx },
      { 'propertyDoc.location.fullAddress': rx },
      { 'agencyDoc.agencyName': rx },
    );
  }
  if (filters.agency) {
    const rx = new RegExp(escapeRegex(filters.agency), 'i');
    searchParts.push({ 'agencyDoc.agencyName': rx });
  }
  if (searchParts.length) {
    clauses.push({ $or: searchParts });
  }

  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
};

const buildBaseDealMatch = (dealType, closedDateRange) => ({
  dealCategory: 'property',
  dealType,
  status: { $in: CLOSED_DEAL_STATUSES },
  property: { $exists: true, $ne: null },
  closedDate: closedDateRange,
});

const buildLookupStages = () => [
  {
    $lookup: {
      from: 'properties',
      localField: 'property',
      foreignField: '_id',
      as: 'propertyDoc',
    },
  },
  { $unwind: '$propertyDoc' },
  {
    $lookup: {
      from: 'propertytypes',
      localField: 'propertyDoc.propertyType',
      foreignField: '_id',
      as: 'propertyTypeDoc',
    },
  },
  {
    $unwind: {
      path: '$propertyTypeDoc',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'agencies',
      localField: 'agency',
      foreignField: '_id',
      as: 'agencyDoc',
    },
  },
  {
    $unwind: {
      path: '$agencyDoc',
      preserveNullAndEmptyArrays: true,
    },
  },
];

const resolveLocationName = (property) => {
  const building = String(property?.location?.building ?? '').trim();
  const title = String(property?.title ?? '').trim();
  if (building) return building;
  if (title) return title.split('|')[0]?.trim() || title;
  return 'Property';
};

const resolveLocationSub = (property) => {
  const zone = String(property?.location?.zone ?? '').trim();
  const city = String(property?.location?.city ?? '').trim();
  return [zone, city].filter(Boolean).join(', ') || '';
};

const resolveBedroomsLabel = (bedrooms) => {
  const n = Number(bedrooms);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Studio';
  return String(n);
};

const resolveContractStatus = (deal, dealType) => {
  if (dealType === 'rent') {
    if (deal.contractDetails?.renewalDate) return 'renewed';
    return 'new';
  }
  const status = String(deal.propertyDoc?.completionStatus ?? '').toLowerCase();
  if (status === 'off-plan') return 'off-plan';
  return 'ready';
};

const resolveDateFields = (deal) => {
  const start = deal.contractDetails?.startDate;
  const end = deal.contractDetails?.endDate;
  if (start && end) {
    return {
      dateFrom: start,
      dateTo: end,
      dateLabel: `${formatTxDate(start)} - ${formatTxDate(end)}`,
      date: end,
    };
  }
  const closed = deal.closedDate;
  return {
    dateFrom: closed,
    dateTo: null,
    dateLabel: formatTxDate(closed),
    date: closed,
  };
};

const mapDealRow = (deal, dealType) => {
  const property = deal.propertyDoc;
  const sqft = Number(property?.area?.sqft);
  const amount = Number(deal.dealAmount) || 0;
  const amountPerSqft =
    Number.isFinite(sqft) && sqft > 0 ? amount / sqft : null;
  const dates = resolveDateFields(deal);

  return {
    id: deal._id.toString(),
    dealId: deal._id.toString(),
    propertyId: property?._id?.toString() ?? null,
    locationName: resolveLocationName(property),
    locationSub: resolveLocationSub(property),
    amount,
    amountFormatted: formatNumber(amount),
    amountPerSqft,
    amountPerSqftFormatted:
      amountPerSqft != null ? formatNumber(amountPerSqft) : null,
    date: dates.date,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    dateLabel: dates.dateLabel,
    contractStatus: resolveContractStatus(deal, dealType),
    propertyType: deal.propertyTypeDoc?.name ?? '',
    bedrooms: Number(property?.bedrooms),
    bedroomsLabel: resolveBedroomsLabel(property?.bedrooms),
    sizeSqft: sqft || 0,
    sizeSqftFormatted: formatNumber(sqft || 0),
    currency: deal.currency || 'AED',
    city: property?.location?.city ?? '',
    zone: property?.location?.zone ?? '',
  };
};

const average = (values) => {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

const percentChange = (current, previous) => {
  if (!Number.isFinite(previous) || previous === 0) {
    if (!Number.isFinite(current) || current === 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
};

const buildSummary = (currentRows, previousCount, dealType) => {
  const amounts = currentRows.map((r) => Number(r.dealAmount)).filter(Number.isFinite);
  const avgDealAmount = average(amounts);
  const transactionCount = currentRows.length;

  const renewed = currentRows.filter((d) => d.contractDetails?.renewalDate);
  const newDeals = currentRows.filter((d) => !d.contractDetails?.renewalDate);

  const renewedAmounts = renewed.map((d) => Number(d.dealAmount)).filter(Number.isFinite);
  const newAmounts = newDeals.map((d) => Number(d.dealAmount)).filter(Number.isFinite);

  const summary = {
    avgDealAmount: avgDealAmount != null ? Math.round(avgDealAmount) : null,
    avgDealAmountFormatted:
      avgDealAmount != null ? formatNumber(avgDealAmount) : null,
    transactionCount,
    transactionCountFormatted: formatCompactCount(transactionCount),
    transactionCountChangePercent: percentChange(transactionCount, previousCount),
  };

  if (dealType === 'rent') {
    summary.newRentals = {
      count: newDeals.length,
      avgDealAmount:
        average(newAmounts) != null ? Math.round(average(newAmounts)) : null,
      avgDealAmountFormatted:
        average(newAmounts) != null ? formatNumber(average(newAmounts)) : null,
    };
    summary.renewedRent = {
      count: renewed.length,
      avgDealAmount:
        average(renewedAmounts) != null
          ? Math.round(average(renewedAmounts))
          : null,
      avgDealAmountFormatted:
        average(renewedAmounts) != null
          ? formatNumber(average(renewedAmounts))
          : null,
    };
  }

  return summary;
};

const runFilteredDeals = async (dealType, closedDateRange, postMatch) => {
  const pipeline = [
    { $match: buildBaseDealMatch(dealType, closedDateRange) },
    ...buildLookupStages(),
  ];
  if (Object.keys(postMatch).length) {
    pipeline.push({ $match: postMatch });
  }
  return DealClosure.aggregate(pipeline);
};

/**
 * @param {Record<string, unknown>} query
 */
const getHistoricalTransactions = async (query = {}) => {
  const parsed = parseHistoricalTransactionsQuery(query);
  if (parsed.error) {
    return { error: parsed.error };
  }

  const {
    dealType,
    timeframe,
    sortBy,
    page,
    limit,
    propertyTypeId,
    bedrooms,
    priceMin,
    priceMax,
    city,
    location,
    agency,
    windows,
  } = parsed;

  const postMatch = buildPostLookupMatch({
    city,
    propertyTypeId,
    bedrooms,
    priceMin,
    priceMax,
    location,
    agency,
  });

  const currentRange = { $gte: windows.since, $lte: windows.now };
  const previousRange = { $gte: windows.prevSince, $lt: windows.prevEnd };

  const [currentRows, previousRows] = await Promise.all([
    runFilteredDeals(dealType, currentRange, postMatch),
    runFilteredDeals(dealType, previousRange, postMatch),
  ]);

  const summary = buildSummary(currentRows, previousRows.length, dealType);

  const sorted = [...currentRows].sort((a, b) => {
    const dateDiff =
      new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime();
    switch (sortBy) {
      case 'oldest':
        return -dateDiff;
      case 'price-high': {
        const amt = (b.dealAmount || 0) - (a.dealAmount || 0);
        return amt !== 0 ? amt : dateDiff;
      }
      case 'price-low': {
        const amt = (a.dealAmount || 0) - (b.dealAmount || 0);
        return amt !== 0 ? amt : dateDiff;
      }
      case 'newest':
      default:
        return dateDiff;
    }
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const pageRows = sorted.slice(start, start + limit);

  return {
    dealType,
    timeframe,
    sortBy,
    filters: {
      city,
      location: location || null,
      agency: agency || null,
      propertyTypeId: propertyTypeId?.toString() ?? null,
      bedrooms,
      priceMin,
      priceMax,
    },
    summary,
    transactions: pageRows.map((row) => mapDealRow(row, dealType)),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
};

module.exports = {
  getHistoricalTransactions,
  parseHistoricalTransactionsQuery,
};
