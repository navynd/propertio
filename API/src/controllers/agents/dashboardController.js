const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agents = require('../../models/agentsModel');
const Properties = require('../../models/propertiesModal');
const Inquirys = require('../../models/inquirysModel');
const DealClosure = require('../../models/dealClosureModel');
const ListingType = require('../../models/listingTypeModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { SORT_BY_PROPERTY } = require('../../utils/constants');

const { Types } = mongoose;

const VALID_SORT_BY = new Set(SORT_BY_PROPERTY.map((s) => s.value));

const getMonthRanges = () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return {
    currentMonthStart,
    currentMonthEnd: now,
    previousMonthStart,
    previousMonthEnd,
  };
};

const toFixedNumber = (value, digits = 2) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(digits));
};

const calculateChange = (current, previous) => {
  const currentVal = Number(current || 0);
  const previousVal = Number(previous || 0);

  if (previousVal === 0) {
    if (currentVal === 0) return { change: 0, direction: 'up' };
    return { change: 100, direction: 'up' };
  }

  const raw = ((currentVal - previousVal) / previousVal) * 100;
  return {
    change: toFixedNumber(Math.abs(raw), 2),
    direction: raw >= 0 ? 'up' : 'down',
  };
};

const getPrimaryImageUrl = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;
  const sorted = [...images].sort((a, b) => {
    if (a?.isPrimary && !b?.isPrimary) return -1;
    if (!a?.isPrimary && b?.isPrimary) return 1;
    return Number(a?.order || 0) - Number(b?.order || 0);
  });
  return sorted[0]?.url || null;
};

