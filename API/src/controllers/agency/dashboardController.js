const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agencies = require('../../models/agenciesModel');
const Agents = require('../../models/agentsModel');
const Properties = require('../../models/propertiesModal');
const Inquirys = require('../../models/inquirysModel');
const DealClosure = require('../../models/dealClosureModel');
const ProjectAgencyAllocation = require('../../models/projectAgencyAllocationModel');
const Newprojects = require('../../models/newprojectsModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const VALID_PROJECT_TABS = new Set(['all', 'new', 'off-plan']);
const VALID_SORT_BY = new Set([
  'featured',
  'newest',
  'price-low',
  'price-high',
  'delivery-date-earliest',
  'delivery-date-latest',
]);

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

const normalizeProgressStatus = (status) => {
  if (!status) return null;
  return status.split('-').join(' ');
};

const normalizeProjectStatus = (status) => {
  if (status === 'ready') return 'ready';
  if (status === 'off-plan') return 'off-plan';
  return 'off-plan';
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

/**
 * @swagger
 * /agency/dashboard:
 *   get:
 *     summary: Get agency dashboard data
 *     description: |
 *       Returns all data needed by the agency dashboard in a single response:
 *       - KPI cards with month-over-month change
 *       - assigned projects table (tabs, sorting, pagination)
 *       - listings grouped by location
 *       - verification badge status
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectTab
 *         schema:
 *           type: string
 *           enum: [all, new, off-plan]
 *           default: all
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price-low, price-high, delivery-date-earliest, delivery-date-latest]
 *           default: newest
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
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agency not found
 *       500:
 *         description: Failed to fetch dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  try {
    const agencyId = req.user?.id || req.user?._id;
    if (!agencyId || !Types.ObjectId.isValid(agencyId)) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const agency = await Agencies.findById(agencyId)
      .select('_id isVerified')
      .lean();
    if (!agency) {
      return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    const projectTabRaw = (req.query?.projectTab || 'all').toString().toLowerCase();
    const sortByRaw = (req.query?.sortBy || 'newest').toString().toLowerCase();
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query?.limit, 10) || 5));
    const skip = (page - 1) * limit;
    const projectTab = VALID_PROJECT_TABS.has(projectTabRaw) ? projectTabRaw : 'all';
    const sortBy = VALID_SORT_BY.has(sortByRaw) ? sortByRaw : 'newest';

    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getMonthRanges();

    const agencyObjectId = new Types.ObjectId(agencyId);

    const propertyActiveBase = {
      agency: agencyObjectId,
      isActive: true,
      status: 'active',
    };
    const agentsBase = { agency: agencyObjectId, isActive: true };
    const leadsBase = { agency: agencyObjectId };
    const dealsBase = {
      agency: agencyObjectId,
      status: { $in: ['approved', 'completed'] },
    };

    const activeAllocations = await ProjectAgencyAllocation.find({
      agency: agencyObjectId,
      status: 'active',
    })
      .select('project')
      .lean();
    const allocatedProjectIds = [
      ...new Set(activeAllocations.map((a) => a.project?.toString()).filter(Boolean)),
    ].map((id) => new Types.ObjectId(id));

    let projectQuery = {
      _id: { $in: allocatedProjectIds },
      isActive: true,
    };

    if (projectTab === 'off-plan') {
      projectQuery = { ...projectQuery, completionStatus: 'off-plan' };
    } else if (projectTab === 'new') {
      projectQuery = {
        ...projectQuery,
        $or: [
          { projectType: 'new' },
          { completionStatus: 'ready' },
        ],
      };
    }

    let sort = {};
    switch (sortBy) {
      case 'newest':
      case 'featured': // backward compatibility
        sort = { isFeatured: -1, publishedAt: -1 };
        break;
      case 'price-low':
        sort = { 'launchPrice.startingFrom': 1 };
        break;
      case 'price-high':
        sort = { 'launchPrice.startingFrom': -1 };
        break;
      case 'delivery-date-earliest':
        sort = { deliveryDate: 1 };
        break;
      case 'delivery-date-latest':
        sort = { deliveryDate: -1 };
        break;
      default:
        sort = { isFeatured: -1, publishedAt: -1 };
    }

    const [
      totalActiveListingsCount,
      currentMonthActiveListingsCount,
      previousMonthActiveListingsCount,
      totalAgentsCount,
      currentMonthAgentsCount,
      previousMonthAgentsCount,
      totalSuperAgentsCount,
      currentMonthSuperAgentsCount,
      previousMonthSuperAgentsCount,
      totalRevenueSalesAgg,
      previousMonthRevenueSalesAgg,
      totalRevenueRentAgg,
      previousMonthRevenueRentAgg,
      currentMonthRevenueAllAgg,
      previousMonthRevenueAllAgg,
      totalLeadsCount,
      previousMonthLeadsCount,
      thisMonthLeadsCount,
      projectsAllCount,
      projectsNewCount,
      projectsOffPlanCount,
      projectsTotal,
      projectsRows,
      listingsByLocationRows,
    ] = await Promise.all([
      Properties.countDocuments(propertyActiveBase),
      Properties.countDocuments({
        ...propertyActiveBase,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Properties.countDocuments({
        ...propertyActiveBase,
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),

      Agents.countDocuments(agentsBase),
      Agents.countDocuments({
        ...agentsBase,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Agents.countDocuments({
        ...agentsBase,
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),

      Agents.countDocuments({ ...agentsBase, agentType: 'superagent' }),
      Agents.countDocuments({
        ...agentsBase,
        agentType: 'superagent',
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Agents.countDocuments({
        ...agentsBase,
        agentType: 'superagent',
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),

      DealClosure.aggregate([
        { $match: { ...dealsBase, dealType: 'sale' } },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealsBase,
            dealType: 'sale',
            closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        { $match: { ...dealsBase, dealType: 'rent' } },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealsBase,
            dealType: 'rent',
            closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealsBase,
            closedDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealsBase,
            closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        { $group: { _id: null, amount: { $sum: '$dealAmount' } } },
      ]),

      Inquirys.countDocuments(leadsBase),
      Inquirys.countDocuments({
        ...leadsBase,
        inquiredAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      Inquirys.countDocuments({
        ...leadsBase,
        inquiredAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),

      Newprojects.countDocuments({ _id: { $in: allocatedProjectIds }, isActive: true }),
      Newprojects.countDocuments({
        _id: { $in: allocatedProjectIds },
        isActive: true,
        $or: [{ projectType: 'new' }, { completionStatus: 'ready' }],
      }),
      Newprojects.countDocuments({
        _id: { $in: allocatedProjectIds },
        isActive: true,
        completionStatus: 'off-plan',
      }),

      Newprojects.countDocuments(projectQuery),
      Newprojects.find(projectQuery)
        .select(`
          projectName images location completionStatus
          projectAnnouncement progressStatus expectedCompletionDate isFeatured
        `)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      Newprojects.aggregate([
        {
          $match: {
            _id: { $in: allocatedProjectIds },
            isActive: true,
          },
        },
        {
          $project: {
            locationName: {
              $ifNull: ['$location.zone', '$location.city'],
            },
          },
        },
        {
          $match: { locationName: { $type: 'string', $ne: '' } },
        },
        {
          $group: {
            _id: '$locationName',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

    const totalRevenueSales = Number(totalRevenueSalesAgg?.[0]?.amount || 0);
    const previousRevenueSales = Number(previousMonthRevenueSalesAgg?.[0]?.amount || 0);
    const totalRevenueRent = Number(totalRevenueRentAgg?.[0]?.amount || 0);
    const previousRevenueRent = Number(previousMonthRevenueRentAgg?.[0]?.amount || 0);
    const thisMonthRevenueTotal = Number(currentMonthRevenueAllAgg?.[0]?.amount || 0);
    const previousMonthRevenueTotal = Number(previousMonthRevenueAllAgg?.[0]?.amount || 0);

    const projectItems = projectsRows.map((project) => ({
      projectId: project._id,
      projectName: project.projectName,
      image: getPrimaryImageUrl(project.images),
      location: {
        city: project.location?.city || null,
        zone: project.location?.zone || null,
      },
      projectStatus: normalizeProjectStatus(project.completionStatus),
      announcedDate: project.projectAnnouncement || null,
      progressStatus: normalizeProgressStatus(project.progressStatus),
      expectedFinishDate: project.expectedCompletionDate || null,
      isFeatured: Boolean(project.isFeatured),
    }));

    const locationBased = listingsByLocationRows.map((row) => ({
      location: row._id,
      count: row.count,
    }));

    const pages = Math.ceil(projectsTotal / limit) || 1;

    return success(res, 'Agency dashboard fetched successfully', {
      stats: {
        totalActiveListings: {
          count: totalActiveListingsCount,
          change: calculateChange(currentMonthActiveListingsCount, previousMonthActiveListingsCount).change,
          direction: calculateChange(currentMonthActiveListingsCount, previousMonthActiveListingsCount).direction,
        },
        totalAgents: {
          count: totalAgentsCount,
          change: calculateChange(currentMonthAgentsCount, previousMonthAgentsCount).change,
          direction: calculateChange(currentMonthAgentsCount, previousMonthAgentsCount).direction,
        },
        totalSuperAgents: {
          count: totalSuperAgentsCount,
          change: calculateChange(currentMonthSuperAgentsCount, previousMonthSuperAgentsCount).change,
          direction: calculateChange(currentMonthSuperAgentsCount, previousMonthSuperAgentsCount).direction,
        },
        totalRevenueBySales: {
          amount: totalRevenueSales,
          currency: 'AED',
          change: calculateChange(totalRevenueSales, previousRevenueSales).change,
          direction: calculateChange(totalRevenueSales, previousRevenueSales).direction,
        },
        totalRevenueByRent: {
          amount: totalRevenueRent,
          currency: 'AED',
          change: calculateChange(totalRevenueRent, previousRevenueRent).change,
          direction: calculateChange(totalRevenueRent, previousRevenueRent).direction,
        },
        thisMonthRevenueSalesAndRent: {
          amount: thisMonthRevenueTotal,
          currency: 'AED',
          change: calculateChange(thisMonthRevenueTotal, previousMonthRevenueTotal).change,
          direction: calculateChange(thisMonthRevenueTotal, previousMonthRevenueTotal).direction,
        },
        totalLeads: {
          count: totalLeadsCount,
          change: calculateChange(thisMonthLeadsCount, previousMonthLeadsCount).change,
          direction: calculateChange(thisMonthLeadsCount, previousMonthLeadsCount).direction,
        },
        thisMonthLeads: {
          count: thisMonthLeadsCount,
          change: calculateChange(thisMonthLeadsCount, previousMonthLeadsCount).change,
          direction: calculateChange(thisMonthLeadsCount, previousMonthLeadsCount).direction,
        },
      },
      projects: {
        tabs: {
          all: projectsAllCount,
          new: projectsNewCount,
          offPlan: projectsOffPlanCount,
        },
        items: projectItems,
        pagination: {
          page,
          limit,
          total: projectsTotal,
          pages,
        },
      },
      listingsByLocation: locationBased,
      isVerified: Boolean(agency.isVerified),
    });
  } catch (error) {
    logger.error('Agency dashboard fetch failed', {
      error: error.message,
      agencyId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to fetch agency dashboard', 'SERVER_ERROR');
  }
});

module.exports = {
  getDashboard,
};
