const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Inquirys = require('../../models/inquirysModel');
const ProjectUnit = require('../../models/projectUnitModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const ProjectBuilding = require('../../models/projectBuildingModel');
const PropertyType = require('../../models/propertyTypeModel');
const Newprojects = require('../../models/newprojectsModel');
const Agencies = require('../../models/agenciesModel');
const Notification = require('../../models/notificationModel');
const uploadService = require('../../services/uploadService');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const VALID_TABS = ['customer-requests', 'closed-deal'];
const VALID_SUBTABS = ['new', 'attended', 'closed'];
const VALID_PROJECT_LEAD_STATUSES = ['available', 'reserved', 'in-progress', 'follow-up', 'pre-close'];
const VALID_PROJECT_STATUS_ACTIONS = ['attend', 'set-project-status', 'close-inquiry'];
const STATUS_EXPIRY_DAYS = {
  reserved: 7,
  'in-progress': 10,
  'follow-up': 20,
  'pre-close': null,
  available: null,
};
const STATUSES_REQUIRING_UNIT = ['reserved', 'in-progress', 'follow-up', 'pre-close'];

const toBooleanEnv = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const isExpertsEmailNotificationEnabled = () =>
  toBooleanEnv(process.env.EXPERTS_MAIL_NOTIFICATION);

const isExpertsPushNotificationEnabled = () =>
  toBooleanEnv(process.env.EXPERTS_PUSH_NOTIFICATION);

const {
  pickPrimaryImageRaw,
  ensureNotificationImage,
} = require('../../utils/notificationImage');

const pickPrimaryImage = (images = []) => {
  const raw = pickPrimaryImageRaw(images);
  return ensureNotificationImage(raw, 'project');
};

const notifyAgencyOnProjectDealSubmitted = async ({
  agencyId,
  projectId,
  inquiryId,
  dealAmount,
  currency,
  agentName,
}) => {
  if (!agencyId || !Types.ObjectId.isValid(agencyId)) return;

  const [agency, project] = await Promise.all([
    Agencies.findById(agencyId).select('agencyName email preferences fcmTokens').lean(),
    projectId ? Newprojects.findById(projectId).select('projectName images').lean() : null,
  ]);
  if (!agency) return;

  const notificationSettings = agency?.preferences?.notificationSettings || {};
  const shouldEmail =
    isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
  const shouldPush =
    isExpertsPushNotificationEnabled() && notificationSettings.push !== false;

  const projectName = project?.projectName || 'Project';
  const projectImage = pickPrimaryImage(project?.images);
  const amount = Number(dealAmount || 0);
  const normalizedCurrency = currency || 'AED';

  const title = 'Project Deal Approval Pending';
  const body = `${agentName || 'An agent'} submitted a project deal for ${projectName}. It is waiting for your approval.`;

  const notification = await Notification.create({
    recipient: { recipientType: 'agency', recipientId: agency._id },
    title,
    message: body,
    notificationType: 'alert',
    priority: 'high',
    relatedItem: { itemType: 'project', itemId: projectId || null },
    channels: { email: shouldEmail, sms: false, push: shouldPush, inApp: true },
    actionText: 'Review',
    metadata: {
      inquiryId: inquiryId ? String(inquiryId) : null,
      projectId: projectId ? String(projectId) : null,
      projectName,
      image: projectImage,
      dealAmount: amount,
      currency: normalizedCurrency,
      agentName: agentName || null,
      approvalStatus: 'waiting',
    },
  });

  if (shouldEmail && agency?.email) {
    const subject = `${title}: ${projectName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Project Deal Approval Pending</h2>
        <p>Hi ${agency.agencyName || 'Agency'},</p>
        <p>${body}</p>
        <p><strong>Deal amount:</strong> ${amount} ${normalizedCurrency}</p>
      </div>
    `;
    await sendEmail(agency.email, subject, html);
    await Notification.findByIdAndUpdate(notification._id, {
      $set: {
        'deliveryStatus.email.sent': true,
        'deliveryStatus.email.sentAt': new Date(),
      },
    });
  }

  if (shouldPush) {
    const activeTokens = (agency?.fcmTokens || [])
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
            type: 'project-deal-submitted',
            agencyId: String(agency._id),
            projectId: projectId ? String(projectId) : '',
            inquiryId: inquiryId ? String(inquiryId) : '',
            image: projectImage || '',
            approvalStatus: 'waiting',
          },
        });
        anyPushSent = true;
      } catch (pushErr) {
        logger.error('Agency push failed for project deal submit', {
          error: pushErr.message,
          agencyId: agency._id,
          inquiryId,
        });
      }
    }

    if (anyPushSent) {
      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.push.sent': true,
          'deliveryStatus.push.sentAt': new Date(),
        },
      });
    }
  }
};

