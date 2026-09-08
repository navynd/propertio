const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const DealClosure = require('../../models/dealClosureModel');
const Newprojects = require('../../models/newprojectsModel');
const Developers = require('../../models/developersModel');
const ProjectUnit = require('../../models/projectUnitModel');
const ProjectLayout = require('../../models/projectLayoutModel');
const ProjectBuilding = require('../../models/projectBuildingModel');
const ProjectAgencyAllocation = require('../../models/projectAgencyAllocationModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const PropertyType = require('../../models/propertyTypeModel');
const Agencies = require('../../models/agenciesModel');
const Inquirys = require('../../models/inquirysModel');

const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const validateObjectId = (id) => Types.ObjectId.isValid(id);

/**
 * @swagger
 * /developers/revenue:
 *   get:
 *     summary: Get developer revenue (list or project detail)
 *     description: |
 *       Revenue has two modes for the authenticated developer:
 *       - Detail mode: provide `projectId` to get project summary + unit-level deal rows, with `buildingId` and `propertyType` filters.
 *       - List mode: omit `projectId` to get aggregated deal rows across all developer projects, grouped by project (multiple agencies per project row).
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: |
 *           Optional. When present (detail mode), it must be a valid project ObjectId owned by the authenticated developer.
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Building tab filter (detail mode only).
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Property type tab filter (detail mode only).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: |
 *           In detail mode: searches by `unitNumber`.
 *           In list mode: searches by `projectName`.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter deals where `closedDate` is >= startDate.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter deals where `closedDate` is <= endDate.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, oldest, highest, lowest]
 *         description: Sorting (falls back to newest when omitted/unknown).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Revenue fetched successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     projectName:
 *                       type: string
 *                       nullable: true
 *                       description: Present in detail mode.
 *                     totalRevenue:
 *                       type: number
 *                       description: Sum of deal amounts for the current filters (detail and list modes).
 *                     totalAmount:
 *                       type: number
 *                       description: Same as totalRevenue (list mode).
 *                     currency:
 *                       type: string
 *                       example: AED
 *                     buildingTabs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     propertyTypeTabs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     deals:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Deal rows for the table (unit-level for detail mode, project-level for list mode).
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalDeals:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         description: Validation error (e.g. invalid `projectId`)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Failed to fetch revenue
 */
const getRevenue = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const developer = await Developers.findById(developerId).lean();
    if (!developer) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const {
      projectId,
      buildingId,
      propertyType,
      search,
      startDate,
      endDate,
      sortBy = 'featured',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const searchTrim = search?.toString().trim();

    // -----------------------------------------------------------------------
    // MODE 1 — Revenue detail page (?projectId)
    // -----------------------------------------------------------------------
    if (projectId && projectId.toString().trim()) {
      if (!validateObjectId(projectId)) {
        return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
      }

      // Verify project belongs to this developer
      const project = await Newprojects.findOne({
        _id: projectId,
        developer: developerId,
        isActive: true,
      }).lean();

      if (!project) {
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      // -----------------------------------------------------------
      // BUILDING TAB FILTERS
      // -----------------------------------------------------------
      const buildings = await ProjectBuilding.find({
        project: projectId,
        isActive: true,
      })
        .select('buildingName')
        .lean();

      const buildingTabs = buildings.map((b) => ({
        id: b._id,
        name: b.buildingName,
      }));

      // -----------------------------------------------------------
      // DEAL QUERY BASE
      // -----------------------------------------------------------
      const dealQuery = {
        dealCategory: 'project',
        project: new Types.ObjectId(projectId),
        developer: new Types.ObjectId(developerId),
        status: { $in: ['approved', 'completed'] },
      };

      // -----------------------------------------------------------
      // BUILDING FILTER (unit -> layout -> building)
      // -----------------------------------------------------------
      if (buildingId && validateObjectId(buildingId)) {
        const buildingLayouts = await ProjectLayout.find({
          project: projectId,
          building: buildingId,
          isActive: true,
        })
          .select('_id')
          .lean();

        const layoutIds = buildingLayouts.map((l) => l._id);
        const buildingUnits = await ProjectUnit.find({
          layout: { $in: layoutIds },
          isActive: true,
        })
          .select('_id')
          .lean();

        dealQuery.unit = {
          $in: buildingUnits.map((u) => u._id),
        };
      }

      // -----------------------------------------------------------
      // PROPERTY TYPE FILTER (unit -> layout -> propertyType)
      // -----------------------------------------------------------
      if (propertyType && validateObjectId(propertyType)) {
        const ptLayouts = await ProjectLayout.find({
          project: projectId,
          propertyType: propertyType,
          isActive: true,
        })
          .select('_id')
          .lean();

        const ptLayoutIds = ptLayouts.map((l) => l._id);
        const ptUnits = await ProjectUnit.find({
          layout: { $in: ptLayoutIds },
          isActive: true,
        })
          .select('_id')
          .lean();

        const ptUnitIds = ptUnits.map((u) => u._id);

        if (dealQuery.unit) {
          const existingIds = new Set(dealQuery.unit.$in.map((id) => id.toString()));
          dealQuery.unit = {
            $in: ptUnitIds.filter((id) => existingIds.has(id.toString())),
          };
        } else {
          dealQuery.unit = { $in: ptUnitIds };
        }
      }

      // -----------------------------------------------------------
      // SEARCH (unitNumber)
      // -----------------------------------------------------------
      if (searchTrim) {
        const searchUnits = await ProjectUnit.find(
          {
            project: projectId,
            unitNumber: { $regex: searchTrim, $options: 'i' },
            isActive: true,
          },
          { _id: 1 },
        ).lean();

        const searchUnitIds = searchUnits.map((u) => u._id);

        if (dealQuery.unit) {
          const currentIds = new Set(dealQuery.unit.$in.map((id) => id.toString()));
          dealQuery.unit = {
            $in: searchUnitIds.filter((id) => currentIds.has(id.toString())),
          };
        } else {
          dealQuery.unit = { $in: searchUnitIds };
        }
      }

      // -----------------------------------------------------------
      // DATE RANGE FILTER
      // -----------------------------------------------------------
      if (startDate || endDate) {
        dealQuery.closedDate = {};
        if (startDate) {
          const d = new Date(startDate);
          if (!isNaN(d.getTime())) dealQuery.closedDate.$gte = d;
        }
        if (endDate) {
          const d = new Date(endDate);
          if (!isNaN(d.getTime())) dealQuery.closedDate.$lte = d;
        }

        if (!Object.keys(dealQuery.closedDate).length) {
          delete dealQuery.closedDate;
        }
      }

      // -----------------------------------------------------------
      // SUMMARY STATS + PAGINATED DEALS
      // -----------------------------------------------------------
      const [totalRevenue, totalDeals, deals] = await Promise.all([
        DealClosure.aggregate([
          {
            $match: {
              dealCategory: 'project',
              project: new Types.ObjectId(projectId),
              developer: new Types.ObjectId(developerId),
              status: { $in: ['approved', 'completed'] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$dealAmount' },
            },
          },
        ]),
        DealClosure.countDocuments(dealQuery),
        DealClosure.find(dealQuery)
          .populate('unit', 'unitId unitNumber floor')
          .populate('layout', 'layoutName building propertyType')
          .populate('agency', 'agencyName profilePicture')
          .sort({ closedDate: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      // -----------------------------------------------------------
      // BUILDING & PROPERTY TYPE NAMES (for the table)
      // -----------------------------------------------------------
      const buildingIds = [...new Set(
        deals
          .filter((d) => d.layout?.building)
          .map((d) => d.layout.building.toString()),
      )];

      const buildingDocs = await ProjectBuilding.find({
        _id: { $in: buildingIds },
      })
        .select('buildingName')
        .lean();

      const buildingMap = {};
      buildingDocs.forEach((b) => {
        buildingMap[b._id.toString()] = b.buildingName;
      });

      const ptIds = [...new Set(
        deals
          .filter((d) => d.layout?.propertyType)
          .map((d) => d.layout.propertyType.toString()),
      )];

      const ptDocs = await PropertyType.find({ _id: { $in: ptIds } })
        .select('name')
        .lean();

      const ptMap = {};
      ptDocs.forEach((pt) => {
        ptMap[pt._id.toString()] = pt.name;
      });

      // -----------------------------------------------------------
      // PROPERTY TYPE TABS (built from all layouts under project)
      // -----------------------------------------------------------
      const allLayouts = await ProjectLayout.find({
        project: projectId,
        isActive: true,
      })
        .populate('propertyType', 'name')
        .lean();

      const propertyTypeMap = {};
      allLayouts.forEach((l) => {
        const ptId = l.propertyType?._id?.toString();
        const ptName = l.propertyType?.name;
        if (ptId && !propertyTypeMap[ptId]) {
          propertyTypeMap[ptId] = { id: ptId, name: ptName };
        }
      });

      // -----------------------------------------------------------
      // MAP DEAL ROWS
      // -----------------------------------------------------------
      const dealRows = deals.map((deal) => ({
        dealId: deal._id,

        // "Tower name / Type" column
        buildingName: deal.layout?.building
          ? (buildingMap[deal.layout.building.toString()] || null)
          : null,
        propertyType: deal.layout?.propertyType
          ? (ptMap[deal.layout.propertyType.toString()] || null)
          : null,

        // "Layout name" column
        layoutName: deal.layout?.layoutName || null,

        // "Unit ID" column
        unitNumber: deal.unit?.unitNumber || deal.unit?.unitId || null,

        // "Deal closed by" column → agency name
        agency: deal.agency
          ? {
              id: deal.agency._id,
              agencyName: deal.agency.agencyName,
              logo: deal.agency.profilePicture || null,
            }
          : null,

        closedDate: deal.closedDate,
        dealAmount: deal.dealAmount,
        currency: deal.currency || 'AED',
      }));

      const totalPages = Math.ceil(totalDeals / limitNum) || 1;

      // Use DealClosure for accurate sold units count
      const soldUnitsCount = await DealClosure.countDocuments({
        dealCategory: 'project',
        project: new Types.ObjectId(projectId),
        developer: new Types.ObjectId(developerId),
        status: { $in: ['approved', 'completed'] },
      });

      return success(res, 'Revenue detail fetched successfully', {
        projectName: project.projectName,

        totalUnits: project.totalUnits || 0,
        soldUnits: soldUnitsCount,
        remainingUnits: (project.totalUnits || 0) - soldUnitsCount,

        totalRevenue: totalRevenue[0]?.total || 0,
        totalAmount: totalRevenue[0]?.total || 0,
        currency: 'AED',

        buildingTabs,
        propertyTypeTabs: Object.values(propertyTypeMap),
        deals: dealRows,

        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages,
          totalDeals,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      }, 200);
    }

    // -----------------------------------------------------------------------
    // MODE 2 — Revenue list page (no projectId)
    // -----------------------------------------------------------------------

    // Step 1: Get all project IDs for this developer
    const developerProjects = await Newprojects.find({
      developer: developerId,
      isActive: true,
    })
      .select('_id projectName')
      .lean();

    const developerProjectIds = developerProjects.map((p) => p._id);

    if (!developerProjectIds.length) {
      return success(res, 'No revenue data found', {
        totalRevenue: 0,
        totalAmount: 0,
        currency: 'AED',
        deals: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
          totalDeals: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }, 200);
    }

    // Step 2: Build deal query
    const listQuery = {
      dealCategory: 'project',
      developer: new Types.ObjectId(developerId),
      project: { $in: developerProjectIds },
      status: { $in: ['approved', 'completed'] },
    };

    // Search by project name
    if (searchTrim) {
      const searchLower = searchTrim.toLowerCase();
      const matchedProjects = developerProjects.filter((p) => (p.projectName || '').toLowerCase().includes(searchLower));
      listQuery.project = { $in: matchedProjects.map((p) => p._id) };
    }

    // Date range filter
    if (startDate || endDate) {
      listQuery.closedDate = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) listQuery.closedDate.$gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) listQuery.closedDate.$lte = d;
      }

      if (!Object.keys(listQuery.closedDate).length) {
        delete listQuery.closedDate;
      }
    }

    // Sort
    let sortObj = {};
    switch (sortBy) {
      case 'newest': sortObj = { closedDate: -1 }; break;
      case 'oldest': sortObj = { closedDate: 1 }; break;
      case 'highest': sortObj = { dealAmount: -1 }; break;
      case 'lowest': sortObj = { dealAmount: 1 }; break;
      default: sortObj = { closedDate: -1 };
    }

    // Step 3: Run queries in parallel
    const [totalRevenueAgg, totalDeals, deals] = await Promise.all([
      DealClosure.aggregate([
        { $match: listQuery },
        { $group: { _id: null, total: { $sum: '$dealAmount' } } },
      ]),
      DealClosure.countDocuments(listQuery),
      DealClosure.find(listQuery)
        .populate('project', 'projectName slug images location')
        .populate('agency', 'agencyName profilePicture')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Get all unique project IDs in current page
    const pageProjectIds = [...new Set(
      deals
        .filter((d) => d.project?._id)
        .map((d) => d.project._id.toString()),
    )];

    // Get all agencies per project (from all deals on that project)
    const allProjectDeals = await DealClosure.find({
      dealCategory: 'project',
      developer: new Types.ObjectId(developerId),
      project: { $in: pageProjectIds.map((id) => new Types.ObjectId(id)) },
      status: { $in: ['approved', 'completed'] },
    })
      .select('project agency')
      .populate('agency', 'agencyName profilePicture')
      .lean();

    // Build agencyMap per project
    // { [projectId]: Map(agencyId -> {id, agencyName, logo}) }
    const agencyByProject = {};
    allProjectDeals.forEach((d) => {
      const pId = d.project?.toString();
      if (!pId || !d.agency) return;

      if (!agencyByProject[pId]) agencyByProject[pId] = new Map();

      const aId = d.agency._id.toString();
      if (!agencyByProject[pId].has(aId)) {
        agencyByProject[pId].set(aId, {
          id: d.agency._id,
          agencyName: d.agency.agencyName,
          logo: d.agency.profilePicture || null,
        });
      }
    });

    // Map list rows
    const dealRows = deals.map((deal) => {
      const pId = deal.project?._id?.toString();
      const projectAgencies = pId ? [...(agencyByProject[pId]?.values() || [])] : [];

      const displayAgencies = projectAgencies.slice(0, 2);
      const remainingCount = Math.max(0, projectAgencies.length - 2);

      const primaryImage = (deal.project?.images || [])
        .sort((a, b) => {
          if (b.isPrimary && !a.isPrimary) return 1;
          if (a.isPrimary && !b.isPrimary) return -1;
          return (a.order || 0) - (b.order || 0);
        })[0] || null;

      return {
        dealId: deal._id,

        project: deal.project
          ? {
              id: deal.project._id,
              projectName: deal.project.projectName,
              slug: deal.project.slug,
              image: primaryImage,
              location: {
                city: deal.project.location?.city,
                zone: deal.project.location?.zone,
              },
            }
          : null,

        agencies: {
          display: displayAgencies,
          remainingCount,
          total: projectAgencies.length,
        },

        closedDate: deal.closedDate,
        dealAmount: deal.dealAmount,
        currency: deal.currency || 'AED',
      };
    });

    const totalPages = Math.ceil(totalDeals / limitNum) || 1;

    return success(res, 'Revenue fetched successfully', {
      totalRevenue,
      // totalAmount: totalRevenue,
      currency: 'AED',
      deals: dealRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalDeals,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    }, 200);
  } catch (error) {
    logger.error('Developer get revenue failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to fetch revenue', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /developers/revenue/dropdown:
 *   get:
 *     summary: Add Deal dropdown data (projects, agencies, layouts, units)
 *     description: |
 *       Single endpoint powering the Add Deal wizard:
 *       - `type=projects` (no extra params)
 *       - `type=agencies` requires `projectId`
 *       - `type=layouts` requires `projectId` + `agencyId`
 *       - `type=units` requires `projectId` + `agencyId` + `layoutId`
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [projects, agencies, layouts, units]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: agencyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: layoutId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dropdown items fetched successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Failed to fetch dropdown data
 */
const getDropdown = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { type, projectId, agencyId, layoutId } = req.query || {};

    const VALID_TYPES = ['projects', 'agencies', 'layouts', 'units'];
    if (!type || !VALID_TYPES.includes(type)) {
      return failure(
        res,
        400,
        'type is required: projects | agencies | layouts | units',
        'VALIDATION_ERROR',
      );
    }

    const primaryImageFromProject = (p) => (p.images || [])
      .sort((a, b) => {
        if (b.isPrimary && !a.isPrimary) return 1;
        if (a.isPrimary && !b.isPrimary) return -1;
        return (a.order || 0) - (b.order || 0);
      })[0] || null;

    // CASE 1 — projects
    if (type === 'projects') {
      const projects = await Newprojects.find({
        developer: developerId,
        isActive: true,
        publishStatus: 'published',
      })
        .select('projectName slug images location')
        .sort({ createdAt: -1 })
        .lean();

      return success(res, 'Projects fetched successfully', {
        type,
        items: projects.map((p) => ({
          id: p._id,
          projectName: p.projectName,
          slug: p.slug,
          image: primaryImageFromProject(p),
          location: {
            city: p.location?.city,
            zone: p.location?.zone,
          },
        })),
      }, 200);
    }

    // CASE 2 — agencies
    if (type === 'agencies') {
      if (!projectId || !validateObjectId(projectId)) {
        return failure(res, 400, 'projectId is required for type=agencies', 'VALIDATION_ERROR');
      }

      const project = await Newprojects.findOne({
        _id: projectId,
        developer: developerId,
        isActive: true,
      })
        .select('authorizedAgencies')
        .lean();

      if (!project) {
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      if (!project.authorizedAgencies?.length) {
        return success(res, 'No authorized agencies', { type, items: [] }, 200);
      }

      const agencies = await Agencies.find({
        _id: { $in: project.authorizedAgencies },
        isActive: true,
      })
        .select('agencyName profilePicture')
        .lean();

      return success(res, 'Agencies fetched successfully', {
        type,
        items: agencies.map((a) => ({
          id: a._id,
          agencyName: a.agencyName,
          logo: a.profilePicture || null,
        })),
      }, 200);
    }

    // CASE 3 — layouts
    if (type === 'layouts') {
      if (!projectId || !validateObjectId(projectId)) {
        return failure(res, 400, 'projectId is required for type=layouts', 'VALIDATION_ERROR');
      }
      if (!agencyId || !validateObjectId(agencyId)) {
        return failure(res, 400, 'agencyId is required for type=layouts', 'VALIDATION_ERROR');
      }

      const project = await Newprojects.findOne({
        _id: projectId,
        developer: developerId,
        isActive: true,
      })
        .select('_id')
        .lean();

      if (!project) {
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      const agencyAllocation = await ProjectAgencyAllocation.findOne({
        project: projectId,
        agency: agencyId,
        status: 'active',
      })
        .select('layoutSummary')
        .lean();

      if (!agencyAllocation?.layoutSummary?.length) {
        return success(res, 'No layouts found', { type, items: [] }, 200);
      }

      const layoutIds = agencyAllocation.layoutSummary
        .map((ls) => ls.layout)
        .filter(Boolean);

      const layouts = await ProjectLayout.find({
        _id: { $in: layoutIds },
        project: projectId,
        isActive: true,
      })
        .populate('building', 'buildingName')
        .populate('propertyType', 'name')
        .lean();

      return success(res, 'Layouts fetched successfully', {
        type,
        items: layouts.map((l) => ({
          id: l._id,
          layoutName: l.layoutName,
          buildingName: l.building?.buildingName || null,
          propertyType: l.propertyType?.name || null,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          areaSqft: l.areaSqft,
        })),
      }, 200);
    }

    // CASE 4 — units
    if (type === 'units') {
      if (!projectId || !validateObjectId(projectId)) {
        return failure(res, 400, 'projectId is required for type=units', 'VALIDATION_ERROR');
      }
      if (!agencyId || !validateObjectId(agencyId)) {
        return failure(res, 400, 'agencyId is required for type=units', 'VALIDATION_ERROR');
      }
      if (!layoutId || !validateObjectId(layoutId)) {
        return failure(res, 400, 'layoutId is required for type=units', 'VALIDATION_ERROR');
      }

      const project = await Newprojects.findOne({
        _id: projectId,
        developer: developerId,
        isActive: true,
      })
        .select('_id')
        .lean();

      if (!project) {
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      const agentAllocations = await ProjectAgentAllocation.find({
        project: projectId,
        agency: agencyId,
        status: 'active',
      })
        .select('units agent')
        .populate('agent', 'fullName')
        .lean();

      if (!agentAllocations.length) {
        return success(res, 'No units found', { type, items: [] }, 200);
      }

      const allAgentUnitIds = agentAllocations.flatMap((alloc) => alloc.units || []);
      const uniqueUnitIds = [...new Set(allAgentUnitIds.map((id) => id.toString()))]
        .map((id) => new Types.ObjectId(id));

      if (!uniqueUnitIds.length) {
        return success(res, 'No units found', { type, items: [] }, 200);
      }

      const units = await ProjectUnit.find({
        _id: { $in: uniqueUnitIds },
        layout: layoutId,
        project: projectId,
        isActive: true,
        status: { $eq: 'available' }, // strictly only available units
      })
        .select('unitId unitNumber floor status')
        .sort({ unitNumber: 1 })
        .lean();

      const agentUnitMap = {};
      agentAllocations.forEach((alloc) => {
        (alloc.units || []).forEach((uId) => {
          agentUnitMap[uId.toString()] = {
            agentId: alloc.agent?._id,
            agentName: alloc.agent?.fullName || null,
          };
        });
      });

      return success(res, 'Units fetched successfully', {
        type,
        items: units.map((u) => ({
          id: u._id,
          unitId: u.unitId,
          unitNumber: u.unitNumber || null,
          floor: u.floor ?? null,
          status: u.status,
          assignedAgent: agentUnitMap[u._id.toString()] || null,
        })),
      }, 200);
    }

    return failure(res, 400, 'Unsupported dropdown type', 'VALIDATION_ERROR');
  } catch (err) {
    logger.error('Developer get dropdown error', {
      error: err.message,
      developerId: req.user?.id || req.user?._id,
      type: req.query?.type,
    });
    return failure(res, 500, 'Failed to fetch dropdown data', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /developers/revenue:
 *   post:
 *     summary: Manually add a project deal (closes unit)
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, agencyId, layoutId, unitId, dealAmount, closedDate]
 *             properties:
 *               projectId: { type: string }
 *               agencyId: { type: string }
 *               layoutId: { type: string }
 *               unitId: { type: string }
 *               dealAmount: { type: number }
 *               closedDate: { type: string, format: date-time }
 *               currency: { type: string, example: AED }
 *               notes: { type: string }
 *               customer:
 *                 type: object
 *                 description: Optional manual customer details. Defaults are used when omitted.
 *                 properties:
 *                   userId: { type: string }
 *                   name: { type: string }
 *                   email: { type: string }
 *                   phoneNumber: { type: string }
 *     responses:
 *       201:
 *         description: Deal added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agency not authorized for this project
 *       404:
 *         description: Unit not found under this layout
 *       500:
 *         description: Failed to add deal
 */
const addDeal = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const {
      projectId,
      agencyId,
      layoutId,
      unitId,
      dealAmount,
      closedDate,
      currency = 'AED',
      notes,
      customer,
    } = req.body || {};

    if (!projectId || !validateObjectId(projectId)) {
      return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
    }
    if (!agencyId || !validateObjectId(agencyId)) {
      return failure(res, 400, 'Valid agencyId is required', 'VALIDATION_ERROR');
    }
    if (!layoutId || !validateObjectId(layoutId)) {
      return failure(res, 400, 'Valid layoutId is required', 'VALIDATION_ERROR');
    }
    if (!unitId || !validateObjectId(unitId)) {
      return failure(res, 400, 'Valid unitId is required', 'VALIDATION_ERROR');
    }
    if (dealAmount === undefined || dealAmount === null || Number.isNaN(Number(dealAmount))) {
      return failure(res, 400, 'dealAmount is required and must be a number', 'VALIDATION_ERROR');
    }
    if (!closedDate) {
      return failure(res, 400, 'closedDate is required', 'VALIDATION_ERROR');
    }

    const closedDateVal = new Date(closedDate);
    if (isNaN(closedDateVal.getTime())) {
      return failure(res, 400, 'Invalid closedDate', 'VALIDATION_ERROR');
    }

    const project = await Newprojects.findOne({
      _id: projectId,
      developer: developerId,
      isActive: true,
    })
      .select('authorizedAgencies projectName')
      .lean();

    if (!project) {
      return failure(res, 404, 'Project not found', 'NOT_FOUND');
    }

    const isAuthorized = (project.authorizedAgencies || [])
      .some((a) => a.toString() === agencyId.toString());

    if (!isAuthorized) {
      return failure(res, 403, 'Agency is not authorized for this project', 'FORBIDDEN');
    }

    const agentAllocation = await ProjectAgentAllocation.findOne({
      project: projectId,
      agency: agencyId,
      status: 'active',
      units: { $in: [new Types.ObjectId(unitId)] },
    })
      .select('agent')
      .lean();

    if (!agentAllocation) {
      return failure(
        res,
        400,
        'Unit is not assigned to any agent under this agency',
        'VALIDATION_ERROR',
      );
    }

    const unit = await ProjectUnit.findOne({
      _id: unitId,
      layout: layoutId,
      project: projectId,
      isActive: true,
    }).lean();

    if (!unit) {
      return failure(res, 404, 'Unit not found under this layout', 'NOT_FOUND');
    }

    if (unit.status !== 'available') {
      return failure(
        res,
        400,
        `Unit is currently ${unit.status} and cannot be closed manually`,
        'VALIDATION_ERROR',
      );
    }

    const now = new Date();
    const customerInput = customer && typeof customer === 'object' ? customer : {};
    const manualCustomer = {
      userId: customerInput.userId && validateObjectId(customerInput.userId)
        ? new Types.ObjectId(customerInput.userId)
        : undefined,
      name: customerInput.name?.toString().trim() || 'Manual Entry',
      email: customerInput.email?.toString().trim() || 'manual@entry.com',
      phoneNumber: customerInput.phoneNumber?.toString().trim() || '000',
    };

    const dealClosure = await DealClosure.create({
      dealCategory: 'project',
      project: projectId,
      unit: unitId,
      layout: layoutId,
      developer: developerId,
      agency: agencyId,
      agent: agentAllocation.agent,
      customer: manualCustomer,
      dealType: 'sale',
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      closedDate: closedDateVal,
      notes: notes || undefined,
      closedBy: agentAllocation.agent,
      status: 'approved',
    });

    await ProjectUnit.findByIdAndUpdate(unitId, {
      $set: {
        status: 'closed',
        statusUpdatedAt: now,
        statusUpdatedBy: agentAllocation.agent,
        statusUpdatedByAgency: agencyId,
        statusExpiresAt: null,
        saleInfo: {
          closedAmount: Number(dealAmount),
          closedDate: closedDateVal,
          closedBy: agentAllocation.agent,
          closedByAgency: agencyId,
        },
        agencyApproval: {
          status: 'approved',
          reviewedBy: agencyId,
          reviewedAt: now,
        },
      },
      $push: {
        statusHistory: {
          status: 'closed',
          changedAt: now,
          agency: agencyId,
          note: 'Manually closed by developer',
        },
      },
    });

    await Newprojects.findByIdAndUpdate(projectId, { $inc: { soldUnits: 1 } });

    return success(res, 'Deal added successfully', {
      deal: {
        id: dealClosure._id,
        project: projectId,
        agency: agencyId,
        unit: unitId,
        layout: layoutId,
        dealAmount: dealClosure.dealAmount,
        currency: dealClosure.currency,
        closedDate: dealClosure.closedDate,
        status: dealClosure.status,
      },
    }, 201);
  } catch (err) {
    logger.error('Developer add deal error', {
      error: err.message,
      developerId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to add deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /developers/revenue/{dealId}:
 *   put:
 *     summary: Edit an existing developer revenue deal
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dealId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agencyId: { type: string }
 *               dealAmount: { type: number }
 *               closedDate: { type: string, format: date-time }
 *               currency: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Deal updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agency not authorized for this project
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Failed to update deal
 */
const editDeal = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { dealId } = req.params;
    if (!validateObjectId(dealId)) {
      return failure(res, 400, 'Invalid deal ID', 'VALIDATION_ERROR');
    }

    const {
      agencyId,
      dealAmount,
      closedDate,
      currency,
      notes,
    } = req.body || {};

    if (!agencyId && dealAmount === undefined && !closedDate && !currency && notes === undefined) {
      return failure(res, 400, 'At least one field is required to update', 'VALIDATION_ERROR');
    }

    const deal = await DealClosure.findOne({
      _id: dealId,
      developer: developerId,
      dealCategory: 'project',
      status: { $in: ['approved', 'completed'] },
    });

    if (!deal) {
      return failure(res, 404, 'Deal not found', 'NOT_FOUND');
    }

    if (agencyId) {
      if (!validateObjectId(agencyId)) {
        return failure(res, 400, 'Valid agencyId is required', 'VALIDATION_ERROR');
      }

      const project = await Newprojects.findOne({
        _id: deal.project,
        developer: developerId,
        isActive: true,
      })
        .select('authorizedAgencies')
        .lean();

      const isAuthorized = (project?.authorizedAgencies || [])
        .some((a) => a.toString() === agencyId.toString());

      if (!isAuthorized) {
        return failure(res, 403, 'Agency is not authorized for this project', 'FORBIDDEN');
      }

      deal.agency = agencyId;
    }

    if (dealAmount !== undefined && dealAmount !== null && !Number.isNaN(Number(dealAmount))) {
      deal.dealAmount = Number(dealAmount);
    }

    if (closedDate) {
      const d = new Date(closedDate);
      if (isNaN(d.getTime())) {
        return failure(res, 400, 'Invalid closedDate', 'VALIDATION_ERROR');
      }
      deal.closedDate = d;
    }

    if (currency) deal.currency = currency;
    if (notes !== undefined) deal.notes = notes;

    await deal.save();

    return success(res, 'Deal updated successfully', {
      deal: {
        id: deal._id,
        agency: deal.agency,
        dealAmount: deal.dealAmount,
        currency: deal.currency,
        closedDate: deal.closedDate,
        notes: deal.notes || null,
        status: deal.status,
      },
    }, 200);
  } catch (err) {
    logger.error('Developer edit deal error', {
      error: err.message,
      dealId: req.params?.dealId,
      developerId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to update deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /developers/revenue/{dealId}:
 *   delete:
 *     summary: Delete a developer revenue deal
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dealId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deal deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deal not found
 *       500:
 *         description: Failed to delete deal
 */
const deleteDeal = asyncHandler(async (req, res) => {
  try {
    const developerId = req.user?.id || req.user?._id;
    if (!developerId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { dealId } = req.params;
    if (!validateObjectId(dealId)) {
      return failure(res, 400, 'Invalid deal ID', 'VALIDATION_ERROR');
    }

    const now = new Date();

    const deal = await DealClosure.findOne({
      _id: dealId,
      developer: developerId,
      dealCategory: 'project',
    });

    if (!deal) {
      return failure(res, 404, 'Deal not found', 'NOT_FOUND');
    }

    if (deal.unit) {
      const unit = await ProjectUnit.findById(deal.unit);
      if (unit && unit.status === 'closed') {
        unit.status = 'available';
        unit.statusExpiresAt = null;
        unit.statusUpdatedAt = now;
        unit.statusUpdatedBy = null;
        unit.statusUpdatedByAgency = null;
        unit.statusNote = null;

        unit.saleInfo = {};

        unit.agencyApproval = {
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          rejectedReason: null,
        };

        unit.statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : [];
        unit.statusHistory.push({
          status: 'available',
          changedAt: now,
          note: 'Released — deal deleted by developer',
        });

        await unit.save();
      }
    }

    await Newprojects.findByIdAndUpdate(deal.project, { $inc: { soldUnits: -1 } });

    if (deal.inquiry) {
      await Inquirys.findByIdAndUpdate(deal.inquiry, {
        $set: {
          status: 'attended',
          closedAt: null,
          dealClosed: {
            isClosed: false,
            dealClosureRef: null,
            dealType: null,
            dealAmount: null,
            closedDate: null,
          },
        },
      });
    }

    await DealClosure.findByIdAndDelete(dealId);

    return success(res, 'Deal deleted successfully', {});
  } catch (err) {
    logger.error('Developer delete deal error', {
      error: err.message,
      dealId: req.params?.dealId,
      developerId: req.user?.id || req.user?._id,
    });
    return failure(res, 500, 'Failed to delete deal', 'SERVER_ERROR');
  }
});

module.exports = {
  getRevenue,
  getDropdown,
  addDeal,
  editDeal,
  deleteDeal,
};


