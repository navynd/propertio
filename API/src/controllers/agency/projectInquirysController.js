const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Inquirys = require('../../models/inquirysModel');
const ProjectUnit = require('../../models/projectUnitModel');
const ProjectAgencyAllocation = require('../../models/projectAgencyAllocationModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const ProjectBuilding = require('../../models/projectBuildingModel');
const PropertyType = require('../../models/propertyTypeModel');
const DealClosure = require('../../models/dealClosureModel');
const Newprojects = require('../../models/newprojectsModel');
const Agents = require('../../models/agentsModel');
const Developers = require('../../models/developersModel');
const Notification = require('../../models/notificationModel');
const uploadService = require('../../services/uploadService');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const {
  PROJECT_LEAD_TAB_VALUES,
  PROJECT_LEAD_SUBTAB_VALUES,
  PROJECT_LEAD_STATUS_VALUES,
  PROJECT_LEAD_STATUS_ACTION_VALUES,
  PROJECT_LEAD_STATUS_EXPIRY_DAYS,
  PROJECT_LEAD_STATUSES_REQUIRING_UNIT,
  PROJECT_LEAD_STATUS_HELPER_TEXT,
} = require('../../utils/constants');

const { Types } = mongoose;

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

const notifyDealDecisionRecipient = async ({
  recipientType,
  recipient,
  projectId,
  projectName,
  image,
  inquiryId,
  dealType,
  dealAmount,
  currency,
  decision,
}) => {
  if (!recipient?._id) return;

  const settings = recipient?.preferences?.notificationSettings || {};
  const shouldEmail =
    isExpertsEmailNotificationEnabled() && settings.email !== false;
  const shouldPush =
    isExpertsPushNotificationEnabled() && settings.push !== false;

  const title = decision === 'approved'
    ? 'Deal Approved'
    : 'Deal Declined';
  const body = decision === 'approved'
    ? `Deal has been approved for ${projectName || 'project'}.`
    : `Deal has been declined for ${projectName || 'project'}.`;

  const notification = await Notification.create({
    recipient: { recipientType, recipientId: recipient._id },
    title,
    message: body,
    notificationType: 'alert',
    priority: 'high',
    relatedItem: { itemType: 'project', itemId: projectId || null },
    channels: { email: shouldEmail, sms: false, push: shouldPush, inApp: true },
    actionText: 'View',
    metadata: {
      inquiryId: inquiryId ? String(inquiryId) : null,
      projectId: projectId ? String(projectId) : null,
      projectName: projectName || null,
      image: ensureNotificationImage(image, 'project'),
      dealType: dealType || null,
      dealAmount: Number(dealAmount || 0),
      currency: currency || 'AED',
      decision,
    },
  });

  if (shouldEmail && recipient?.email) {
    const subject = `${title}: ${projectName || 'Project'}`;
    const displayName = recipient.fullName || recipient.developerName || recipient.agencyName || 'User';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">${title}</h2>
        <p>Hi ${displayName},</p>
        <p>${body}</p>
        <p><strong>Deal type:</strong> ${dealType || '-'}</p>
        <p><strong>Deal amount:</strong> ${Number(dealAmount || 0)} ${currency || 'AED'}</p>
      </div>
    `;
    await sendEmail(recipient.email, subject, html);
    await Notification.findByIdAndUpdate(notification._id, {
      $set: {
        'deliveryStatus.email.sent': true,
        'deliveryStatus.email.sentAt': new Date(),
      },
    });
  }

  if (shouldPush) {
    const activeTokens = (recipient?.fcmTokens || [])
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
            type: 'project-deal-decision',
            recipientType,
            decision,
            projectId: projectId ? String(projectId) : '',
            inquiryId: inquiryId ? String(inquiryId) : '',
            image: image || '',
          },
        });
        anyPushSent = true;
      } catch (pushErr) {
        logger.error('Project deal decision push failed', {
          error: pushErr.message,
          recipientType,
          recipientId: recipient._id,
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
 * /agency/project-leads:
 *   get:
 *     summary: List project leads for the authenticated agency (project-only inquiries)
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [customer-requests, close-deal-request, closed-deal]
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
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Optional Agent ObjectId filter
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    tab = 'customer-requests',
    subTab = 'new',
    projectLeadStatus,
    agentId,
    projectId,
    layoutId,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    counts,
  } = req.query;

  const includeCounts = counts === true || counts === 'true' || counts === 1 || counts === '1';

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    agency: new Types.ObjectId(agencyId),
    inquiryCategory: 'project',
  };

  if (agentId && Types.ObjectId.isValid(agentId)) {
    filter.agent = new Types.ObjectId(agentId);
  }
  if (projectId && Types.ObjectId.isValid(projectId)) {
    filter.project = new Types.ObjectId(projectId);
  }
  if (layoutId && Types.ObjectId.isValid(layoutId)) {
    filter.layout = new Types.ObjectId(layoutId);
  }

  const activeTab = PROJECT_LEAD_TAB_VALUES.includes(tab) ? tab : 'customer-requests';
  const activeSubTab = PROJECT_LEAD_SUBTAB_VALUES.includes(subTab) ? subTab : 'new';

  if (activeTab === 'customer-requests') {
    if (activeSubTab === 'new') {
      filter.status = 'new';
    }

    if (activeSubTab === 'attended') {
      filter.status = 'attended';
      if (projectLeadStatus && PROJECT_LEAD_STATUS_VALUES.includes(projectLeadStatus)) {
        filter.projectLeadStatus = projectLeadStatus;
      }
    }

    if (activeSubTab === 'closed') {
      filter.status = 'closed';
      filter['dealClosed.isClosed'] = { $ne: true };
      filter['dealApproval.isWaiting'] = { $ne: true };
    }
  }

  if (activeTab === 'close-deal-request') {
    filter['dealApproval.isWaiting'] = true;
  }

  if (activeTab === 'closed-deal') {
    filter.status = 'closed';
    filter['dealClosed.isClosed'] = true;
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        .populate('unit', 'unitNumber status')
        .populate('agent', 'fullName email phoneNumber profilePicture position')
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
                agency: new Types.ObjectId(agencyId),
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
                      'dealApproval.isWaiting': { $ne: true },
                    },
                  },
                  { $count: 'count' },
                ],
                closeDealRequest: [{ $match: { 'dealApproval.isWaiting': true } }, { $count: 'count' }],
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
            unitNumber: inv.unit.unitNumber,
            status: inv.unit.status,
          }
        : null;

      const agent =
        inv.agent && typeof inv.agent === 'object'
          ? {
              id: inv.agent._id,
              fullName: inv.agent.fullName,
              profilePicture: inv.agent.profilePicture,
              position: inv.agent.position,
              isSuperAgent: inv.agent.position === '',
            }
          : null;

      const customer = {
        id: inv.customer?.userId?._id || inv.customer?.userId || null,
        name: inv.customer?.name,
        phoneNumber: inv.customer?.phoneNumber,
        profilePicture: inv.customer?.userId?.profilePicture || null,
      };

      const project = inv.project
        ? {
            id: inv.project._id,
            title: inv.projectTitle || inv.project.projectName,
            slug: inv.project.slug,
            image: inv.project.images?.[0] || null,
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

      const dealApproval =
        inv.dealApproval?.isWaiting === true
          ? { isWaiting: true, submittedAt: inv.dealApproval.submittedAt }
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
        agent,
        customer,
        dealClosed,
        dealApproval,
      };
    });

    const countsResponse = includeCounts
      ? countAgg?.[0]
        ? {
            new: countAgg[0].new?.[0]?.count ?? 0,
            attended: countAgg[0].attended?.[0]?.count ?? 0,
            closed: countAgg[0].closed?.[0]?.count ?? 0,
            closeDealRequest: countAgg[0].closeDealRequest?.[0]?.count ?? 0,
            closedDeal: countAgg[0].closedDeal?.[0]?.count ?? 0,
          }
        : {
            new: 0,
            attended: 0,
            closed: 0,
            closeDealRequest: 0,
            closedDeal: 0,
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

    if (countsResponse) {
      data.counts = countsResponse;
    }

    return success(res, 'Project leads retrieved successfully', data);
  } catch (err) {
    logger.error('Agency list project leads error', { error: err.message, agencyId });
    return failure(res, 500, 'Failed to fetch project leads', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/{id}/status:
 *   post:
 *     summary: Update project lead status (attend, set-project-status, close-inquiry)
 *     description: Handles all project lead status transitions and updates the ProjectUnit global status when applicable.
 *     tags: [Agency]
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
 *                 description: Required when type=set-project-status
 *               unitId:
 *                 type: string
 *                 description: Required for reserved/in-progress/follow-up/pre-close
 *               notes:
 *                 type: string
 *             required:
 *               - type
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry or unit not found
 *       500:
 *         description: Server error
 */
const updateProjectLeadStatus = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { type, projectLeadStatus, unitId, notes } = req.body || {};

  if (!type || !PROJECT_LEAD_STATUS_ACTION_VALUES.includes(type)) {
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
      agency: agencyId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const now = new Date();
    inquiry.statusHistory = Array.isArray(inquiry.statusHistory) ? inquiry.statusHistory : [];

    if (type === 'attend') {
      if (inquiry.status !== 'new') {
        return failure(res, 400, 'Inquiry is already attended or closed', 'VALIDATION_ERROR');
      }

      inquiry.status = 'attended';
      inquiry.attendedAt = now;
      inquiry.statusHistory.push({
        status: 'attended',
        changedAt: now,
        ...(notes ? { notes } : {}),
      });

      await inquiry.save();

      const updated = await Inquirys.findById(inquiry._id)
        .populate('agent', 'fullName email phoneNumber profilePicture agentType')
        .populate('unit', 'unitId unitNumber floor status')
        .lean();

      return success(res, 'Inquiry marked as attended', {
        inquiry: {
          id: updated._id,
          status: updated.status,
          projectLeadStatus: updated.projectLeadStatus,
          attendedAt: updated.attendedAt,
          panelState: 'set-status',
        },
      });
    }

    if (type === 'close-inquiry') {
      if (inquiry.status === 'closed') {
        return failure(res, 400, 'Inquiry is already closed', 'VALIDATION_ERROR');
      }

      if (inquiry.dealApproval?.isWaiting === true) {
        return failure(res, 400, 'Cannot close inquiry while deal approval is pending', 'VALIDATION_ERROR');
      }

      if (inquiry.unit) {
        const unit = await ProjectUnit.findById(inquiry.unit);
        if (unit && unit.statusUpdatedByAgency?.toString() === agencyId.toString()) {
          unit.status = 'available';
          unit.statusExpiresAt = null;
          unit.statusUpdatedAt = now;
          unit.statusUpdatedBy = null;
          unit.statusUpdatedByAgency = null;
          unit.statusNote = null;
          unit.statusNoteVisibleTo = null;
          unit.statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : [];
          unit.statusHistory.push({
            status: 'available',
            changedAt: now,
            agency: agencyId,
            note: 'Released — inquiry closed',
          });
          await unit.save();
        }
      }

      inquiry.status = 'closed';
      inquiry.closedAt = now;
      inquiry.statusHistory.push({
        status: 'closed',
        changedAt: now,
        ...(notes ? { notes } : {}),
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

    // type === 'set-project-status'
    if (!projectLeadStatus || !PROJECT_LEAD_STATUS_VALUES.includes(projectLeadStatus)) {
      return failure(
        res,
        400,
        'projectLeadStatus is required and must be one of: available, reserved, in-progress, follow-up, pre-close',
        'VALIDATION_ERROR',
      );
    }

    if (inquiry.status === 'closed') {
      return failure(res, 400, 'Cannot update status of a closed inquiry', 'VALIDATION_ERROR');
    }

    if (inquiry.dealApproval?.isWaiting === true) {
      return failure(res, 400, 'Cannot change status while deal approval is pending', 'VALIDATION_ERROR');
    }

    if (PROJECT_LEAD_STATUSES_REQUIRING_UNIT.includes(projectLeadStatus)) {
      if (!unitId || !Types.ObjectId.isValid(unitId)) {
        return failure(res, 400, 'unitId is required for this status', 'VALIDATION_ERROR');
      }
    }

    if (unitId) {
      const agentAllocation = await ProjectAgentAllocation.findOne({
        project: inquiry.project,
        agency: agencyId,
        agent: inquiry.agent,
        status: 'active',
        units: { $in: [new Types.ObjectId(unitId)] },
      }).lean();

      if (!agentAllocation) {
        return failure(res, 400, 'Unit is not allocated to this agent', 'VALIDATION_ERROR');
      }
    }

    // Match agent behaviour: do not flip new → attended on "available" alone.
    // Attended is set only when moving to a unit-backed project lead status.
    if (PROJECT_LEAD_STATUSES_REQUIRING_UNIT.includes(projectLeadStatus)) {
      inquiry.status = 'attended';
      inquiry.attendedAt = inquiry.attendedAt || now;
    }

    if (inquiry.unit && inquiry.unit.toString() !== unitId?.toString()) {
      const prevUnit = await ProjectUnit.findById(inquiry.unit);
      if (prevUnit && prevUnit.statusUpdatedByAgency?.toString() === agencyId.toString()) {
        prevUnit.status = 'available';
        prevUnit.statusExpiresAt = null;
        prevUnit.statusUpdatedAt = now;
        prevUnit.statusUpdatedBy = null;
        prevUnit.statusUpdatedByAgency = null;
        prevUnit.statusNote = null;
        prevUnit.statusNoteVisibleTo = null;
        prevUnit.statusHistory = Array.isArray(prevUnit.statusHistory) ? prevUnit.statusHistory : [];
        prevUnit.statusHistory.push({
          status: 'available',
          changedAt: now,
          agency: agencyId,
          note: 'Released — unit changed',
        });
        await prevUnit.save();
      }
    }

    if (unitId) {
      const unit = await ProjectUnit.findById(unitId);
      if (!unit) {
        return failure(res, 404, 'Unit not found', 'NOT_FOUND');
      }

      if (
        ['reserved', 'in-progress', 'follow-up', 'pre-close'].includes(unit.status) &&
        unit.statusUpdatedByAgency?.toString() !== agencyId.toString()
      ) {
        return failure(res, 400, `Unit is currently ${unit.status} by another agency`, 'VALIDATION_ERROR');
      }

      const expiryDays = PROJECT_LEAD_STATUS_EXPIRY_DAYS[projectLeadStatus];
      const statusExpiresAt = expiryDays ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null;

      unit.status = projectLeadStatus;
      unit.statusExpiresAt = statusExpiresAt;
      unit.statusUpdatedAt = now;
      unit.statusUpdatedBy = inquiry.agent;
      unit.statusUpdatedByAgency = agencyId;

      if (projectLeadStatus === 'in-progress' && notes) {
        unit.statusNote = notes;
        unit.statusNoteVisibleTo = { agent: inquiry.agent, agency: agencyId };
      }

      unit.statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : [];
      unit.statusHistory.push({
        status: projectLeadStatus,
        changedAt: now,
        changedBy: inquiry.agent,
        agency: agencyId,
        expiresAt: statusExpiresAt,
        ...(notes ? { note: notes } : {}),
      });

      await unit.save();
      inquiry.unit = unitId;
    }

    if (projectLeadStatus === 'available') {
      inquiry.unit = null;
    }

    const inquiryExpiryDays = PROJECT_LEAD_STATUS_EXPIRY_DAYS[projectLeadStatus];
    inquiry.statusExpiresAt = inquiryExpiryDays
      ? new Date(now.getTime() + inquiryExpiryDays * 24 * 60 * 60 * 1000)
      : null;

    inquiry.projectLeadStatus = projectLeadStatus;
    inquiry.statusHistory.push({
      status: projectLeadStatus,
      changedAt: now,
      ...(notes ? { notes } : {}),
    });

    await inquiry.save();

    let panelState = 'set-status-and-unit';
    if (inquiry.status === 'new') panelState = 'set-status';

    return success(res, 'Project lead status updated successfully', {
      inquiry: {
        id: inquiry._id,
        status: inquiry.status,
        projectLeadStatus: inquiry.projectLeadStatus,
        statusExpiresAt: inquiry.statusExpiresAt || null,
        statusHelperText: PROJECT_LEAD_STATUS_HELPER_TEXT[projectLeadStatus] || null,
        attendedAt: inquiry.attendedAt || null,
        panelState,
        unit: unitId
          ? {
              id: new Types.ObjectId(unitId),
              unitId,
            }
          : null,
      },
    });
  } catch (err) {
    logger.error('Agency update project lead status error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to update project lead status', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/{id}:
 *   get:
 *     summary: Get a project lead by ID (project-only inquiry)
 *     description: Returns the project lead detail payload used by the Lead Detail page (includes panelState + statusBadge).
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agency: agencyId,
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
       totalUnits availableUnits soldUnits reservedUnits faqs`,
      )
      .populate('unit', 'unitId unitNumber floor status')
      .populate(
        'layout',
        `layoutName bedrooms bathrooms
       areaSqft areaSqm startingPrice
       floorPlans totalUnits availableUnits
       reservedUnits soldUnits building propertyType`,
      )
      .populate('agent', 'fullName email phoneNumber profilePicture agentType')
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

    // Populate authorizedAgencies and amenities on project (nested refs)
    if (inquiry.project) {
      // eslint-disable-next-line global-require
      await Newprojects.populate(inquiry.project, [
        { path: 'authorizedAgencies', select: 'agencyName profilePicture' },
        { path: 'amenities', select: 'name slug icon image' },
      ]);
    }

    // Get building name (for Tower heading)
    let buildingName = null;
    if (inquiry.layout?.building) {
      const building = await ProjectBuilding.findById(inquiry.layout.building).select('buildingName').lean();
      buildingName = building?.buildingName || null;
    }

    // Get property type name
    let propertyTypeName = null;
    if (inquiry.layout?.propertyType) {
      const pt = await PropertyType.findById(inquiry.layout.propertyType).select('name slug').lean();
      propertyTypeName = pt?.name || null;
    }

    // Build units grid (all units allocated to this agency under this layout)
    let units = [];
    let agentUnits = [];
    let layoutUnitsAvailable = 0;
    let layoutUnitsAssigned = 0;
    if (inquiry.layout?._id && inquiry.project?._id) {
      const agencyAllocation = await ProjectAgencyAllocation.findOne({
        project: inquiry.project._id,
        agency: agencyId,
        status: 'active',
      })
        .select('units')
        .lean();

      const agencyUnitIds = agencyAllocation?.units || [];

      const projectId = inquiry.project._id;
      const layoutId = inquiry.layout._id;

      const agentAllocation = inquiry.agent?._id
        ? await ProjectAgentAllocation.findOne({
            project: projectId,
            agency: agencyId,
            agent: inquiry.agent._id,
            status: 'active',
          })
            .select('units')
            .lean()
        : null;

      const agentUnitSet = new Set((agentAllocation?.units || []).map((u) => u.toString()));

      const allUnits =
        agencyUnitIds.length > 0
          ? await ProjectUnit.find({
              _id: { $in: agencyUnitIds },
              project: projectId,
              layout: layoutId,
              isActive: true,
            })
              .select('unitId unitNumber floor status statusUpdatedByAgency saleInfo')
              .sort({ unitNumber: 1 })
              .lean()
          : [];

      const layoutUnitIds = new Set(allUnits.map((u) => u._id.toString()));

      const agentAllocationsForLayout = await ProjectAgentAllocation.find({
        project: projectId,
        agency: agencyId,
        status: 'active',
      })
        .select('units')
        .lean();

      const assignedUnitIds = new Set(
        agentAllocationsForLayout.flatMap((alloc) =>
          (alloc.units || [])
            .filter((unitRef) => layoutUnitIds.has(unitRef.toString()))
            .map((unitRef) => unitRef.toString()),
        ),
      );

      layoutUnitsAvailable = allUnits.filter((u) => u.status === 'available').length;
      layoutUnitsAssigned = assignedUnitIds.size;

      units = allUnits.map((u) => {
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
          if (agentUnitSet.has(u._id.toString())) {
            displayState = 'available';
          } else {
            displayState = 'unavailable';
          }
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

      const assignedUnitId = inquiry.unit?._id ? String(inquiry.unit._id) : null;
      agentUnits = units.filter((unit) => {
        const unitId = String(unit.id);
        if (assignedUnitId && unitId === assignedUnitId) {
          return true;
        }
        return agentUnitSet.has(unitId) && unit.status === 'available';
      });
    }

    // panelState (exact order)
    let panelState = 'set-status';
    if (inquiry.dealApproval?.isWaiting === true) {
      panelState = 'verify-approve';
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

    // statusHelperText
    const statusHelperText = PROJECT_LEAD_STATUS_HELPER_TEXT[inquiry.projectLeadStatus] ?? null;

    // statusBadge (exact order)
    let statusBadge = 'new-inquiry';
    if (inquiry.status === 'closed' && inquiry.dealClosed?.isClosed === true) {
      statusBadge = 'deal-closed';
    } else if (inquiry.status === 'closed') {
      statusBadge = 'inquiry-closed';
    } else if (inquiry.projectLeadStatus === 'pre-close' && !inquiry.dealApproval?.isWaiting) {
      statusBadge = 'pre-close';
    } else if (inquiry.status === 'attended') {
      statusBadge = 'attended';
    } else {
      statusBadge = 'new-inquiry';
    }

    // Inquiry payload
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
                  notes:
                    inquiry.dealClosed.dealClosureRef.notes || null,
                  documents:
                    inquiry.dealClosed.dealClosureRef.documents || [],
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
            notes: inquiry.dealApproval.notes || null,
          }
        : null,
    };

    const customerUser = inquiry.customer?.userId;
    const customerUserId =
      customerUser && typeof customerUser === 'object' && customerUser._id
        ? customerUser._id
        : customerUser || "profileless.png";
    const customerProfilePicture =
      customerUser && typeof customerUser === 'object'
        ? customerUser.profilePicture || null
        : "profileless.png";

    const customer = {
      name: inquiry.customer?.name,
      email: inquiry.customer?.email,
      phoneNumber: inquiry.customer?.phoneNumber,
      userId: customerUserId,
      profilePicture: customerProfilePicture,
      inquiredAt: inquiry.inquiredAt,
      unitNumber: inquiry.unit?.unitNumber || null,
      dealAmount: inquiry.dealApproval?.dealAmount || inquiry.dealClosed?.dealAmount || null,
      preClosedDate: inquiry.dealApproval?.submittedAt || null,
      closedDate: inquiry.closedAt || null,
      leadSource: inquiry.source || null,
    };

    const agent =
      inquiry.agent && typeof inquiry.agent === 'object'
        ? {
            id: inquiry.agent._id,
            fullName: inquiry.agent.fullName,
            email: inquiry.agent.email,
            phoneNumber: inquiry.agent.phoneNumber,
            profilePicture: inquiry.agent.profilePicture || null,
            agentType: inquiry.agent.agentType,
            isSuperAgent: inquiry.agent.agentType === 'superagent',
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
            image: a.image || null,
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
              id: f._id || null,
              question: f.question,
              answer: f.answer,
              order: Number(f.order || 0),
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
      agent,
      ...(project ? { project } : {}),
      ...(layoutInfo ? { layoutInfo } : {}),
      ...(assignedUnit ? { assignedUnit } : {}),
      units,
      agentUnits,
    });
  } catch (err) {
    logger.error('Agency get project lead error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to fetch project lead', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/{id}/submit-deal:
 *   post:
 *     summary: Submit and close a pre-close deal (agency)
 *     description: >
 *       Agency-only: records the close-deal document and amount, creates DealClosure,
 *       closes the inquiry and unit (same outcome as approve-deal with action=approve).
 *       Does not set dealApproval.isWaiting. If an agent already submitted a deal awaiting
 *       approval, use POST /agency/project-leads/{id}/approve-deal instead.
 *     tags: [Agency]
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
 *               dealType:
 *                 type: string
 *                 enum: [sale, rent]
 *                 description: Defaults to sale if omitted
 *               commission:
 *                 type: number
 *                 description: Optional commission amount
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
 *         description: Deal closed successfully (includes dealClosureId)
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { dealAmount, currency, document, notes, dealType, commission } = req.body || {};

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

  const resolvedDealType = ['sale', 'rent'].includes(dealType) ? dealType : 'sale';

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agency: agencyId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    if (inquiry.inquiryCategory !== 'project') {
      return failure(res, 400, 'This action is only valid for project inquiries', 'VALIDATION_ERROR');
    }

    if (inquiry.projectLeadStatus !== 'pre-close') {
      return failure(res, 400, 'Inquiry must be in pre-close status to submit deal', 'VALIDATION_ERROR');
    }

    if (inquiry.status === 'closed') {
      return failure(res, 400, 'Cannot submit deal for a closed inquiry', 'VALIDATION_ERROR');
    }

    if (inquiry.dealApproval?.isWaiting === true) {
      return failure(
        res,
        400,
        'A deal is already awaiting approval; use approve-deal with action approve or decline',
        'VALIDATION_ERROR',
      );
    }

    if (!inquiry.unit) {
      return failure(res, 400, 'No unit assigned to this inquiry', 'VALIDATION_ERROR');
    }

    const now = new Date();
    inquiry.statusHistory = Array.isArray(inquiry.statusHistory) ? inquiry.statusHistory : [];

    const uploadedAtCandidate = document.uploadedAt ? new Date(document.uploadedAt) : null;
    const uploadedAt =
      uploadedAtCandidate && !Number.isNaN(uploadedAtCandidate.getTime()) ? uploadedAtCandidate : now;

    inquiry.dealApproval = {
      isWaiting: false,
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      document: {
        url: document.url.trim(),
        filename: document.filename.trim(),
        uploadedAt,
      },
      submittedAt: now,
      approvedAt: now,
      ...(notes ? { notes } : {}),
    };

    const { dealClosure } = await finalizeAgencyApprovedProjectDeal({
      inquiry,
      agencyId,
      dealType: resolvedDealType,
      commission,
      notes,
      now,
    });

    return success(res, 'Deal closed successfully', {
      inquiry: {
        id: inquiry._id,
        status: inquiry.status,
        projectLeadStatus: inquiry.projectLeadStatus,
        statusBadge: 'deal-closed',
        panelState: 'deal-closed',
        closedAt: inquiry.closedAt,
        dealClosed: {
          isClosed: true,
          dealType: inquiry.dealClosed.dealType,
          dealAmount: inquiry.dealClosed.dealAmount,
          closedDate: inquiry.dealClosed.closedDate,
        },
        dealApproval: {
          isWaiting: false,
          approvedAt: inquiry.dealApproval.approvedAt,
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
      dealClosureId: dealClosure._id,
    });
  } catch (err) {
    logger.error('Agency submit deal error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to submit deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/close-deal-document:
 *   post:
 *     summary: Upload a close-deal document for project leads
 *     description: Uploads a single document file and returns document metadata (url, filename, uploadedAt) for use in submit-deal payloads.
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
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
    logger.error('Agency upload close-deal document error', { error: err.message, agencyId });
    return failure(res, 500, 'Failed to upload document', 'SERVER_ERROR');
  }
});

/**
 * Shared path for agency-approved project deal: DealClosure + inquiry closed + unit sold + notifications.
 * Mutates `inquiry` (expects dealApproval populated with document/amount/currency; sets isWaiting=false, approvedAt).
 */
async function finalizeAgencyApprovedProjectDeal({
  inquiry,
  agencyId,
  dealType,
  commission,
  notes,
  now,
}) {
  inquiry.dealApproval.isWaiting = false;
  inquiry.dealApproval.approvedAt = now;

  const dealClosure = await DealClosure.create({
    dealCategory: 'project',
    project: inquiry.project,
    unit: inquiry.unit,
    layout: inquiry.layout,
    inquiry: inquiry._id,
    developer: inquiry.developer || undefined,

    agent: inquiry.agent,
    agency: agencyId,
    customer: {
      userId: inquiry.customer?.userId || undefined,
      name: inquiry.customer?.name,
      email: inquiry.customer?.email,
      phoneNumber: inquiry.customer?.phoneNumber,
    },

    dealType,
    dealAmount: inquiry.dealApproval.dealAmount,
    currency: inquiry.dealApproval.currency || 'AED',
    commission: commission != null ? { amount: Number(commission) } : undefined,

    approvalFlow: {
      submittedAt: inquiry.dealApproval.submittedAt,
      submittedBy: inquiry.agent,
      approvedAt: now,
      approvedBy: agencyId,
    },

    documents: inquiry.dealApproval.document?.url
      ? [
          {
            title: inquiry.dealApproval.document.filename,
            url: inquiry.dealApproval.document.url,
            type: 'pdf',
            uploadedAt: inquiry.dealApproval.document.uploadedAt || now,
          },
        ]
      : [],

    notes: notes || undefined,

    closedDate: now,
    closedBy: inquiry.agent,

    status: 'approved',
  });

  inquiry.dealClosed = {
    isClosed: true,
    dealClosureRef: dealClosure._id,
    dealType: dealType,
    dealAmount: inquiry.dealApproval.dealAmount,
    closedDate: now,
  };

  inquiry.status = 'closed';
  inquiry.closedAt = now;
  inquiry.projectLeadStatus = 'closed';
  inquiry.statusExpiresAt = null;

  inquiry.statusHistory.push({
    status: 'deal-approved',
    changedAt: now,
    ...(notes ? { notes } : {}),
  });

  await inquiry.save();

  if (inquiry.unit) {
    const unit = await ProjectUnit.findById(inquiry.unit);
    if (unit) {
      unit.status = 'closed';
      unit.statusExpiresAt = null;
      unit.statusUpdatedAt = now;
      unit.statusUpdatedBy = inquiry.agent;
      unit.statusUpdatedByAgency = agencyId;

      unit.saleInfo = {
        closedAmount: inquiry.dealApproval.dealAmount,
        closedDate: now,
        closedBy: inquiry.agent,
        closedByAgency: agencyId,
        customerName: inquiry.customer?.name,
        customerEmail: inquiry.customer?.email,
        customerPhone: inquiry.customer?.phoneNumber,
        documents: inquiry.dealApproval.document?.url ? [inquiry.dealApproval.document.url] : [],
      };

      unit.agencyApproval = {
        status: 'approved',
        reviewedBy: agencyId,
        reviewedAt: now,
      };

      unit.statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : [];
      unit.statusHistory.push({
        status: 'closed',
        changedAt: now,
        changedBy: inquiry.agent,
        agency: agencyId,
        note: 'Deal approved by agency',
      });

      await unit.save();

      await Newprojects.findByIdAndUpdate(inquiry.project, {
        $inc: {
          soldUnits: 1,
          availableUnits: -1,
        },
      });
    }
  }

  const [projectDoc, agentDoc, developerDoc] = await Promise.all([
    inquiry.project
      ? Newprojects.findById(inquiry.project).select('projectName images').lean()
      : null,
    inquiry.agent
      ? Agents.findById(inquiry.agent)
          .select('fullName email preferences fcmTokens')
          .lean()
      : null,
    inquiry.developer
      ? Developers.findById(inquiry.developer)
          .select('developerName email preferences fcmTokens')
          .lean()
      : null,
  ]);

  const projectName = projectDoc?.projectName || 'Project';
  const image = pickPrimaryImage(projectDoc?.images);
  const notifyTasks = [];

  if (agentDoc) {
    notifyTasks.push(
      notifyDealDecisionRecipient({
        recipientType: 'agent',
        recipient: agentDoc,
        projectId: inquiry.project,
        projectName,
        image,
        inquiryId: inquiry._id,
        dealType,
        dealAmount: inquiry.dealApproval?.dealAmount,
        currency: inquiry.dealApproval?.currency || 'AED',
        decision: 'approved',
      }),
    );
  }
  if (developerDoc) {
    notifyTasks.push(
      notifyDealDecisionRecipient({
        recipientType: 'developer',
        recipient: developerDoc,
        projectId: inquiry.project,
        projectName,
        image,
        inquiryId: inquiry._id,
        dealType,
        dealAmount: inquiry.dealApproval?.dealAmount,
        currency: inquiry.dealApproval?.currency || 'AED',
        decision: 'approved',
      }),
    );
  }

  void Promise.all(notifyTasks).catch((notifyErr) => {
    logger.error('Failed sending project deal approval notifications', {
      error: notifyErr.message,
      inquiryId: inquiry._id,
      agencyId,
    });
  });

  return { dealClosure };
}

/**
 * @swagger
 * /agency/project-leads/{id}/approve-deal:
 *   post:
 *     summary: Approve or decline submitted deal
 *     description: Approves (closes inquiry + sets ProjectUnit.status=closed) or declines (keeps lead in pre-close state and records declinedReason).
 *     tags: [Agency]
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
 *               action:
 *                 type: string
 *                 enum: [approve, decline]
 *               dealType:
 *                 type: string
 *                 enum: [sale, rent]
 *                 description: Required when action=approve
 *               commission:
 *                 type: number
 *                 description: Optional when action=approve
 *               declinedReason:
 *                 type: string
 *                 description: Required when action=decline
 *               notes:
 *                 type: string
 *             required:
 *               - action
 *     responses:
 *       200:
 *         description: Deal processed successfully (includes `dealClosureId` when action=approve)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Inquiry not found
 *       500:
 *         description: Server error
 */
const approveDeal = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  const { action, dealType, commission, declinedReason, notes } = req.body || {};

  if (!action || !['approve', 'decline'].includes(action)) {
    return failure(res, 400, 'action is required and must be approve or decline', 'VALIDATION_ERROR');
  }

  if (action === 'approve') {
    if (!dealType || !['sale', 'rent'].includes(dealType)) {
      return failure(res, 400, 'dealType is required and must be sale or rent', 'VALIDATION_ERROR');
    }
  }

  if (action === 'decline') {
    if (!declinedReason || typeof declinedReason !== 'string' || !declinedReason.trim()) {
      return failure(res, 400, 'declinedReason is required when declining', 'VALIDATION_ERROR');
    }
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agency: agencyId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    if (!inquiry.dealApproval?.isWaiting) {
      return failure(res, 400, 'No pending deal approval for this inquiry', 'VALIDATION_ERROR');
    }

    if (inquiry.status === 'closed') {
      return failure(res, 400, 'Inquiry is already closed', 'VALIDATION_ERROR');
    }

    const now = new Date();
    inquiry.statusHistory = Array.isArray(inquiry.statusHistory) ? inquiry.statusHistory : [];

    if (action === 'approve') {
      const { dealClosure } = await finalizeAgencyApprovedProjectDeal({
        inquiry,
        agencyId,
        dealType,
        commission,
        notes,
        now,
      });

      return success(res, 'Deal approved successfully', {
        inquiry: {
          id: inquiry._id,
          status: inquiry.status,
          projectLeadStatus: inquiry.projectLeadStatus,
          statusBadge: 'deal-closed',
          panelState: 'deal-closed',
          closedAt: inquiry.closedAt,
          dealClosed: {
            isClosed: true,
            dealType: inquiry.dealClosed.dealType,
            dealAmount: inquiry.dealClosed.dealAmount,
            closedDate: inquiry.dealClosed.closedDate,
          },
          dealApproval: {
            isWaiting: false,
            approvedAt: inquiry.dealApproval.approvedAt,
          },
        },
        dealClosureId: dealClosure._id,
      });
    }

    inquiry.dealApproval.isWaiting = false;
    inquiry.dealApproval.declinedAt = now;
    inquiry.dealApproval.declinedReason = declinedReason.trim();

    inquiry.statusHistory.push({
      status: 'deal-declined',
      changedAt: now,
      notes: declinedReason.trim(),
    });

    await inquiry.save();

    if (inquiry.unit) {
      const unit = await ProjectUnit.findById(inquiry.unit);
      if (unit) {
        unit.agencyApproval = {
          status: 'rejected',
          reviewedBy: agencyId,
          reviewedAt: now,
          rejectedReason: declinedReason.trim(),
        };
        await unit.save();
      }
    }

    const [projectDoc, agentDoc, developerDoc] = await Promise.all([
      inquiry.project
        ? Newprojects.findById(inquiry.project).select('projectName images').lean()
        : null,
      inquiry.agent
        ? Agents.findById(inquiry.agent)
            .select('fullName email preferences fcmTokens')
            .lean()
        : null,
      inquiry.developer
        ? Developers.findById(inquiry.developer)
            .select('developerName email preferences fcmTokens')
            .lean()
        : null,
    ]);

    const projectName = projectDoc?.projectName || 'Project';
    const image = pickPrimaryImage(projectDoc?.images);
    const declineNotifyTasks = [];

    if (agentDoc) {
      declineNotifyTasks.push(
        notifyDealDecisionRecipient({
          recipientType: 'agent',
          recipient: agentDoc,
          projectId: inquiry.project,
          projectName,
          image,
          inquiryId: inquiry._id,
          dealType: 'pending',
          dealAmount: inquiry.dealApproval?.dealAmount,
          currency: inquiry.dealApproval?.currency || 'AED',
          decision: 'declined',
        }),
      );
    }
    if (developerDoc) {
      declineNotifyTasks.push(
        notifyDealDecisionRecipient({
          recipientType: 'developer',
          recipient: developerDoc,
          projectId: inquiry.project,
          projectName,
          image,
          inquiryId: inquiry._id,
          dealType: 'pending',
          dealAmount: inquiry.dealApproval?.dealAmount,
          currency: inquiry.dealApproval?.currency || 'AED',
          decision: 'declined',
        }),
      );
    }

    void Promise.all(declineNotifyTasks).catch((notifyErr) => {
      logger.error('Failed sending project deal decline notifications', {
        error: notifyErr.message,
        inquiryId: inquiry._id,
        agencyId,
      });
    });

    return success(res, 'Deal declined', {
      inquiry: {
        id: inquiry._id,
        status: inquiry.status,
        projectLeadStatus: inquiry.projectLeadStatus,
        statusBadge: 'pre-close',
        panelState: 'set-status-and-unit',
        dealApproval: {
          isWaiting: false,
          declinedAt: inquiry.dealApproval.declinedAt,
          declinedReason: inquiry.dealApproval.declinedReason,
        },
      },
    });
  } catch (err) {
    logger.error('Agency approve deal error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to process deal approval', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/{id}/available-units:
 *   get:
 *     summary: List available units for the lead's assigned agent (under the same layout)
 *     description: Returns only units that are allocated to the inquiry's agent and are available globally, filtered by the inquiry layout.
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agency: agencyId,
      inquiryCategory: 'project',
    }).lean();

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const agentAllocation =
      inquiry.project && inquiry.agent
        ? await ProjectAgentAllocation.findOne({
            project: inquiry.project,
            agency: agencyId,
            agent: inquiry.agent,
            status: 'active',
          }).lean()
        : null;

    const agentUnitIds = agentAllocation?.units || [];

    const rawUnits =
      inquiry.layout && agentUnitIds.length
        ? await ProjectUnit.find({
            _id: { $in: agentUnitIds },
            layout: inquiry.layout,
            status: 'available',
            isActive: true,
          })
            .select('unitId unitNumber floor')
            .sort({ unitNumber: 1 })
            .lean()
        : [];

    const units = rawUnits.map((unit) => ({
      id: unit._id,
      unitId: unit.unitId,
      unitNumber: unit.unitNumber,
      floor: unit.floor || null,
    }));

    return success(res, 'Available units retrieved successfully', { units });
  } catch (err) {
    logger.error('Agency get available units error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to fetch available units', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/project-leads/{id}:
 *   delete:
 *     summary: Delete a project lead inquiry
 *     description: Deletes a project inquiry. If it has a unit assigned (and deal not closed), releases that unit back to available (only if this agency last updated it).
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({
      _id: id,
      agency: agencyId,
      inquiryCategory: 'project',
    });

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const now = new Date();

    if (inquiry.unit && inquiry.dealClosed?.isClosed !== true) {
      const unit = await ProjectUnit.findById(inquiry.unit);

      if (unit && unit.statusUpdatedByAgency?.toString() === agencyId.toString()) {
        unit.status = 'available';
        unit.statusExpiresAt = null;
        unit.statusUpdatedAt = now;
        unit.statusUpdatedBy = null;
        unit.statusUpdatedByAgency = null;
        unit.statusNote = null;
        unit.statusNoteVisibleTo = null;
        unit.statusHistory = Array.isArray(unit.statusHistory) ? unit.statusHistory : [];
        unit.statusHistory.push({
          status: 'available',
          changedAt: now,
          agency: agencyId,
          note: 'Released — inquiry deleted',
        });

        await unit.save();
      }
    }

    await Inquirys.findOneAndDelete({
      _id: id,
      agency: agencyId,
    });

    return success(res, 'Project lead deleted successfully', {});
  } catch (err) {
    logger.error('Agency delete project lead error', { error: err.message, inquiryId: id, agencyId });
    return failure(res, 500, 'Failed to delete project lead', 'SERVER_ERROR');
  }
});

module.exports = {
  listProjectLeads,
  getProjectLeadById,
  updateProjectLeadStatus,
  submitDeal,
  approveDeal,
  getAvailableUnits,
  deleteProjectLead,
  uploadCloseDealDocument,
};