const buildPropertySort = (sortBy) => {
  const map = {
    featured: { isFeatured: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    'price-high': { price: -1 },
    'price-low': { price: 1 },
    'beds-least': { bedrooms: 1 },
    'beds-most': { bedrooms: -1 },
  };
  return map[sortBy] || map.featured;
};

const contactDetailForInquiry = (inquiry) => {
  const { inquiryType, customer = {} } = inquiry;
  if (inquiryType === 'email') return customer.email || null;
  return customer.phoneNumber || null;
};

/**
 * @swagger
 * /agents/dashboard:
 *   get:
 *     summary: Get agent dashboard data
 *     description: |
 *       KPI cards (with month-over-month change), active listing types for the "Property for"
 *       dropdown (same source as admin master `listingtypes`), `sortByProperty` options (same as
 *       admin `sortbyproperty`), paginated properties, and recent property inquiries.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *         description: Optional ListingType ObjectId — filters the properties table. Omit, empty, or whitespace only means no filter (all properties for the agent).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price-high, price-low, beds-least, beds-most]
 *           default: featured
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *       - in: query
 *         name: inquiriesLimit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Failed to fetch dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  try {
    const agentId = req.user?.id || req.user?._id;
    if (!agentId || !Types.ObjectId.isValid(agentId)) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const agent = await Agents.findById(agentId).select('_id isVerified').lean();
    if (!agent) {
      return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const listingTypeRaw =
      req.query?.listingType == null
        ? ''
        : String(req.query.listingType).trim();
    const sortByRaw = (req.query?.sortBy || 'featured').toString().toLowerCase();
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query?.limit, 10) || 5));
    const inquiriesLimit = Math.min(30, Math.max(1, parseInt(req.query?.inquiriesLimit, 10) || 8));
    const skip = (page - 1) * limit;

    const sortBy = VALID_SORT_BY.has(sortByRaw) ? sortByRaw : 'featured';
    const sort = buildPropertySort(sortBy);

    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getMonthRanges();

    const agentObjectId = new Types.ObjectId(agentId);
    const propertyBase = { agent: agentObjectId };
    const activeListingMatch = {
      ...propertyBase,
      isActive: true,
      status: 'active',
    };
    const inquiryBase = {
      agent: agentObjectId,
      inquiryCategory: 'property',
    };
    const dealBase = {
      agent: agentObjectId,
      dealCategory: 'property',
      status: { $in: ['approved', 'completed'] },
    };

    const allActiveListingTypes = await ListingType.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const excludedListingTypeIds = new Set(
      allActiveListingTypes
        .filter((lt) => lt.slug === 'new-projects')
        .map((lt) => lt._id.toString()),
    );

    const listingTypesForDropdown = allActiveListingTypes.filter(
      (lt) => lt.slug !== 'new-projects',
    );

    const buyIds = listingTypesForDropdown
      .filter((lt) => lt.transaction === 'buy')
      .map((lt) => lt._id);
    const rentIds = listingTypesForDropdown
      .filter((lt) => lt.transaction === 'rent')
      .map((lt) => lt._id);

    const listingTypeFilter = {};
    const excludedListingTypeObjectIds = Array.from(excludedListingTypeIds).map(
      (id) => new Types.ObjectId(id),
    );
    if (listingTypeRaw) {
      const normalizedListingType = listingTypeRaw.toLowerCase();
      const matchedBySlug = allActiveListingTypes.find(
        (lt) => String(lt.slug || '').toLowerCase() === normalizedListingType,
      );

      if (normalizedListingType === 'new-projects') {
        // Explicitly prevent matching excluded listing type slug
        listingTypeFilter._id = { $in: [] };
      } else if (matchedBySlug) {
        // Allow slug-based filtering for valid non-excluded listing types
        listingTypeFilter.listingType = matchedBySlug._id;
      } else if (Types.ObjectId.isValid(listingTypeRaw)) {
        const listingTypeId = new Types.ObjectId(listingTypeRaw);
        if (excludedListingTypeIds.has(listingTypeId.toString())) {
          // Explicitly prevent matching excluded listing type id
          listingTypeFilter._id = { $in: [] };
        } else {
          listingTypeFilter.listingType = listingTypeId;
        }
      }
    }
    if (!listingTypeFilter.listingType && excludedListingTypeObjectIds.length) {
      // For "all" listingType mode, still exclude blocked listing types.
      listingTypeFilter.listingType = { $nin: excludedListingTypeObjectIds };
    }
    // No listingType (or invalid id) => propertyListFilter is only { agent } — all listings for the agent
    const propertyListFilter = { ...propertyBase, ...listingTypeFilter };

    const [
      totalListings,
      activeListingsCount,
      totalRentCount,
      totalSaleCount,
      totalInquiriesCount,
      newInquiriesCount,
      dealsClosedCount,
      lifetimeRevenueAgg,
      currentMonthRevenueAgg,
      previousMonthRevenueAgg,

      activeListingsCurrentMonth,
      activeListingsPreviousMonth,
      totalListingsCurrentMonth,
      totalListingsPreviousMonth,
      rentCurrentMonth,
      rentPreviousMonth,
      saleCurrentMonth,
      salePreviousMonth,
      inquiriesCurrentMonth,
      inquiriesPreviousMonth,
      newInquiriesCurrentMonth,
      newInquiriesPreviousMonth,
      dealsCurrentMonth,
      dealsPreviousMonth,

      listingTypeCountsAgg,

      propertiesTotal,
      propertiesRows,

      recentInquiries,
    ] = await Promise.all([
      Properties.countDocuments(propertyBase),
      Properties.countDocuments(activeListingMatch),
      rentIds.length
        ? Properties.countDocuments({ ...propertyBase, listingType: { $in: rentIds } })
        : Promise.resolve(0),
      buyIds.length
        ? Properties.countDocuments({ ...propertyBase, listingType: { $in: buyIds } })
        : Promise.resolve(0),
      Inquirys.countDocuments(inquiryBase),
      Inquirys.countDocuments({ ...inquiryBase, status: 'new' }),
      DealClosure.countDocuments(dealBase),
      DealClosure.aggregate([
        { $match: dealBase },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealBase,
            closedDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealBase,
            closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),

      Properties.countDocuments({
        ...activeListingMatch,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Properties.countDocuments({
        ...activeListingMatch,
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      Properties.countDocuments({
        ...propertyBase,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Properties.countDocuments({
        ...propertyBase,
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      rentIds.length
        ? Properties.countDocuments({
            ...propertyBase,
            listingType: { $in: rentIds },
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          })
        : Promise.resolve(0),
      rentIds.length
        ? Properties.countDocuments({
            ...propertyBase,
            listingType: { $in: rentIds },
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
          })
        : Promise.resolve(0),
      buyIds.length
        ? Properties.countDocuments({
            ...propertyBase,
            listingType: { $in: buyIds },
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          })
        : Promise.resolve(0),
      buyIds.length
        ? Properties.countDocuments({
            ...propertyBase,
            listingType: { $in: buyIds },
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
          })
        : Promise.resolve(0),
      Inquirys.countDocuments({
        ...inquiryBase,
        inquiredAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Inquirys.countDocuments({
        ...inquiryBase,
        inquiredAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      Inquirys.countDocuments({
        ...inquiryBase,
        status: 'new',
        inquiredAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Inquirys.countDocuments({
        ...inquiryBase,
        status: 'new',
        inquiredAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      DealClosure.countDocuments({
        ...dealBase,
        closedDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      DealClosure.countDocuments({
        ...dealBase,
        closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),

      Properties.aggregate([
        { $match: propertyBase },
        { $group: { _id: '$listingType', count: { $sum: 1 } } },
      ]),

      Properties.countDocuments(propertyListFilter),
      Properties.find(propertyListFilter)
        .select(
          'title images location bedrooms bathrooms price currency status isFeatured listingType',
        )
        .populate('listingType', 'name slug transaction category')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      Inquirys.find({ ...inquiryBase, status: 'new' })
        .sort({ inquiredAt: -1 })
        .limit(inquiriesLimit)
        .select('customer inquiryType property propertyTitle inquiredAt')
        .populate('property', 'title images location')
        .lean(),
    ]);

    const countByListingType = new Map(
      listingTypeCountsAgg.map((row) => [row._id?.toString(), row.count]),
    );

    const listingTypes = listingTypesForDropdown.map((lt) => ({
      _id: lt._id,
      name: lt.name,
      slug: lt.slug,
      transaction: lt.transaction,
      category: lt.category,
      displayOrder: lt.displayOrder,
      propertyCount: countByListingType.get(lt._id.toString()) || 0,
    }));

    const lifetimeRevenue = Number(lifetimeRevenueAgg?.[0]?.amount || 0);
    const revenueMonthCurrent = Number(currentMonthRevenueAgg?.[0]?.amount || 0);
    const revenueMonthPrevious = Number(previousMonthRevenueAgg?.[0]?.amount || 0);
    const revenueMoM = calculateChange(revenueMonthCurrent, revenueMonthPrevious);

    const activeListingsMoM = calculateChange(activeListingsCurrentMonth, activeListingsPreviousMonth);
    const totalListingsMoM = calculateChange(totalListingsCurrentMonth, totalListingsPreviousMonth);
    const rentMoM = calculateChange(rentCurrentMonth, rentPreviousMonth);
    const saleMoM = calculateChange(saleCurrentMonth, salePreviousMonth);
    const inquiriesMoM = calculateChange(inquiriesCurrentMonth, inquiriesPreviousMonth);
    const newInquiriesMoM = calculateChange(newInquiriesCurrentMonth, newInquiriesPreviousMonth);
    const dealsMoM = calculateChange(dealsCurrentMonth, dealsPreviousMonth);

    const propertyItems = propertiesRows.map((p) => {
      const lt = p.listingType;
      const listingLabel =
        lt && typeof lt === 'object'
          ? lt.name
          : null;

      return {
        propertyId: p._id,
        title: p.title,
        image: getPrimaryImageUrl(p.images),
        location: {
          city: p.location?.city || null,
          zone: p.location?.zone || null,
        },
        listingTypeId: lt && typeof lt === 'object' ? lt._id : p.listingType,
        listingLabel,
        transaction: lt && typeof lt === 'object' ? lt.transaction : null,
        category: lt && typeof lt === 'object' ? lt.category : null,
        beds: p.bedrooms,
        baths: p.bathrooms,
        price: p.price,
        currency: p.currency || 'AED',
        status: p.status,
        isFeatured: Boolean(p.isFeatured),
      };
    });

    const inquiryItems = recentInquiries.map((row) => {
      const prop = row.property;
      const title =
        (prop && typeof prop === 'object' && prop.title) || row.propertyTitle || null;
      const loc =
        prop && typeof prop === 'object' && prop.location
          ? {
              city: prop.location.city || null,
              zone: prop.location.zone || null,
            }
          : { city: null, zone: null };

      return {
        inquiryId: row._id,
        inquiredAt: row.inquiredAt,
        property: {
          title,
          image:
            prop && typeof prop === 'object' ? getPrimaryImageUrl(prop.images) : null,
          location: loc,
        },
        customer: {
          name: row.customer?.name || null,
        },
        inquiryType: row.inquiryType,
        contactDetail: contactDetailForInquiry(row),
      };
    });

    const pages = Math.ceil(propertiesTotal / limit) || 1;

    return success(res, 'Agent dashboard fetched successfully', {
      stats: {
        totalRevenueSalesAndRent: {
          amount: lifetimeRevenue,
          currency: 'AED',
          change: revenueMoM.change,
          direction: revenueMoM.direction,
        },
        activeListings: {
          count: activeListingsCount,
          change: activeListingsMoM.change,
          direction: activeListingsMoM.direction,
        },
        totalListings: {
          count: totalListings,
          change: totalListingsMoM.change,
          direction: totalListingsMoM.direction,
        },
        totalRentProperties: {
          count: totalRentCount,
          change: rentMoM.change,
          direction: rentMoM.direction,
        },
        totalSaleProperties: {
          count: totalSaleCount,
          change: saleMoM.change,
          direction: saleMoM.direction,
        },
        totalInquiries: {
          count: totalInquiriesCount,
          change: inquiriesMoM.change,
          direction: inquiriesMoM.direction,
        },
        newInquiries: {
          count: newInquiriesCount,
          change: newInquiriesMoM.change,
          direction: newInquiriesMoM.direction,
        },
        dealsClosed: {
          count: dealsClosedCount,
          change: dealsMoM.change,
          direction: dealsMoM.direction,
        },
      },
    //   sortByProperty: SORT_BY_PROPERTY,
    //   listingTypes,
      properties: {
        items: propertyItems,
        pagination: {
          page,
          limit,
          total: propertiesTotal,
          pages,
        },
      },
      recentInquiries: inquiryItems,
      isVerified: Boolean(agent.isVerified),
    });
  } catch (error) {
    logger.error('Agent dashboard fetch failed', {
      error: error.message,
      agentId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to fetch agent dashboard', 'SERVER_ERROR');
  }
});

module.exports = {
  getDashboard,
};
