const mongoose = require('mongoose');
const { Types } = mongoose;

const Agents = require('../models/agentsModel');
const Properties = require('../models/propertiesModal');
const Inquirys = require('../models/inquirysModel');
const DealClosure = require('../models/dealClosureModel');
const ListingType = require('../models/listingTypeModel');
const PropertyType = require('../models/propertyTypeModel');
const Location = require('../models/locationsModel');
const {
    buildMediaImageUrl,
    buildLocationImageUrl,
} = require('../utils/mediaUrl');

const escapeRegex = (str) =>
    String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Closed deals counted in stats and track records (not payment status). */
const CLOSED_DEAL_STATUSES = ['approved', 'completed'];

const formatLocationArea = (location) => {
    if (!location || typeof location !== 'object') return null;
    const parts = [location.zone, location.city].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
};

const normalizePropertyType = (propertyType) => {
    if (!propertyType) return null;
    if (typeof propertyType === 'object' && propertyType.name) {
        return { name: propertyType.name, slug: propertyType.slug || null };
    }
    return null;
};

const mapDealToTrackRecord = async (deal) => {
    const base = {
        dealClosedDate: deal.closedDate,
        dealType: deal.dealType,
        dealAmount: deal.dealAmount ?? null,
        dealCategory: deal.dealCategory,
    };

    if (deal.dealCategory === 'project' && deal.project) {
        const project = deal.project;
        const layout = deal.layout;
        let propertyType = normalizePropertyType(layout?.propertyType);
        if (!propertyType && layout?.propertyType) {
            const pt = await PropertyType.findById(layout.propertyType)
                .select('name slug')
                .lean();
            propertyType = normalizePropertyType(pt);
        }
        const propertyName = project.projectName || null;
        const locationArea = formatLocationArea(project.location);
        return {
            ...base,
            propertyName,
            locationArea,
            location: propertyName,
            bedrooms: layout?.bedrooms ?? null,
            propertyType,
        };
    }

    if (deal.property) {
        const property = deal.property;
        let propertyType = normalizePropertyType(property.propertyType);
        if (!propertyType && property.propertyType) {
            const pt = await PropertyType.findById(property.propertyType)
                .select('name slug')
                .lean();
            propertyType = normalizePropertyType(pt);
        }
        const propertyName = property.title || null;
        const locationArea = formatLocationArea(property.location);
        return {
            ...base,
            propertyName,
            locationArea,
            location: propertyName,
            bedrooms: property.bedrooms ?? null,
            propertyType,
        };
    }

    return {
        ...base,
        propertyName: null,
        locationArea: null,
        location: null,
        bedrooms: null,
        propertyType: null,
    };
};

/**
 * Track records for public agent profile — closed deals in the last 12 months.
 */
const getAgentTrackRecordsFromClosedDeals = async (agentId, options = {}) => {
    if (!agentId) return [];

    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const deals = await DealClosure.find({
        agent: new Types.ObjectId(agentId),
        closedDate: { $gte: twelveMonthsAgo },
        status: { $in: CLOSED_DEAL_STATUSES },
    })
        .sort({ closedDate: -1 })
        .limit(limit)
        .populate({
            path: 'property',
            select: 'title location bedrooms propertyType',
            populate: { path: 'propertyType', select: 'name slug' },
        })
        .populate('project', 'projectName location')
        .populate({
            path: 'layout',
            select: 'bedrooms propertyType layoutName',
            populate: { path: 'propertyType', select: 'name slug' },
        })
        .lean();

    return Promise.all(deals.map(mapDealToTrackRecord));
};

const getDealLocationZone = (deal) => {
    const loc =
        deal.dealCategory === 'project'
            ? deal.project?.location
            : deal.property?.location;
    if (!loc) return null;
    const zone = (loc.zone || '').trim();
    const city = (loc.city || '').trim();
    return zone || city || null;
};

const pickPrimaryImageUrl = (images) => {
    if (!Array.isArray(images) || !images.length) return null;
    const primary = images.find((img) => img?.isPrimary && img?.url);
    if (primary?.url) return String(primary.url).trim();
    const sorted = [...images].sort(
        (a, b) => (a?.order ?? 0) - (b?.order ?? 0),
    );
    const first = sorted.find((img) => img?.url);
    return first?.url ? String(first.url).trim() : null;
};

/** @returns {{ raw: string, mediaType: 'property'|'project' }|null} */
const getDealListingImageRef = (deal) => {
    if (deal.dealCategory === 'project') {
        const raw = pickPrimaryImageUrl(deal.project?.images);
        return raw ? { raw, mediaType: 'project' } : null;
    }
    const raw = pickPrimaryImageUrl(deal.property?.images);
    return raw ? { raw, mediaType: 'property' } : null;
};

