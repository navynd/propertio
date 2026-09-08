const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Inquirys = require('../../models/inquirysModel');
const DealClosure = require('../../models/dealClosureModel');
const Properties = require('../../models/propertiesModal');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const {
  INQUIRY_STATUS,
  INQUIRY_TYPE,
  INQUIRY_DEAL_TYPES,
  INQUIRY_STATUS_ACTION_VALUES,
} = require('../../utils/constants');

const { Types } = mongoose;

const VALID_STATUSES = INQUIRY_STATUS.map((status) => status.value);
const VALID_INQUIRY_TYPES = INQUIRY_TYPE.map((type) => type.value);
const VALID_STATUS_ACTIONS = INQUIRY_STATUS_ACTION_VALUES;
const VALID_DEAL_TYPES = INQUIRY_DEAL_TYPES.map((type) => type.value);

/**
 * Agents.specialization refs JobTitles — return a stable shape whether populated or only an id.
 */
function formatAgentForInquiryResponse(agent) {
  if (!agent || typeof agent !== 'object') return null;

  const spec = agent.specialization;
  let specialization = null;
  if (spec && typeof spec === 'object' && 'title' in spec) {
    specialization = {
      id: spec._id,
      title: spec.title,
      description: spec.description ?? null,
    };
  } else if (spec != null) {
    specialization = { id: spec };
  }

  return {
    id: agent._id,
    fullName: agent.fullName,
    email: agent.email,
    phoneNumber: agent.phoneNumber,
    profilePicture: agent.profilePicture,
    position: agent.position,
    agentType: agent.agentType ?? null,
    specialization,
  };
}

