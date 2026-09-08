const { Types } = require('mongoose');

const Properties = require('../models/propertiesModal');
const DealClosure = require('../models/dealClosureModel');
const ListingType = require('../models/listingTypeModel');

const CLOSED_DEAL_STATUSES = ['approved', 'completed'];
const DEFAULT_TRANSACTION_LIMIT = 10;
const TREND_MONTHS = 12;

const escapeRegex = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatNumber = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString('en-US');
};

const formatInsightDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildLocationSubtitle = (location) => {
  if (!location || typeof location !== 'object') return '';
  return [location.city, location.zone].filter(Boolean).join(', ');
};

const buildDisplayTitle = (property) => {
  const title = String(property?.title ?? '').trim();
  const typeName = String(property?.propertyType?.name ?? '').trim();
  if (!title) return typeName || 'Property';
  if (!typeName) return title;
  const base = title.split('|')[0]?.trim() || title;
  return `${base} | ${typeName}`;
};

const pricePerSqft = (price, sqft) => {
  const p = Number(price);
  const a = Number(sqft);
  if (!Number.isFinite(p) || !Number.isFinite(a) || a <= 0) return null;
  return p / a;
};

const resolveActivePropertyQuery = async (idOrSlug) => {
  const query = { status: 'active', isActive: true };
  if (Types.ObjectId.isValid(idOrSlug)) {
    query._id = new Types.ObjectId(idOrSlug);
  } else {
    query.slug = idOrSlug;
  }

  return Properties.findOne(query)
    .populate({ path: 'propertyType', select: 'name slug' })
    .populate({ path: 'listingType', select: 'name transaction' })
    .lean();
};

/**
 * Loose similarity: match if ANY of zone, city, propertyType, or listingType aligns.
 * Not agent-based — used only to find comparable properties / closed deals.
 */
const buildSimilarityOrClauses = (property, dealListingTypeIds = []) => {
  const or = [];
  const zone = String(property.location?.zone ?? '').trim();
  const city = String(property.location?.city ?? '').trim();

  if (zone) {
    or.push({
      'location.zone': new RegExp(`^${escapeRegex(zone)}$`, 'i'),
    });
  }
  if (city) {
    or.push({
      'location.city': new RegExp(`^${escapeRegex(city)}$`, 'i'),
    });
  }

  const propertyTypeId = property.propertyType?._id || property.propertyType;
  if (propertyTypeId) {
    or.push({ propertyType: propertyTypeId });
  }

  const anchorListingTypeId = property.listingType?._id || property.listingType;
  if (anchorListingTypeId) {
    or.push({ listingType: anchorListingTypeId });
  }
  if (Array.isArray(dealListingTypeIds) && dealListingTypeIds.length) {
    or.push({ listingType: { $in: dealListingTypeIds } });
  }

  return or;
};

/** Active listing filter + loose $or similarity (not strict AND on all fields). */
const buildSimilarPropertyFilter = (property, dealListingTypeIds = []) => {
  const filter = {
    _id: { $ne: property._id },
    status: 'active',
    isActive: true,
  };

  const similarityOr = buildSimilarityOrClauses(property, dealListingTypeIds);
  if (similarityOr.length) {
    filter.$or = similarityOr;
  }

  return filter;
};

const propertyMatchesSimilarity = (prop, anchor, dealListingTypeIds = []) => {
  if (!prop || String(prop._id) === String(anchor._id)) return false;

  const zone = String(anchor.location?.zone ?? '').trim();
  const city = String(anchor.location?.city ?? '').trim();
  const propZone = String(prop.location?.zone ?? '').trim();
  const propCity = String(prop.location?.city ?? '').trim();

  if (zone && propZone && zone.toLowerCase() === propZone.toLowerCase()) {
    return true;
  }
  if (city && propCity && city.toLowerCase() === propCity.toLowerCase()) {
    return true;
  }

  const anchorPt = String(anchor.propertyType?._id || anchor.propertyType || '');
  const propPt = String(prop.propertyType?._id || prop.propertyType || '');
  if (anchorPt && propPt && anchorPt === propPt) {
    return true;
  }

  const anchorLt = String(anchor.listingType?._id || anchor.listingType || '');
  const propLt = String(prop.listingType?._id || prop.listingType || '');
  if (anchorLt && propLt && anchorLt === propLt) {
    return true;
  }

  const dealLtSet = new Set(dealListingTypeIds.map((id) => String(id)));
  if (propLt && dealLtSet.has(propLt)) {
    return true;
  }

  return false;
};

