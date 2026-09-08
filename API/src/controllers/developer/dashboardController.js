const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Developers = require('../../models/developersModel');
const Newprojects = require('../../models/newprojectsModel');
const DealClosure = require('../../models/dealClosureModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const VALID_PROJECT_TABS = new Set(['active', 'soldout']);
const VALID_SORT_BY = new Set(['featured', 'newest']);

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
  const change = toFixedNumber(Math.abs(raw), 2);
  return {
    change,
    direction: raw >= 0 ? 'up' : 'down',
  };
};

const normalizeProjectStatus = (status) => {
  if (status === 'ready') return 'ready';
  if (status === 'off-plan') return 'off-plan';
  return 'off-plan';
};

const normalizeProgressStatus = (status) => {
  if (!status) return null;
  return status.split('-').join(' ');
};

const getPrimaryImageUrl = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => {
    if (a?.isPrimary && !b?.isPrimary) return -1;
    if (!a?.isPrimary && b?.isPrimary) return 1;
    return Number(a?.order || 0) - Number(b?.order || 0);
  });

  return sorted[0]?.url || null;
};

/**
 * @swagger
 * /developers/dashboard:
 *   get:
 *     summary: Get developer dashboard data
 *     description: |
 *       Returns all data needed by the developer dashboard in a single response:
 *       - top stat cards (with month-over-month percentage change; total revenue amount is lifetime closed deal sum, change compares this month vs last month)
 *       - projects table (tabs, sorting, pagination)
 *       - location based project counts
 *       - developer verification badge status
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectTab
 *         schema:
 *           type: string
 *           enum: [active, soldout]
 *           default: active
 *         description: Selects project list tab.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest]
 *           default: featured
 *         description: Projects table sort order.
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
 *         description: Number of rows returned in the projects table.
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Dashboard fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalProjects:
 *                           type: object
 *                           properties:
 *                             count: { type: integer, example: 457 }
 *                             change: { type: number, example: 16.98 }
 *                             direction: { type: string, enum: [up, down], example: up }
 *                         totalReadyProjects:
 *                           type: object
 *                           properties:
 *                             count: { type: integer, example: 600 }
 *                             change: { type: number, example: 16.98 }
 *                             direction: { type: string, enum: [up, down], example: up }
 *                         offPlanProjects:
 *                           type: object
 *                           properties:
 *                             count: { type: integer, example: 12 }
 *                             change: { type: number, example: 16.98 }
 *                             direction: { type: string, enum: [up, down], example: up }
 *                         totalRevenue:
 *                           type: object
 *                           properties:
 *                             amount: { type: number, example: 10000000 }
 *                             currency: { type: string, example: AED }
 *                             change: { type: number, example: 2 }
 *                             direction: { type: string, enum: [up, down], example: down }
 *                     projects:
 *                       type: object
 *                       properties:
 *                         tabs:
 *                           type: object
 *                           properties:
 *                             active: { type: integer, example: 22 }
 *                             soldout: { type: integer, example: 7 }
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               projectId: { type: string, example: 671b5e943d3fe8fe805dd95a }
 *                               projectName: { type: string, example: Omniyat Bespoke }
 *                               image: { type: string, nullable: true }
 *                               location:
 *                                 type: object
 *                                 properties:
 *                                   city: { type: string, nullable: true, example: Dubai }
 *                                   zone: { type: string, nullable: true, example: Palm Jumeirah }
 *                               projectStatus: { type: string, enum: [ready, off-plan], example: off-plan }
 *                               progressStatus: { type: string, nullable: true, example: construction started }
 *                               expectedCompletionDate:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               isFeatured: { type: boolean, example: true }
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page: { type: integer, example: 1 }
 *                             limit: { type: integer, example: 5 }
 *                             total: { type: integer, example: 24 }
 *                             pages: { type: integer, example: 5 }
 *                     locationBasedProjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location: { type: string, example: Dubai Marina }
 *                           count: { type: integer, example: 42 }
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Developer not found
 *       500:
 *         description: Failed to fetch dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId || !Types.ObjectId.isValid(developerId)) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const developer = await Developers.findById(developerId)
      .select('_id isVerified')
      .lean();

    if (!developer) {
      return failure(res, 404, 'Developer not found', 'NOT_FOUND');
    }

    const projectTabRaw = (req.query?.projectTab || 'active').toString().toLowerCase();
    const sortByRaw = (req.query?.sortBy || 'featured').toString().toLowerCase();
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query?.limit, 10) || 5));
    const projectTab = VALID_PROJECT_TABS.has(projectTabRaw) ? projectTabRaw : 'active';
    const sortBy = VALID_SORT_BY.has(sortByRaw) ? sortByRaw : 'featured';
    const skip = (page - 1) * limit;

    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getMonthRanges();

    const developerObjectId = new Types.ObjectId(developerId);
    const projectBaseMatch = {
      developer: developerObjectId,
      isActive: true,
      publishStatus: { $in: ['published', 'soldout'] },
    };

    const dealBaseMatch = {
      dealCategory: 'project',
      developer: developerObjectId,
      status: { $in: ['approved', 'completed'] },
    };

    const projectListMatch = {
      ...projectBaseMatch,
      ...(projectTab === 'soldout'
        ? { publishStatus: 'soldout' }
        : { publishStatus: 'published' }),
    };
    const activeProjectLocationMatch = {
      ...projectBaseMatch,
      publishStatus: 'published',
    };

    const sort = sortBy === 'featured'
      ? { isFeatured: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [
      totalProjectsCount,
      totalReadyProjectsCount,
      offPlanProjectsCount,
      currentMonthProjectsCount,
      previousMonthProjectsCount,
      currentMonthReadyProjectsCount,
      previousMonthReadyProjectsCount,
      currentMonthOffPlanProjectsCount,
      previousMonthOffPlanProjectsCount,
      currentRevenueAgg,
      previousRevenueAgg,
      lifetimeRevenueAgg,
      activeProjectsTabCount,
      soldoutProjectsTabCount,
      projectsTotal,
      projectsRows,
      locationRows,
    ] = await Promise.all([
      Newprojects.countDocuments(projectBaseMatch),
      Newprojects.countDocuments({ ...projectBaseMatch, completionStatus: 'ready' }),
      Newprojects.countDocuments({ ...projectBaseMatch, completionStatus: 'off-plan' }),

      Newprojects.countDocuments({
        ...projectBaseMatch,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Newprojects.countDocuments({
        ...projectBaseMatch,
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      Newprojects.countDocuments({
        ...projectBaseMatch,
        completionStatus: 'ready',
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Newprojects.countDocuments({
        ...projectBaseMatch,
        completionStatus: 'ready',
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),
      Newprojects.countDocuments({
        ...projectBaseMatch,
        completionStatus: 'off-plan',
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }),
      Newprojects.countDocuments({
        ...projectBaseMatch,
        completionStatus: 'off-plan',
        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      }),

      DealClosure.aggregate([
        {
          $match: {
            ...dealBaseMatch,
            closedDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$dealAmount' },
          },
        },
      ]),
      DealClosure.aggregate([
        {
          $match: {
            ...dealBaseMatch,
            closedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$dealAmount' },
          },
        },
      ]),
      DealClosure.aggregate([
        { $match: dealBaseMatch },
        {
          $group: {
            _id: null,
            amount: { $sum: '$dealAmount' },
          },
        },
      ]),

      Newprojects.countDocuments({ ...projectBaseMatch, publishStatus: 'published' }),
      Newprojects.countDocuments({ ...projectBaseMatch, publishStatus: 'soldout' }),
      Newprojects.countDocuments(projectListMatch),
      Newprojects.find(projectListMatch)
        .select(`
          projectName images location completionStatus
          progressStatus expectedCompletionDate isFeatured
        `)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Newprojects.aggregate([
        { $match: activeProjectLocationMatch },
        {
          $project: {
            locationName: {
              $ifNull: ['$location.zone', '$location.city'],
            },
          },
        },
        {
          $match: {
            locationName: { $type: 'string', $ne: '' },
          },
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

    const revenueCurrent = Number(currentRevenueAgg?.[0]?.amount || 0);
    const revenuePrevious = Number(previousRevenueAgg?.[0]?.amount || 0);
    const lifetimeRevenue = Number(lifetimeRevenueAgg?.[0]?.amount || 0);

    const totalProjectsDelta = calculateChange(currentMonthProjectsCount, previousMonthProjectsCount);
    const totalReadyProjectsDelta = calculateChange(
      currentMonthReadyProjectsCount,
      previousMonthReadyProjectsCount,
    );
    const offPlanProjectsDelta = calculateChange(
      currentMonthOffPlanProjectsCount,
      previousMonthOffPlanProjectsCount,
    );
    const totalRevenueDelta = calculateChange(revenueCurrent, revenuePrevious);

    const projectItems = projectsRows.map((project) => ({
      projectId: project._id,
      projectName: project.projectName,
      image: getPrimaryImageUrl(project.images),
      location: {
        city: project.location?.city || null,
        zone: project.location?.zone || null,
      },
      projectStatus: normalizeProjectStatus(project.completionStatus),
      progressStatus: normalizeProgressStatus(project.progressStatus),
      expectedCompletionDate: project.expectedCompletionDate || null,
      isFeatured: Boolean(project.isFeatured),
    }));

    const pages = Math.ceil(projectsTotal / limit) || 1;
    const locationBasedProjects = locationRows.map((row) => ({
      location: row._id,
      count: row.count,
    }));

    return success(res, 'Dashboard fetched successfully', {
      stats: {
        totalProjects: {
          count: totalProjectsCount,
          change: totalProjectsDelta.change,
          direction: totalProjectsDelta.direction,
        },
        totalReadyProjects: {
          count: totalReadyProjectsCount,
          change: totalReadyProjectsDelta.change,
          direction: totalReadyProjectsDelta.direction,
        },
        offPlanProjects: {
          count: offPlanProjectsCount,
          change: offPlanProjectsDelta.change,
          direction: offPlanProjectsDelta.direction,
        },
        totalRevenue: {
          amount: revenueCurrent,
          // amount: lifetimeRevenue,
          currency: 'AED',
          change: totalRevenueDelta.change,
          direction: totalRevenueDelta.direction,
        },
      },
      projects: {
        tabs: {
          active: activeProjectsTabCount,
          soldout: soldoutProjectsTabCount,
        },
        items: projectItems,
        pagination: {
          page,
          limit,
          total: projectsTotal,
          pages,
        },
      },
      locationBasedProjects,
      isVerified: Boolean(developer.isVerified),
    });
  } catch (error) {
    logger.error('Developer dashboard fetch failed', {
      error: error.message,
      developerId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to fetch dashboard', 'SERVER_ERROR');
  }
});

module.exports = {
  getDashboard,
};