const resolveExpertiseListingImage = (area, locDoc) => {
    const raw = area.listingImageRaw || area.listingImage;
    if (raw) {
        return buildMediaImageUrl(
            raw,
            area.listingImageMediaType || 'property',
        );
    }
    if (locDoc) {
        const locRaw = locDoc.coverImage || locDoc.gallery?.[0];
        if (locRaw) return buildLocationImageUrl(locRaw);
    }
    return null;
};

const mapLocationDetailsForResponse = (locDoc) => {
    if (!locDoc) return null;
    return {
        ...locDoc,
        coverImage: locDoc.coverImage
            ? buildLocationImageUrl(locDoc.coverImage)
            : null,
        gallery: (locDoc.gallery || [])
            .map((item) => buildLocationImageUrl(item))
            .filter(Boolean),
    };
};

const buildExpertiseAreaDescription = (areaName, locDoc, dealStats) => {
    if (locDoc?.metaDescription?.trim()) {
        return locDoc.metaDescription.trim();
    }

    const { totalDeals = 0, saleDeals = 0, rentDeals = 0 } = dealStats || {};
    const parts = [];
    if (totalDeals > 0) {
        parts.push(
            `${totalDeals} closed deal${totalDeals === 1 ? '' : 's'}`,
        );
    }
    if (saleDeals > 0) {
        parts.push(`${saleDeals} sale`);
    }
    if (rentDeals > 0) {
        parts.push(`${rentDeals} rent`);
    }

    if (parts.length) {
        return `${areaName} is a focus market for this agent with ${parts.join(', ')} in this area.`;
    }

    return `${areaName} is one of the neighborhoods where this agent is active.`;
};

const applyAgentRatingsToAreas = (areas, agentRatings) => {
    const average =
        typeof agentRatings?.average === 'number' ? agentRatings.average : 0;
    const totalCount =
        typeof agentRatings?.totalCount === 'number'
            ? agentRatings.totalCount
            : 0;

    return areas.map((area) => ({
        ...area,
        averageRating:
            typeof area.averageRating === 'number' && area.averageRating > 0
                ? area.averageRating
                : average,
        ratingsCount:
            typeof area.ratingsCount === 'number' && area.ratingsCount > 0
                ? area.ratingsCount
                : totalCount,
    }));
};

const enrichExpertiseAreasWithLocations = async (areas, options = {}) => {
    if (!areas.length) return [];

    const names = [
        ...new Set(
            areas
                .map((a) => (a.locationName || '').trim())
                .filter(Boolean),
        ),
    ];

    const locationDocs = names.length
        ? await Location.find({
              isActive: true,
              $or: names.map((name) => ({
                  name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
              })),
          })
              .select('name slug type coordinates coverImage gallery stats metaDescription')
              .lean()
        : [];

    const byNameLower = new Map(
        locationDocs.map((doc) => [doc.name.toLowerCase(), doc]),
    );
    const byId = new Map(
        locationDocs.map((doc) => [doc._id.toString(), doc]),
    );

    const withLocations = areas.map((area) => {
        const areaData = { ...area };
        const locDoc = area.location
            ? byId.get(String(area.location))
            : byNameLower.get((area.locationName || '').toLowerCase());

        if (locDoc) {
            areaData.location = locDoc._id;
            areaData.locationDetails = mapLocationDetailsForResponse(locDoc);
        }

        areaData.listingImage = resolveExpertiseListingImage(areaData, locDoc);
        delete areaData.listingImageRaw;
        delete areaData.listingImageMediaType;

        if (!areaData.description?.trim()) {
            areaData.description = buildExpertiseAreaDescription(
                areaData.locationName || locDoc?.name || 'This area',
                locDoc,
                {
                    totalDeals: areaData.totalDeals,
                    saleDeals: areaData.saleDeals,
                    rentDeals: areaData.rentDeals,
                },
            );
        }

        return areaData;
    });

    return applyAgentRatingsToAreas(withLocations, options.agentRatings);
};

/**
 * Expertise areas derived from closed deals when agent.expertiseAreas is empty.
 */