const getListingTypeIdsForDealType = async (dealType) => {
  const txValues =
    dealType === 'rent'
      ? ['rent', 'rental']
      : ['buy', 'sale', 'sell'];

  const rows = await ListingType.find({
    isActive: true,
    transaction: { $in: txValues },
  })
    .select('_id')
    .lean();

  return rows.map((r) => r._id);
};

const mapPropertyToTransactionRow = (property, dealType) => {
  const amount =
    dealType === 'rent' && property.rentPricing?.yearly != null
      ? Number(property.rentPricing.yearly)
      : Number(property.price);

  return {
    propertyId: property._id,
    title: buildDisplayTitle(property),
    subtitle: buildLocationSubtitle(property.location),
    date: formatInsightDate(property.publishedAt || property.updatedAt),
    price: Number.isFinite(amount) ? amount : 0,
    priceFormatted: formatNumber(amount),
    areaSqft: Number(property.area?.sqft) || 0,
    areaFormatted: formatNumber(property.area?.sqft),
    currency: property.currency || 'AED',
    source: 'listing',
  };
};

const mapDealToTransactionRow = (deal) => {
  const property = deal.property;
  if (!property) return null;

  return {
    propertyId: property._id,
    dealId: deal._id,
    title: buildDisplayTitle(property),
    subtitle: buildLocationSubtitle(property.location),
    date: formatInsightDate(deal.closedDate),
    price: Number(deal.dealAmount) || 0,
    priceFormatted: formatNumber(deal.dealAmount),
    areaSqft: Number(property.area?.sqft) || 0,
    areaFormatted: formatNumber(property.area?.sqft),
    currency: deal.currency || 'AED',
    source: 'deal',
  };
};

/**
 * Closed property deals only (not filtered by agent).
 * Property on the deal must loosely match zone / city / propertyType / listingType.
 */
const fetchDealTransactions = async (property, dealType, limit) => {
  const dealListingTypeIds = await getListingTypeIdsForDealType(dealType);
  const fetchCap = Math.min(Math.max(limit * 8, 40), 200);

  const deals = await DealClosure.find({
    dealCategory: 'property',
    dealType,
    status: { $in: CLOSED_DEAL_STATUSES },
    property: { $exists: true, $ne: null },
  })
    .sort({ closedDate: -1 })
    .limit(fetchCap)
    .populate({
      path: 'property',
      match: { status: 'active', isActive: true },
      select:
        'title bedrooms area location currency publishedAt propertyType listingType rentPricing price',
      populate: [
        { path: 'propertyType', select: 'name slug' },
        { path: 'listingType', select: 'name transaction' },
      ],
    })
    .lean();

  return deals
    .filter((deal) =>
      propertyMatchesSimilarity(deal.property, property, dealListingTypeIds),
    )
    .slice(0, limit)
    .map(mapDealToTransactionRow)
    .filter(Boolean);
};

const fetchListingFallbackTransactions = async (
  property,
  dealType,
  limit,
  excludePropertyIds = [],
) => {
  const dealListingTypeIds = await getListingTypeIdsForDealType(dealType);
  const exclude = new Set(excludePropertyIds.map((id) => String(id)));

  const rows = await Properties.find(
    buildSimilarPropertyFilter(property, dealListingTypeIds),
  )
    .select(
      'title bedrooms area location currency publishedAt updatedAt propertyType listingType rentPricing price',
    )
    .populate({ path: 'propertyType', select: 'name slug' })
    .sort({ publishedAt: -1 })
    .limit(Math.min(limit * 4, 80))
    .lean();

  return rows
    .filter((p) => !exclude.has(String(p._id)))
    .slice(0, limit)
    .map((p) => mapPropertyToTransactionRow(p, dealType));
};

