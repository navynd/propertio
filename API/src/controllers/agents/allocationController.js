const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const PropertyAllocation = require('../../models/propertyallocationModel');
const { success, failure } = require('../../utils/helpers');
const uploadService = require('../../services/uploadService');
const { logger } = require('../../utils/logger');

const VALID_STATUSES = ['pending', 'in-progress', 'completed', 'cancelled'];

/**
 * When `listingLink` is sent, empty clears; non-empty must be http(s) URL whose path
 * ends with a MongoDB ObjectId (last segment: 24 hex), e.g. …/propertydrilldown/69de2c13bbed8e594c50e513.
 * Host is not restricted.
 * @param {unknown} value
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
const validateListingLink = (value) => {
  if (value === undefined || value === null) return { ok: true };
  const s = String(value).trim();
  if (s === '') return { ok: true };
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, message: 'Listing link must start with http:// or https://' };
    }
    if (!u.hostname) {
      return { ok: false, message: 'Listing link must be a valid URL with a host' };
    }
    const segments = u.pathname.split('/').filter(Boolean);
    const last = segments.length ? segments[segments.length - 1].toLowerCase() : '';
    if (!last || !/^[a-f0-9]{24}$/.test(last) || !mongoose.Types.ObjectId.isValid(last)) {
      return {
        ok: false,
        message: 'Listing link must end with a valid property id (24-character hex) as the last part of the path',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Listing link must be a valid http or https URL' };
  }
};

// Build document URL (S3/CloudFront when enabled)
// const buildDocumentUrl = (storedValue) => {
//   if (!storedValue) return null;
//   const normalized = storedValue.toString();
//   if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
//     return normalized;
//   }
//   const cleanValue = normalized.replace(/^\/+/, '');
//   const relativePath = cleanValue.includes('/') ? cleanValue : `doc/agency/${cleanValue}`;
//   return uploadService.getUploadUrl(relativePath);
// };

const formatAllocation = (allocation) => ({
  id: allocation._id,
  title: allocation.title,
  // document: buildDocumentUrl(allocation.document),
  document: allocation.document,
  documentType: allocation.documentType,
  status: allocation.status,
  sentAt: allocation.sentAt,
  deadline: allocation.deadline,
  startedAt: allocation.startedAt,
  completedAt: allocation.completedAt,
  propertyDetails: allocation.propertyDetails,
  agencyNotes: allocation.agencyNotes,
  agentNotes: allocation.agentNotes || [],
  completedProperty: allocation.completedProperty
    ? {
        id: allocation.completedProperty._id,
        title: allocation.completedProperty.title,
        slug: allocation.completedProperty.slug,
        images: allocation.completedProperty.images,
        price: allocation.completedProperty.price,
        listingType: allocation.completedProperty.listingType,
      }
    : null,
  listingLink: allocation.listingLink || null,
  completionNotes: allocation.completionNotes || null,
  extensionRequested: allocation.extensionRequested || null,
});

/**
 * @swagger
 * /agents/allocated-properties:
 *   get:
 *     summary: List and search property allocations for the authenticated agent
 *     description: Returns paginated allocations assigned to the logged-in agent. Optional filter by status and text search on title, location, property type, description.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, location, property type, or description (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         description: Filter allocations by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Allocations retrieved successfully
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
 *                     allocations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           document:
 *                             type: string
 *                             nullable: true
 *                           documentType:
 *                             type: string
 *                             enum: [pdf, doc, docx, other]
 *                           status:
 *                             type: string
 *                             enum: [pending, in-progress, completed, cancelled]
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                           deadline:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           propertyDetails:
 *                             type: object
 *                             nullable: true
 *                           agencyNotes:
 *                             type: string
 *                             nullable: true
 *                           completedProperty:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                           listingLink:
 *                             type: string
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * @route GET /api/agents/allocated-properties
 * @desc List property allocations for the authenticated agent (query: status, page, limit)
 */
