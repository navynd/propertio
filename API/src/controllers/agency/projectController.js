const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agencies = require('../../models/agenciesModel');
const Newprojects = require('../../models/newprojectsModel');
const ProjectAgencyAllocation = require('../../models/projectAgencyAllocationModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const ProjectLayout = require('../../models/projectLayoutModel');
const ProjectUnit = require('../../models/projectUnitModel');
const LeadAssignment = require('../../models/leadAssignmentModel');
const Agents = require('../../models/agentsModel');
const Notification = require('../../models/notificationModel');

const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');

const { Types } = mongoose;
const validateObjectId = (id) => Types.ObjectId.isValid(id);

/** Same display states as GET /agents/projects/units unitGrid. */
const resolveAgencyUnitDisplayState = (unit, agencyId) => {
  if (unit.status === 'closed') {
    const closedByAgency = unit.saleInfo?.closedByAgency?.toString();
    if (closedByAgency === agencyId.toString()) {
      return 'sold-by-your-agent';
    }
    return 'sold-by-other';
  }
  if (['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(unit.status)) {
    return 'agent-working-on';
  }
  if (unit.status === 'available') {
    return 'available';
  }
  return 'unavailable';
};

//closed units finds
const findClosedProjectUnits = async (unitIds, session) => {
  if (!unitIds?.length) return [];
  const query = ProjectUnit.find({
    _id: { $in: unitIds },
    status: 'closed',
    isActive: true,
  }).select('unitId unitNumber');
  return session ? query.session(session).lean() : query.lean();
};

const formatClosedUnitLabels = (units) =>
  units.map((u) => u.unitNumber || u.unitId || u._id.toString());

const closedUnitsAllocationFailure = (res, closedUnits, action) => {
  const labels = formatClosedUnitLabels(closedUnits);
  const message =
    action === 'remove'
      ? `Closed unit${labels.length === 1 ? '' : 's'} cannot be removed from agent allocation: ${labels.join(', ')}`
      : `Closed unit${labels.length === 1 ? '' : 's'} cannot be assigned or updated: ${labels.join(', ')}`;
  return failure(res, 400, message, 'VALIDATION_ERROR');
};

/** e.g. [1200, 1400] → "1200-1400"; single value → "1200" */
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

/** Min–max area from layouts that have at least one unit allocated to this agency. */
const getAllocatedLayoutAreaRanges = async (projectId, agencyUnitIds) => {
  if (!Array.isArray(agencyUnitIds) || !agencyUnitIds.length) {
    return { areaSqm: null, areaSqft: null };
  }

  const units = await ProjectUnit.find({
    _id: { $in: agencyUnitIds },
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

/** Populated JobTitles doc → { title, description } for API responses */
const agentSpecializationDto = (agent) => {
  const spec = agent?.specialization;
  if (!spec || typeof spec !== 'object') return null;
  return {
    title: spec.title ?? null,
    description: spec.description ?? null,
  };
};

const populateAgentWithSpecialization = {
  path: 'agent',
  select: 'fullName profilePicture agentType specialization',
  populate: {
    path: 'specialization',
    select: 'title description',
  },
};

/** Subdoc may use schema field `agency` or legacy `assignedByAgency` from older writes */
const assignedAgentsSubdocAgencyId = (entry) =>
  entry?.assignedByAgency ?? entry?.agency ?? null;

const toBooleanEnv = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const isExpertsEmailNotificationEnabled = () => toBooleanEnv(process.env.EXPERTS_MAIL_NOTIFICATION);
const isExpertsPushNotificationEnabled = () => toBooleanEnv(process.env.EXPERTS_PUSH_NOTIFICATION);

const {
  pickPrimaryImageRaw,
  ensureNotificationImage,
} = require('../../utils/notificationImage');

const getPrimaryProjectImage = (project = null) => {
  const raw = pickPrimaryImageRaw(project?.images);
  return ensureNotificationImage(raw, 'project');
};

const notifyAgentProjectAssignment = async ({
  agent,
  project,
  mode,
  unitsAssigned = 0,
  addedUnits = 0,
  removedUnits = 0,
  unitsReleased = 0,
}) => {
  const settings = agent?.preferences?.notificationSettings || {};
  const shouldEmail = isExpertsEmailNotificationEnabled() && settings.email !== false;
  const shouldPush = isExpertsPushNotificationEnabled() && settings.push !== false;

  const projectName = project?.projectName || 'Project';
  const projectImage = getPrimaryProjectImage(project);
  const agentName = agent?.fullName || 'Agent';

  let title = 'Project Unit Assignment';
  let body = `You have been assigned ${Number(unitsAssigned || 0)} unit(s) in ${projectName}.`;
  if (mode === 'updated') {
    title = 'Project Unit Assignment Updated';
    body = `Your assignment in ${projectName} was updated. Total units: ${Number(unitsAssigned || 0)} (added: ${Number(addedUnits || 0)}, removed: ${Number(removedUnits || 0)}).`;
  } else if (mode === 'cancelled') {
    title = 'Project Unit Assignment Cancelled';
    body = `Your assignment in ${projectName} was cancelled. Released units: ${Number(unitsReleased || 0)}.`;
  }

  const notification = await Notification.create({
    recipient: { recipientType: 'agent', recipientId: agent?._id },
    title,
    message: body,
    notificationType: 'property-update',
    priority: 'high',
    relatedItem: { itemType: 'project', itemId: project?._id },
    channels: { email: shouldEmail, sms: false, push: shouldPush, inApp: true },
    actionText: 'View',
    metadata: {
      mode,
      projectId: project?._id?.toString() || null,
      projectName,
      image: projectImage,
      unitsAssigned: Number(unitsAssigned || 0),
      addedUnits: Number(addedUnits || 0),
      removedUnits: Number(removedUnits || 0),
      unitsReleased: Number(unitsReleased || 0),
    },
  });

  if (shouldEmail && agent?.email) {
    const subject = `${title}: ${projectName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">${title}</h2>
        <p>Hi ${agentName},</p>
        <p>${body}</p>
        ${projectImage ? `<p><img src="${projectImage}" alt="${projectName}" style="max-width: 220px; border-radius: 8px; display: block; margin: 12px 0;" /></p>` : ''}
      </div>
    `;
    await sendEmail(agent.email, subject, html);
    await Notification.findByIdAndUpdate(notification._id, {
      $set: { 'deliveryStatus.email.sent': true, 'deliveryStatus.email.sentAt': new Date() },
    });
  }

  if (shouldPush) {
    const activeTokens = (agent?.fcmTokens || [])
      .filter((token) => token?.isActive && token?.token)
      .map((token) => token.token);
    let anyPushSent = false;
    for (const token of activeTokens) {
      try {
        await sendPushNotificationToToken({
          token,
          title,
          body,
          data: {
            notificationId: String(notification._id),
            type: 'project-agent-assignment',
            mode: mode || 'assigned',
            projectId: project?._id?.toString() || '',
            agentId: agent?._id?.toString() || '',
          },
        });
        anyPushSent = true;
      } catch (pushErr) {
        logger.error('Agent assignment push failed', {
          error: pushErr.message,
          agentId: agent?._id,
          projectId: project?._id,
          mode,
        });
      }
    }
    if (anyPushSent) {
      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.push.sent': true, 'deliveryStatus.push.sentAt': new Date() },
      });
    }
  }
};

/**
 * @swagger
 * /agency/projects:
 *   get:
 *     summary: Get projects allocated to the authenticated agency
 *     description: >
 *       Returns projects that have an active `ProjectAgencyAllocation` for the authenticated agency.
 *       Supports two tabs:
 *
 *       - **Unallocated**: Projects allocated to the agency but with **no** active `ProjectAgentAllocation` for this agency.
 *       - **Allocated**: Projects that have **at least one** active `ProjectAgentAllocation` for this agency.
 *
 *       Also supports filtering by project type (new/off-plan), search by projectName, sorting, and pagination.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: >
 *           Optional Project ObjectId. When provided, the endpoint returns a single detailed
 *           project view (including developer, amenities, payment plans, authorized agencies,
 *           and authorized agents for this agency) instead of the tabbed list.
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [unallocated, allocated]
 *           default: unallocated
 *         description: >
 *           Tab selector. "unallocated" shows projects with no agent allocations for this agency.
 *           "allocated" shows projects with at least one active agent allocation.
 *       - in: query
 *         name: subTab
 *         schema:
 *           type: string
 *           enum: [all, new, off-plan]
 *           default: all
 *         description: >
 *           Sub-filter for project type.
 *           - all: no extra project-type filter
 *           - new: only projects with projectType = "new"
 *           - off-plan: only projects with completionStatus = "off-plan"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search on projectName.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price-low, price-high, delivery-date-earliest, delivery-date-latest]
 *           default: featured
 *         description: >
 *           Sort mode:
 *           - featured: featured projects first (isFeatured desc, publishedAt desc)
 *           - newest: newest projects first (isFeatured desc, publishedAt desc)
 *           - price-low: lowest launch price first
 *           - price-high: highest launch price first
 *           - delivery-date-earliest: earliest delivery date first
 *           - delivery-date-latest: latest delivery date first
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (1-based).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Page size for pagination (max 50).
 *     responses:
 *       200:
 *         description: Projects fetched successfully
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
 *                   example: Projects fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectId:
 *                             type: string
 *                             description: Project ObjectId
 *                           projectName:
 *                             type: string
 *                             example: "Omniyat Bespoke | Villa"
 *                           slug:
 *                             type: string
 *                           image:
 *                             type: object
 *                             nullable: true
 *                             description: Primary image object (if any)
 *                           location:
 *                             type: object
 *                             properties:
 *                               city:
 *                                 type: string
 *                               zone:
 *                                 type: string
 *                           projectStatus:
 *                             type: string
 *                             description: Mirrors completionStatus
 *                             example: off-plan
 *                           projectType:
 *                             type: string
 *                             example: new
 *                           progressStatus:
 *                             type: string
 *                             nullable: true
 *                           announcedDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           expectedCompletionDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           isFeatured:
 *                             type: boolean
 *                           totalUnits:
 *                             type: integer
 *                             description: Total active units allocated to this agency for the project.
 *                           availableUnits:
 *                             type: integer
 *                             description: Active allocated units with status "available".
 *                           soldUnits:
 *                             type: integer
 *                             description: Active allocated units with status "closed".
 *                           assignedAgentsCount:
 *                             type: integer
 *                             description: >
 *                               Only present on allocated tab rows. Number of active ProjectAgentAllocation
 *                               records for this agency on this project.
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalProjects:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     tabs:
 *                       type: object
 *                       description: Tab badge counts
 *                       properties:
 *                         unallocated:
 *                           type: integer
 *                           example: 12
 *                         allocated:
 *                           type: integer
 *                           example: 8
 *       401:
 *         description: Unauthorized (missing/invalid token or agency not found)
 *       500:
 *         description: Server error
 */
const getAgencyProjects = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;

  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  try {
    const agency = await Agencies.findById(agencyId);
    if (!agency) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const {
      projectId,
      tab = 'unallocated',
      subTab = 'all',
      search,
      sortBy = 'featured',
      page = 1,
      limit = 10,
    } = req.query;

    // ── Single project detail mode ──
    if (projectId) {
      if (!validateObjectId(projectId)) {
        return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
      }

      // Verify agency allocation
      const agencyAllocation = await ProjectAgencyAllocation.findOne({
        project: projectId,
        agency: agencyId,
        status: 'active',
      }).lean();

      if (!agencyAllocation) {
        return failure(
          res,
          403,
          'You are not authorized to view this project',
          'FORBIDDEN',
        );
      }

      // Get project with related refs
      const project = await Newprojects.findOne({
        _id: projectId,
        isActive: true,
      })
        .populate('developer', 'name logo')
        .populate('propertyTypes', 'name')
        .populate('amenities', 'name icon image')
        .lean();

      if (!project) {
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      // Get authorized agencies
      const authorizedAgencies = await Agencies.find({
        _id: { $in: project.authorizedAgencies || [] },
      })
        .select('agencyName profilePicture isVerified')
        .lean();

      // Get agent allocations for this agency
      const agentAllocations = await ProjectAgentAllocation.find({
        project: projectId,
        agency: agencyId,
        status: 'active',
      })
        .populate(
          'agent',
          `
          fullName profilePicture agentType
          ratings.average brokerLicenseNumber
          statistics.activeListings
        `,
        )
        .lean();

      const authorizedAgents = agentAllocations.map((alloc) => ({
        allocationId: alloc._id,
        agentId: alloc.agent?._id,
        fullName: alloc.agent?.fullName,
        profilePicture: alloc.agent?.profilePicture,
        agentType: alloc.agent?.agentType,
        ratings: alloc.agent?.ratings?.average || 0,
        unitsCount: Array.isArray(alloc.units) ? alloc.units.length : 0,
        allocatedAt: alloc.allocatedAt,
        status: alloc.status,
      }));

      // Payment plans
      const paymentPlans = Array.isArray(project.paymentPlans)
        ? project.paymentPlans.map((plan, index) => ({
            planName: plan.planName || `Option ${index + 1}`,
            downPayment: plan.downPayment,
            duringConstruction: plan.duringConstruction,
            onHandover: plan.onHandover,
          }))
        : [];

      // Project timeline
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

      // Sort images
      const sortedImages = (project.images || []).sort((a, b) => {
        if (b.isPrimary && !a.isPrimary) return 1;
        if (a.isPrimary && !b.isPrimary) return -1;
        const aOrder = typeof a.order === 'number' ? a.order : 0;
        const bOrder = typeof b.order === 'number' ? b.order : 0;
        return aOrder - bOrder;
      });

      // Sort FAQs
      const sortedFaqs = (project.faqs || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((faq) => ({ question: faq.question, answer: faq.answer }));

      //added for areaSqm and areaSqft
      const agencyUnitIds = agencyAllocation.units || [];
      const layoutAreaRanges = await getAllocatedLayoutAreaRanges(
        projectId,
        agencyUnitIds,
      );
      //added for areaSqm and areaSqft

      return success(
        res,
        'Project fetched successfully',
        {
          projectId: project._id,
          projectName: project.projectName,
          canAssignAgents: true,
          description: project.description,
          aboutProject: project.aboutProject,
          projectLocation: project.location,
          projectStatus: project.completionStatus,
          // areaSqm: project.areaSqm || null,
          // areaSqft: project.areaSqft || null,
          areaSqm: layoutAreaRanges.areaSqm ?? project.areaSqm ?? null,
          areaSqft: layoutAreaRanges.areaSqft ?? project.areaSqft ?? null,
          governmentFees: project.governmentFees || null,
          zoneLocation: project.location?.zone || null,
          propertyPrice: project.launchPrice || null,
          authorizedAgents,
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
            allocationId: agencyAllocation._id,
            allocatedAt: agencyAllocation.allocatedAt,
            unitsCount: Array.isArray(agencyAllocation.units)
              ? agencyAllocation.units.length
              : 0,
            status: agencyAllocation.status,
          },
        },
        200,
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Step 1: Get all project IDs allocated to agency
    const agencyAllocations = await ProjectAgencyAllocation.find({
      agency: agencyId,
      status: 'active',
    })
      .select('project units allocatedAt createdAt')
      .lean();

    if (!agencyAllocations.length) {
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
          tabs: { unallocated: 0, allocated: 0 },
        },
        200,
      );
    }

    const allocatedProjectIds = agencyAllocations.map((a) => a.project);

    // Step 2: Build base project query
    const projectQuery = {
      _id: { $in: allocatedProjectIds },
      isActive: true,
    };

    // subTab filter
    if (subTab === 'new') {
      projectQuery.projectType = 'ready';
    }
    if (subTab === 'off-plan') {
      projectQuery.completionStatus = 'off-plan';
    }

    // search filter (project name + location/address)
    if (search && search.toString().trim()) {
      const searchRegex = {
        $regex: search.toString().trim(),
        $options: 'i',
      };
      projectQuery.$or = [
        { projectName: searchRegex },
        { 'location.city': searchRegex },
        { 'location.zone': searchRegex },
        { 'location.address': searchRegex },
      ];
    }

    // sortBy (aligned with public project search)
    const sortByValue = String(sortBy || '').trim().toLowerCase();
    let sortObj = {};
    switch (sortByValue) {
      case 'newest':
        sortObj = { isFeatured: -1, publishedAt: -1 };
        break;
      case 'price-low':
        sortObj = { 'launchPrice.startingFrom': 1 };
        break;
      case 'price-high':
        sortObj = { 'launchPrice.startingFrom': -1 };
        break;
      case 'delivery-date-earliest':
        sortObj = { deliveryDate: 1 };
        break;
      case 'delivery-date-latest':
        sortObj = { deliveryDate: -1 };
        break;
      default:
        sortObj = { isFeatured: -1, publishedAt: -1 };
        break;
    }

    // Step 3: Get all projects matching query
    const allProjects = await Newprojects.find(projectQuery)
      .select(
        `
        _id projectName slug images location
        projectType completionStatus publishStatus
        progressStatus projectAnnouncement
        expectedCompletionDate isFeatured
        totalUnits availableUnits soldUnits
        createdAt
      `,
      )
      .sort(sortObj)
      .lean();

    // Step 4: Split into unallocated / allocated for this agency's agents
    const agentAllocations = await ProjectAgentAllocation.find({
      agency: agencyId,
      status: 'active',
    })
      .select('project')
      .lean();

    const allocatedToAgentProjectIds = new Set(
      agentAllocations.map((a) => a.project.toString()),
    );

    const unallocatedProjects = allProjects.filter(
      (p) => !allocatedToAgentProjectIds.has(p._id.toString()),
    );
    const allocatedProjects = allProjects.filter((p) =>
      allocatedToAgentProjectIds.has(p._id.toString()),
    );

    // Step 5: Select projects based on tab
    const targetProjects = tab === 'allocated' ? allocatedProjects : unallocatedProjects;

    // Step 6: Paginate
    const totalProjects = targetProjects.length;
    const paginatedProjects = targetProjects.slice(skip, skip + limitNum);

    // Step 7: Build allocation-based unit counts + assigned agents count map
    const allocationUnitIdsByProject = {};
    const allocationDatesByProject = {};
    agencyAllocations.forEach((allocation) => {
      const projectKey = allocation.project?.toString();
      if (!projectKey) return;
      if (!allocationUnitIdsByProject[projectKey]) {
        allocationUnitIdsByProject[projectKey] = new Set();
      }
      (allocation.units || []).forEach((unitId) => {
        if (unitId) allocationUnitIdsByProject[projectKey].add(unitId.toString());
      });
      allocationDatesByProject[projectKey] = {
        /** Prefer `allocatedAt`; for legacy rows without it, use allocation `createdAt` */
        effectiveAllocatedAt: allocation.allocatedAt || allocation.createdAt || null,
      };
    });

    let unitCountMap = {};
    let agentCountMap = {};
    if (paginatedProjects.length) {
      const paginatedProjectIds = paginatedProjects.map((p) => p._id);
      const allocatedUnitIds = paginatedProjectIds.flatMap((projectId) =>
        Array.from(allocationUnitIdsByProject[projectId.toString()] || []),
      );

      const paginatedProjectIdSet = new Set(
        paginatedProjectIds.map((id) => id.toString()),
      );

      if (tab === 'allocated') {
        agentAllocations.forEach((allocation) => {
          const projectKey = allocation.project?.toString();
          if (!projectKey || !paginatedProjectIdSet.has(projectKey)) return;
          agentCountMap[projectKey] = (agentCountMap[projectKey] || 0) + 1;
        });
      }

      const allocatedUnitsByStatus = allocatedUnitIds.length
        ? await ProjectUnit.aggregate([
          {
            $match: {
              _id: { $in: allocatedUnitIds.map((id) => new Types.ObjectId(id)) },
              isActive: true,
            },
          },
          {
            $group: {
              _id: { project: '$project', status: '$status' },
              count: { $sum: 1 },
            },
          },
        ])
        : [];

      allocatedUnitsByStatus.forEach((row) => {
        const projectKey = row._id?.project?.toString();
        if (!projectKey) return;
        if (!unitCountMap[projectKey]) {
          unitCountMap[projectKey] = { totalUnits: 0, availableUnits: 0, soldUnits: 0 };
        }
        const status = row._id?.status;
        const count = Number(row.count || 0);
        unitCountMap[projectKey].totalUnits += count;
        if (status === 'available') unitCountMap[projectKey].availableUnits += count;
        if (status === 'closed') unitCountMap[projectKey].soldUnits += count;
      });
    }

    // Step 8: Map response rows
    const mappedProjects = paginatedProjects.map((project) => {
      const projectKey = project._id.toString();
      const allocDates = allocationDatesByProject[projectKey] || {};
      const primaryImage =
        (project.images || []).sort((a, b) => {
          if (b.isPrimary && !a.isPrimary) return 1;
          if (a.isPrimary && !b.isPrimary) return -1;
          const aOrder = typeof a.order === 'number' ? a.order : 0;
          const bOrder = typeof b.order === 'number' ? b.order : 0;
          return aOrder - bOrder;
        })[0] || null;

      const base = {
        projectId: project._id,
        projectName: project.projectName,
        slug: project.slug,
        image: primaryImage,
        location: {
          city: project.location?.city,
          zone: project.location?.zone,
        },
        projectStatus: project.completionStatus,
        projectType: project.projectType,
        progressStatus: project.progressStatus || null,
        announcedDate: project.projectAnnouncement || null,
        expectedCompletionDate: project.expectedCompletionDate || null,
        isFeatured: project.isFeatured,
        totalUnits: unitCountMap[projectKey]?.totalUnits || 0,
        availableUnits: unitCountMap[projectKey]?.availableUnits || 0,
        soldUnits: unitCountMap[projectKey]?.soldUnits || 0,
        /** Agency allocation date (`allocatedAt`, else allocation record `createdAt`) */
        allocatedAt: allocDates.effectiveAllocatedAt || null,
        /** Project document creation time */
        projectCreatedAt: project.createdAt || null,
      };

      if (tab === 'unallocated') {
        return base;
      }

      return {
        ...base,
        assignedAgentsCount: agentCountMap[project._id.toString()] || 0,
      };
    });

    // Step 9: Tab counts for badges
    const tabs = {
      unallocated: unallocatedProjects.length,
      allocated: allocatedProjects.length,
    };

    // Step 10: Pagination meta
    const totalPages = totalProjects ? Math.ceil(totalProjects / limitNum) : 0;

    return success(
      res,
      'Projects fetched successfully',
      {
        projects: mappedProjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages,
          totalProjects,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        tabs,
      },
      200,
    );
  } catch (error) {
    logger.error('Get agency projects failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to fetch projects', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/projects/units:
 *   get:
 *     summary: Get units of a project allocated to the authenticated agency
 *     description: >
 *       Returns units for a given project that are allocated to the authenticated agency
 *       via `ProjectAgencyAllocation`. The endpoint has two modes:
 *
 *       1. **Units list page** (no layoutId): returns layouts (grouped views) with
 *          counts of available units, and an "unassigned/assigned" tab to show layouts
 *          without/with agent allocations from this agency.
 *
 *       2. **Unit detail page** (with layoutId): returns detailed information about
 *          units under a specific layout. Within detail mode, there are two tabs:
 *          `assigned-agents` and `unit-status`.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ObjectId. Must have an active ProjectAgencyAllocation for this agency.
 *       - in: query
 *         name: layoutId
 *         schema:
 *           type: string
 *         description: >
 *           Optional ProjectLayout ObjectId. When provided, the endpoint returns the
 *           unit detail view for this layout instead of the layouts list.
 *       - in: query
 *         name: allocationId
 *         schema:
 *           type: string
 *         description: >
 *           Optional ProjectAgentAllocation ObjectId. When provided (and no layoutId/bulk),
 *           the endpoint returns data for the "Edit assignment" screen, including pre-selected
 *           units and building → layout → unit grouping.
 *       - in: query
 *         name: bulk
 *         schema:
 *           type: boolean
 *         description: >
 *           Optional flag for bulk-assign mode. When `bulk=true` (string or boolean),
 *           the endpoint returns data for the "Bulk assign" screen, where units are
 *           grouped by building/layout and globally marked as assigned/unassigned.
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [unassigned, assigned]
 *           default: unassigned
 *         description: >
 *           Only used when **no layoutId**, **no allocationId**, and **no bulk** are provided
 *           (units list page). Controls which
 *           layouts are returned:
 *           - unassigned: layouts with agency units but no active ProjectAgentAllocation
 *             for this agency.
 *           - assigned: layouts with at least one active ProjectAgentAllocation for this agency.
 *       - in: query
 *         name: subTab
 *         schema:
 *           type: string
 *           enum: [all, apartment, penthouse, townhouse, duplex, villa]
 *           default: all
 *         description: >
 *           Optional propertyType filter (by name) applied at layout level (only when no layoutId).
 *       - in: query
 *         name: unitStatusTab
 *         schema:
 *           type: string
 *           enum: [assigned-agents, unit-status]
 *           default: assigned-agents
 *         description: >
 *           Only used when **layoutId** is provided:
 *           - assigned-agents: shows agent allocations per layout and a unit grid.
 *           - unit-status: shows per-unit status, "your agent", and "handling agent".
 *       - in: query
 *         name: statusFilter
 *         schema:
 *           type: string
 *           enum: [all, available, reserved, in-progress, follow-up, closed]
 *           default: all
 *         description: >
 *           Only used in detail mode when `unitStatusTab = unit-status`. Filters units by status.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: >
 *           Optional case-insensitive search.
 *           - **Units list** (projectId only): matches layout name, building, property type, beds,
 *             unit number/unitId on agency units, and assigned agent name or specialization.
 *           - **Detail** with `unitStatusTab=unit-status`: matches unitNumber.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: >
 *           Page number for pagination (1-based).
 *           - In list mode: paginates layouts.
 *           - In detail `unit-status` mode: paginates units.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Page size for pagination (max 50).
 *     responses:
 *       200:
 *         description: Units data fetched successfully (list, detail, edit, or bulk)
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
 *                   example: Units fetched successfully
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       description: Units list page (CASE 4 - projectId only)
 *                       properties:
 *                         projectName:
 *                           type: string
 *                           nullable: true
 *                         totalUnits:
 *                           type: integer
 *                         soldUnits:
 *                           type: integer
 *                         remainingUnits:
 *                           type: integer
 *                         propertyTypeFilters:
 *                           type: array
 *                           description: Aggregated property type filters for this project's layouts
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: PropertyType ObjectId
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                                 description: Number of layouts for this type (with agency units)
 *                         tabs:
 *                           type: object
 *                           properties:
 *                             unassigned:
 *                               type: integer
 *                             assigned:
 *                               type: integer
 *                         layouts:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               layoutId:
 *                                 type: string
 *                               buildingName:
 *                                 type: string
 *                               propertyType:
 *                                 type: string
 *                               layoutName:
 *                                 type: string
 *                               beds:
 *                                 type: integer
 *                               totalAvailableUnits:
 *                                 type: integer
 *                               assignedAgents:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     agentId: { type: string }
 *                                     fullName: { type: string }
 *                                     profilePicture: { type: string }
 *                                     agentType: { type: string }
 *                                     unitsAssigned: { type: integer }
 *                               unitsAssigned:
 *                                 type: integer
 *                                 description: Sum of unitsAssigned for this layout (assigned tab)
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             totalPages: { type: integer }
 *                             totalLayouts: { type: integer }
 *                             hasNextPage: { type: boolean }
 *                             hasPrevPage: { type: boolean }
 *                     - type: object
 *                       description: Unit detail page (CASE 1 - with layoutId)
 *                       properties:
 *                         buildingName:
 *                           type: string
 *                           nullable: true
 *                         layoutName:
 *                           type: string
 *                         beds:
 *                           type: integer
 *                         maidBedroom:
 *                           type: boolean
 *                         baths:
 *                           type: integer
 *                         unitsAvailable:
 *                           type: integer
 *                         unitsAssigned:
 *                           type: integer
 *                         propertyType:
 *                           type: string
 *                         areaSqft:
 *                           type: number
 *                         areaSqm:
 *                           type: number
 *                         price:
 *                           type: number
 *                         floorPlans:
 *                           type: array
 *                           items: { type: object }
 *                         unitGrid:
 *                           type: array
 *                           description: Grid for units under this layout
 *                           items:
 *                             type: object
 *                             properties:
 *                               unitId: { type: string }
 *                               unitNumber: { type: string }
 *                               isAssigned: { type: boolean }
 *                               status: { type: string }
 *                         activeTab:
 *                           type: string
 *                           enum: [assigned-agents, unit-status]
 *                         assignedAgents:
 *                           type: array
 *                           description: Present when activeTab = assigned-agents
 *                           items:
 *                             type: object
 *                             properties:
 *                               allocationId: { type: string }
 *                               agentId: { type: string }
 *                               fullName: { type: string }
 *                               profilePicture: { type: string }
 *                               agentType: { type: string }
 *                               ratings: { type: number }
 *                               status: { type: string }
 *                               unitsCount: { type: integer }
 *                               layoutSummary:
 *                                 type: object
 *                                 properties:
 *                                   layoutName: { type: string }
 *                                   buildingName: { type: string }
 *                                   propertyType: { type: string }
 *                                   areaSqft: { type: number }
 *                                   bedrooms: { type: integer }
 *                                   totalUnits: { type: integer }
 *                                   unitNumbers:
 *                                     type: array
 *                                     items: { type: string }
 *                         statusCounts:
 *                           type: object
 *                           description: Present when activeTab = unit-status
 *                           additionalProperties:
 *                             type: integer
 *                         units:
 *                           type: array
 *                           description: Present when activeTab = unit-status
 *                           items:
 *                             type: object
 *                             properties:
 *                               unitId: { type: string }
 *                               unitNumber: { type: string }
 *                               assignedAgencies:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     agencyId: { type: string }
 *                                     agencyName: { type: string }
 *                               yourAgent:
 *                                 type: object
 *                                 nullable: true
 *                               handlingAgent:
 *                                 type: object
 *                                 nullable: true
 *                               unitStatus:
 *                                 type: string
 *                         pagination:
 *                           type: object
 *                           description: Present when activeTab = unit-status
 *                           properties:
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             totalPages: { type: integer }
 *                             totalUnits: { type: integer }
 *                             hasNextPage: { type: boolean }
 *                             hasPrevPage: { type: boolean }
 *                     - type: object
 *                       description: Edit assignment screen (CASE 2 - with allocationId)
 *                       properties:
 *                         selectedAgent:
 *                           type: object
 *                           properties:
 *                             allocationId: { type: string }
 *                             agentId: { type: string }
 *                             fullName: { type: string }
 *                             profilePicture: { type: string }
 *                             agentType: { type: string }
 *                         buildings:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               buildingId: { type: string, nullable: true }
 *                               buildingName: { type: string, nullable: true }
 *                               propertyType: { type: string, nullable: true }
 *                               layouts:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     layoutId: { type: string }
 *                                     layoutName: { type: string }
 *                                     beds: { type: integer }
 *                                     areaSqft: { type: number }
 *                                     totalUnits: { type: integer }
 *                                     selectedCount: { type: integer }
 *                                     units:
 *                                       type: array
 *                                       items:
 *                                         type: object
 *                                         properties:
 *                                           unitId: { type: string }
 *                                           unitNumber: { type: string }
 *                                           isAssigned: { type: boolean }
 *                                           status: { type: string }
 *                         totalSelected:
 *                           type: integer
 *                         legendType:
 *                           type: string
 *                           example: selected-deselected
 *                     - type: object
 *                       description: Bulk assign screen (CASE 3 - bulk=true)
 *                       properties:
 *                         buildings:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               buildingId: { type: string, nullable: true }
 *                               buildingName: { type: string, nullable: true }
 *                               propertyType: { type: string, nullable: true }
 *                               layouts:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     layoutId: { type: string }
 *                                     layoutName: { type: string }
 *                                     beds: { type: integer }
 *                                     areaSqft: { type: number }
 *                                     totalUnits: { type: integer }
 *                                     selectedCount: { type: integer }
 *                                     units:
 *                                       type: array
 *                                       items:
 *                                         type: object
 *                                         properties:
 *                                           unitId: { type: string }
 *                                           unitNumber: { type: string }
 *                                           isAssigned: { type: boolean }
 *                                           status: { type: string }
 *                         totalUnits:
 *                           type: integer
 *                         legendType:
 *                           type: string
 *                           example: selected-unassigned
 *       400:
 *         description: Validation error (invalid IDs or invalid tab values)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Agency is not authorized for this project
 *       404:
 *         description: Layout not found (when layoutId is provided)
 *       500:
 *         description: Server error
 */
const getAgencyProjectUnits = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;

  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  try {
    const agency = await Agencies.findById(agencyId);
    if (!agency) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const {
      projectId,
      layoutId,
      allocationId,
      bulk,
      tab = 'unassigned',
      subTab = 'all',
      unitStatusTab = 'assigned-agents',
      statusFilter = 'all',
      search,
      page = 1,
      limit = 10,
    } = req.query;

    if (!projectId || !validateObjectId(projectId)) {
      return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
    }

    const agencyAllocation = await ProjectAgencyAllocation.findOne({
      project: projectId,
      agency: agencyId,
      status: 'active',
    }).lean();

    if (!agencyAllocation) {
      return failure(
        res,
        403,
        'Not authorized to view this project',
        'FORBIDDEN',
      );
    }

    const agencyUnitIds = agencyAllocation.units || [];

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // CASE 1: layoutId → Unit Detail Page
    if (layoutId && !allocationId && !bulk) {
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
        _id: { $in: agencyUnitIds },
        project: projectId,
        layout: layoutId,
        isActive: true,
      })
        .select(
          'unitId unitNumber floor status assignedAgents saleInfo statusUpdatedByAgency',
        )
        .lean();

      const agentAllocationsRaw = await ProjectAgentAllocation.find({
        project: projectId,
        agency: agencyId,
        status: 'active',
      })
        .populate({
          ...populateAgentWithSpecialization,
          select:
            'fullName profilePicture agentType specialization ratings.average statistics.activeListings',
        })
        .lean();

      const layoutUnitIds = new Set(allUnits.map((u) => u._id.toString()));
      const agentAllocations = agentAllocationsRaw
        .map((alloc) => {
          const unitsForLayout = (alloc.units || []).filter((u) =>
            layoutUnitIds.has(u.toString()),
          );
          return { ...alloc, units: unitsForLayout };
        })
        .filter((alloc) => (alloc.units || []).length > 0);

      const assignedUnitIds = new Set(
        agentAllocations.flatMap((a) => (a.units || []).map((u) => u.toString())),
      );

      const unitGrid = allUnits.map((unit) => ({
        unitId: unit._id,
        unitNumber: unit.unitNumber || unit.unitId,
        floor: unit.floor ?? null,
        isAssigned: assignedUnitIds.has(unit._id.toString()),
        status: unit.status,
        displayState: resolveAgencyUnitDisplayState(unit, agencyId),
      }));

      const unitsAvailable = allUnits.filter((u) => u.status === 'available').length;
      const unitsAssigned = assignedUnitIds.size;

      // Sub case: Assigned Agents tab
      if (unitStatusTab === 'assigned-agents') {
        const assignedAgentsList = agentAllocations.map((alloc) => {
          const units = (alloc.units || [])
            .map((unitRef) => {
              const unit = allUnits.find((u) => u._id.toString() === unitRef.toString());
              if (!unit) return null;
              return {
                _id: unit._id,
                unitId: unit.unitId,
                unitNumber: unit.unitNumber,
                status: unit.status
              };
            })
            .filter(Boolean);
          return {
            allocationId: alloc._id,
            agentId: alloc.agent?._id,
            fullName: alloc.agent?.fullName || null,
            profilePicture: alloc.agent?.profilePicture || null,
            agentType: alloc.agent?.agentType || null,
            specialization: agentSpecializationDto(alloc.agent),
            ratings: alloc.agent?.ratings?.average || 0,
            status: alloc.status,
            unitsCount: Array.isArray(alloc.units) ? alloc.units.length : 0,
            layoutSummary: {
              layoutName: layout.layoutName,
              buildingName: layout.building?.buildingName || null,
              propertyType: layout.propertyType?.name || null,
              areaSqft: layout.areaSqft,
              bedrooms: layout.bedrooms,
              totalUnits: Array.isArray(alloc.units) ? alloc.units.length : 0,
              units,
            },
          };
        });

        return success(
          res,
          'Unit detail fetched',
          {
            buildingName: layout.building?.buildingName || null,
            layoutName: layout.layoutName,
            beds: layout.bedrooms,
            maidBedroom: layout.maidBedroom || false,
            baths: layout.bathrooms,
            unitsAvailable,
            unitsAssigned,
            propertyType: layout.propertyType?.name || null,
            areaSqft: layout.areaSqft,
            areaSqm: layout.areaSqm,
            price: layout.startingPrice,
            floorPlans: layout.floorPlans || [],
            unitGrid,
            activeTab: 'assigned-agents',
            assignedAgents: assignedAgentsList,
          },
          200,
        );
      }

      // Sub case: Unit Status tab
      if (unitStatusTab === 'unit-status') {
        const statusQuery = {
          _id: { $in: agencyUnitIds },
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

        const [statusUnits, totalUnits] = await Promise.all([
          ProjectUnit.find(statusQuery)
            .populate({
              path: 'assignedAgents.agent',
              select: 'fullName profilePicture agency specialization',
              populate: [
                { path: 'agency', select: 'agencyName' },
                { path: 'specialization', select: 'title description' },
              ],
            })
            .sort({ unitNumber: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          ProjectUnit.countDocuments(statusQuery),
        ]);

        const allAgencyAllocations = await ProjectAgencyAllocation.find({
          project: projectId,
          status: 'active',
        })
          .populate('agency', 'agencyName')
          .lean();

        const projectAgencies = allAgencyAllocations
          .filter((a) => a.agency)
          .map((a) => ({
            agencyId: a.agency._id,
            agencyName: a.agency.agencyName,
          }));

        const statusCounts = await ProjectUnit.aggregate([
          {
            $match: {
              _id: { $in: agencyUnitIds },
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
        ]);

        const statusCountMap = { all: totalUnits };
        statusCounts.forEach((s) => {
          statusCountMap[s._id] = s.count;
        });
        const agencyNameById = new Map(
          projectAgencies.map((a) => [a.agencyId?.toString(), a.agencyName || null]),
        );

        // Fallback map: unit -> assigned agent from this agency allocation.
        // Some units may not yet have assignedAgents subdocs written on unit docs.
        const fallbackMyAgentByUnitId = new Map();
        agentAllocations.forEach((alloc) => {
          (alloc.units || []).forEach((unitRef) => {
            const unitId = unitRef.toString();
            if (fallbackMyAgentByUnitId.has(unitId)) return;
            fallbackMyAgentByUnitId.set(unitId, {
              agent: alloc.agent || null,
              assignedByAgency: alloc.agency || agencyId,
            });
          });
        });

        const unitStatusList = statusUnits.map((unit) => {
          const assignedAgentsArr = unit.assignedAgents || [];
          const fallbackMyAgent = fallbackMyAgentByUnitId.get(unit._id.toString()) || null;

          const myAgent =
            assignedAgentsArr.find((a) => {
              const subAgencyId = assignedAgentsSubdocAgencyId(a);
              return (
                subAgencyId && subAgencyId.toString() === agencyId.toString()
              );
            }) || fallbackMyAgent;
          const myAgencyId =
            assignedAgentsSubdocAgencyId(myAgent) ||
            myAgent?.agent?.agency?._id ||
            myAgent?.assignedByAgency ||
            null;
          const myAgencyName = myAgencyId
            ? agencyNameById.get(myAgencyId.toString()) || null
            : myAgent?.agent?.agency?.agencyName || null;

          const closedByAgencyId = unit.saleInfo?.closedByAgency?.toString() || null;
          const isSoldByOtherAgency = Boolean(
            unit.status === 'closed' &&
              closedByAgencyId &&
              closedByAgencyId !== agencyId.toString(),
          );
          const isSoldByYourAgency = Boolean(
            unit.status === 'closed' &&
              closedByAgencyId &&
              closedByAgencyId === agencyId.toString(),
          );

          const closedByAgentId = unit.saleInfo?.closedBy?.toString() || null;
          const closingAgentEntry =
            isSoldByYourAgency && closedByAgentId
              ? assignedAgentsArr.find(
                  (a) => a.agent?._id?.toString() === closedByAgentId,
                )
              : null;

          const handlingAgent =
            closingAgentEntry ||
            assignedAgentsArr.find((a) => a.isCurrentHandler === true) ||
            myAgent;

          const statusUpdatedByAgencyId =
            unit?.statusUpdatedByAgency ? unit.statusUpdatedByAgency.toString() : null;
          const statusIndicatesActiveHandling = ['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(
            String(unit?.status || '').toLowerCase(),
          );
          const isUnitHandledByOtherAgency = Boolean(
            !isSoldByOtherAgency &&
              statusIndicatesActiveHandling &&
              statusUpdatedByAgencyId &&
              statusUpdatedByAgencyId !== agencyId.toString(),
          );
          const handlingAgencyId =
            assignedAgentsSubdocAgencyId(handlingAgent) ||
            handlingAgent?.agent?.agency?._id ||
            null;
          const handlingAgencyIdStr = handlingAgencyId ? handlingAgencyId.toString() : null;
          const isOtherAgencyHandler = Boolean(
            !isSoldByOtherAgency &&
              !isSoldByYourAgency &&
              handlingAgent &&
              (
                (handlingAgencyIdStr && handlingAgencyIdStr !== agencyId.toString()) ||
                (!handlingAgencyIdStr &&
                  myAgent?.agent?._id &&
                  handlingAgent?.agent?._id &&
                  handlingAgent.agent._id.toString() !== myAgent.agent._id.toString())
              ),
          );
          const resolvedHandlingAgencyName = handlingAgencyIdStr
            ? agencyNameById.get(handlingAgencyIdStr) || null
            : handlingAgent?.agent?.agency?.agencyName || null;
          const resolvedOtherAgencyName = statusUpdatedByAgencyId
            ? agencyNameById.get(statusUpdatedByAgencyId) || null
            : null;
          const soldByOtherAgencyName = closedByAgencyId
            ? agencyNameById.get(closedByAgencyId) || null
            : null;

          const showHandlingAsOtherAgent =
            isSoldByOtherAgency || isUnitHandledByOtherAgency || isOtherAgencyHandler;

          return {
            unitId: unit._id,
            unitNumber: unit.unitNumber || unit.unitId,
            assignedAgencies: projectAgencies,
            yourAgent: {
              agentId: myAgent?.agent?._id || null,
              fullName: myAgent?.agent?.fullName || 'Agent not assigned',
              profilePicture: myAgent?.agent?.profilePicture || 'profileless.png',
              agencyName: myAgencyName,
              specialization: myAgent ? agentSpecializationDto(myAgent.agent) : null,
            },
            handlingAgent: {
              agentId: showHandlingAsOtherAgent ? null : handlingAgent?.agent?._id || null,
              fullName: showHandlingAsOtherAgent
                ? 'OtherAgent'
                : handlingAgent
                  ? handlingAgent.agent?.fullName || 'Agent not assigned'
                  : 'No agent is handling',
              profilePicture: showHandlingAsOtherAgent
                ? 'profileless.png'
                : handlingAgent?.agent?.profilePicture || 'profileless.png',
              agencyName: isSoldByOtherAgency
                ? soldByOtherAgencyName
                : isUnitHandledByOtherAgency
                  ? resolvedOtherAgencyName
                  : isOtherAgencyHandler
                    ? resolvedHandlingAgencyName
                    : handlingAgent?.agent?.agency?.agencyName || null,
              specialization: showHandlingAsOtherAgent
                ? null
                : handlingAgent
                  ? agentSpecializationDto(handlingAgent.agent)
                  : null,
            },
            unitStatus: unit.status,
          };
        });

        return success(
          res,
          'Unit status fetched',
          {
            buildingName: layout.building?.buildingName || null,
            layoutName: layout.layoutName,
            beds: layout.bedrooms,
            maidBedroom: layout.maidBedroom || false,
            baths: layout.bathrooms,
            unitsAvailable,
            unitsAssigned,
            propertyType: layout.propertyType?.name || null,
            areaSqft: layout.areaSqft,
            areaSqm: layout.areaSqm,
            price: layout.startingPrice,
            floorPlans: layout.floorPlans || [],
            unitGrid,
            activeTab: 'unit-status',
            statusCounts: statusCountMap,
            units: unitStatusList,
            pagination: {
              page: pageNum,
              limit: limitNum,
              totalPages: Math.ceil(totalUnits / limitNum),
              totalUnits,
              hasNextPage: pageNum < Math.ceil(totalUnits / limitNum),
              hasPrevPage: pageNum > 1,
            },
          },
          200,
        );
      }
    }

    // CASE 2: allocationId → Edit Assignment Screen
    if (allocationId && !bulk) {
      if (!validateObjectId(allocationId)) {
        return failure(res, 400, 'Valid allocationId is required', 'VALIDATION_ERROR');
      }

      const existingAllocation = await ProjectAgentAllocation.findOne({
        _id: allocationId,
        agency: agencyId,
        status: 'active',
      })
        .populate(populateAgentWithSpecialization)
        .lean();

      if (!existingAllocation) {
        return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
      }

      const preSelectedUnitIds = new Set(
        (existingAllocation.units || []).map((u) => u.toString()),
      );

      const layouts = await ProjectLayout.find({
        project: projectId,
        isActive: true,
      })
        .populate('building', 'buildingName')
        .populate('propertyType', 'name')
        .lean();

      const units = await ProjectUnit.find({
        _id: { $in: agencyUnitIds },
        project: projectId,
        isActive: true,
      })
        .select('unitId unitNumber layout building status')
        .lean();

      const buildingMap = {};

      layouts.forEach((layout) => {
        const bKey = layout.building ? layout.building._id.toString() : 'no-building';
        const bName = layout.building?.buildingName || null;

        if (!buildingMap[bKey]) {
          buildingMap[bKey] = {
            buildingId: layout.building?._id || null,
            buildingName: bName,
            propertyType: layout.propertyType?.name || null,
            layouts: [],
          };
        }

        const layoutUnits = units
          .filter((u) => u.layout?.toString() === layout._id.toString())
          .map((u) => ({
            unitId: u._id,
            unitNumber: u.unitNumber || u.unitId,
            isAssigned: preSelectedUnitIds.has(u._id.toString()),
            status: u.status,
          }));

        if (layoutUnits.length > 0) {
          buildingMap[bKey].layouts.push({
            layoutId: layout._id,
            layoutName: layout.layoutName,
            beds: layout.bedrooms,
            areaSqft: layout.areaSqft,
            totalUnits: layoutUnits.length,
            selectedCount: layoutUnits.filter((u) => u.isAssigned).length,
            units: layoutUnits,
          });
        }
      });

      const buildings = Object.values(buildingMap).filter(
        (b) => Array.isArray(b.layouts) && b.layouts.length > 0,
      );

      return success(
        res,
        'Edit assignment data fetched',
        {
          selectedAgent: {
            allocationId: existingAllocation._id,
            agentId: existingAllocation.agent?._id,
            fullName: existingAllocation.agent?.fullName,
            profilePicture: existingAllocation.agent?.profilePicture,
            agentType: existingAllocation.agent?.agentType,
            specialization: agentSpecializationDto(existingAllocation.agent),
          },
          buildings,
          totalSelected: preSelectedUnitIds.size,
          legendType: 'selected-deselected',
        },
        200,
      );
    }

    // CASE 3: bulk=true → Bulk Assign Screen
    if (bulk === 'true' || bulk === true) {
      const layouts = await ProjectLayout.find({
        project: projectId,
        isActive: true,
      })
        .populate('building', 'buildingName')
        .populate('propertyType', 'name')
        .lean();

      const units = await ProjectUnit.find({
        _id: { $in: agencyUnitIds },
        project: projectId,
        isActive: true,
      })
        .select('unitId unitNumber layout building status assignedAgents')
        .lean();

      const allAgentAllocations = await ProjectAgentAllocation.find({
        project: projectId,
        agency: agencyId,
        status: 'active',
      }).lean();

      const globalAssignedUnitIds = new Set(
        allAgentAllocations.flatMap((a) =>
          (a.units || []).map((u) => u.toString()),
        ),
      );

      const buildingMap = {};

      layouts.forEach((layout) => {
        const bKey = layout.building ? layout.building._id.toString() : 'no-building';
        const bName = layout.building?.buildingName || null;

        if (!buildingMap[bKey]) {
          buildingMap[bKey] = {
            buildingId: layout.building?._id || null,
            buildingName: bName,
            propertyType: layout.propertyType?.name || null,
            layouts: [],
          };
        }

        const layoutUnits = units
          .filter((u) => u.layout?.toString() === layout._id.toString())
          .map((u) => ({
            unitId: u._id,
            unitNumber: u.unitNumber || u.unitId,
            isAssigned: globalAssignedUnitIds.has(u._id.toString()),
            status: u.status,
          }));

        if (layoutUnits.length > 0) {
          buildingMap[bKey].layouts.push({
            layoutId: layout._id,
            layoutName: layout.layoutName,
            beds: layout.bedrooms,
            areaSqft: layout.areaSqft,
            totalUnits: layoutUnits.length,
            selectedCount: 0,
            units: layoutUnits,
          });
        }
      });

      const buildings = Object.values(buildingMap).filter(
        (b) => Array.isArray(b.layouts) && b.layouts.length > 0,
      );

      return success(
        res,
        'Bulk assign data fetched',
        {
          buildings,
          totalUnits: agencyUnitIds.length,
          legendType: 'selected-unassigned',
        },
        200,
      );
    }

    // CASE 4: projectId only → Units List Page
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
          _id: { $in: agencyUnitIds },
          project: new Types.ObjectId(projectId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$layout',
          count: { $sum: 1 },
        },
      },
    ]);

    const unitCountMap = {};
    unitCountAgg.forEach((u) => {
      unitCountMap[u._id.toString()] = u.count;
    });

    const agentAllocations = await ProjectAgentAllocation.find({
      project: projectId,
      agency: agencyId,
      status: 'active',
    })
      .populate(populateAgentWithSpecialization)
      .lean();

    const assignedLayoutIds = new Set();
    const agentByLayout = {};

    agentAllocations.forEach((alloc) => {
      const summaries = Array.isArray(alloc.layoutSummary)
        ? alloc.layoutSummary
        : [];
      summaries.forEach((summary) => {
        const lId = summary?.layout?.toString();
        if (!lId) return;
        assignedLayoutIds.add(lId);
        if (!agentByLayout[lId]) agentByLayout[lId] = [];
        agentByLayout[lId].push({
          agentId: alloc.agent?._id,
          fullName: alloc.agent?.fullName,
          profilePicture: alloc.agent?.profilePicture,
          agentType: alloc.agent?.agentType,
          unitsAssigned: Number(summary?.unitsCount || 0),
          specialization: agentSpecializationDto(alloc.agent),
        });
      });
    });

    const filteredLayouts = allLayouts.filter((layout) => {
      const lId = layout._id.toString();
      const hasUnits = (unitCountMap[lId] || 0) > 0;
      if (!hasUnits) return false;
      if (tab === 'unassigned') {
        return !assignedLayoutIds.has(lId);
      }
      if (tab === 'assigned') {
        return assignedLayoutIds.has(lId);
      }
      return true;
    });

    const searchTrim =
      search && typeof search === 'string' ? search.trim() : '';
    let layoutsForPagination = filteredLayouts;
    if (searchTrim) {
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapeRegex(searchTrim), 'i');

      const matchingLayoutIdsFromUnits = await ProjectUnit.distinct('layout', {
        _id: { $in: agencyUnitIds },
        project: new Types.ObjectId(projectId),
        isActive: true,
        $or: [
          { unitNumber: { $regex: searchTrim, $options: 'i' } },
          { unitId: { $regex: searchTrim, $options: 'i' } },
        ],
      });
      const unitMatchSet = new Set(
        matchingLayoutIdsFromUnits.map((id) => id.toString()),
      );

      layoutsForPagination = filteredLayouts.filter((layout) => {
        const lId = layout._id.toString();
        if (
          searchRegex.test(layout.layoutName || '') ||
          searchRegex.test(layout.building?.buildingName || '') ||
          searchRegex.test(layout.propertyType?.name || '') ||
          searchRegex.test(String(layout.bedrooms ?? ''))
        ) {
          return true;
        }
        if (unitMatchSet.has(lId)) return true;
        const agents = agentByLayout[lId] || [];
        return agents.some(
          (a) =>
            searchRegex.test(a.fullName || '') ||
            searchRegex.test(a.agentType || '') ||
            searchRegex.test(a.specialization?.title || '') ||
            searchRegex.test(a.specialization?.description || ''),
        );
      });
    }

    const projectStats = await ProjectUnit.aggregate([
      {
        $match: {
          _id: { $in: agencyUnitIds },
          project: new Types.ObjectId(projectId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sold: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
          },
          remaining: {
            $sum: { $cond: [{ $ne: ['$status', 'closed'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats =
      projectStats[0] || {
        total: 0,
        sold: 0,
        remaining: 0,
      };

    const unassignedCount = allLayouts.filter((l) => {
      const lId = l._id.toString();
      return (unitCountMap[lId] || 0) > 0 && !assignedLayoutIds.has(lId);
    }).length;

    const assignedCount = allLayouts.filter((l) => {
      const lId = l._id.toString();
      return (unitCountMap[lId] || 0) > 0 && assignedLayoutIds.has(lId);
    }).length;

    const propertyTypeMap = {};
    allLayouts.forEach((l) => {
      const ptId = l.propertyType?._id?.toString();
      const ptName = l.propertyType?.name;
      const lId = l._id.toString();
      const hasUnits = (unitCountMap[lId] || 0) > 0;
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

    const totalLayouts = layoutsForPagination.length;
    const totalPages = totalLayouts ? Math.ceil(totalLayouts / limitNum) : 0;
    const paginatedLayouts = layoutsForPagination.slice(skip, skip + limitNum);

    const mappedLayouts = paginatedLayouts.map((layout) => {
      const lId = layout._id.toString();

      const base = {
        layoutId: layout._id,
        buildingName: layout.building?.buildingName || null,
        propertyType: layout.propertyType?.name || null,
        layoutName: layout.layoutName,
        beds: layout.bedrooms,
        floorPlans: Array.isArray(layout.floorPlans) && layout.floorPlans.length ? layout.floorPlans[0] : null,
        totalAvailableUnits: unitCountMap[lId] || 0,
      };

      if (tab === 'unassigned') {
        return base;
      }

      const agentsForLayout = agentByLayout[lId] || [];
      return {
        ...base,
        assignedAgents: agentsForLayout,
        unitsAssigned: agentsForLayout.reduce(
          (sum, a) => sum + (a.unitsAssigned || 0),
          0,
        ),
      };
    });

    return success(
      res,
      'Units fetched successfully',
      {
        totalUnits: stats.total,
        soldUnits: stats.sold,
        remainingUnits: stats.remaining,
        propertyTypeFilters: Object.values(propertyTypeMap),
        tabs: {
          unassigned: unassignedCount,
          assigned: assignedCount,
        },
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
    logger.error('Get agency project units failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to fetch units', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/projects/assign-agents:
 *   post:
 *     summary: Assign an agent to project units
 *     description: Create a new agent allocation for specific units in an agency-allocated project.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - assignments
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Project ObjectId
 *               assignments:
 *                 type: array
 *                 description: >
 *                   List of agent assignments. For single-assign, send one item.
 *                 items:
 *                   type: object
 *                   required:
 *                     - agentId
 *                     - unitIds
 *                   properties:
 *                     agentId:
 *                       type: string
 *                       description: Agent ObjectId (must belong to the authenticated agency)
 *                     unitIds:
 *                       type: array
 *                       description: List of unit ObjectIds to assign to this agent (must be within the agency allocation)
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Agent assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized for this project
 *       404:
 *         description: Project or agent not found
 */
/** POST /api/agency/projects/assign-agents — create new agent allocation */
const assignAgents = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agencyId = req.user?.id || req.user?._id;

    const agency = await Agencies.findById(agencyId).session(session);
    if (!agency) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { projectId, assignments } = req.body || {};

    if (!projectId || !validateObjectId(projectId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
    }
    if (
      !assignments ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'assignments array is required',
        'VALIDATION_ERROR',
      );
    }

    // Validate each assignment payload
    // eslint-disable-next-line no-restricted-syntax
    for (const assignment of assignments) {
      const { agentId, unitIds } = assignment || {};

      if (!agentId || !validateObjectId(agentId)) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'Valid agentId required in each assignment',
          'VALIDATION_ERROR',
        );
      }

      if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'unitIds required in each assignment',
          'VALIDATION_ERROR',
        );
      }

      if (!unitIds.every((id) => validateObjectId(id))) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'Invalid unitIds in assignment',
          'VALIDATION_ERROR',
        );
      }
    }

    const agentIdList = assignments.map((a) => a.agentId);
    const uniqueAgentIds = new Set(agentIdList);
    if (uniqueAgentIds.size !== agentIdList.length) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Duplicate agentIds in assignments',
        'VALIDATION_ERROR',
      );
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const assignment of assignments) {
      const unitStrs = assignment.unitIds.map((id) => id.toString());
      if (new Set(unitStrs).size !== unitStrs.length) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'An agent has the same unit listed more than once. Remove the duplicate unit IDs.',
          'VALIDATION_ERROR',
        );
      }
    }

    const allUnitIds = assignments.flatMap((a) => a.unitIds);
    const uniqueUnitIds = new Set(allUnitIds.map((id) => id.toString()));
    if (uniqueUnitIds.size !== allUnitIds.length) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'A unit is listed for more than one agent. Each unit can only go to one agent.',
        'VALIDATION_ERROR',
      );
    }

    const agencyAllocation = await ProjectAgencyAllocation.findOne({
      project: projectId,
      agency: agencyId,
      status: 'active',
    })
      .session(session)
      .lean();

    if (!agencyAllocation) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 403, 'Not authorized for this project', 'FORBIDDEN');
    }

    const agencyUnitSet = new Set(
      (agencyAllocation.units || []).map((u) => u.toString()),
    );
    const invalidUnits = allUnitIds.filter(
      (id) => !agencyUnitSet.has(id.toString()),
    );
    if (invalidUnits.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Some units are not allocated to your agency',
        'VALIDATION_ERROR',
      );
    }

    //closed units finds
    const closedUnitsInRequest = await findClosedProjectUnits(allUnitIds, session);
    if (closedUnitsInRequest.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return closedUnitsAllocationFailure(res, closedUnitsInRequest, 'assign');
    }
    //closed units finds

    const agents = await Agents.find({
      _id: { $in: [...uniqueAgentIds] },
      agency: agencyId,
      isActive: true,
    })
      .session(session)
      .lean();

    if (agents.length !== uniqueAgentIds.size) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Some agents not found or not in your agency',
        'VALIDATION_ERROR',
      );
    }

    const existingAllocations = await ProjectAgentAllocation.find({
      project: projectId,
      agency: agencyId,
      agent: { $in: [...uniqueAgentIds] },
      status: 'active',
    })
      .session(session)
      .lean();
    const existingAllocationByAgent = new Map(
      existingAllocations.map((a) => [a.agent.toString(), a]),
    );

    const createdAllocations = [];
    let createdCount = 0;
    let updatedCount = 0;

    // Process each assignment
    // eslint-disable-next-line no-restricted-syntax
    for (const assignment of assignments) {
      const { agentId, unitIds } = assignment;
      const existingAllocation = existingAllocationByAgent.get(agentId.toString());
      const prevUnitIds = existingAllocation
        ? (existingAllocation.units || []).map((u) => u.toString())
        : [];
      const mergedUnitIds = existingAllocation
        ? [...new Set([...prevUnitIds, ...unitIds.map((u) => u.toString())])]
        : unitIds.map((u) => u.toString());

      // eslint-disable-next-line no-await-in-loop
      const units = await ProjectUnit.find({
        _id: { $in: mergedUnitIds },
        isActive: true,
      })
        .select('layout')
        .session(session)
        .lean();

      const layoutUnitMap = {};
      units.forEach((unit) => {
        const lId = unit.layout.toString();
        if (!layoutUnitMap[lId]) layoutUnitMap[lId] = [];
        layoutUnitMap[lId].push(unit._id);
      });

      // eslint-disable-next-line no-await-in-loop
      const layoutSummary = await Promise.all(
        Object.entries(layoutUnitMap).map(async ([layoutId, lUnitIds]) => {
          const layout = await ProjectLayout.findById(layoutId)
            .select('layoutName bedrooms')
            .session(session)
            .lean();
          return {
            layout: layoutId,
            layoutName: layout?.layoutName,
            bedrooms: layout?.bedrooms,
            unitsCount: lUnitIds.length,
          };
        }),
      );

      let allocationId;
      let notifyMode = 'assigned';
      let addedUnits = mergedUnitIds.length;
      let removedUnits = 0;

      if (existingAllocation) {
        notifyMode = 'updated';
        const nextUnitSet = new Set(mergedUnitIds);
        const prevUnitSet = new Set(prevUnitIds);
        const addedUnitIds = [...nextUnitSet].filter((id) => !prevUnitSet.has(id));
        addedUnits = addedUnitIds.length;
        removedUnits = 0;

        if (unitIds.length > 0) {
          // eslint-disable-next-line no-await-in-loop
          await ProjectUnit.updateMany(
            { _id: { $in: unitIds } },
            {
              $addToSet: {
                assignedAgents: {
                  agent: agentId,
                  agency: agencyId,
                  assignedByAgency: agencyId,
                  assignedAt: new Date(),
                  isCurrentHandler: false,
                },
              },
            },
            { session },
          );
        }

        // eslint-disable-next-line no-await-in-loop
        const updatedAllocation = await ProjectAgentAllocation.findByIdAndUpdate(
          existingAllocation._id,
          {
            $set: {
              units: mergedUnitIds,
              layoutSummary,
              allocatedAt: new Date(),
            },
          },
          { new: true, session },
        );
        allocationId = updatedAllocation?._id || existingAllocation._id;
        updatedCount += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        const [newAllocation] = await ProjectAgentAllocation.create(
          [
            {
              project: projectId,
              agency: agencyId,
              agent: agentId,
              allocatedBy: agencyId,
              units: unitIds,
              layoutSummary,
              status: 'active',
              allocatedAt: new Date(),
            },
          ],
          { session },
        );

        // eslint-disable-next-line no-await-in-loop
        await ProjectUnit.updateMany(
          { _id: { $in: unitIds } },
          {
            $addToSet: {
              assignedAgents: {
                agent: agentId,
                agency: agencyId,
                assignedByAgency: agencyId,
                assignedAt: new Date(),
                isCurrentHandler: false,
              },
            },
          },
          { session },
        );
        allocationId = newAllocation._id;
        createdCount += 1;
      }

      // Update LeadAssignment per layout
      // eslint-disable-next-line no-restricted-syntax
      for (const [layoutId] of Object.entries(layoutUnitMap)) {
        // eslint-disable-next-line no-await-in-loop
        const config = await LeadAssignment.findOne({
          project: projectId,
          layout: layoutId,
        }).session(session);

        if (!config) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const agencyIndex = config.agencyQueue.findIndex(
          (q) => q.agency.toString() === agencyId.toString(),
        );

        if (agencyIndex === -1) {
          config.agencyQueue.push({
            agency: agencyId,
            agentQueue: [{ agent: agentId, addedAt: new Date() }],
            agentPointer: 0,
            addedAt: new Date(),
          });
        } else {
          const agencyEntry = config.agencyQueue[agencyIndex];
          const agentExists = agencyEntry.agentQueue.some(
            (a) => a.agent.toString() === agentId.toString(),
          );
          if (!agentExists) {
            config.agencyQueue[agencyIndex].agentQueue.push({
              agent: agentId,
              addedAt: new Date(),
            });
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await LeadAssignment.findByIdAndUpdate(
          config._id,
          { $set: { agencyQueue: config.agencyQueue } },
          { session },
        );
      }

      createdAllocations.push({
        allocationId,
        agentId,
        unitsAssigned: mergedUnitIds.length,
        mode: notifyMode,
        addedUnits,
        removedUnits,
        layoutSummary,
      });
    }

    await session.commitTransaction();
    session.endSession();

    const projectForNotification = await Newprojects.findById(projectId)
      .select('projectName images')
      .lean();

    void Promise.all(
      createdAllocations.map(async (item) => {
        const assignedAgent = agents.find((a) => a._id.toString() === item.agentId.toString());
        if (!assignedAgent) return;
        try {
          await notifyAgentProjectAssignment({
            agent: assignedAgent,
            project: projectForNotification,
            mode: item.mode || 'assigned',
            unitsAssigned: item.unitsAssigned,
            addedUnits: item.addedUnits || 0,
            removedUnits: item.removedUnits || 0,
          });
        } catch (notifyErr) {
          logger.error('Failed to notify assigned agent', {
            error: notifyErr.message,
            agentId: item.agentId,
            projectId,
          });
        }
      }),
    );

    const responseStatusCode = createdCount > 0 && updatedCount === 0 ? 201 : 200;

    return success(
      res,
      'Agents assigned successfully',
      {
        projectId,
        createdAllocations: createdCount,
        updatedAllocations: updatedCount,
        totalAgentsAssigned: createdAllocations.length,
        totalUnitsAssigned: allUnitIds.length,
        allocations: createdAllocations,
      },
      responseStatusCode,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Assign agents failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to process agent assignment', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/projects/assign-agents:
 *   put:
 *     summary: Update an existing agent allocation
 *     description: Update the list of units assigned to an agent for a given project allocation.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - allocationId
 *               - unitIds
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Project ObjectId
 *               allocationId:
 *                 type: string
 *                 description: ProjectAgentAllocation ObjectId
 *               unitIds:
 *                 type: array
 *                 description: Updated list of unit ObjectIds assigned to the agent
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Allocation updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized for this project
 *       404:
 *         description: Allocation not found
 */
/** PUT /api/agency/projects/assign-agents — edit existing allocation */
const updateAgentAllocation = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agencyId = req.user?.id || req.user?._id;

    const agency = await Agencies.findById(agencyId).session(session);
    if (!agency) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { projectId, allocationId, unitIds } = req.body || {};

    if (!projectId || !validateObjectId(projectId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
    }
    if (!allocationId || !validateObjectId(allocationId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Valid allocationId is required',
        'VALIDATION_ERROR',
      );
    }
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'unitIds array is required', 'VALIDATION_ERROR');
    }

    const allocation = await ProjectAgentAllocation.findOne({
      _id: allocationId,
      agency: agencyId,
      status: 'active',
    })
      .session(session)
      .lean();

    if (!allocation) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    const agencyAllocation = await ProjectAgencyAllocation.findOne({
      project: projectId,
      agency: agencyId,
      status: 'active',
    })
      .session(session)
      .lean();

    if (!agencyAllocation) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 403, 'Not authorized for this project', 'FORBIDDEN');
    }

    const agencyUnitSet = new Set(
      (agencyAllocation.units || []).map((u) => u.toString()),
    );
    const invalidUnits = unitIds.filter((id) => !agencyUnitSet.has(id));
    if (invalidUnits.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Some units are not allocated to your agency',
        'VALIDATION_ERROR',
      );
    }

    const oldUnitSet = new Set(
      (allocation.units || []).map((u) => u.toString()),
    );
    const newUnitSet = new Set(unitIds.map((u) => u.toString()));

    const addedUnits = unitIds.filter((id) => !oldUnitSet.has(id));
    const removedUnits = (allocation.units || [])
      .map((u) => u.toString())
      .filter((id) => !newUnitSet.has(id));

    //closed units finds
    const [closedRemovedUnits, closedAddedUnits] = await Promise.all([
      findClosedProjectUnits(removedUnits, session),
      findClosedProjectUnits(addedUnits, session),
    ]);

    if (closedRemovedUnits.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return closedUnitsAllocationFailure(res, closedRemovedUnits, 'remove');
    }

    if (closedAddedUnits.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return closedUnitsAllocationFailure(res, closedAddedUnits, 'assign');
    }
    //closed units finds

    const [addedUnitDocs, removedUnitDocs] = await Promise.all([
      addedUnits.length
        ? ProjectUnit.find({ _id: { $in: addedUnits } })
            .select('layout')
            .session(session)
            .lean()
        : [],
      removedUnits.length
        ? ProjectUnit.find({ _id: { $in: removedUnits } })
            .select('layout')
            .session(session)
            .lean()
        : [],
    ]);

    const addedLayoutSet = new Set(
      addedUnitDocs.map((u) => u.layout.toString()),
    );
    const removedLayoutSet = new Set(
      removedUnitDocs.map((u) => u.layout.toString()),
    );

    const currentLayoutSet = new Set(
      (allocation.layoutSummary || []).map((l) => l.layout.toString()),
    );

    const newLayouts = [...addedLayoutSet].filter(
      (lId) => !currentLayoutSet.has(lId),
    );

    const droppedLayouts = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const lId of removedLayoutSet) {
      // eslint-disable-next-line no-await-in-loop
      const remaining = await ProjectUnit.countDocuments({
        _id: { $in: unitIds },
        layout: lId,
        isActive: true,
      }).session(session);
      if (!remaining) {
        droppedLayouts.push(lId);
      }
    }

    if (addedUnits.length) {
      await ProjectUnit.updateMany(
        { _id: { $in: addedUnits } },
        {
          $addToSet: {
            assignedAgents: {
              agent: allocation.agent,
              agency: agencyId,
              assignedByAgency: agencyId,
              assignedAt: new Date(),
              isCurrentHandler: false,
            },
          },
        },
        { session },
      );
    }

    if (removedUnits.length) {
      const pullMatch = { _id: { $in: removedUnits } };
      await ProjectUnit.updateMany(
        pullMatch,
        {
          $pull: {
            assignedAgents: {
              agent: allocation.agent,
              agency: agencyId,
            },
          },
        },
        { session },
      );
      await ProjectUnit.updateMany(
        pullMatch,
        {
          $pull: {
            assignedAgents: {
              agent: allocation.agent,
              assignedByAgency: agencyId,
            },
          },
        },
        { session },
      );
    }

    const allLayoutIds = new Set([
      ...currentLayoutSet,
      ...addedLayoutSet,
    ]);
    droppedLayouts.forEach((lId) => allLayoutIds.delete(lId));

    const newLayoutSummary = await Promise.all(
      [...allLayoutIds].map(async (layoutId) => {
        const layout = await ProjectLayout.findById(layoutId)
          .select('layoutName bedrooms')
          .session(session)
          .lean();
        // eslint-disable-next-line no-await-in-loop
        const unitsInLayout = await ProjectUnit.countDocuments({
          _id: { $in: unitIds },
          layout: layoutId,
          isActive: true,
        }).session(session);
        return {
          layout: layoutId,
          layoutName: layout?.layoutName,
          bedrooms: layout?.bedrooms,
          unitsCount: unitsInLayout,
        };
      }),
    );

    await ProjectAgentAllocation.findByIdAndUpdate(
      allocationId,
      {
        $set: {
          units: unitIds,
          layoutSummary: newLayoutSummary,
          lastModifiedAt: new Date(),
        },
      },
      { session },
    );

    // Update LeadAssignment for new layouts
    // eslint-disable-next-line no-restricted-syntax
    for (const layoutId of newLayouts) {
      // eslint-disable-next-line no-await-in-loop
      const config = await LeadAssignment.findOne({
        project: projectId,
        layout: layoutId,
      }).session(session);

      if (!config) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const agencyIndex = config.agencyQueue.findIndex(
        (q) => q.agency.toString() === agencyId.toString(),
      );

      if (agencyIndex !== -1) {
        const agentExists = config.agencyQueue[agencyIndex].agentQueue.some(
          (a) => a.agent.toString() === allocation.agent.toString(),
        );
        if (!agentExists) {
          config.agencyQueue[agencyIndex].agentQueue.push({
            agent: allocation.agent,
            addedAt: new Date(),
          });
          // eslint-disable-next-line no-await-in-loop
          await LeadAssignment.findByIdAndUpdate(
            config._id,
            { $set: { agencyQueue: config.agencyQueue } },
            { session },
          );
        }
      }
    }

    // Remove agent from dropped layout queues
    // eslint-disable-next-line no-restricted-syntax
    for (const layoutId of droppedLayouts) {
      // eslint-disable-next-line no-await-in-loop
      const config = await LeadAssignment.findOne({
        project: projectId,
        layout: layoutId,
      }).session(session);

      if (!config) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const agencyIndex = config.agencyQueue.findIndex(
        (q) => q.agency.toString() === agencyId.toString(),
      );

      if (agencyIndex !== -1) {
        config.agencyQueue[agencyIndex].agentQueue =
          config.agencyQueue[agencyIndex].agentQueue.filter(
            (a) => a.agent.toString() !== allocation.agent.toString(),
          );

        const queueLen = config.agencyQueue[agencyIndex].agentQueue.length;
        if (!queueLen) {
          config.agencyQueue.splice(agencyIndex, 1);
          if (config.agencyPointer >= config.agencyQueue.length) {
            config.agencyPointer = 0;
          }
        } else if (
          config.agencyQueue[agencyIndex].agentPointer >= queueLen
        ) {
          config.agencyQueue[agencyIndex].agentPointer = 0;
        }

        // eslint-disable-next-line no-await-in-loop
        await LeadAssignment.findByIdAndUpdate(
          config._id,
          {
            $set: {
              agencyQueue: config.agencyQueue,
              agencyPointer: config.agencyPointer,
            },
          },
          { session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    const [projectForNotification, agentForNotification] = await Promise.all([
      Newprojects.findById(projectId).select('projectName images').lean(),
      Agents.findById(allocation.agent)
        .select('fullName email preferences fcmTokens')
        .lean(),
    ]);

    if (agentForNotification) {
      void notifyAgentProjectAssignment({
        agent: agentForNotification,
        project: projectForNotification,
        mode: 'updated',
        unitsAssigned: unitIds.length,
        addedUnits: addedUnits.length,
        removedUnits: removedUnits.length,
      }).catch((notifyErr) => {
        logger.error('Failed to notify updated agent allocation', {
          error: notifyErr.message,
          agentId: allocation.agent,
          projectId,
          allocationId,
        });
      });
    }

    return success(
      res,
      'Allocation updated successfully',
      {
        allocationId,
        projectId,
        unitsAssigned: unitIds.length,
        addedUnits: addedUnits.length,
        removedUnits: removedUnits.length,
      },
      200,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Update agent allocation failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to process agent assignment', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/projects/assign-agents:
 *   delete:
 *     summary: Cancel an agent allocation
 *     description: Soft-cancel an existing agent allocation and remove the agent from affected units and lead queues.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - allocationId
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Project ObjectId
 *               allocationId:
 *                 type: string
 *                 description: ProjectAgentAllocation ObjectId
 *     responses:
 *       200:
 *         description: Allocation cancelled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized for this project
 *       404:
 *         description: Allocation not found
 */
/** DELETE /api/agency/projects/assign-agents — cancel allocation */
const deleteAgentAllocation = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agencyId = req.user?.id || req.user?._id;

    const agency = await Agencies.findById(agencyId).session(session);
    if (!agency) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { projectId, allocationId } = req.body || {};

    if (!projectId || !validateObjectId(projectId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
    }
    if (!allocationId || !validateObjectId(allocationId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(
        res,
        400,
        'Valid allocationId is required',
        'VALIDATION_ERROR',
      );
    }

    const allocation = await ProjectAgentAllocation.findOne({
      _id: allocationId,
      agency: agencyId,
      status: 'active',
    })
      .session(session)
      .lean();

    if (!allocation) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    const allocationLayoutIds = [
      ...new Set(
        (allocation.layoutSummary || []).map((l) => l.layout.toString()),
      ),
    ];

    const cancelPull = { _id: { $in: allocation.units || [] } };
    await ProjectUnit.updateMany(
      cancelPull,
      {
        $pull: {
          assignedAgents: {
            agent: allocation.agent,
            agency: agencyId,
          },
        },
      },
      { session },
    );
    await ProjectUnit.updateMany(
      cancelPull,
      {
        $pull: {
          assignedAgents: {
            agent: allocation.agent,
            assignedByAgency: agencyId,
          },
        },
      },
      { session },
    );

    await ProjectAgentAllocation.findByIdAndUpdate(
      allocationId,
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: agencyId,
        },
      },
      { session },
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const layoutId of allocationLayoutIds) {
      // eslint-disable-next-line no-await-in-loop
      const config = await LeadAssignment.findOne({
        project: projectId,
        layout: layoutId,
      }).session(session);

      if (!config) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const agencyIndex = config.agencyQueue.findIndex(
        (q) => q.agency.toString() === agencyId.toString(),
      );

      if (agencyIndex === -1) {
        // eslint-disable-next-line no-continue
        continue;
      }

      config.agencyQueue[agencyIndex].agentQueue =
        config.agencyQueue[agencyIndex].agentQueue.filter(
          (a) => a.agent.toString() !== allocation.agent.toString(),
        );

      const queueLen = config.agencyQueue[agencyIndex].agentQueue.length;
      if (!queueLen) {
        config.agencyQueue.splice(agencyIndex, 1);
        if (config.agencyPointer >= config.agencyQueue.length) {
          config.agencyPointer = 0;
        }
      } else if (
        config.agencyQueue[agencyIndex].agentPointer >= queueLen
      ) {
        config.agencyQueue[agencyIndex].agentPointer = 0;
      }

      // eslint-disable-next-line no-await-in-loop
      await LeadAssignment.findByIdAndUpdate(
        config._id,
        {
          $set: {
            agencyQueue: config.agencyQueue,
            agencyPointer: config.agencyPointer,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    const [projectForNotification, agentForNotification] = await Promise.all([
      Newprojects.findById(projectId).select('projectName images').lean(),
      Agents.findById(allocation.agent)
        .select('fullName email preferences fcmTokens')
        .lean(),
    ]);

    if (agentForNotification) {
      void notifyAgentProjectAssignment({
        agent: agentForNotification,
        project: projectForNotification,
        mode: 'cancelled',
        unitsReleased: (allocation.units || []).length,
      }).catch((notifyErr) => {
        logger.error('Failed to notify cancelled agent allocation', {
          error: notifyErr.message,
          agentId: allocation.agent,
          projectId,
          allocationId,
        });
      });
    }

    return success(
      res,
      'Allocation cancelled successfully',
      {
        allocationId,
        projectId,
        agentId: allocation.agent,
        unitsReleased: (allocation.units || []).length,
      },
      200,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Delete agent allocation failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to process agent assignment', 'SERVER_ERROR');
  }
});

module.exports = {
  getAgencyProjects,
  getAgencyProjectUnits,
  assignAgents,
  updateAgentAllocation,
  deleteAgentAllocation,
};