const fetchTransactionsForTab = async (property, dealType, limit) => {
  const fromDeals = await fetchDealTransactions(property, dealType, limit);
  if (fromDeals.length >= limit) {
    return { transactions: fromDeals.slice(0, limit), totalCount: fromDeals.length };
  }

  const existingIds = new Set(
    fromDeals.map((r) => String(r.propertyId)),
  );
  const fallback = await fetchListingFallbackTransactions(
    property,
    dealType,
    limit - fromDeals.length,
    fromDeals.map((r) => r.propertyId),
  );

  const merged = [
    ...fromDeals,
    ...fallback.filter((r) => !existingIds.has(String(r.propertyId))),
  ].slice(0, limit);

  return {
    transactions: merged,
    totalCount: merged.length,
  };
};

/** Short label like "Jan 25" for chart categories. */
const formatMonthLabel = (year, monthIndex) => {
  const d = new Date(year, monthIndex, 1);
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  const yr = String(year).slice(-2);
  return `${mon} ${yr}`;
};

const buildTrendBuckets = () => {
  const buckets = [];
  const now = new Date();
  for (let i = TREND_MONTHS - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: formatMonthLabel(d.getFullYear(), d.getMonth()),
      sums: [],
    });
  }
  return buckets;
};

const pushPricePerSqftSample = (bucketMap, dateValue, price, sqft) => {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const pps = pricePerSqft(price, sqft);
  if (pps == null || !bucketMap.has(key)) return;
  bucketMap.get(key).sums.push(pps);
};