/**
 * @swagger
 * /agency/inquiries:
 *   get:
 *     summary: List property inquiries for the authenticated agency (project inquiries use a separate API)
 *     tags: [Agency]
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
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: agentId
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    status,
    type,
    propertyId,
    agentId,
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

  const filter = {
    agency: new Types.ObjectId(agencyId),
    inquiryCategory: 'property',
  };

  if (agentId && Types.ObjectId.isValid(agentId)) {
    filter.agent = new Types.ObjectId(agentId);
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
        .populate('property', 'title slug images location listingType price')
        .populate('customer.userId', 'profilePicture')
        .populate({
          path: 'agent',
          select: 'fullName email phoneNumber profilePicture position specialization agentType',
          populate: { path: 'specialization', select: 'title description' },
        })
        .sort({ inquiredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inquirys.countDocuments(filter),
      includeCounts === 'true' || includeCounts === true
        ? Inquirys.aggregate([
            {
              $match: {
                agency: new Types.ObjectId(agencyId),
                inquiryCategory: 'property',
              },
            },
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
      const subject = inv.property
        ? {
            type: 'property',
            id: inv.property._id,
            title: inv.propertyTitle || inv.property.title,
            slug: inv.property?.slug,
            images: inv.property?.images,
            location: inv.property?.location,
            listingType: inv.property?.listingType,
            price: inv.property?.price,
          }
        : null;

      const agent = formatAgentForInquiryResponse(inv.agent);

      return {
        id: inv._id,
        inquiryCategory: inv.inquiryCategory,
        inquiryType: inv.inquiryType,
        message: inv.message ? (inv.message.length > 100 ? inv.message.slice(0, 100) + '...' : inv.message) : null,
        status: inv.status,
        inquiredAt: inv.inquiredAt,
        attendedAt: inv.attendedAt,
        closedAt: inv.closedAt,
        customer: {
          id: inv.customer?.userId?._id || inv.customer?.userId || null,
          name: inv.customer?.name,
          email: inv.customer?.email,
          phoneNumber: inv.customer?.phoneNumber,
          profilePicture: inv.customer?.userId?.profilePicture || "profileless.png",
        },
        subject,
        agent,
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
    logger.error('Agency list inquiries error', { error: err.message, agencyId });
    return failure(res, 500, 'Failed to fetch inquiries', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/inquiries/{id}:
 *   get:
 *     summary: Get single inquiry details for agency (dealClosed includes dealClosureRef)
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    let inquiry = await Inquirys.findOne({ _id: id, agency: agencyId })
      .populate({
        path: 'property',
        populate: [
          { path: 'amenities', select: 'name slug category icon image' },
          { path: 'listingType', select: 'name slug transaction category' },
          { path: 'propertyType', select: 'name slug category' },
        ],
      })
      .populate({
        path: 'project',
        populate: { path: 'amenities', select: 'name slug category icon image' },
      })
      .populate('unit')
      .populate('listingType', 'name slug')
      .populate('customer.userId', 'profilePicture')
      .populate({
        path: 'agent',
        select: 'fullName email phoneNumber profilePicture position specialization agentType',
        populate: { path: 'specialization', select: 'title description' },
      })
      .populate(
        'dealClosed.dealClosureRef',
        `dealType dealAmount currency commission
       closedDate notes contractDetails
       paymentDetails documents`,
      )
      .lean();

    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    const customer = {
      name: inquiry.customer?.name,
      email: inquiry.customer?.email,
      phoneNumber: inquiry.customer?.phoneNumber,
      userId: inquiry.customer?.userId?._id || inquiry.customer?.userId,
      profilePicture:
        inquiry.customer?.userId?.profilePicture ||
        inquiry.customer?.profilePicture ||
        'profileless.png',
    };

    let property = null;
    let project = null;
    let unit = null;

    if (inquiry.inquiryCategory === 'property' && inquiry.property) {
      property = inquiry.property;
    }
    if (inquiry.inquiryCategory === 'project') {
      if (inquiry.project) project = inquiry.project;
      if (inquiry.unit) unit = inquiry.unit;
    }

    const agent = formatAgentForInquiryResponse(inquiry.agent);

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
            // Full deal info from DealClosure
            dealClosureRef: inquiry.dealClosed.dealClosureRef
              ? {
                  id: inquiry.dealClosed.dealClosureRef._id,
                  currency: inquiry.dealClosed.dealClosureRef.currency,
                  commission: inquiry.dealClosed.dealClosureRef.commission || null,
                  notes: inquiry.dealClosed.dealClosureRef.notes || null,
                  contractDetails:
                    inquiry.dealClosed.dealClosureRef.contractDetails || null,
                  paymentDetails:
                    inquiry.dealClosed.dealClosureRef.paymentDetails || null,
                  documents: inquiry.dealClosed.dealClosureRef.documents || [],
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
      agent,
      ...(property ? { property } : {}),
      ...(project ? { project } : {}),
      ...(unit ? { unit } : {}),
    });
  } catch (err) {
    logger.error('Agency get inquiry error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to fetch inquiry', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/inquiries/{id}/status:
 *   post:
 *     summary: Update inquiry status (attend or close-inquiry) from agency side
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
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
    const inquiry = await Inquirys.findOne({ _id: id, agency: agencyId });
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
          notes: noteText,
        });
      }
    }

    await inquiry.save();

    const updated = await Inquirys.findById(inquiry._id)
      .populate('property', 'title slug images location listingType price')
      .populate('project', 'projectName slug images location')
      .populate('unit', 'unitNumber status')
      .populate({
        path: 'agent',
        select: 'fullName email phoneNumber profilePicture position specialization agentType',
        populate: { path: 'specialization', select: 'title description' },
      })
      .lean();

    const inquiryPayload = buildInquirySummary(updated, true);
    return success(res, type === 'attend' ? 'Inquiry marked as attended' : 'Inquiry closed', { inquiry: inquiryPayload });
  } catch (err) {
    logger.error('Agency update inquiry status error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to update inquiry status', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/inquiries/{id}/notes:
 *   post:
 *     summary: Add a note to an inquiry from agency side
 *     tags: [Agency]
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
 *             required: [note]
 *             properties:
 *               note:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Note added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Inquiry not found
 */
