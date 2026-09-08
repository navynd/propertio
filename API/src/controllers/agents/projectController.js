const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Newprojects = require('../../models/newprojectsModel');
const Agents = require('../../models/agentsModel');
const Agencies = require('../../models/agenciesModel');
const ProjectLayout = require('../../models/projectLayoutModel');
const ProjectUnit = require('../../models/projectUnitModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const validateObjectId = (id) => Types.ObjectId.isValid(id);

const formatAreaRange = (values) => {
    const nums = (values || [])
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
    if (!nums.length) return null;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === max) return String(min);
    return `${min}-${max}`;
};

/** Min–max area from layouts that have at least one unit allocated to this agent. */
const getAllocatedLayoutAreaRanges = async (projectId, allocatedUnitIds) => {
    if (!Array.isArray(allocatedUnitIds) || !allocatedUnitIds.length) {
        return { areaSqm: null, areaSqft: null };
    }

    const units = await ProjectUnit.find({
        _id: { $in: allocatedUnitIds },
        project: projectId,
        isActive: true,
    })
        .select('layout')
        .lean();

    const layoutIds = [
        ...new Set(units.map((u) => u.layout?.toString()).filter(Boolean)),
    ];
    if (!layoutIds.length) {
        return { areaSqm: null, areaSqft: null };
    }

    const layouts = await ProjectLayout.find({
        _id: { $in: layoutIds },
        project: projectId,
        isActive: true,
    })
        .select('areaSqm areaSqft')
        .lean();

    return {
        areaSqm: formatAreaRange(layouts.map((l) => l.areaSqm)),
        areaSqft: formatAreaRange(layouts.map((l) => l.areaSqft)),
    };
};