const average = (arr) => {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const buildTrendSeriesFromBuckets = (buckets) =>
  buckets.map((b) => {
    const avg = average(b.sums);
    return avg != null ? Math.round(avg) : 0;
  });

const fetchTrendDataPoints = async (property, dealType) => {
  const since = new Date();
  since.setMonth(since.getMonth() - (TREND_MONTHS - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const dealListingTypeIds = await getListingTypeIdsForDealType(dealType);
  const points = [];

  const deals = await DealClosure.find({
    dealCategory: 'property',
    dealType,
    status: { $in: CLOSED_DEAL_STATUSES },
    closedDate: { $gte: since },
    property: { $exists: true, $ne: null },
  })
    .sort({ closedDate: -1 })
    .limit(200)
    .populate({
      path: 'property',
      match: { status: 'active', isActive: true },
      select: 'area location listingType propertyType rentPricing price',
    })
    .lean();

  deals
    .filter((deal) =>
      propertyMatchesSimilarity(deal.property, property, dealListingTypeIds),
    )
    .forEach((deal) => {
      const sqft = deal.property?.area?.sqft;
      points.push({
        date: deal.closedDate,
        price: deal.dealAmount,
        sqft,
        zone: deal.property?.location?.zone || property.location?.zone,
      });
    });

  if (points.length < 3) {
    const listings = await Properties.find({
      ...buildSimilarPropertyFilter(property, dealListingTypeIds),
      publishedAt: { $gte: since },
    })
      .select('price area publishedAt rentPricing location listingType propertyType')
      .limit(120)
      .lean();

    listings.forEach((row) => {
      const amount =
        dealType === 'rent' && row.rentPricing?.yearly != null
          ? row.rentPricing.yearly
          : row.price;
      points.push({
        date: row.publishedAt,
        price: amount,
        sqft: row.area?.sqft,
        zone: row.location?.zone,
      });
    });
  }

  return points;
};

const buildPriceTrends = async (property) => {
  const listingTx = String(property.listingType?.transaction ?? '').toLowerCase();
  const dealType =
    listingTx === 'rent' || listingTx === 'rental' ? 'rent' : 'sale';
  const isSale = dealType === 'sale';

  const zone = String(property.location?.zone ?? '').trim();
  const city = String(property.location?.city ?? '').trim();
  const propertyTypeName = String(property.propertyType?.name ?? 'properties').trim();
  const beds = Number(property.bedrooms);
  const bedsLabel = Number.isFinite(beds)
    ? `${beds} bedroom${beds === 1 ? '' : 's'}`
    : '';

  const locationPhrase = [zone, city].filter(Boolean).join(' and ') || 'this area';
  const transactionVerb = isSale ? 'sold' : 'rented';
  const summaryTitle = [bedsLabel, propertyTypeName, transactionVerb, 'in', locationPhrase]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');

  const points = await fetchTrendDataPoints(property, dealType);
  const buckets = buildTrendBuckets();
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  const zoneKey = zone.toLowerCase();
  const areaBuckets = new Map(
    buckets.map((b) => [b.key, { key: b.key, label: b.label, sums: [] }]),
  );

  points.forEach((pt) => {
    pushPricePerSqftSample(bucketMap, pt.date, pt.price, pt.sqft);
    const ptZone = String(pt.zone ?? '').trim().toLowerCase();
    if (zoneKey && ptZone === zoneKey) {
      pushPricePerSqftSample(areaBuckets, pt.date, pt.price, pt.sqft);
    }
  });

  const categories = buckets.map((b) => b.label);
  const areaSeries = buildTrendSeriesFromBuckets(
    buckets.map((b) => areaBuckets.get(b.key) || b),
  );
  const overallSeries = buildTrendSeriesFromBuckets(buckets);

  const allPps = points
    .map((pt) => pricePerSqft(pt.price, pt.sqft))
    .filter((v) => v != null);
  const averagePricePerSqft = average(allPps);
  const averagePrice =
    averagePricePerSqft != null && Number(property.area?.sqft) > 0
      ? Math.round(averagePricePerSqft * Number(property.area.sqft))
      : null;

  const currentPps = pricePerSqft(
    isSale
      ? property.price
      : property.rentPricing?.yearly ?? property.price,
    property.area?.sqft,
  );

  let priceDifferencePercent = null;
  if (
    currentPps != null &&
    averagePricePerSqft != null &&
    averagePricePerSqft > 0
  ) {
    priceDifferencePercent = Math.round(
      ((currentPps - averagePricePerSqft) / averagePricePerSqft) * 100,
    );
  }

  let priceCompareNote = null;
  if (priceDifferencePercent != null && priceDifferencePercent !== 0) {
    const abs = Math.abs(priceDifferencePercent);
    const dir = priceDifferencePercent < 0 ? 'less' : 'more';
    priceCompareNote = `(This property costs ${abs}% ${dir} than the average price)`;
  }

  const zoneLabel = zone || city || 'Area';
  const areaAvg =
    average(areaSeries.filter((v) => v > 0)) ?? 0;
  const overallAvg =
    average(overallSeries.filter((v) => v > 0)) ?? areaAvg;

  const maxVal = Math.max(...areaSeries, ...overallSeries, 0);
  const yAxisMax = maxVal > 0 ? Math.ceil((maxVal * 1.2) / 50) * 50 : 600;

  return {
    dealType,
    summaryTitle,
    averagePrice,
    averagePriceFormatted:
      averagePrice != null ? `${formatNumber(averagePrice)} AED` : null,
    averagePricePerSqft:
      averagePricePerSqft != null ? Math.round(averagePricePerSqft) : null,
    currency: property.currency || 'AED',
    priceCompareNote,
    priceDifferencePercent,
    period: 'Last 1 year',
    periodOptions: ['Last 1 year'],
    chart: {
      categories,
      series: [
        {
          name: `${zoneLabel} @ ${areaAvg || overallAvg} AED/Sqft`,
          data: areaSeries,
        },
        {
          name: `${locationPhrase} @ ${overallAvg} AED/Sqft`,
          data: overallSeries,
        },
      ],
      yAxisMax,
    },
  };
};

/**
 * @param {string} propertyIdOrSlug
 * @param {{ limit?: number }} [options]
 */
const getPropertyPriceInsights = async (propertyIdOrSlug, options = {}) => {
  const limit = Math.min(
    Math.max(Number(options.limit) || DEFAULT_TRANSACTION_LIMIT, 1),
    50,
  );

  const property = await resolveActivePropertyQuery(propertyIdOrSlug);
  if (!property) {
    return null;
  }

  const [sold, rent, trends] = await Promise.all([
    fetchTransactionsForTab(property, 'sale', limit),
    fetchTransactionsForTab(property, 'rent', limit),
    buildPriceTrends(property),
  ]);

  return {
    propertyId: property._id,
    sold,
    rent,
    trends,
  };
};

module.exports = {
  getPropertyPriceInsights,
};
