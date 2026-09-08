const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Inquirys = require('../../models/inquirysModel');
const DealClosure = require('../../models/dealClosureModel');
const Properties = require('../../models/propertiesModal');
const Agencies = require('../../models/agenciesModel');
const Notification = require('../../models/notificationModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { INQUIRY_STATUS, INQUIRY_TYPE, INQUIRY_DEAL_TYPES } = require('../../utils/constants');
const { recalcAgentStatistics } = require('../../services/agentStatsService');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');

const { Types } = mongoose;
const VALID_STATUSES = INQUIRY_STATUS.map(status => status.value);
const VALID_INQUIRY_TYPES = INQUIRY_TYPE.map(type => type.value);
const VALID_CATEGORIES = ['property'];
const VALID_STATUS_ACTIONS = ['attend', 'close-inquiry'];
const VALID_DEAL_TYPES = INQUIRY_DEAL_TYPES.map(type => type.value);

const selectLeadImages = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  return [...images]
    .sort((a, b) => {
      if (a?.isPrimary && !b?.isPrimary) return -1;
      if (!a?.isPrimary && b?.isPrimary) return 1;
      return Number(a?.order || 0) - Number(b?.order || 0);
    })
    .slice(0, 3);
};

const pickPrimaryImage = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;
  return [...images]
    .sort((a, b) => {
      if (a?.isPrimary && !b?.isPrimary) return -1;
      if (!a?.isPrimary && b?.isPrimary) return 1;
      return Number(a?.order || 0) - Number(b?.order || 0);
    })[0]?.url || null;
};

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