const getAgentExpertiseAreasFromClosedDeals = async (agentId, options = {}) => {
    if (!agentId) return [];

    const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 20);

    const deals = await DealClosure.find({
        agent: new Types.ObjectId(agentId),
        status: { $in: CLOSED_DEAL_STATUSES },
    })
        .populate('property', 'location images')
        .populate('project', 'location images')
        .lean();

    const byZone = new Map();

    for (const deal of deals) {
        const zone = getDealLocationZone(deal);
        if (!zone) continue;

        if (!byZone.has(zone)) {
            byZone.set(zone, {
                locationName: zone,
                saleDeals: 0,
                rentDeals: 0,
                totalDeals: 0,
                totalRevenue: 0,
                listingImageRaw: null,
                listingImageMediaType: null,
            });
        }

        const row = byZone.get(zone);
        row.totalDeals += 1;
        row.totalRevenue += Number(deal.dealAmount) || 0;
        if (deal.dealType === 'sale') row.saleDeals += 1;
        else if (deal.dealType === 'rent') row.rentDeals += 1;

        if (!row.listingImageRaw) {
            const dealImage = getDealListingImageRef(deal);
            if (dealImage) {
                row.listingImageRaw = dealImage.raw;
                row.listingImageMediaType = dealImage.mediaType;
            }
        }
    }

    const areas = [...byZone.values()]
        .sort((a, b) => b.totalDeals - a.totalDeals)
        .slice(0, limit)
        .map((row) => ({
            locationName: row.locationName,
            saleDeals: row.saleDeals,
            rentDeals: row.rentDeals,
            totalDeals: row.totalDeals,
            totalRevenue: row.totalRevenue,
            listingImageRaw: row.listingImageRaw,
            listingImageMediaType: row.listingImageMediaType,
        }));

    return enrichExpertiseAreasWithLocations(areas, {
        agentRatings: options.agentRatings,
    });
};

/** Buy / rent listing type ids (excludes new-projects), aligned with agent dashboard. */
const getBuyRentListingTypeIds = async () => {
    const listingTypes = await ListingType.find({
        isActive: true,
        slug: { $ne: 'new-projects' },
    })
        .select('transaction')
        .lean();

    const buyIds = listingTypes
        .filter((lt) => lt.transaction === 'buy')
        .map((lt) => lt._id);
    const rentIds = listingTypes
        .filter((lt) => lt.transaction === 'rent')
        .map((lt) => lt._id);

    return { buyIds, rentIds };
};

/** Live active listing counts per agent (for public search / profile). */
const aggregateActivePropertyCountsByAgents = async (agentIds) => {
    if (!Array.isArray(agentIds) || !agentIds.length) {
        return new Map();
    }

    const ids = agentIds.map((id) => new Types.ObjectId(id));
    const { buyIds, rentIds } = await getBuyRentListingTypeIds();

    const rows = await Properties.aggregate([
        {
            $match: {
                agent: { $in: ids },
                isActive: true,
                status: 'active',
            },
        },
        {
            $group: {
                _id: '$agent',
                totalSaleProperties: {
                    $sum: {
                        $cond: [{ $in: ['$listingType', buyIds] }, 1, 0],
                    },
                },
                totalRentProperties: {
                    $sum: {
                        $cond: [{ $in: ['$listingType', rentIds] }, 1, 0],
                    },
                },
            },
        },
    ]);

    return new Map(
        rows.map((row) => [
            row._id.toString(),
            {
                totalSaleProperties: row.totalSaleProperties || 0,
                totalRentProperties: row.totalRentProperties || 0,
            },
        ]),
    );
};

const closedDealStatsGroupStage = {
    $group: {
        _id: null,
        totalRevenueSales: {
            $sum: {
                $cond: [{ $eq: ['$dealType', 'sale'] }, '$dealAmount', 0],
            },
        },
        totalRevenueRent: {
            $sum: {
                $cond: [{ $eq: ['$dealType', 'rent'] }, '$dealAmount', 0],
            },
        },
        dealsClosedSales: {
            $sum: {
                $cond: [{ $eq: ['$dealType', 'sale'] }, 1, 0],
            },
        },
        dealsClosedRent: {
            $sum: {
                $cond: [{ $eq: ['$dealType', 'rent'] }, 1, 0],
            },
        },
    },
};