const addNote = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { note, isPrivate = false } = req.body || {};

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }
  if (!note || typeof note !== 'string' || !note.trim()) {
    return failure(res, 400, 'note is required', 'VALIDATION_ERROR');
  }

  try {
    const inquiry = await Inquirys.findOne({ _id: id, agency: agencyId });
    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }

    inquiry.notes = inquiry.notes || [];
    inquiry.notes.push({
      note: note.trim(),
      isPrivate: Boolean(isPrivate),
      addedAt: new Date(),
    });

    await inquiry.save();

    const updated = await Inquirys.findById(inquiry._id)
      .populate('property', 'title slug images location listingType price')
      .populate('project', 'projectName slug images location')
      .populate('unit', 'unitNumber status')
      .populate({
        path: 'agent',
        select: 'fullName email phoneNumber profilePicture position specialization agentType',
        populate: { path: 'specialization', select: 'title description' },
      })
      .lean();

    const inquiryPayload = buildInquirySummary(updated, true);
    return success(res, 'Note added successfully', { inquiry: inquiryPayload });
  } catch (err) {
    logger.error('Agency add note error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to add note', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/inquiries/{id}/close-deal:
 *   post:
 *     summary: Close the deal (sale/rent) from agency side
 *     tags: [Agency]
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
 *         description: Deal closed successfully (dealClosed simplified via DealClosure)
 *       400:
 *         description: Validation error or deal already closed
 *       404:
 *         description: Inquiry not found
 */
const closeDeal = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
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
    const inquiry = await Inquirys.findOne({ _id: id, agency: agencyId });
    if (!inquiry) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }
    if (inquiry.status === 'closed' && inquiry.dealClosed?.isClosed) {
      return failure(res, 400, 'Deal already closed for this inquiry', 'VALIDATION_ERROR');
    }

    const now = new Date();
    const closedDateVal = closedDate ? new Date(closedDate) : now;
    if (isNaN(closedDateVal.getTime())) {
      return failure(res, 400, 'Invalid closedDate', 'VALIDATION_ERROR');
    }

    inquiry.status = 'closed';
    inquiry.closedAt = closedDateVal;
    // Step 1: Create DealClosure record
    const dealClosure = await DealClosure.create({
      dealCategory: 'property',
      property: inquiry.property,
      inquiry: inquiry._id,
      agent: inquiry.agent,
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
      closedBy: inquiry.agent,
      status: 'approved',
    });

    // Step 2: Update inquiry with simplified dealClosed
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

    // Keep property deal snapshot in sync for admin/property detail APIs.
    if (inquiry.property) {
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
    }

    const updated = await Inquirys.findById(inquiry._id)
      .populate('property', 'title slug images location listingType price')
      .populate('project', 'projectName slug images location')
      .populate('unit', 'unitNumber status')
      .populate({
        path: 'agent',
        select: 'fullName email phoneNumber profilePicture position specialization agentType',
        populate: { path: 'specialization', select: 'title description' },
      })
      .lean();

    const inquiryPayload = buildInquirySummary(updated, true);
    return success(res, 'Deal closed successfully', { inquiry: inquiryPayload });
  } catch (err) {
    logger.error('Agency close deal error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to close deal', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/inquiries/{id}:
 *   delete:
 *     summary: Delete an inquiry from agency side
 *     tags: [Agency]
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
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid inquiry ID', 'VALIDATION_ERROR');
  }

  try {
    const result = await Inquirys.findOneAndDelete({ _id: id, agency: agencyId });
    if (!result) {
      return failure(res, 404, 'Inquiry not found', 'NOT_FOUND');
    }
    return success(res, 'Inquiry deleted successfully', {});
  } catch (err) {
    logger.error('Agency delete inquiry error', { error: err.message, inquiryId: id });
    return failure(res, 500, 'Failed to delete inquiry', 'SERVER_ERROR');
  }
});

function buildInquirySummary(inq, includeAgent = false) {
  if (!inq) return null;
  const subject =
    inq.inquiryCategory === 'property'
      ? inq.property
        ? {
            type: 'property',
            id: inq.property._id,
            title: inq.propertyTitle || inq.property.title,
            slug: inq.property.slug,
          }
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

  const base = {
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
          id: inq.customer.userId?._id || inq.customer.userId || null,
          name: inq.customer.name,
          email: inq.customer.email,
          phoneNumber: inq.customer.phoneNumber,
          profilePicture: inq.customer.userId?.profilePicture || "profileless.png",
        }
      : null,
    subject,
    dealClosed: inq.dealClosed?.isClosed
      ? {
          isClosed: true,
          dealType: inq.dealClosed.dealType,
          dealAmount: inq.dealClosed.dealAmount,
          closedDate: inq.dealClosed.closedDate,
          // currency/commission/notes are in DealClosure
          // not needed for list summary
        }
      : null,
  };

  if (includeAgent && inq.agent && typeof inq.agent === 'object') {
    base.agent = formatAgentForInquiryResponse(inq.agent);
  }

  return base;
}

module.exports = {
  listInquiries,
  getInquiryById,
  updateInquiryStatus,
  addNote,
  closeDeal,
  deleteInquiry,
};