const notifyAgencyOnPropertyDealClosed = async ({
  agencyId,
  propertyId,
  propertyTitle,
  dealType,
  dealAmount,
  currency,
  agentName,
  image,
}) => {
  if (!agencyId || !Types.ObjectId.isValid(agencyId)) return;

  const agency = await Agencies.findById(agencyId)
    .select('agencyName email preferences fcmTokens')
    .lean();
  if (!agency) return;

  const notificationSettings = agency?.preferences?.notificationSettings || {};
  const shouldEmail =
    isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
  const shouldPush =
    isExpertsPushNotificationEnabled() && notificationSettings.push !== false;

  const normalizedDealType = String(dealType || '').toLowerCase();
  const actionLabel = normalizedDealType === 'rent' ? 'rented' : 'sold';
  const title = 'Property Deal Closed';
  const body = `${propertyTitle || 'Property'} has been marked as ${actionLabel} by ${agentName || 'your agent'}.`;

  const notification = await Notification.create({
    recipient: { recipientType: 'agency', recipientId: agency._id },
    title,
    message: body,
    notificationType: 'alert',
    priority: 'high',
    relatedItem: { itemType: 'property', itemId: propertyId || null },
    channels: { email: shouldEmail, sms: false, push: shouldPush, inApp: true },
    actionText: 'View',
    metadata: {
      propertyId: propertyId ? String(propertyId) : null,
      propertyTitle: propertyTitle || null,
      image: image || null,
      dealType: normalizedDealType || null,
      dealAmount: Number(dealAmount || 0),
      currency: currency || 'AED',
      agentName: agentName || null,
    },
  });

  if (shouldEmail && agency?.email) {
    const subject = `${title}: ${propertyTitle || 'Property'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Property Deal Closed</h2>
        <p>Hi ${agency.agencyName || 'Agency'},</p>
        <p>${body}</p>
        <p><strong>Deal type:</strong> ${normalizedDealType || '-'}</p>
        <p><strong>Deal amount:</strong> ${Number(dealAmount || 0)} ${currency || 'AED'}</p>
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
            type: 'property-deal-closed',
            propertyId: propertyId ? String(propertyId) : '',
            image: image || '',
            agencyId: String(agency._id),
            dealType: normalizedDealType || '',
          },
        });
        anyPushSent = true;
      } catch (pushErr) {
        logger.error('Agency push failed for property deal close', {
          error: pushErr.message,
          agencyId: agency._id,
          propertyId,
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
 * /agents/inquiries:
 *   get:
 *     summary: List inquiries for the authenticated agent (property + project)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, attended, closed, closed-sale-rent]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [call, email, whatsapp]
 *       - in: query
 *         name: inquiryCategory
 *         schema:
 *           type: string
 *           enum: [property, project]
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [sale, rent]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
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
 *       - in: query
 *         name: counts
 *         schema:
 *           type: boolean
 *         description: Include tab counts (new, attended, closed, closedSaleRent)
 *     responses:
 *       200:
 *         description: Inquiries retrieved successfully
 *       401:
 *         description: Unauthorized
 */
const listInquiries = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    status,
    type,
    inquiryCategory,
    propertyId,
    projectId,
    transactionType,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    counts: includeCounts = false,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { agent: new Types.ObjectId(agentId) };

  // This controller handles property leads only
  // Project leads are handled by agentProjectLeadController
  filter.inquiryCategory = 'property';

  if (inquiryCategory && VALID_CATEGORIES.includes(inquiryCategory)) {
    filter.inquiryCategory = inquiryCategory;
  }
  if (propertyId && Types.ObjectId.isValid(propertyId)) {
    filter.property = new Types.ObjectId(propertyId);
  }
  if (type && VALID_INQUIRY_TYPES.includes(type)) {
    filter.inquiryType = type;
  }

  if (status && VALID_STATUSES.includes(status)) {
    if (status === 'closed-sale-rent') {
      filter.status = 'closed';
      filter['dealClosed.isClosed'] = true;
      if (transactionType && VALID_DEAL_TYPES.includes(transactionType)) {
        filter['dealClosed.dealType'] = transactionType;
      }
    } else if (status === 'closed') {
      filter.status = 'closed';
      filter['dealClosed.isClosed'] = { $ne: true };
    } else {
      filter.status = status;
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(term, 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'customer.name': regex },
        { 'customer.email': regex },
        { 'customer.phoneNumber': regex },
        { propertyTitle: regex },
        { projectTitle: regex },
        { message: regex },
      ],
    });
  }

  if (startDate || endDate) {
    filter.inquiredAt = {};
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) filter.inquiredAt.$gte = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) filter.inquiredAt.$lte = d;
    }
    if (Object.keys(filter.inquiredAt).length === 0) delete filter.inquiredAt;
  }

  try {
    const [inquiries, total, countAgg] = await Promise.all([
      Inquirys.find(filter)
        .populate('customer.userId', 'profilePicture')
        .populate('property', 'title slug images location listingType price')
        .populate('project', 'projectName slug images location')
        .populate('unit', 'unitNumber status')
        .sort({ inquiredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inquirys.countDocuments(filter),
      includeCounts === 'true' || includeCounts === true
        ? Inquirys.aggregate([
            { $match: { agent: new Types.ObjectId(agentId) } },
            {
              $facet: {
                new: [{ $match: { status: 'new' } }, { $count: 'count' }],
                attended: [{ $match: { status: 'attended' } }, { $count: 'count' }],
                closed: [
                  { $match: { status: 'closed', 'dealClosed.isClosed': { $ne: true } } },
                  { $count: 'count' },
                ],
                closedSaleRent: [
                  { $match: { status: 'closed', 'dealClosed.isClosed': true } },
                  { $count: 'count' },
                ],
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const formatted = inquiries.map((inv) => {
      const subject =
        inv.inquiryCategory === 'property'
          ? inv.property
            ? {
                type: 'property',
                id: inv.property._id,
                title: inv.propertyTitle || inv.property.title,
                slug: inv.property?.slug,
                images: selectLeadImages(inv.property?.images),
                location: inv.property?.location,
                listingType: inv.property?.listingType,
                price: inv.property?.price,
              }
            : null
          : inv.project
            ? {
                type: 'project',
                id: inv.project._id,
                title: inv.projectTitle || inv.project.projectName,
                slug: inv.project?.slug,
                images: selectLeadImages(inv.project?.images),
                location: inv.project?.location,
                unit: inv.unit ? { id: inv.unit._id, unitNumber: inv.unit.unitNumber, status: inv.unit.status } : null,
              }
            : null;

      return {
        id: inv._id,
        inquiryCategory: inv.inquiryCategory,
        inquiryType: inv.inquiryType,
        message: inv.message ? (inv.message.length > 100 ? inv.message.slice(0, 100) + '...' : inv.message) : null,
        status: inv.status,
        inquiredAt: inv.inquiredAt,
        attendedAt: inv.attendedAt,
        closedAt: inv.closedAt,
        customer: inv.customer
          ? {
              userId: inv.customer.userId?._id || inv.customer.userId || null,
              name: inv.customer.name,
              email: inv.customer.email,
              phoneNumber: inv.customer.phoneNumber,
              profilePicture: inv.customer.userId?.profilePicture || 'profileless.png',
            }
          : null,
        subject,
        dealClosed:
          inv.dealClosed?.isClosed === true
            ? {
                dealType: inv.dealClosed.dealType,
                dealAmount: inv.dealClosed.dealAmount,
                // currency removed — lives in DealClosure now
                closedDate: inv.dealClosed.closedDate,
              }
            : null,
      };
    });

    const counts =
      countAgg && countAgg[0]
        ? {
            new: countAgg[0].new?.[0]?.count ?? 0,
            attended: countAgg[0].attended?.[0]?.count ?? 0,
            closed: countAgg[0].closed?.[0]?.count ?? 0,
            closedSaleRent: countAgg[0].closedSaleRent?.[0]?.count ?? 0,
          }
        : undefined;

    const data = {
      inquiries: formatted,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
    };
    if (counts) data.counts = counts;

    return success(res, 'Inquiries retrieved successfully', data);
  } catch (err) {
    logger.error('Agent list inquiries error', { error: err.message, agentId });
    return failure(res, 500, 'Failed to fetch inquiries', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/inquiries/{id}:
 *   get:
 *     summary: Get single inquiry details (property leads only, customer, and dealClosed)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry retrieved successfully
 *       404:
 *         description: Inquiry not found
 */
const getInquiryById = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    let inquiry = await Inquirys.findOne({
      _id: id,
      agent: agentId,
      inquiryCategory: 'property', // property leads only
    })
      .populate('customer.userId', 'profilePicture')
      .populate({
        path: 'property',
        populate: [
          { path: 'amenities', select: 'name slug icon image' },
          { path: 'listingType', select: 'name slug' },
          { path: 'propertyType', select: 'name slug' },
        ],
      })
      .populate('listingType', 'name slug')
      .populate(
        'dealClosed.dealClosureRef',
        `dealType dealAmount currency commission
       closedDate notes documents`,
      )
      .lean();

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const customer = inquiry.customer
      ? {
          userId: inquiry.customer.userId?._id || inquiry.customer.userId || null,
          name: inquiry.customer.name,
          email: inquiry.customer.email,
          phoneNumber: inquiry.customer.phoneNumber,
          profilePicture: inquiry.customer.userId?.profilePicture || 'profileless.png',
        }
      : null;

    const inquiryPayload = {
      id: inquiry._id,
      inquiryCategory: inquiry.inquiryCategory,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message,
      status: inquiry.status,
      inquiredAt: inquiry.inquiredAt,
      attendedAt: inquiry.attendedAt,
      closedAt: inquiry.closedAt,
      source: inquiry.source,
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
                  documents:
                    inquiry.dealClosed.dealClosureRef.documents || [],
                }
              : null,
          }
        : null,
      notes: inquiry.notes,
      statusHistory: inquiry.statusHistory,
      propertyTitle: inquiry.propertyTitle,
      projectTitle: inquiry.projectTitle,
      listingType: inquiry.listingType,
    };

    return success(res, 'Inquiry retrieved successfully', {
      inquiry: inquiryPayload,
      customer,
      ...(inquiry.property ? { property: inquiry.property } : {}),
    });
  } catch (err) {
    logger.error('Agent get inquiry error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to fetch inquiry', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/inquiries/{id}/status:
 *   post:
 *     summary: Update inquiry status (attend or close-inquiry)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [attend, close-inquiry]
 *               notes:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error or already in that status
 *       404:
 *         description: Inquiry not found
 */
const updateInquiryStatus = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { type, notes, reason } = req.body || {};

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }
  if (!type || !VALID_STATUS_ACTIONS.includes(type)) {
    return failure(res, 400, 'type is required and must be "attend" or "close-inquiry"', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({ _id: id, agent: agentId });
    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const now = new Date();
    const noteText = [notes, reason].filter(Boolean).join(' ').trim() || undefined;

    if (type === 'attend') {
      if (inquiry.status === 'attended') {
        return failure(res, 400, 'Inquiry is already attended', 'VALIDATION_ERROR');
      }
      inquiry.status = 'attended';
      inquiry.attendedAt = now;
      if (noteText) {
        inquiry.statusHistory = inquiry.statusHistory || [];
        inquiry.statusHistory.push({
          status: 'attended',
          changedAt: now,
          changedBy: agentId,
          changedByModel: 'Agents',
          notes: noteText,
        });
      }
    } else {
      if (inquiry.status === 'closed') {
        return failure(res, 400, 'Inquiry is already closed', 'VALIDATION_ERROR');
      }
      inquiry.status = 'closed';
      inquiry.closedAt = now;
      if (noteText) {
        inquiry.statusHistory = inquiry.statusHistory || [];
        inquiry.statusHistory.push({
          status: 'closed',
          changedAt: now,
          changedBy: agentId,
          changedByModel: 'Agents',
          notes: noteText,
        });
      }
    }

    await inquiry.save();

    const updated = await Inquirys.findById(inquiry._id)
      .populate('customer.userId', 'profilePicture')
      .populate('property', 'title slug images location listingType price')
      .populate('project', 'projectName slug images location')
      .populate('unit', 'unitNumber status')
      .lean();

    const inquiryPayload = buildInquirySummary(updated);
    return success(res, type === 'attend' ? 'Inquiry marked as attended' : 'Inquiry closed', { inquiry: inquiryPayload });
  } catch (err) {
    logger.error('Agent update inquiry status error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to update inquiry status', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/inquiries/{id}/close-deal:
 *   post:
 *     summary: Close the deal (sale/rent)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dealType, dealAmount]
 *             properties:
 *               dealType:
 *                 type: string
 *                 enum: [sale, rent]
 *               dealAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *               commission:
 *                 type: number
 *               closedDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deal closed successfully (includes `dealClosureId` and simplified `dealClosed`)
 *       400:
 *         description: Validation error, deal already closed, or property already sold/rented
 *       404:
 *         description: Inquiry not found
 */
const closeDeal = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { dealType, dealAmount, currency, commission, closedDate, notes } = req.body || {};

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }
  if (!dealType || !VALID_DEAL_TYPES.includes(dealType)) {
    return failure(res, 400, 'dealType is required and must be "sale" or "rent"', 'VALIDATION_ERROR');
  }
  if (dealAmount === undefined || dealAmount === null || Number.isNaN(Number(dealAmount))) {
    return failure(res, 400, 'dealAmount is required and must be a number', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({ _id: id, agent: agentId });
    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }
    if (inquiry.status === 'closed' && inquiry.dealClosed?.isClosed) {
      return failure(res, 400, 'Deal already closed for this inquiry', 'VALIDATION_ERROR');
    }

    if (!inquiry.property) {
      return failure(res, 400, 'Inquiry is not linked to a property', 'VALIDATION_ERROR');
    }

    const property = await Properties.findById(inquiry.property)
      .select('status')
      .lean();

    if (!property) {
      return failure(res, 404, 'Property not found', 'NOT_FOUND');
    }

    if (property.status === 'sold' || property.status === 'rented') {
      const message =
        property.status === 'rented'
          ? 'This property has already been rented. You cannot close another deal for it.'
          : 'This property has already been sold. You cannot close another deal for it.';
      return failure(res, 400, message, 'PROPERTY_UNAVAILABLE');
    }

    const existingPropertyDeal = await Inquirys.findOne({
      property: inquiry.property,
      _id: { $ne: inquiry._id },
      'dealClosed.isClosed': true,
    })
      .select('_id')
      .lean();

    if (existingPropertyDeal) {
      return failure(
        res,
        400,
        'A deal has already been closed for this property',
        'PROPERTY_UNAVAILABLE',
      );
    }

    const now = new Date();
    const closedDateVal = closedDate ? new Date(closedDate) : now;
    if (isNaN(closedDateVal.getTime())) {
      return failure(res, 400, 'Invalid closedDate', 'VALIDATION_ERROR');
    }

    // Step 1: Get agencyId from inquiry
    const agencyId = inquiry.agency;

    // Step 2: Create DealClosure record
    const dealClosure = await DealClosure.create({
      dealCategory: 'property',
      property: inquiry.property,
      inquiry: inquiry._id,
      agent: agentId,
      agency: agencyId,
      customer: {
        userId: inquiry.customer?.userId || undefined,
        name: inquiry.customer?.name,
        email: inquiry.customer?.email,
        phoneNumber: inquiry.customer?.phoneNumber,
      },
      dealType,
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      commission:
        commission != null ? { amount: Number(commission) } : undefined,
      notes: notes || undefined,
      closedDate: closedDateVal,
      closedBy: agentId,
      status: 'approved',
    });

    // Step 3: Update inquiry with simplified dealClosed
    inquiry.status = 'closed';
    inquiry.closedAt = closedDateVal;
    inquiry.dealClosed = {
      isClosed: true,
      dealClosureRef: dealClosure._id,
      dealType,
      dealAmount: Number(dealAmount),
      closedDate: closedDateVal,
    };
    await inquiry.save();

    // Update property status + dealInfo after deal close so admin/property detail can show deal fields.
    await Properties.findByIdAndUpdate(inquiry.property, {
      $set: {
        status: dealType === 'sale' ? 'sold' : 'rented',
        dealInfo: {
          dealType,
          dealAmount: Number(dealAmount),
          dealClosedDate: closedDateVal,
          customer: {
            name: inquiry.customer?.name,
            email: inquiry.customer?.email,
            phone: inquiry.customer?.phoneNumber,
          },
        },
      },
    });

    try {
      await recalcAgentStatistics(agentId);
    } catch (statsErr) {
      logger.error('Failed to recalc agent statistics after deal close', {
        error: statsErr.message,
        agentId,
        inquiryId: id,
      });
    }

    const updated = await Inquirys.findById(inquiry._id)
      .populate('customer.userId', 'profilePicture')
      .populate('property', 'title slug images location listingType price')
      .populate('project', 'projectName slug images location')
      .populate('unit', 'unitNumber status')
      .lean();

    const inquiryPayload = buildInquirySummary(updated);

    void notifyAgencyOnPropertyDealClosed({
      agencyId: inquiry.agency,
      propertyId: inquiry.property,
      propertyTitle: updated?.property?.title || inquiry.propertyTitle || 'Property',
      image: pickPrimaryImage(updated?.property?.images),
      dealType,
      dealAmount: Number(dealAmount),
      currency: currency || 'AED',
      agentName: req.user?.fullName || req.user?.name || 'Agent',
    }).catch((notifyErr) => {
      logger.error('Failed notifying agency after property deal close', {
        error: notifyErr.message,
        inquiryId: id,
        agencyId: inquiry.agency,
      });
    });

    return success(res, 'Deal closed successfully', {
      inquiry: inquiryPayload,
      dealClosureId: dealClosure._id,
    });
  } catch (err) {
    logger.error('Agent close deal error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to close deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/inquiries/{id}:
 *   delete:
 *     summary: Delete an inquiry
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry deleted successfully
 *       404:
 *         description: Inquiry not found
 */
const deleteInquiry = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const result = await Inquirys.findOneAndDelete({ _id: id, agent: agentId });
    if (!result) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }
    return success(res, 'Inquiry deleted successfully', {});
  } catch (err) {
    logger.error('Agent delete inquiry error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to delete inquiry', 'SERVER_ERROR');
  }
});

function buildInquirySummary(inq) {
  if (!inq) return null;
  const subject =
    inq.inquiryCategory === 'property'
      ? inq.property
        ? { type: 'property', id: inq.property._id, title: inq.propertyTitle || inq.property.title, slug: inq.property.slug }
        : null
      : inq.project
        ? {
            type: 'project',
            id: inq.project._id,
            title: inq.projectTitle || inq.project.projectName,
            slug: inq.project.slug,
            unit: inq.unit ? { id: inq.unit._id, unitNumber: inq.unit.unitNumber } : null,
          }
        : null;

  return {
    id: inq._id,
    inquiryCategory: inq.inquiryCategory,
    inquiryType: inq.inquiryType,
    message: inq.message,
    status: inq.status,
    inquiredAt: inq.inquiredAt,
    attendedAt: inq.attendedAt,
    closedAt: inq.closedAt,
    customer: inq.customer
      ? {
          userId: inq.customer.userId?._id || inq.customer.userId || null,
          name: inq.customer.name,
          email: inq.customer.email,
          phoneNumber: inq.customer.phoneNumber,
          profilePicture: inq.customer.userId?.profilePicture || 'profileless.png',
        }
      : null,
    subject,
    dealClosed: inq.dealClosed?.isClosed
      ? {
          isClosed: true,
          dealType: inq.dealClosed.dealType,
          dealAmount: inq.dealClosed.dealAmount,
          closedDate: inq.dealClosed.closedDate,
          // currency/commission/notes in DealClosure
        }
      : null,
  };
}

module.exports = {
  listInquiries,
  getInquiryById,
  updateInquiryStatus,
  closeDeal,
  deleteInquiry,
};