/** Live closed-deal counts and revenue per agent (approved/completed deals). */
const aggregateClosedDealStatsByAgents = async (agentIds) => {
    if (!Array.isArray(agentIds) || !agentIds.length) {
        return new Map();
    }

    const ids = agentIds.map((id) => new Types.ObjectId(id));
    const rows = await DealClosure.aggregate([
        {
            $match: {
                agent: { $in: ids },
                status: { $in: CLOSED_DEAL_STATUSES },
            },
        },
        {
            $group: {
                _id: '$agent',
                totalRevenueSales: {
                    $sum: {
                        $cond: [{ $eq: ['$dealType', 'sale'] }, '$dealAmount', 0],
                    },
                },
                totalRevenueRent: {
                    $sum: {
                        $cond: [{ $eq: ['$dealType', 'rent'] }, '$dealAmount', 0],
                    },
                },
                dealsClosedSales: {
                    $sum: {
                        $cond: [{ $eq: ['$dealType', 'sale'] }, 1, 0],
                    },
                },
                dealsClosedRent: {
                    $sum: {
                        $cond: [{ $eq: ['$dealType', 'rent'] }, 1, 0],
                    },
                },
            },
        },
    ]);

    return new Map(
        rows.map((row) => [
            row._id.toString(),
            {
                totalRevenueSales: row.totalRevenueSales || 0,
                totalRevenueRent: row.totalRevenueRent || 0,
                dealsClosedSales: row.dealsClosedSales || 0,
                dealsClosedRent: row.dealsClosedRent || 0,
            },
        ]),
    );
};

const recalcAgentStatistics = async (agentId, session) => {
    if (!agentId) return;

    const agentObjectId = new Types.ObjectId(agentId);
    const { buyIds, rentIds } = await getBuyRentListingTypeIds();

    const propAggPipeline = [
        { $match: { agent: agentObjectId, isActive: true } },
        {
            $group: {
                _id: null,
                totalListings: { $sum: 1 },
                activeListings: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
                    },
                },
                totalSaleProperties: {
                    $sum: {
                        $cond: [{ $in: ['$listingType', buyIds] }, 1, 0],
                    },
                },
                totalRentProperties: {
                    $sum: {
                        $cond: [{ $in: ['$listingType', rentIds] }, 1, 0],
                    },
                },
            },
        },
    ];

    let propAggQuery = Properties.aggregate(propAggPipeline);
    if (session) propAggQuery = propAggQuery.session(session);

    const [propAgg, inquiryAgg, dealAgg] = await Promise.all([
        propAggQuery,
        (() => {
            let q = Inquirys.aggregate([
                { $match: { agent: agentObjectId } },
                {
                    $group: {
                        _id: null,
                        totalInquiries: { $sum: 1 },
                        newInquiries: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'new'] }, 1, 0],
                            },
                        },
                    },
                },
            ]);
            if (session) q = q.session(session);
            return q;
        })(),
        (() => {
            let q = DealClosure.aggregate([
                {
                    $match: {
                        agent: agentObjectId,
                        'paymentDetails.paymentStatus': 'completed',
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRevenueSales: {
                            $sum: {
                                $cond: [{ $eq: ['$dealType', 'sale'] }, '$dealAmount', 0],
                            },
                        },
                        totalRevenueRent: {
                            $sum: {
                                $cond: [{ $eq: ['$dealType', 'rent'] }, '$dealAmount', 0],
                            },
                        },
                        dealsClosedSales: {
                            $sum: {
                                $cond: [{ $eq: ['$dealType', 'sale'] }, 1, 0],
                            },
                        },
                        dealsClosedRent: {
                            $sum: {
                                $cond: [{ $eq: ['$dealType', 'rent'] }, 1, 0],
                            },
                        },
                    },
                },
            ]);
            if (session) q = q.session(session);
            return q;
        })(),
    ]);

    const props = propAgg[0] || {};
    const inqs = inquiryAgg[0] || {};
    const deals = dealAgg[0] || {};
    const totalDeals =
        (deals.dealsClosedSales || 0) + (deals.dealsClosedRent || 0);

    await Agents.findByIdAndUpdate(
        agentObjectId,
        {
            $set: {
                'statistics.totalListings': props.totalListings || 0,
                'statistics.activeListings': props.activeListings || 0,
                'statistics.totalSaleProperties':
                    props.totalSaleProperties || 0,
                'statistics.totalRentProperties':
                    props.totalRentProperties || 0,
                'statistics.totalInquiries': inqs.totalInquiries || 0,
                'statistics.newInquiries': inqs.newInquiries || 0,
                'statistics.totalRevenueSales': deals.totalRevenueSales || 0,
                'statistics.totalRevenueRent': deals.totalRevenueRent || 0,
                'statistics.dealsClosedSales': deals.dealsClosedSales || 0,
                'statistics.dealsClosedRent': deals.dealsClosedRent || 0,
                'statistics.totalDeals': totalDeals,
            },
        },
        { session },
    );
};

module.exports = {
    recalcAgentStatistics,
    aggregateActivePropertyCountsByAgents,
    aggregateClosedDealStatsByAgents,
    getBuyRentListingTypeIds,
    getAgentTrackRecordsFromClosedDeals,
    enrichExpertiseAreasWithLocations,
    getAgentExpertiseAreasFromClosedDeals,
};