/**
 * @swagger
 * /agents/project-leads:
 *   get:
 *     summary: List project leads for the authenticated agent (project-only inquiries)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [customer-requests, closed-deal]
 *           default: customer-requests
 *         description: Active tab filter
 *       - in: query
 *         name: subTab
 *         schema:
 *           type: string
 *           enum: [new, attended, closed]
 *           default: new
 *         description: Used only when tab=customer-requests
 *       - in: query
 *         name: projectLeadStatus
 *         schema:
 *           type: string
 *           enum: [available, reserved, in-progress, follow-up, pre-close]
 *         description: Optional filter within attended subTab
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Optional Project ObjectId filter
 *       - in: query
 *         name: layoutId
 *         schema:
 *           type: string
 *         description: Optional Layout ObjectId filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search customer name/email/phone + projectTitle
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by inquiredAt (>= startDate)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by inquiredAt (<= endDate)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Page size (max 50)
 *       - in: query
 *         name: counts
 *         schema:
 *           type: boolean
 *         description: If true, include tab counts in response
 *     responses:
 *       200:
 *         description: Project leads retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const listProjectLeads = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    tab = 'customer-requests',
    subTab = 'new',
    projectLeadStatus,
    projectId,
    layoutId,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    counts: countsParam = false,
  } = req.query;

  const includeCounts = countsParam === true || countsParam === 'true';
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    agent: new Types.ObjectId(agentId),
    inquiryCategory: 'project',
  };

  if (projectId && Types.ObjectId.isValid(projectId)) {
    filter.project = new Types.ObjectId(projectId);
  }
  if (layoutId && Types.ObjectId.isValid(layoutId)) {
    filter.layout = new Types.ObjectId(layoutId);
  }

  const activeTab = VALID_TABS.includes(tab) ? tab : 'customer-requests';
  const activeSubTab = VALID_SUBTABS.includes(subTab) ? subTab : 'new';

  if (activeTab === 'customer-requests') {
    if (activeSubTab === 'new') {
      filter.status = 'new';
    }

    if (activeSubTab === 'attended') {
      filter.status = 'attended';
      if (projectLeadStatus && VALID_PROJECT_LEAD_STATUSES.includes(projectLeadStatus)) {
        filter.projectLeadStatus = projectLeadStatus;
      }
    }

    if (activeSubTab === 'closed') {
      filter.status = 'closed';
      filter['dealClosed.isClosed'] = { $ne: true };
    }
  }

  if (activeTab === 'closed-deal') {
    filter.status = 'closed';
    filter['dealClosed.isClosed'] = true;
  }

  if (search && String(search).trim()) {
    const term = String(search)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(term, 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'customer.name': regex },
        { 'customer.email': regex },
        { 'customer.phoneNumber': regex },
        { projectTitle: regex },
      ],
    });
  }

  if (startDate || endDate) {
    filter.inquiredAt = {};

    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) {
        filter.inquiredAt.$gte = d;
      }
    }

    if (endDate) {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) {
        filter.inquiredAt.$lte = d;
      }
    }

    if (Object.keys(filter.inquiredAt).length === 0) {
      delete filter.inquiredAt;
    }
  }

  try {
    const [inquiries, total, countAgg] = await Promise.all([
      Inquirys.find(filter)
        .populate('project', 'projectName slug images location')
        .populate('layout', 'layoutName bedrooms propertyType')
        .populate('unit', 'unitId unitNumber status')
        .populate('agent', 'fullName email phoneNumber profilePicture agentType')
        .populate('customer.userId', 'profilePicture')
        .sort({ inquiredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inquirys.countDocuments(filter),
      includeCounts
        ? Inquirys.aggregate([
            {
              $match: {
                agent: new Types.ObjectId(agentId),
                inquiryCategory: 'project',
              },
            },
            {
              $facet: {
                new: [{ $match: { status: 'new' } }, { $count: 'count' }],
                attended: [{ $match: { status: 'attended' } }, { $count: 'count' }],
                closed: [
                  {
                    $match: {
                      status: 'closed',
                      'dealClosed.isClosed': { $ne: true },
                    },
                  },
                  { $count: 'count' },
                ],
                closedDeal: [
                  {
                    $match: {
                      status: 'closed',
                      'dealClosed.isClosed': true,
                    },
                  },
                  { $count: 'count' },
                ],
              },
            },
          ])
        : Promise.resolve(undefined),
    ]);

    const formatted = (inquiries || []).map((inv) => {
      const layoutType = inv.layout
        ? {
            id: inv.layout._id,
            layoutName: inv.layout.layoutName,
            bedrooms: inv.layout.bedrooms,
            propertyType: inv.layout.propertyType,
          }
        : null;

      const unit = inv.unit
        ? {
            id: inv.unit._id,
            unitId: inv.unit.unitId,
            unitNumber: inv.unit.unitNumber,
            status: inv.unit.status,
          }
        : null;

      const customer = {
        id: inv.customer?.userId?._id || inv.customer?.userId || null,
        name: inv.customer?.name,
        phoneNumber: inv.customer?.phoneNumber,
        profilePicture: inv.customer?.userId?.profilePicture || null,
      };

      const agent = inv.agent
        ? {
            id: inv.agent._id,
            fullName: inv.agent.fullName,
            email: inv.agent.email,
            phoneNumber: inv.agent.phoneNumber,
            profilePicture: inv.agent.profilePicture || null,
            agentType: inv.agent.agentType,
          }
        : null;

      const project = inv.project
        ? {
            id: inv.project._id,
            title: inv.projectTitle || inv.project.projectName,
            slug: inv.project.slug,
            image: inv.project.images?.[0]?.url || null,
            location: inv.project.location,
            receivedOn: inv.inquiredAt,
          }
        : null;

      const dealClosed =
        inv.dealClosed?.isClosed === true
          ? {
              dealType: inv.dealClosed.dealType,
              dealAmount: inv.dealClosed.dealAmount,
              // currency removed — lives in DealClosure now
              closedDate: inv.dealClosed.closedDate,
            }
          : null;

      const dealApproval = inv.dealApproval
        ? {
            isWaiting: inv.dealApproval.isWaiting,
            submittedAt: inv.dealApproval.submittedAt || null,
            declinedAt: inv.dealApproval.declinedAt || null,
            declinedReason: inv.dealApproval.declinedReason || null,
          }
        : null;

      return {
        id: inv._id,
        inquiryType: inv.inquiryType,
        status: inv.status,
        projectLeadStatus: inv.projectLeadStatus,
        statusExpiresAt: inv.statusExpiresAt || null,
        inquiredAt: inv.inquiredAt,
        attendedAt: inv.attendedAt || null,
        closedAt: inv.closedAt || null,
        project,
        layoutType,
        unit,
        customer,
        agent,
        dealClosed,
        dealApproval,
      };
    });

    const counts = countAgg?.[0]
      ? {
          new: countAgg[0].new?.[0]?.count ?? 0,
          attended: countAgg[0].attended?.[0]?.count ?? 0,
          closed: countAgg[0].closed?.[0]?.count ?? 0,
          closedDeal: countAgg[0].closedDeal?.[0]?.count ?? 0,
        }
      : undefined;

    const data = {
      inquiries: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
    if (counts) {
      data.counts = counts;
    }

    return success(res, 'Project leads retrieved successfully', data);
  } catch (err) {
    logger.error('Agent list project leads error', { error: err.message, agentId });
    return failure(res, 500, 'Failed to fetch project leads', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}/status:
 *   post:
 *     summary: Update project lead status for the authenticated agent
 *     description: Allows the agent to attend, close, or update the project lead status (including assigning units) on their own project leads.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [attend, set-project-status, close-inquiry]
 *               projectLeadStatus:
 *                 type: string
 *                 enum: [available, reserved, in-progress, follow-up, pre-close]
 *               unitId:
 *                 type: string
 *               notes:
 *                 type: string
 *             required:
 *               - type
 *     responses:
 *       200:
 *         description: Project lead status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const updateProjectLeadStatus = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { type, projectLeadStatus, unitId, notes } = req.body || {};

  if (!type || !VALID_PROJECT_STATUS_ACTIONS.includes(type)) {
    return failure(
      res,
      400,
      'type is required and must be attend, set-project-status or close-inquiry',
      'VALIDATION_ERROR',
    );
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const agencyId = inquiry.agency;
    const now = new Date();

    if (type === 'attend') {
      if (inquiry.status !== 'new') {
        return failure(res, 400, 'Inquiry is already attended or closed', 'VALIDATION_ERROR');
      }

      inquiry.status = 'attended';
      inquiry.attendedAt = now;
      inquiry.statusHistory.push({
        status: 'attended',
        changedAt: now,
        notes: notes || undefined,
      });

      await inquiry.save();

      return success(res, 'Inquiry marked as attended', {
        inquiry: {
          id: inquiry._id,
          status: inquiry.status,
          projectLeadStatus: inquiry.projectLeadStatus,
          attendedAt: inquiry.attendedAt,
          panelState: 'set-status',
        },
      });
    }

    if (type === 'close-inquiry') {
      if (inquiry.status === 'closed') {
        return failure(res, 400, 'Inquiry is already closed', 'VALIDATION_ERROR');
      }

      if (inquiry.dealApproval?.isWaiting === true) {
        return failure(
          res,
          400,
          'Cannot close inquiry while deal approval is pending',
          'VALIDATION_ERROR',
        );
      }

      if (inquiry.unit) {
        const unit = await ProjectUnit.findById(inquiry.unit);

        if (unit && unit.statusUpdatedByAgency?.toString() === agencyId?.toString()) {
          unit.status = 'available';
          unit.statusExpiresAt = null;
          unit.statusUpdatedAt = now;
          unit.statusUpdatedBy = null;
          unit.statusUpdatedByAgency = null;
          unit.statusNote = null;

          unit.statusHistory.push({
            status: 'available',
            changedAt: now,
            agency: agencyId,
            note: 'Released — inquiry closed by agent',
          });

          await unit.save();
        }
      }

      inquiry.status = 'closed';
      inquiry.closedAt = now;

      inquiry.statusHistory.push({
        status: 'closed',
        changedAt: now,
        notes: notes || undefined,
      });

      await inquiry.save();

      return success(res, 'Inquiry closed successfully', {
        inquiry: {
          id: inquiry._id,
          status: inquiry.status,
          projectLeadStatus: inquiry.projectLeadStatus,
          closedAt: inquiry.closedAt,
          panelState: 'inquiry-closed',
        },
      });
    }

    if (type === 'set-project-status') {
      if (!projectLeadStatus || !VALID_PROJECT_LEAD_STATUSES.includes(projectLeadStatus)) {
        return failure(
          res,
          400,
          'projectLeadStatus is required and must be one of: available, reserved, in-progress, follow-up, pre-close',
          'VALIDATION_ERROR',
        );
      }

      if (inquiry.status === 'closed') {
        return failure(
          res,
          400,
          'Cannot update status of a closed inquiry',
          'VALIDATION_ERROR',
        );
      }

      if (inquiry.dealApproval?.isWaiting === true) {
        return failure(
          res,
          400,
          'Cannot change status while deal approval is pending',
          'VALIDATION_ERROR',
        );
      }

      if (STATUSES_REQUIRING_UNIT.includes(projectLeadStatus)) {
        if (!unitId || !Types.ObjectId.isValid(unitId)) {
          return failure(res, 400, 'unitId is required for this status', 'VALIDATION_ERROR');
        }
      }

      if (unitId) {
        const agentAllocation = await ProjectAgentAllocation.findOne({
          project: inquiry.project,
          agency: agencyId,
          agent: agentId,
          status: 'active',
          units: { $in: [new Types.ObjectId(unitId)] },
        }).lean();

        if (!agentAllocation) {
          return failure(
            res,
            400,
            'Unit is not allocated to this agent',
            'VALIDATION_ERROR',
          );
        }
      }

      if (projectLeadStatus === 'available') {
        inquiry.unit = null;
      } else if (STATUSES_REQUIRING_UNIT.includes(projectLeadStatus)) {
        inquiry.status = 'attended';
        inquiry.attendedAt = inquiry.attendedAt || now;
      }

      if (inquiry.unit && unitId && inquiry.unit.toString() !== unitId.toString()) {
        const prevUnit = await ProjectUnit.findById(inquiry.unit);

        if (prevUnit && prevUnit.statusUpdatedByAgency?.toString() === agencyId?.toString()) {
          prevUnit.status = 'available';
          prevUnit.statusExpiresAt = null;
          prevUnit.statusUpdatedAt = now;
          prevUnit.statusUpdatedBy = null;
          prevUnit.statusUpdatedByAgency = null;
          prevUnit.statusNote = null;

          prevUnit.statusHistory.push({
            status: 'available',
            changedAt: now,
            agency: agencyId,
            note: 'Released — unit changed by agent',
          });

          await prevUnit.save();
        }
      }

      let updatedUnit = null;
      if (unitId) {
        const unit = await ProjectUnit.findById(unitId);

        if (!unit) {
          return failure(res, 404, 'Unit not found', 'NOT_FOUND');
        }

        const isCurrentlyAssignedUnit =
          inquiry.unit && inquiry.unit.toString() === unit._id.toString();
        const isAvailableUnit = unit.status === 'available';
        if (!isCurrentlyAssignedUnit && !isAvailableUnit) {
          return failure(
            res,
            400,
            'Unit is not selectable. Choose an available unit or keep the assigned unit',
            'VALIDATION_ERROR',
          );
        }

        if (
          ['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(unit.status) &&
          unit.statusUpdatedByAgency?.toString() !== agencyId?.toString()
        ) {
          return failure(
            res,
            400,
            `Unit is currently ${unit.status} by another agency`,
            'VALIDATION_ERROR',
          );
        }

        const expiryDays = STATUS_EXPIRY_DAYS[projectLeadStatus];
        const statusExpiresAt = expiryDays
          ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)
          : null;

        unit.status = projectLeadStatus;
        unit.statusExpiresAt = statusExpiresAt;
        unit.statusUpdatedAt = now;
        unit.statusUpdatedBy = agentId;
        unit.statusUpdatedByAgency = agencyId;

        if (projectLeadStatus === 'in-progress' && notes) {
          unit.statusNote = notes;
          unit.statusNoteVisibleTo = {
            agent: agentId,
            agency: agencyId,
          };
        }

        unit.statusHistory.push({
          status: projectLeadStatus,
          changedAt: now,
          changedBy: agentId,
          agency: agencyId,
          expiresAt: statusExpiresAt,
          note: notes || undefined,
        });

        await unit.save();

        inquiry.unit = unitId;
        updatedUnit = unit;
      }

      const expiryDays = STATUS_EXPIRY_DAYS[projectLeadStatus];
      inquiry.statusExpiresAt = expiryDays
        ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)
        : null;

      inquiry.projectLeadStatus = projectLeadStatus;
      inquiry.statusHistory.push({
        status: projectLeadStatus,
        changedAt: now,
        notes: notes || undefined,
      });

      await inquiry.save();

      const helperMap = {
        reserved: 'This Reserved status will be kept for 7 days',
        'in-progress': 'This In-Progress status will be kept for 10 days',
        'follow-up': 'This Follow up status will be kept for 20 days',
        'pre-close': null,
        available: null,
      };

      let panelState = 'set-status-and-unit';
      if (inquiry.status === 'new') {
        panelState = 'set-status';
      }

      return success(res, 'Project lead status updated successfully', {
        inquiry: {
          id: inquiry._id,
          status: inquiry.status,
          projectLeadStatus: inquiry.projectLeadStatus,
          statusExpiresAt: inquiry.statusExpiresAt || null,
          statusHelperText: helperMap[projectLeadStatus] || null,
          attendedAt: inquiry.attendedAt || null,
          panelState,
          unit: updatedUnit
            ? {
                id: updatedUnit._id,
                unitId: updatedUnit.unitId,
              }
            : null,
        },
      });
    }

    return failure(res, 400, 'Invalid type', 'VALIDATION_ERROR');
  } catch (err) {
    logger.error('Agent update project lead status error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to update project lead status', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}:
 *   get:
 *     summary: Get detailed project lead for the authenticated agent
 *     description: Returns full project lead details, including project, layout, units grid, and status info. Agent can only see their own leads.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     responses:
 *       200:
 *         description: Project lead retrieved successfully
 *       400:
 *         description: Invalid inquiry ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const getProjectLeadById = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    })
      .populate(
        'project',
        `projectName slug description aboutProject
       location images masterPlan brochure
       virtualTour360 videoTour amenities
       paymentPlans launchPrice governmentFees
       completionStatus progressStatus
       authorizedAgencies faqs
       totalUnits availableUnits soldUnits reservedUnits`,
      )
      .populate('unit', 'unitId unitNumber floor status')
      .populate(
        'layout',
        `layoutName bedrooms bathrooms
       areaSqft areaSqm startingPrice
       floorPlans totalUnits availableUnits
       reservedUnits soldUnits building propertyType`,
      )
      .populate('agency', 'agencyName profilePicture')
      .populate('customer.userId', 'profilePicture')
      .populate(
        'dealClosed.dealClosureRef',
        `dealType dealAmount currency commission
       closedDate notes documents approvalFlow`,
      )
      .lean();

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const agencyId = inquiry.agency?._id || inquiry.agency || null;

    if (inquiry.project) {
      // eslint-disable-next-line global-require
      await Newprojects.populate(inquiry.project, [
        { path: 'authorizedAgencies', select: 'agencyName profilePicture' },
        { path: 'amenities', select: 'name slug icon' },
      ]);
    }

    let buildingName = null;
    if (inquiry.layout?.building) {
      const building = await ProjectBuilding.findById(inquiry.layout.building).select('buildingName').lean();
      buildingName = building?.buildingName || null;
    }

    let propertyTypeName = null;
    if (inquiry.layout?.propertyType) {
      const pt = await PropertyType.findById(inquiry.layout.propertyType).select('name slug').lean();
      propertyTypeName = pt?.name || null;
    }

    let units = [];
    let layoutUnitsAvailable = 0;
    let layoutUnitsAssigned = 0;
    if (inquiry.layout?._id && inquiry.project?._id && agencyId) {
      const agentAllocation = await ProjectAgentAllocation.findOne({
        project: inquiry.project._id,
        agency: agencyId,
        agent: agentId,
        status: 'active',
      })
        .select('units')
        .lean();

      const agentUnitIds = agentAllocation?.units || [];

      if (agentUnitIds.length > 0) {
        const rawUnits = await ProjectUnit.find({
          _id: { $in: agentUnitIds },
          layout: inquiry.layout._id,
          isActive: true,
        })
          .select('unitId unitNumber floor status statusUpdatedByAgency saleInfo')
          .sort({ unitNumber: 1 })
          .lean();

        layoutUnitsAvailable = rawUnits.filter((u) => u.status === 'available').length;
        layoutUnitsAssigned = rawUnits.filter(
          (u) => u.status !== 'available' && u.status !== 'closed',
        ).length;

        units = rawUnits.map((u) => {
          let displayState;

          if (u.status === 'closed') {
            const closedByAgency = u.saleInfo?.closedByAgency?.toString();
            if (closedByAgency === agencyId.toString()) {
              displayState = 'sold-by-your-agent';
            } else {
              displayState = 'sold-by-other';
            }
          } else if (['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(u.status)) {
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
      }
    }

    let panelState = 'set-status';
    if (inquiry.dealApproval?.isWaiting === true) {
      panelState = 'waiting-approval';
    } else if (inquiry.status === 'closed' && inquiry.dealClosed?.isClosed === true) {
      panelState = 'deal-closed';
    } else if (inquiry.status === 'closed') {
      panelState = 'inquiry-closed';
    } else if (inquiry.status === 'new') {
      panelState = 'set-status';
    } else if (inquiry.status === 'attended') {
      panelState = 'set-status-and-unit';
    } else {
      panelState = 'set-status';
    }

    const helperMap = {
      reserved: 'This Reserved status will be kept for 7 days',
      'in-progress': 'This In-Progress status will be kept for 10 days',
      'follow-up': 'This Follow up status will be kept for 20 days',
      'pre-close': null,
      available: null,
    };
    const statusHelperText = helperMap[inquiry.projectLeadStatus] ?? null;

    let statusBadge = 'new-inquiry';
    if (inquiry.status === 'closed' && inquiry.dealClosed?.isClosed === true) {
      statusBadge = 'deal-closed';
    } else if (inquiry.status === 'closed') {
      statusBadge = 'inquiry-closed';
    } else if (inquiry.projectLeadStatus === 'pre-close' && !inquiry.dealApproval?.isWaiting) {
      statusBadge = 'pre-close';
    } else if (inquiry.projectLeadStatus === 'pre-close' && inquiry.dealApproval?.isWaiting === true) {
      statusBadge = 'waiting-approval';
    } else if (inquiry.status === 'attended') {
      statusBadge = 'attended';
    } else {
      statusBadge = 'new-inquiry';
    }

    const inquiryPayload = {
      id: inquiry._id,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message || null,
      status: inquiry.status,
      projectLeadStatus: inquiry.projectLeadStatus,
      statusExpiresAt: inquiry.statusExpiresAt || null,
      statusHelperText,
      statusBadge,
      panelState,
      inquiredAt: inquiry.inquiredAt,
      attendedAt: inquiry.attendedAt || null,
      closedAt: inquiry.closedAt || null,
      source: inquiry.source || null,
      notes: inquiry.notes || [],
      statusHistory: inquiry.statusHistory || [],
      projectTitle: inquiry.projectTitle || null,
      dealClosed: inquiry.dealClosed?.isClosed
        ? {
            isClosed: true,
            dealType: inquiry.dealClosed.dealType,
            dealAmount: inquiry.dealClosed.dealAmount,
            closedDate: inquiry.dealClosed.closedDate,
            dealClosureRef: inquiry.dealClosed.dealClosureRef
              ? {
                  id: inquiry.dealClosed.dealClosureRef._id,
                  currency: inquiry.dealClosed.dealClosureRef.currency,
                  commission:
                    inquiry.dealClosed.dealClosureRef.commission || null,
                  notes: inquiry.dealClosed.dealClosureRef.notes || null,
                  documents: inquiry.dealClosed.dealClosureRef.documents || [],
                  approvalFlow:
                    inquiry.dealClosed.dealClosureRef.approvalFlow || null,
                }
              : null,
          }
        : null,
      dealApproval: inquiry.dealApproval
        ? {
            isWaiting: inquiry.dealApproval.isWaiting,
            dealAmount: inquiry.dealApproval.dealAmount || null,
            currency: inquiry.dealApproval.currency || null,
            document: inquiry.dealApproval.document
              ? {
                  url: inquiry.dealApproval.document.url,
                  filename: inquiry.dealApproval.document.filename,
                  uploadedAt: inquiry.dealApproval.document.uploadedAt,
                }
              : null,
            submittedAt: inquiry.dealApproval.submittedAt || null,
            approvedAt: inquiry.dealApproval.approvedAt || null,
            declinedAt: inquiry.dealApproval.declinedAt || null,
            declinedReason: inquiry.dealApproval.declinedReason || null,
          }
        : null,
    };

    const sourceRaw = String(inquiry.source || inquiry.inquiryType || '').trim().toLowerCase();
    const leadSource =
      sourceRaw === 'email' || sourceRaw === 'mail'
        ? 'Mail'
        : sourceRaw === 'whatsapp'
          ? 'Whatsapp'
          : sourceRaw === 'call'
            ? 'Call'
            : null;

    const customer = {
      name: inquiry.customer?.name,
      email: inquiry.customer?.email,
      phoneNumber: inquiry.customer?.phoneNumber,
      userId: inquiry.customer?.userId || null,
      profilePicture:
        inquiry.customer?.userId &&
        typeof inquiry.customer.userId === 'object'
          ? inquiry.customer.userId.profilePicture || null
          : null,
      inquiredAt: inquiry.inquiredAt,
      unitNumber: inquiry.unit?.unitNumber || null,
      dealAmount: inquiry.dealApproval?.dealAmount || inquiry.dealClosed?.dealAmount || null,
      preClosedDate: inquiry.dealApproval?.submittedAt || null,
      closedDate: inquiry.closedAt || null,
      leadSource,
    };

    const agency =
      inquiry.agency && typeof inquiry.agency === 'object'
        ? {
            id: inquiry.agency._id,
            agencyName: inquiry.agency.agencyName,
            logo: inquiry.agency.profilePicture || null,
          }
        : null;

    const project = inquiry.project
      ? {
          id: inquiry.project._id,
          projectName: inquiry.project.projectName,
          slug: inquiry.project.slug,
          description: inquiry.project.description || null,
          aboutProject: inquiry.project.aboutProject || null,
          location: {
            address: inquiry.project.location?.address || null,
            city: inquiry.project.location?.city || null,
            zone: inquiry.project.location?.zone || null,
            coordinates: inquiry.project.location?.coordinates || null,
          },
          completionStatus: inquiry.project.completionStatus || null,
          progressStatus: inquiry.project.progressStatus || null,
          governmentFees: inquiry.project.governmentFees || null,
          launchPrice: inquiry.project.launchPrice
            ? {
                startingFrom: inquiry.project.launchPrice.startingFrom,
                currency: inquiry.project.launchPrice.currency || 'AED',
              }
            : null,
          brochure: inquiry.project.brochure || null,
          paymentPlans: (inquiry.project.paymentPlans || []).map((p) => ({
            planName: p.planName,
            downPayment: {
              percentage: p.downPayment?.percentage || null,
              amount: p.downPayment?.amount || null,
            },
            duringConstruction: {
              percentage: p.duringConstruction?.percentage || null,
              amount: p.duringConstruction?.amount || null,
              installments: p.duringConstruction?.installments || [],
            },
            onHandover: {
              percentage: p.onHandover?.percentage || null,
              amount: p.onHandover?.amount || null,
            },
          })),
          authorizedAgencies: (inquiry.project.authorizedAgencies || []).map((a) => ({
            id: a._id,
            agencyName: a.agencyName,
            logo: a.profilePicture || null,
          })),
          amenities: (inquiry.project.amenities || []).map((a) => ({
            id: a._id,
            name: a.name,
            icon: a.icon || null,
          })),
          virtualTour360: inquiry.project.virtualTour360 || null,
          videoTour: inquiry.project.videoTour || null,
          images: (inquiry.project.images || [])
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((img) => ({
              url: img.url,
              isPrimary: img.isPrimary || false,
              order: img.order || 0,
              caption: img.caption || null,
            })),
          masterPlan: inquiry.project.masterPlan || [],
          faqs: (inquiry.project.faqs || [])
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((f) => ({
              question: f.question,
              answer: f.answer,
            })),
          totalUnits: inquiry.project.totalUnits || 0,
          availableUnits: inquiry.project.availableUnits || 0,
          soldUnits: inquiry.project.soldUnits || 0,
          reservedUnits: inquiry.project.reservedUnits || 0,
        }
      : null;

    const layoutInfo = inquiry.layout
      ? {
          id: inquiry.layout._id,
          buildingName,
          layoutName: inquiry.layout.layoutName,
          bedrooms: inquiry.layout.bedrooms,
          bathrooms: inquiry.layout.bathrooms,
          areaSqft: inquiry.layout.areaSqft,
          areaSqm: inquiry.layout.areaSqm,
          propertyType: propertyTypeName,
          startingPrice: inquiry.layout.startingPrice
            ? {
                amount: inquiry.layout.startingPrice.amount,
                currency: inquiry.layout.startingPrice.currency || 'AED',
              }
            : null,
          floorPlan: inquiry.layout.floorPlans?.[0] || null,
          floorPlans: inquiry.layout.floorPlans || [],
          totalUnits: inquiry.layout.totalUnits || 0,
          availableUnits: layoutUnitsAvailable,
          reservedUnits: inquiry.layout.reservedUnits || 0,
          soldUnits: inquiry.layout.soldUnits || 0,
          unitsAssigned: layoutUnitsAssigned,
        }
      : null;

    const assignedUnit = inquiry.unit
      ? {
          id: inquiry.unit._id,
          unitId: inquiry.unit.unitId,
          unitNumber: inquiry.unit.unitNumber || null,
          floor: inquiry.unit.floor || null,
          status: inquiry.unit.status,
        }
      : null;

    return success(res, 'Project lead retrieved successfully', {
      inquiry: inquiryPayload,
      customer,
      agency,
      ...(project ? { project } : {}),
      ...(layoutInfo ? { layoutInfo } : {}),
      ...(assignedUnit ? { assignedUnit } : {}),
      units,
    });
  } catch (err) {
    logger.error('Agent get project lead error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to fetch project lead', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/close-deal-document:
 *   post:
 *     summary: Upload a close-deal document for project leads
 *     description: Uploads a single document file and returns document metadata (url, filename, uploadedAt) for use in submit-deal payloads.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       400:
 *         description: Validation or upload error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const uploadCloseDealDocument = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const file = req.file;
  if (!file) {
    return failure(res, 400, 'document file is required', 'VALIDATION_ERROR');
  }

  try {
    const uploaded = await uploadService.upload(file, 'deal', {
      allowDocument: true,
      allowVideo: false,
    });

    const document = {
      url: uploaded.url,
      filename: uploaded.filename,
      uploadedAt: new Date(),
    };

    return success(res, 'Document uploaded successfully', { document });
  } catch (err) {
    logger.error('Agent upload close-deal document error', { error: err.message, agentId });
    return failure(res, 500, 'Failed to upload document', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}/submit-deal:
 *   post:
 *     summary: Submit pre-close deal for agency approval
 *     description: Submits a pre-close deal document and amount for agency approval. Keeps the lead in the attended tab and marks it as waiting for approval.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dealAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 example: AED
 *               document:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   filename:
 *                     type: string
 *                   uploadedAt:
 *                     type: string
 *                     format: date-time
 *                 required:
 *                   - url
 *                   - filename
 *               notes:
 *                 type: string
 *             required:
 *               - dealAmount
 *               - document
 *     responses:
 *       200:
 *         description: Deal submitted for agency approval
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const submitDeal = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { dealAmount, currency, document, notes } = req.body || {};

  if (dealAmount === undefined || dealAmount === null || Number.isNaN(Number(dealAmount))) {
    return failure(res, 400, 'dealAmount is required and must be a number', 'VALIDATION_ERROR');
  }

  if (!document || typeof document !== 'object') {
    return failure(res, 400, 'document is required', 'VALIDATION_ERROR');
  }

  if (!document.url || typeof document.url !== 'string' || !document.url.trim()) {
    return failure(res, 400, 'document.url is required', 'VALIDATION_ERROR');
  }

  if (!document.filename || typeof document.filename !== 'string' || !document.filename.trim()) {
    return failure(res, 400, 'document.filename is required', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    if (inquiry.projectLeadStatus !== 'pre-close') {
      return failure(
        res,
        400,
        'Inquiry must be in pre-close status to submit deal',
        'VALIDATION_ERROR',
      );
    }

    if (inquiry.status === 'closed') {
      return failure(
        res,
        400,
        'Cannot submit deal for a closed inquiry',
        'VALIDATION_ERROR',
      );
    }

    if (inquiry.dealApproval?.isWaiting === true) {
      return failure(res, 400, 'Deal approval already pending', 'VALIDATION_ERROR');
    }

    if (!inquiry.unit) {
      return failure(res, 400, 'No unit assigned to this inquiry', 'VALIDATION_ERROR');
    }

    const now = new Date();

    inquiry.dealApproval = {
      isWaiting: true,
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      document: {
        url: document.url.trim(),
        filename: document.filename.trim(),
        uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : now,
      },
      submittedAt: now,
      notes: notes || undefined,
    };

    inquiry.statusHistory.push({
      status: 'pre-close-submitted',
      changedAt: now,
      notes: notes || undefined,
    });

    await inquiry.save();

    void notifyAgencyOnProjectDealSubmitted({
      agencyId: inquiry.agency,
      projectId: inquiry.project,
      inquiryId: inquiry._id,
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      agentName: req.user?.fullName || req.user?.name || 'Agent',
    }).catch((notifyErr) => {
      logger.error('Failed notifying agency for submitted project deal', {
        error: notifyErr.message,
        inquiryId: inquiry._id,
        agencyId: inquiry.agency,
      });
    });

    return success(res, 'Deal submitted for agency approval', {
      inquiry: {
        id: inquiry._id,
        status: inquiry.status,
        projectLeadStatus: inquiry.projectLeadStatus,
        statusBadge: 'waiting-approval',
        panelState: 'waiting-approval',
        dealApproval: {
          isWaiting: true,
          dealAmount: inquiry.dealApproval.dealAmount,
          currency: inquiry.dealApproval.currency,
          document: {
            url: inquiry.dealApproval.document.url,
            filename: inquiry.dealApproval.document.filename,
            uploadedAt: inquiry.dealApproval.document.uploadedAt,
          },
          submittedAt: inquiry.dealApproval.submittedAt,
        },
      },
    });
  } catch (err) {
    logger.error('Agent submit deal error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to submit deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}/available-units:
 *   get:
 *     summary: Get available units for the authenticated agent's project lead
 *     description: Returns units allocated to the authenticated agent under this inquiry's layout that are currently available.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     responses:
 *       200:
 *         description: Available units retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const getAvailableUnits = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    })
      .select('project layout agent agency status projectLeadStatus')
      .lean();

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    if (inquiry.status === 'closed') {
      return failure(res, 400, 'Inquiry is closed', 'VALIDATION_ERROR');
    }

    if (!inquiry.layout) {
      return failure(res, 400, 'No layout assigned to this inquiry', 'VALIDATION_ERROR');
    }

    const agencyId = inquiry.agency;

    const agentAllocation = await ProjectAgentAllocation.findOne({
      project: inquiry.project,
      agency: agencyId,
      agent: agentId,
      status: 'active',
    })
      .select('units')
      .lean();

    if (!agentAllocation || !agentAllocation.units?.length) {
      return success(res, 'Available units retrieved', {
        units: [],
      });
    }

    const units = await ProjectUnit.find({
      _id: { $in: agentAllocation.units },
      layout: inquiry.layout,
      status: 'available',
      isActive: true,
    })
      .select('unitId unitNumber floor')
      .sort({ unitNumber: 1 })
      .lean();

    return success(res, 'Available units retrieved successfully', {
      units: units.map((u) => ({
        id: u._id,
        unitId: u.unitId,
        unitNumber: u.unitNumber || null,
        floor: u.floor || null,
      })),
    });
  } catch (err) {
    logger.error('Agent get available units error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to fetch available units', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}/notes:
 *   post:
 *     summary: Add a note to the authenticated agent's project lead
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *             required:
 *               - note
 *     responses:
 *       200:
 *         description: Note added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const addNote = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { note, isPrivate = false } = req.body || {};

  if (!note || typeof note !== 'string' || !note.trim()) {
    return failure(res, 400, 'note is required', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    inquiry.notes = inquiry.notes || [];
    inquiry.notes.push({
      note: note.trim(),
      addedAt: new Date(),
      isPrivate: Boolean(isPrivate),
    });

    await inquiry.save();

    return success(res, 'Note added successfully', {
      notes: inquiry.notes,
    });
  } catch (err) {
    logger.error('Agent add note error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to add note', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/project-leads/{id}:
 *   delete:
 *     summary: Delete a project lead for the authenticated agent
 *     description: Deletes the project lead and releases any associated unit back to available when appropriate.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Inquiry ObjectId
 *     responses:
 *       200:
 *         description: Project lead deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const deleteProjectLead = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const agencyId = inquiry.agency;
    const now = new Date();

    if (inquiry.unit && !inquiry.dealClosed?.isClosed) {
      const unit = await ProjectUnit.findById(inquiry.unit);

      if (unit && unit.statusUpdatedByAgency?.toString() === agencyId.toString()) {
        unit.status = 'available';
        unit.statusExpiresAt = null;
        unit.statusUpdatedAt = now;
        unit.statusUpdatedBy = null;
        unit.statusUpdatedByAgency = null;
        unit.statusNote = null;

        unit.statusHistory.push({
          status: 'available',
          changedAt: now,
          agency: agencyId,
          note: 'Released — inquiry deleted by agent',
        });

        await unit.save();
      }
    }

    await Inquirys.findOneAndDelete({
      _id: id,
      agent: agentId,
    });

    return success(res, 'Project lead deleted successfully', {});
  } catch (err) {
    logger.error('Agent delete project lead error', { error: err.message, inquiryId: id, agentId });
    return failure(res, 500, 'Failed to delete project lead', 'SERVER_ERROR');
  }
});

module.exports = {
  listProjectLeads,
  getProjectLeadById,
  uploadCloseDealDocument,
  submitDeal,
  getAvailableUnits,
  addNote,
  deleteProjectLead,
  updateProjectLeadStatus,
};