/**
 * @swagger
 * /agents/projects:
 *   get:
 *     summary: Get agent allocated projects
 *     description: >
 *       Returns either a single allocated project detail (when `projectId` is provided)
 *       or a paginated list of projects allocated to the authenticated agent.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         required: false
 *         description: >
 *           When provided, returns the detailed view of this allocated project, if the agent
 *           has an active allocation for it. Otherwise returns the allocated projects list.
 *       - in: query
 *         name: subTab
 *         schema:
 *           type: string
 *           enum: [all, new, off-plan]
 *           default: all
 *         required: false
 *         description: >
 *           List mode only. Filters projects by completion status.
 *           `new` = ready projects, `off-plan` = off-plan projects.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Case-insensitive search by project name (list mode only).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, oldest]
 *           default: featured
 *         required: false
 *         description: >
 *           Sort order for list mode. `featured` sorts by featured flag then newest,
 *           `newest` sorts by creation date descending, `oldest` by creation date ascending.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: Page number for list mode pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         required: false
 *         description: Page size for list mode pagination (max 50).
 *     responses:
 *       200:
 *         description: >
 *           Successful response. Shape depends on whether `projectId` is provided.
 *           - Detail mode (`projectId` provided): returns a single project with allocation info.
 *           - List mode (no `projectId`): returns a paginated list of allocated projects.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: success
 *                     message:
 *                       type: string
 *                       example: Project fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         projectId:
 *                           type: string
 *                         projectName:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         aboutProject:
 *                           type: string
 *                           nullable: true
 *                         projectLocation:
 *                           type: object
 *                           nullable: true
 *                         projectStatus:
 *                           type: string
 *                           description: Mirrors completionStatus
 *                         governmentFees:
 *                           type: number
 *                           nullable: true
 *                         zoneLocation:
 *                           type: string
 *                           nullable: true
 *                         propertyPrice:
 *                           type: number
 *                           nullable: true
 *                         brochure:
 *                           type: string
 *                           nullable: true
 *                         coordinates:
 *                           type: object
 *                           nullable: true
 *                         paymentPlans:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               planName:
 *                                 type: string
 *                               downPayment:
 *                                 type: number
 *                                 nullable: true
 *                               duringConstruction:
 *                                 type: number
 *                                 nullable: true
 *                               onHandover:
 *                                 type: number
 *                                 nullable: true
 *                         authorizedAgencies:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               agencyName:
 *                                 type: string
 *                               profilePicture:
 *                                 type: string
 *                                 nullable: true
 *                               isVerified:
 *                                 type: boolean
 *                         amenities:
 *                           type: array
 *                           items:
 *                             type: object
 *                         virtualTour360:
 *                           type: string
 *                           nullable: true
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                         masterPlan:
 *                           type: array
 *                           items:
 *                             type: object
 *                         videoTour:
 *                           type: string
 *                           nullable: true
 *                         projectTimeline:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               milestone:
 *                                 type: string
 *                               date:
 *                                 type: string
 *                                 format: date-time
 *                               status:
 *                                 type: string
 *                                 enum: [completed, upcoming]
 *                         developer:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             logo:
 *                               type: string
 *                               nullable: true
 *                         faqs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               question:
 *                                 type: string
 *                               answer:
 *                                 type: string
 *                         allocationInfo:
 *                           type: object
 *                           properties:
 *                             allocationId:
 *                               type: string
 *                             allocatedAt:
 *                               type: string
 *                               format: date-time
 *                             unitsCount:
 *                               type: integer
 *                             status:
 *                               type: string
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: success
 *                     message:
 *                       type: string
 *                       example: Projects fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         projects:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               projectId:
 *                                 type: string
 *                               projectName:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               image:
 *                                 type: object
 *                                 nullable: true
 *                               location:
 *                                 type: object
 *                                 properties:
 *                                   city:
 *                                     type: string
 *                                     nullable: true
 *                                   zone:
 *                                     type: string
 *                                     nullable: true
 *                               projectStatus:
 *                                 type: string
 *                                 description: Mirrors completionStatus
 *                               announcedDate:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               progressStatus:
 *                                 type: string
 *                                 nullable: true
 *                               expectedCompletionDate:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               isFeatured:
 *                                 type: boolean
 *                         tabs:
 *                           type: object
 *                           description: Tab badge counts
 *                           properties:
 *                             all:
 *                               type: integer
 *                             new:
 *                               type: integer
 *                             offPlan:
 *                               type: integer
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             totalProjects:
 *                               type: integer
 *                             hasNextPage:
 *                               type: boolean
 *                             hasPrevPage:
 *                               type: boolean
 *       400:
 *         description: Validation error (e.g. invalid projectId)
 *       401:
 *         description: Unauthorized (missing/invalid token or agent not found)
 *       403:
 *         description: Forbidden (agent not allocated to the requested project)
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
const getAgentProjects = asyncHandler(async (req, res) => {
    const agentId = req.user?.id || req.user?._id;
    if (!agentId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    try {
        const agent = await Agents.findById(agentId);
        if (!agent) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            subTab = 'all',
            search,
            sortBy = 'featured',
            page = 1,
            limit = 10,
        } = req.query;

        if (projectId) {
            if (!validateObjectId(projectId)) {
                return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
            }

            const agentAllocation = await ProjectAgentAllocation.findOne({
                project: projectId,
                agent: agentId,
                status: 'active',
            }).lean();

            if (!agentAllocation) {
                return failure(
                    res,
                    403,
                    'You are not authorized to view this project',
                    'FORBIDDEN',
                );
            }

            const project = await Newprojects.findOne({
                _id: projectId,
                isActive: true,
            })
                .populate('developer', 'name logo')
                .populate('amenities', 'name icon image')
                .lean();

            if (!project) {
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            const authorizedAgencies = await Agencies.find({
                _id: { $in: project.authorizedAgencies || [] },
            })
                .select('agencyName profilePicture isVerified')
                .lean();

            const paymentPlans = (project.paymentPlans || []).map((plan, index) => ({
                planName: plan.planName || `Option ${index + 1}`,
                downPayment: plan.downPayment,
                duringConstruction: plan.duringConstruction,
                onHandover: plan.onHandover,
            }));

            const projectTimeline = [];
            if (project.projectAnnouncement) {
                projectTimeline.push({
                    milestone: 'Project announcement',
                    date: project.projectAnnouncement,
                    status: 'completed',
                });
            }
            if (project.bookingOpen) {
                projectTimeline.push({
                    milestone: 'Sales launch',
                    date: project.bookingOpen,
                    status: 'completed',
                });
            }
            if (project.constructionStarted) {
                projectTimeline.push({
                    milestone: 'Construction started',
                    date: project.constructionStarted,
                    status: 'completed',
                });
            }
            if (project.expectedCompletionDate) {
                projectTimeline.push({
                    milestone: 'Expected completion',
                    date: project.expectedCompletionDate,
                    status: project.completionStatus === 'ready' ? 'completed' : 'upcoming',
                });
            }

            const sortedImages = (project.images || []).sort((a, b) => {
                if (b.isPrimary && !a.isPrimary) return 1;
                if (a.isPrimary && !b.isPrimary) return -1;
                return (a.order || 0) - (b.order || 0);
            });

            const sortedFaqs = (project.faqs || [])
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((f) => ({ question: f.question, answer: f.answer }));

            const agentUnitIds = agentAllocation.units || [];
            const layoutAreaRanges = await getAllocatedLayoutAreaRanges(
                projectId,
                agentUnitIds,
            );

            return success(
                res,
                'Project fetched successfully',
                {
                    projectId: project._id,
                    projectName: project.projectName,
                    description: project.description,
                    aboutProject: project.aboutProject,
                    projectLocation: project.location,
                    projectStatus: project.completionStatus,
                    areaSqm: layoutAreaRanges.areaSqm ?? project.areaSqm ?? null,
                    areaSqft: layoutAreaRanges.areaSqft ?? project.areaSqft ?? null,
                    governmentFees: project.governmentFees || null,
                    zoneLocation: project.location?.zone || null,
                    propertyPrice: project.launchPrice || null,
                    brochure: project.brochure || null,
                    coordinates: project.location?.coordinates || null,
                    paymentPlans,
                    authorizedAgencies,
                    amenities: project.amenities || [],
                    virtualTour360: project.virtualTour360 || null,
                    images: sortedImages,
                    masterPlan: project.masterPlan || [],
                    videoTour: project.videoTour || null,
                    projectTimeline,
                    developer: project.developer
                        ? {
                            _id: project.developer._id,
                            name: project.developer.name,
                            logo: project.developer.logo,
                        }
                        : null,
                    faqs: sortedFaqs,
                    allocationInfo: {
                        allocationId: agentAllocation._id,
                        allocatedAt: agentAllocation.allocatedAt,
                        unitsCount: Array.isArray(agentAllocation.units)
                            ? agentAllocation.units.length
                            : 0,
                        status: agentAllocation.status,
                    },
                },
                200,
            );
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const agentAllocations = await ProjectAgentAllocation.find({
            agent: agentId,
            status: 'active',
        })
            .select('project units')
            .lean();

        if (!agentAllocations.length) {
            return success(
                res,
                'No projects found',
                {
                    projects: [],
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        totalPages: 0,
                        totalProjects: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                },
                200,
            );
        }

        const allocatedProjectIds = agentAllocations.map((a) => a.project);

        const allAgentUnitIds = [
            ...new Set(
                agentAllocations.flatMap((allocation) =>
                    (allocation.units || []).map((unitId) => unitId.toString()),
                ),
            ),
        ];

        let availableUnitsByProject = {};
        if (allAgentUnitIds.length) {
            const availableCounts = await ProjectUnit.aggregate([
                {
                    $match: {
                        _id: {
                            $in: allAgentUnitIds.map((id) => new Types.ObjectId(id)),
                        },
                        isActive: true,
                        status: 'available',
                    },
                },
                {
                    $group: {
                        _id: '$project',
                        count: { $sum: 1 },
                    },
                },
            ]);
            availableUnitsByProject = availableCounts.reduce((acc, row) => {
                acc[row._id.toString()] = row.count;
                return acc;
            }, {});
        }

        const projectQuery = {
            _id: { $in: allocatedProjectIds },
            isActive: true,
        };

        if (subTab === 'new') {
            projectQuery.completionStatus = 'ready';
        }
        if (subTab === 'off-plan') {
            projectQuery.completionStatus = 'off-plan';
        }

        if (search && search.toString().trim()) {
            projectQuery.projectName = {
                $regex: search.toString().trim(),
                $options: 'i',
            };
        }

        let sortObj = {};
        switch (sortBy) {
            case 'newest':
                sortObj = { createdAt: -1 };
                break;
            case 'oldest':
                sortObj = { createdAt: 1 };
                break;
            default:
                sortObj = { isFeatured: -1, createdAt: -1 };
        }

        const allProjects = await Newprojects.find(projectQuery)
            .select(
                `
      _id projectName slug images location
      completionStatus projectType
      progressStatus projectAnnouncement
      expectedCompletionDate isFeatured
      createdAt
    `,
            )
            .sort(sortObj)
            .lean();

        const totalProjects = allProjects.length;
        const paginatedProjects = allProjects.slice(skip, skip + limitNum);

        const mappedProjects = paginatedProjects.map((project) => {
            const primaryImage =
                (project.images || []).sort((a, b) => {
                    if (b.isPrimary && !a.isPrimary) return 1;
                    if (a.isPrimary && !b.isPrimary) return -1;
                    return (a.order || 0) - (b.order || 0);
                })[0] || null;

            return {
                projectId: project._id,
                projectName: project.projectName,
                slug: project.slug,
                image: primaryImage,
                location: {
                    city: project.location?.city,
                    zone: project.location?.zone,
                },
                projectStatus: project.completionStatus,
                announcedDate: project.projectAnnouncement || null,
                progressStatus: project.progressStatus || null,
                expectedCompletionDate: project.expectedCompletionDate || null,
                isFeatured: project.isFeatured,
                availableUnits: availableUnitsByProject[project._id.toString()] ?? 0,
            };
        });

        const allCount = allProjects.length;

        const newCount = await Newprojects.countDocuments({
            _id: { $in: allocatedProjectIds },
            isActive: true,
            completionStatus: 'ready',
        });

        const offPlanCount = await Newprojects.countDocuments({
            _id: { $in: allocatedProjectIds },
            isActive: true,
            completionStatus: 'off-plan',
        });

        const totalPages = totalProjects ? Math.ceil(totalProjects / limitNum) : 0;

        return success(
            res,
            'Projects fetched successfully',
            {
                projects: mappedProjects,
                tabs: {
                    all: allCount,
                    new: newCount,
                    offPlan: offPlanCount,
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    totalProjects,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                },
            },
            200,
        );
    } catch (error) {
        logger.error('Get agent projects failed', {
            error: error.message,
            stack: error.stack,
        });
        return failure(res, 500, 'Failed to fetch projects', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agents/projects/units:
 *   get:
 *     summary: Get agent project units
 *     description: >
 *       Returns either a unit detail view for a specific layout (when `layoutId` is provided)
 *       or an aggregated units list per layout for the authenticated agent on a given project.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         required: true
 *         description: Project ObjectId. Agent must have an active allocation on this project.
 *       - in: query
 *         name: layoutId
 *         schema:
 *           type: string
 *         required: false
 *         description: >
 *           When provided, returns the unit detail page for this layout (Image 1).
 *           When omitted, returns the units list page for the project (Image 2).
 *       - in: query
 *         name: statusFilter
 *         schema:
 *           type: string
 *           enum: [all, available, reserved, in-progress, follow-up, pre-close, closed]
 *           default: all
 *         required: false
 *         description: Status filter for the units status table (detail mode).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search by unitNumber or unitId (detail mode).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: Page number for paginated lists.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         required: false
 *         description: Page size for paginated lists (max 50).
 *       - in: query
 *         name: subTab
 *         schema:
 *           type: string
 *           default: all
 *         required: false
 *         description: >
 *           Property type filter for the units list page (Image 2). `all` or a
 *           case-insensitive property type name (e.g. apartment, villa).
 *     responses:
 *       200:
 *         description: Units information fetched successfully.
 *       400:
 *         description: Validation error (invalid projectId or layoutId).
 *       401:
 *         description: Unauthorized (missing/invalid token or agent not found).
 *       403:
 *         description: Agent is not authorized for this project.
 *       404:
 *         description: Layout not found (when layoutId is provided).
 *       500:
 *         description: Server error.
 */