const listAllocatedProperties = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { status, search, page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { agent: new mongoose.Types.ObjectId(agentId) };
  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { title: regex },
      { 'propertyDetails.location': regex },
      { 'propertyDetails.propertyType': regex },
      { 'propertyDetails.description': regex },
    ];
  }

  try {
    const [allocations, total] = await Promise.all([
      PropertyAllocation.find(filter)
        .populate('completedProperty', 'title slug images price listingType')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PropertyAllocation.countDocuments(filter),
    ]);

    const formattedAllocations = allocations.map((a) => ({
      id: a._id,
      title: a.title,
      // document: buildDocumentUrl(a.document),
      document: a.document,
      documentType: a.documentType,
      status: a.status,
      sentAt: a.sentAt,
      deadline: a.deadline,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      propertyDetails: a.propertyDetails,
      agencyNotes: a.agencyNotes,
      completedProperty: a.completedProperty
        ? {
            id: a.completedProperty._id,
            title: a.completedProperty.title,
            slug: a.completedProperty.slug,
          }
        : null,
      listingLink: a.listingLink || null,
    }));

    return success(res, 'Allocations retrieved successfully', {
      allocations: formattedAllocations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    logger.error('Agent list allocations error', { error: err.message, agentId });
    return failure(res, 500, 'Failed to fetch allocations', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/allocated-properties/{id}:
 *   get:
 *     summary: Get a single property allocation by ID
 *     description: Returns full details of an allocation assigned to the authenticated agent.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Allocation ObjectId
 *     responses:
 *       200:
 *         description: Allocation retrieved successfully
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
 *                     allocation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         document:
 *                           type: string
 *                           nullable: true
 *                         documentType:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [pending, in-progress, completed, cancelled]
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *                         deadline:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         propertyDetails:
 *                           type: object
 *                           nullable: true
 *                         agencyNotes:
 *                           type: string
 *                           nullable: true
 *                         agentNotes:
 *                           type: array
 *                           items:
 *                             type: object
 *                         completedProperty:
 *                           type: object
 *                           nullable: true
 *                         listingLink:
 *                           type: string
 *                           nullable: true
 *                         completionNotes:
 *                           type: string
 *                           nullable: true
 *                         extensionRequested:
 *                           type: object
 *                           nullable: true
 *       400:
 *         description: Invalid allocation ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Allocation not found
 *       500:
 *         description: Server error
 *
 * @route GET /api/agents/allocated-properties/:id
 * @desc Get a single property allocation for the authenticated agent
 */
const getAllocatedPropertyById = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid allocation ID', 'VALIDATION_ERROR');
  }

  try {
    const allocation = await PropertyAllocation.findOne({
      _id: id,
      agent: agentId,
    })
      .populate('completedProperty', 'title slug images price listingType')
      .lean();

    if (!allocation) {
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    return success(res, 'Allocation retrieved successfully', {
      allocation: formatAllocation(allocation),
    });
  } catch (err) {
    logger.error('Agent get allocation error', { error: err.message, allocationId: id });
    return failure(res, 500, 'Failed to fetch allocation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/allocated-properties/{id}/complete:
 *   post:
 *     summary: Mark an allocation as completed
 *     description: Sets status to completed and optionally stores listing link and completion notes. Only allowed when status is pending or in-progress.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Allocation ObjectId
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               listingLink:
 *                 type: string
 *                 description: |
 *                   Optional. Empty clears. When set, must be http(s); the last path segment must be the
 *                   property MongoDB id (24 hex), e.g. https://molumulk.tj/propertydrilldown/69de2c13bbed8e594c50e513
 *                 example: "https://molumulk.tj/propertydrilldown/507f1f77bcf86cd799439011"
 *               notes:
 *                 type: string
 *                 description: Completion notes (optional)
 *                 example: "Listed with updated photos and description."
 *     responses:
 *       200:
 *         description: Allocation marked as completed
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
 *                     allocation:
 *                       type: object
 *                       description: Updated allocation with status completed
 *       400:
 *         description: Invalid allocation ID, or allocation already completed/cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Allocation not found
 *       500:
 *         description: Server error
 *
 * @route POST /api/agents/allocated-properties/:id/complete
 * @desc Mark allocation as completed with listing link and notes
 */
const completeAllocation = asyncHandler(async (req, res) => {
  const agentId = req.user?.id || req.user?._id;
  if (!agentId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { listingLink, notes } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid allocation ID', 'VALIDATION_ERROR');
  }

  if (listingLink !== undefined) {
    const linkCheck = validateListingLink(listingLink);
    if (!linkCheck.ok) {
      return failure(res, 400, linkCheck.message, 'VALIDATION_ERROR');
    }
  }

  try {
    const allocation = await PropertyAllocation.findOne({
      _id: id,
      agent: agentId,
    });

    if (!allocation) {
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    if (allocation.status === 'cancelled') {
      return failure(res, 400, 'Cannot complete a cancelled allocation', 'VALIDATION_ERROR');
    }

    const wasCompleted = allocation.status === 'completed';
    if (!wasCompleted) {
      allocation.status = 'completed';
      allocation.completedAt = new Date();
    }
    if (listingLink !== undefined) allocation.listingLink = listingLink || null;
    if (notes !== undefined) allocation.completionNotes = notes || null;
    await allocation.save();

    const populated = await PropertyAllocation.findById(allocation._id)
      .populate('completedProperty', 'title slug images price listingType')
      .lean();

    return success(res, wasCompleted ? 'Allocation updated successfully' : 'Allocation marked as completed', {
      allocation: formatAllocation(populated),
    });
  } catch (err) {
    logger.error('Agent complete allocation error', { error: err.message, allocationId: id });
    return failure(res, 500, 'Failed to complete allocation', 'SERVER_ERROR');
  }
});

module.exports = {
  listAllocatedProperties,
  getAllocatedPropertyById,
  completeAllocation,
};