const getAgentProjectUnits = asyncHandler(async (req, res) => {
    const agentId = req.user?.id || req.user?._id;

    if (!agentId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    try {
        const agent = await Agents.findById(agentId);
        if (!agent) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            layoutId,
            statusFilter = 'all',
            search,
            page = 1,
            limit = 10,
            subTab = 'all',
        } = req.query;

        if (!projectId || !validateObjectId(projectId)) {
            return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
        }

        const agentAllocation = await ProjectAgentAllocation.findOne({
            project: projectId,
            agent: agentId,
            status: 'active',
        }).lean();

        if (!agentAllocation) {
            return failure(
                res,
                403,
                'Not authorized to view this project',
                'FORBIDDEN',
            );
        }

        const agentUnitIds = agentAllocation.units || [];

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        // CASE 1 — UNIT DETAIL PAGE (?projectId + ?layoutId)
        if (layoutId) {
            if (!validateObjectId(layoutId)) {
                return failure(res, 400, 'Valid layoutId is required', 'VALIDATION_ERROR');
            }

            const layout = await ProjectLayout.findOne({
                _id: layoutId,
                project: projectId,
                isActive: true,
            })
                .populate('building', 'buildingName')
                .populate('propertyType', 'name')
                .lean();

            if (!layout) {
                return failure(res, 404, 'Layout not found', 'NOT_FOUND');
            }

            const allUnits = await ProjectUnit.find({
                _id: { $in: agentUnitIds },
                project: projectId,
                layout: layoutId,
                isActive: true,
            })
                .select(
                    'unitId unitNumber floor status statusUpdatedBy statusUpdatedByAgency saleInfo createdAt',
                )
                .lean();

            const agencyId = agentAllocation.agency;

            const unitGrid = allUnits.map((u) => {
                let displayState;

                if (u.status === 'closed') {
                    const closedByAgency = u.saleInfo?.closedByAgency?.toString();
                    if (closedByAgency === agencyId.toString()) {
                        displayState = 'sold-by-your-agent';
                    } else {
                        displayState = 'sold-by-other';
                    }
                } else if (
                    ['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(u.status)
                ) {
                    displayState = 'agent-working-on';
                } else if (u.status === 'available') {
                    displayState = 'available';
                } else {
                    displayState = 'unavailable';
                }

                return {
                    id: u._id,
                    unitId: u.unitId,
                    unitNumber: u.unitNumber || null,
                    floor: u.floor || null,
                    status: u.status,
                    displayState,
                };
            });

            const statusQuery = {
                _id: { $in: agentUnitIds },
                project: projectId,
                layout: layoutId,
                isActive: true,
            };

            if (statusFilter !== 'all') {
                statusQuery.status = statusFilter;
            }

            if (search && search.toString().trim()) {
                statusQuery.unitNumber = {
                    $regex: search.toString().trim(),
                    $options: 'i',
                };
            }

            const [statusUnits, totalUnits, statusCounts] = await Promise.all([
                ProjectUnit.find(statusQuery)
                    .select('unitId unitNumber status statusUpdatedBy createdAt')
                    .sort({ unitNumber: 1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                ProjectUnit.countDocuments(statusQuery),
                ProjectUnit.aggregate([
                    {
                        $match: {
                            _id: {
                                $in: agentUnitIds.map((id) => new Types.ObjectId(id)),
                            },
                            project: new Types.ObjectId(projectId),
                            layout: new Types.ObjectId(layoutId),
                            isActive: true,
                        },
                    },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                        },
                    },
                ]),
            ]);

            const statusCountMap = { all: totalUnits };
            statusCounts.forEach((s) => {
                statusCountMap[s._id] = s.count;
            });

            const unitStatusList = statusUnits.map((unit) => ({
                id: unit._id,
                unitId: unit.unitId,
                unitNumber: unit.unitNumber || unit.unitId,
                assignedDate: unit.createdAt,
                handlingBy: unit.status === 'available'
                    ? 'You'
                    : unit.statusUpdatedBy?.toString() ===
                        agentId.toString()
                        ? 'You'
                        : 'Other agent',
                unitStatus: unit.status,
            }));

            const unitsAvailable = allUnits.filter((u) => u.status === 'available').length;
            const unitsAssigned = allUnits.filter(
                (u) => u.status !== 'available' && u.status !== 'closed',
            ).length;

            const totalPages = Math.ceil(totalUnits / limitNum) || 1;

            return success(
                res,
                'Unit detail fetched successfully',
                {
                    buildingName: layout.building?.buildingName || null,
                    layoutName: layout.layoutName,
                    beds: layout.bedrooms,
                    baths: layout.bathrooms,
                    propertyType: layout.propertyType?.name || null,
                    areaSqft: layout.areaSqft,
                    areaSqm: layout.areaSqm,
                    price: layout.startingPrice || null,
                    maidBedroom: layout.maidBedroom || false,
                    unitsAvailable,
                    unitsAssigned,
                    floorPlans: layout.floorPlans || [],
                    floorPlan: layout.floorPlans?.[0] || null,
                    unitGrid,
                    statusCounts: statusCountMap,
                    units: unitStatusList,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        totalPages,
                        totalUnits,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1,
                    },
                },
                200,
            );
        }

        // CASE 2 — UNITS LIST PAGE (?projectId only)
        const layoutQuery = {
            project: projectId,
            isActive: true,
        };

        if (subTab !== 'all') {
            const PropertyType = mongoose.model('PropertyType');
            const pt = await PropertyType.findOne({
                name: { $regex: subTab, $options: 'i' },
            }).lean();
            if (pt) {
                layoutQuery.propertyType = pt._id;
            }
        }

        const allLayouts = await ProjectLayout.find(layoutQuery)
            .populate('building', 'buildingName')
            .populate('propertyType', 'name')
            .lean();

        const unitCountAgg = await ProjectUnit.aggregate([
            {
                $match: {
                    _id: {
                        $in: agentUnitIds.map((id) => new Types.ObjectId(id)),
                    },
                    project: new Types.ObjectId(projectId),
                    isActive: true,
                },
            },
            {
                $group: {
                    _id: '$layout',
                    total: { $sum: 1 },
                    sold: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const unitCountMap = {};
        unitCountAgg.forEach((u) => {
            unitCountMap[u._id.toString()] = {
                total: u.total,
                sold: u.sold,
            };
        });

        const filteredLayouts = allLayouts.filter((layout) => {
            const lId = layout._id.toString();
            return (unitCountMap[lId]?.total || 0) > 0;
        });

        const projectStats = await ProjectUnit.aggregate([
            {
                $match: {
                    _id: {
                        $in: agentUnitIds.map((id) => new Types.ObjectId(id)),
                    },
                    project: new Types.ObjectId(projectId),
                    isActive: true,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    sold: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0],
                        },
                    },
                    remaining: {
                        $sum: {
                            $cond: [{ $ne: ['$status', 'closed'] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const stats = projectStats[0] || {
            total: 0,
            sold: 0,
            remaining: 0,
        };

        const propertyTypeMap = {};
        allLayouts.forEach((l) => {
            const ptId = l.propertyType?._id?.toString();
            const ptName = l.propertyType?.name;
            const lId = l._id.toString();
            const hasUnits = (unitCountMap[lId]?.total || 0) > 0;
            if (ptId && hasUnits) {
                if (!propertyTypeMap[ptId]) {
                    propertyTypeMap[ptId] = {
                        id: ptId,
                        name: ptName,
                        count: 0,
                    };
                }
                propertyTypeMap[ptId].count += 1;
            }
        });

        const totalLayouts = filteredLayouts.length;
        const totalPages = totalLayouts ? Math.ceil(totalLayouts / limitNum) : 0;
        const paginatedLayouts = filteredLayouts.slice(skip, skip + limitNum);

        const mappedLayouts = paginatedLayouts.map((layout) => {
            const lId = layout._id.toString();
            const counts = unitCountMap[lId] || { total: 0, sold: 0 };

            return {
                layoutId: layout._id,
                buildingName: layout.building?.buildingName || null,
                propertyType: layout.propertyType?.name || null,
                layoutName: layout.layoutName,
                unitsAssigned: counts.total,
                unitsSold: counts.sold,
            };
        });

        const projectInfo = await Newprojects.findById(projectId)
            .select('projectName')
            .lean();

        return success(
            res,
            'Units fetched successfully',
            {
                projectName: projectInfo?.projectName || null,
                totalUnits: stats.total,
                soldUnits: stats.sold,
                remainingUnits: stats.remaining,
                propertyTypeFilters: Object.values(propertyTypeMap),
                layouts: mappedLayouts,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    totalLayouts,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                },
            },
            200,
        );
    } catch (error) {
        logger.error('Get agent project units failed', {
            error: error.message,
            stack: error.stack,
        });
        return failure(res, 500, 'Failed to fetch units', 'SERVER_ERROR');
    }
});

module.exports = {
    getAgentProjects,
    getAgentProjectUnits,
};
