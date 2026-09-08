const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const PropertyAllocation = require('../../models/propertyallocationModel');
const Agent = require('../../models/agentsModel');
const Notification = require('../../models/notificationModel');
const { success, failure } = require('../../utils/helpers');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');
const uploadService = require('../../services/uploadService');
const { validateDocumentFile, generateUniqueFilename, FILE_CATEGORIES } = require('../../utils/fileHelpers');
const { logger } = require('../../utils/logger');
const { escapeRegex } = require('../../utils/searchKeyword');

const PUBLIC_BASE_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '') || 'http://localhost:5000';
const UPLOADS_BASE_URL = `${PUBLIC_BASE_URL}/uploads`;
const DOCUMENTS_FOLDER = 'agencies/property-docs';
const LOCAL_UPLOAD_PATH = process.env.LOCAL_UPLOAD_PATH || path.join(process.cwd(), 'uploads');

// Helper function to build full URL from stored filename/path (uses S3/CloudFront when enabled)
const buildDocumentUrl = (storedValue) => {
  if (!storedValue) return null;
  const normalized = storedValue.toString();

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  const cleanValue = normalized.replace(/^\/+/, '');
  let relativePath;
  if (cleanValue.includes('/')) {
    relativePath = cleanValue;
  } else {
    relativePath = `doc/agency/${cleanValue}`;
  }
  return uploadService.getUploadUrl(relativePath);
};

// Helper function to upload document
const uploadDocument = async (file, folder = DOCUMENTS_FOLDER) => {
  if (!file) {
    throw new Error('No document file provided');
  }

  validateDocumentFile(file);

  const buffer = file.buffer || (file.path ? await fs.readFile(file.path) : null);
  if (!buffer) {
    throw new Error('Invalid document payload: missing buffer or path');
  }

  const filename = generateUniqueFilename(file.originalname, FILE_CATEGORIES.DOCUMENT);
  const targetDir = path.join(LOCAL_UPLOAD_PATH, folder);
  await fs.ensureDir(targetDir);
  const filePath = path.join(targetDir, filename);
  await fs.writeFile(filePath, buffer);

  const relativePath = `${folder}/${filename}`;
  const documentUrl = buildDocumentUrl(relativePath);

  return {
    url: documentUrl,
    filename,
    size: buffer.length,
    mimetype: file.mimetype,
    path: relativePath, // Store only the relative path
  };
};

// Helper function to get document type from mimetype
const getDocumentType = (mimetype) => {
  const normalized = (mimetype || '').toLowerCase();
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('msword') || normalized.includes('wordprocessingml')) {
    return normalized.includes('wordprocessingml') ? 'docx' : 'doc';
  }
  return 'other';
};

// Helper function to send email notification to agent
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

const { resolveAllocationNotificationImage } = require('../../utils/notificationImage');

const sendAllocationEmail = async (agent, allocation) => {
  try {
    const agentName = agent.fullName || 'Agent';
    const notificationSettings = agent?.preferences?.notificationSettings || {};
    const shouldEmail = isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
    const shouldPush = isExpertsPushNotificationEnabled() && notificationSettings.push !== false;
    const documentUrl = buildDocumentUrl(allocation.document);
    const allocationImage = await resolveAllocationNotificationImage(allocation);

    const subject = `New Property Allocation: ${allocation.title}`;
    const title = 'New Property Allocation';
    const body = `You have received a new property allocation: ${allocation.title}`;

    const notification = await Notification.create({
      recipient: {
        recipientType: 'agent',
        recipientId: agent._id,
      },
      title,
      message: body,
      notificationType: 'property-update',
      priority: 'high',
      relatedItem: {
        itemType: 'property',
        itemId: allocation._id,
      },
      channels: {
        email: shouldEmail,
        sms: false,
        push: shouldPush,
        inApp: true,
      },
      actionText: 'View',
      metadata: {
        allocationId: allocation._id?.toString(),
        title: allocation.title,
        propertyName: allocation.title,
        image: allocationImage,
        location: allocation.propertyDetails?.location || null,
        propertyType: allocation.propertyDetails?.propertyType || null,
        estimatedPrice: allocation.propertyDetails?.estimatedPrice || null,
        deadline: allocation.deadline || null,
        documentUrl,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: bold; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Property Allocation</h2>
          </div>
          <div class="content">
            <p>Hi ${agentName},</p>
            <p>You have been assigned a new property to list by your agency.</p>
            
            <div class="details">
              <div class="detail-row"><span class="label">Property Title:</span> ${allocation.title}</div>
              ${allocation.propertyDetails?.location ? `<div class="detail-row"><span class="label">Location:</span> ${allocation.propertyDetails.location}</div>` : ''}
              ${allocation.propertyDetails?.propertyType ? `<div class="detail-row"><span class="label">Property Type:</span> ${allocation.propertyDetails.propertyType}</div>` : ''}
              ${allocation.propertyDetails?.estimatedPrice ? `<div class="detail-row"><span class="label">Estimated Price:</span> ${allocation.propertyDetails.estimatedPrice}</div>` : ''}
              ${allocation.deadline ? `<div class="detail-row"><span class="label">Deadline:</span> ${new Date(allocation.deadline).toLocaleDateString()}</div>` : ''}
              ${allocation.agencyNotes ? `<div class="detail-row"><span class="label">Notes:</span> ${allocation.agencyNotes}</div>` : ''}
            </div>

            <p>Please review the attached document for complete property details.</p>
            <p><a href="${documentUrl}" class="button">View Document</a></p>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              Please log in to your dashboard to access and manage this allocation.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (shouldEmail && agent?.email) {
      await sendEmail(agent.email, subject, html);
      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.email.sent': true,
          'deliveryStatus.email.sentAt': new Date(),
        },
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
              type: 'property-allocation',
              allocationId: allocation._id?.toString() || '',
              agentId: agent._id?.toString() || '',
              title: allocation.title || '',
            },
          });
          anyPushSent = true;
        } catch (pushErr) {
          logger.error('Failed to send allocation push', {
            error: pushErr.message,
            agentId: agent._id,
            allocationId: allocation._id,
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

    logger.info('Allocation email sent to agent', { agentId: agent._id, allocationId: allocation._id });
  } catch (error) {
    logger.error('Failed to send allocation email', { error: error.message, agentId: agent._id });
    // Don't throw - email failure shouldn't block allocation creation
  }
};

const sendAllocationUpdatedNotification = async (agent, allocation) => {
  try {
    const agentName = agent.fullName || 'Agent';
    const notificationSettings = agent?.preferences?.notificationSettings || {};
    const shouldEmail = isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
    const shouldPush = isExpertsPushNotificationEnabled() && notificationSettings.push !== false;
    const documentUrl = buildDocumentUrl(allocation.document);
    const allocationImage = await resolveAllocationNotificationImage(allocation);

    const subject = `Property Allocation Updated: ${allocation.title}`;
    const title = 'Property Allocation Updated';
    const body = `Your allocation was updated: ${allocation.title}`;

    const notification = await Notification.create({
      recipient: {
        recipientType: 'agent',
        recipientId: agent._id,
      },
      title,
      message: body,
      notificationType: 'property-update',
      priority: 'high',
      relatedItem: {
        itemType: 'property',
        itemId: allocation._id,
      },
      channels: {
        email: shouldEmail,
        sms: false,
        push: shouldPush,
        inApp: true,
      },
      actionText: 'View',
      metadata: {
        allocationId: allocation._id?.toString(),
        title: allocation.title,
        propertyName: allocation.title,
        image: allocationImage,
        location: allocation.propertyDetails?.location || null,
        propertyType: allocation.propertyDetails?.propertyType || null,
        estimatedPrice: allocation.propertyDetails?.estimatedPrice || null,
        deadline: allocation.deadline || null,
        documentUrl,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: bold; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Property Allocation Updated</h2>
          </div>
          <div class="content">
            <p>Hi ${agentName},</p>
            <p>Your agency has updated one of your allocations.</p>
            <div class="details">
              <div class="detail-row"><span class="label">Property Title:</span> ${allocation.title}</div>
              ${allocation.propertyDetails?.location ? `<div class="detail-row"><span class="label">Location:</span> ${allocation.propertyDetails.location}</div>` : ''}
              ${allocation.propertyDetails?.propertyType ? `<div class="detail-row"><span class="label">Property Type:</span> ${allocation.propertyDetails.propertyType}</div>` : ''}
              ${allocation.propertyDetails?.estimatedPrice ? `<div class="detail-row"><span class="label">Estimated Price:</span> ${allocation.propertyDetails.estimatedPrice}</div>` : ''}
              ${allocation.deadline ? `<div class="detail-row"><span class="label">Deadline:</span> ${new Date(allocation.deadline).toLocaleDateString()}</div>` : ''}
              ${allocation.agencyNotes ? `<div class="detail-row"><span class="label">Notes:</span> ${allocation.agencyNotes}</div>` : ''}
            </div>
            <p><a href="${documentUrl}" class="button">View Document</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (shouldEmail && agent?.email) {
      await sendEmail(agent.email, subject, html);
      await Notification.findByIdAndUpdate(notification._id, {
        $set: {
          'deliveryStatus.email.sent': true,
          'deliveryStatus.email.sentAt': new Date(),
        },
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
              type: 'property-allocation-updated',
              allocationId: allocation._id?.toString() || '',
              agentId: agent._id?.toString() || '',
              title: allocation.title || '',
            },
          });
          anyPushSent = true;
        } catch (pushErr) {
          logger.error('Failed to send allocation update push', {
            error: pushErr.message,
            agentId: agent._id,
            allocationId: allocation._id,
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
  } catch (error) {
    logger.error('Failed to send allocation updated notification', { error: error.message, agentId: agent?._id });
  }
};

/**
 * @swagger
 * /agency/allocation/send:
 *   post:
 *     summary: Send property details to an agent
 *     description: |
 *       Allows an agency to allocate a property to one of its agents by sending
 *       a title, optional hints, and a PDF/DOC document with full details.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *               - title
 *               - document
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: ID of the agent to allocate the property to
 *                 example: "671b5e943d3fe8fe805dd95a"
 *               title:
 *                 type: string
 *                 description: Property title/name
 *                 example: "Spacious 3BR Apartment in Dubai Marina"
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: PDF/DOC file containing full property details
 *               location:
 *                 type: string
 *                 description: Optional property location hint
 *                 example: "Dubai Marina"
 *               propertyType:
 *                 type: string
 *                 description: Optional property type hint
 *                 example: "Apartment"
 *               expectedPrice:
 *                 type: number
 *                 format: double
 *                 description: Optional expected price or price range hint
 *                 example: 2500000
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Optional deadline by which the agent should list the property
 *                 example: "2025-03-31T00:00:00.000Z"
 *               notes:
 *                 type: string
 *                 description: Additional instructions or notes for the agent
 *                 example: "Focus on buyers looking for marina views."
 *     responses:
 *       200:
 *         description: Property details sent to agent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property details sent to agent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     allocation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "671b5e943d3fe8fe805dd95a"
 *                         title:
 *                           type: string
 *                         agent:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                         document:
 *                           type: string
 *                           description: Public URL of the uploaded document
 *                         status:
 *                           type: string
 *                           enum: [pending, in-progress, completed, cancelled]
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error (missing or invalid fields)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found or does not belong to the agency
 *       500:
 *         description: Server error
 *
 * @route POST /api/agency/allocation/send
 * @desc Send property details to an agent
 */
const sendPropertyToAgent = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { agentId, title, location, propertyType, expectedPrice, deadline, notes } = req.body;
  const document = req.file;

  // Validation
  if (!agentId) {
    return failure(res, 400, 'Agent ID is required', 'VALIDATION_ERROR');
  }
  if (!title || !title.trim()) {
    return failure(res, 400, 'Property title is required', 'VALIDATION_ERROR');
  }
  if (!document) {
    return failure(res, 400, 'Property document is required', 'VALIDATION_ERROR');
  }

  // Validate that agent belongs to this agency
  const agent = await Agent.findOne({ _id: agentId, agency: agencyId, isActive: true });
  if (!agent) {
    return failure(res, 404, 'Agent not found or does not belong to your agency', 'NOT_FOUND');
  }

  try {
    // Upload document using uploadService
    const uploadService = require('../../services/uploadService');
    const uploaded = await uploadService.uploadDocument(document, 'agency');
    const documentType = getDocumentType(document.mimetype);

    // Create property allocation
    const allocation = await PropertyAllocation.create({
      agency: agencyId,
      agent: agentId,
      title: title.trim(),
      document: uploaded.filename, // only store filename in DB
      documentType,
      propertyDetails: {
        location: location?.trim() || undefined,
        propertyType: propertyType?.trim() || undefined,
        estimatedPrice: expectedPrice ? Number(expectedPrice) : undefined,
        description: notes?.trim() || undefined,
      },
      agencyNotes: notes?.trim() || undefined,
      status: 'pending',
      sentAt: new Date(),
      deadline: deadline ? new Date(deadline) : undefined,
    });

    // Add allocation to agent's allocatedProperties array
    await Agent.findByIdAndUpdate(agentId, {
      $addToSet: { allocatedProperties: allocation._id },
    });

    // Send email notification to agent
    await sendAllocationEmail(agent, allocation);

    // Build standardized response
    const responseData = uploadService.buildStandardResponse(
      uploaded,
      { documents: 'agency' },
      {
        allocation: {
          id: allocation._id,
          title: allocation.title,
          agent: {
            id: agent._id,
            name: agent.fullName,
            email: agent.email,
          },
          status: allocation.status,
          sentAt: allocation.sentAt,
        }
      }
    );

    return success(res, 'Property details sent to agent successfully', responseData);
  } catch (error) {
    logger.error('Error sending property to agent', { error: error.message, agencyId, agentId });
    return failure(res, 500, error.message || 'Failed to send property to agent', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/allocation/list:
 *   get:
 *     summary: List property allocations sent by the authenticated agency
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filter allocations by a specific agent
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         description: Filter allocations by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter allocations sent on or after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter allocations sent on or before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match on allocation title only
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
 *         description: Allocations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
 *                           agent:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                           document:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, in-progress, completed, cancelled]
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                           deadline:
 *                             type: string
 *                             format: date-time
 *                           listingLink:
 *                             type: string
 *                             nullable: true
 *                           completedAt:
 *                             type: string
 *                             format: date-time
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
 * @route GET /api/agency/allocation/list
 * @desc Get all property allocations sent by this agency
 */
const getAllocatedProperties = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { agentId, status, startDate, endDate, search, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = { agency: agencyId };
  if (agentId) {
    filter.agent = agentId;
  }
  if (status && ['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    filter.status = status;
  }
  if (startDate || endDate) {
    const sentAtFilter = {};

    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (Number.isNaN(parsedStartDate.getTime())) {
        return failure(res, 400, 'Invalid startDate', 'BAD_REQUEST');
      }
      sentAtFilter.$gte = parsedStartDate;
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (Number.isNaN(parsedEndDate.getTime())) {
        return failure(res, 400, 'Invalid endDate', 'BAD_REQUEST');
      }
      sentAtFilter.$lte = parsedEndDate;
    }

    filter.sentAt = sentAtFilter;
  }

  const searchTrim = typeof search === 'string' ? search.trim() : '';
  if (searchTrim) {
    const escaped = escapeRegex(searchTrim);
    if (escaped) {
      filter.title = { $regex: escaped, $options: 'i' };
    }
  }

  try {
    const [allocations, total] = await Promise.all([
      PropertyAllocation.find(filter)
        .populate({
          path: 'agent',
          select: 'fullName email phoneNumber profilePicture specialization',
          populate: { path: 'specialization', select: 'title description' },
        })
        .populate('completedProperty', 'title slug')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PropertyAllocation.countDocuments(filter),
    ]);

    const formattedAllocations = allocations.map((allocation) => {
      const agent = allocation.agent;
      return {
        id: allocation._id,
        title: allocation.title,
        agent: agent
          ? {
              id: agent._id,
              name: agent.fullName,
              email: agent.email,
              phone: agent.phoneNumber,
              profilePicture: agent.profilePicture,
              specialization: agent.specialization
                ? {
                    id: agent.specialization._id,
                    title: agent.specialization.title,
                    description: agent.specialization.description || null,
                  }
                : null,
            }
          : null,
        // document: buildDocumentUrl(allocation.document),
        document: allocation.document,
        status: allocation.status,
        sentAt: allocation.sentAt,
        deadline: allocation.deadline,
        propertyDetails: allocation.propertyDetails,
        agencyNotes: allocation.agencyNotes,
        completedProperty: allocation.completedProperty
          ? {
              id: allocation.completedProperty._id,
              title: allocation.completedProperty.title,
              slug: allocation.completedProperty.slug,
            }
          : null,
        listingLink: allocation.listingLink || null,
        completedAt: allocation.completedAt || null,
      };
    });

    return success(res, 'Allocations retrieved successfully', {
      allocations: formattedAllocations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching allocations', { error: error.message, agencyId });
    return failure(res, 500, 'Failed to fetch allocations', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/allocation/{id}:
 *   get:
 *     summary: Get details of a specific property allocation
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Allocation ID
 *     responses:
 *       200:
 *         description: Allocation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
 *                         documentType:
 *                           type: string
 *                           enum: [pdf, doc, docx, other]
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
 *                         propertyDetails:
 *                           type: object
 *                           properties:
 *                             location:
 *                               type: string
 *                             propertyType:
 *                               type: string
 *                             estimatedPrice:
 *                               type: number
 *                               format: double
 *                             description:
 *                               type: string
 *                         agent:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                             phone:
 *                               type: string
 *                             whatsapp:
 *                               type: string
 *                             specialization:
 *                               type: string
 *                         completedProperty:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                             title:
 *                               type: string
 *                             slug:
 *                               type: string
 *                             images:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             price:
 *                               type: number
 *                             listingType:
 *                               type: string
 *                         listingLink:
 *                           type: string
 *                           nullable: true
 *                         completionNotes:
 *                           type: string
 *                           nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Allocation not found
 *       500:
 *         description: Server error
 *
 * @route GET /api/agency/allocation/:id
 * @desc Get full allocation details
 */
const getPropertyAllocation = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;

  try {
    const allocation = await PropertyAllocation.findOne({
      _id: id,
      agency: agencyId,
    })
      .populate('agent', 'fullName email phoneNumber whatsappNumber specialization agentType')
      .populate('completedProperty', 'title slug images price listingType')
      .lean();

    if (!allocation) {
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    const formattedAllocation = {
      id: allocation._id,
      title: allocation.title,
      document: buildDocumentUrl(allocation.document),
      documentType: allocation.documentType,
      status: allocation.status,
      sentAt: allocation.sentAt,
      deadline: allocation.deadline,
      startedAt: allocation.startedAt,
      completedAt: allocation.completedAt,
      propertyDetails: allocation.propertyDetails,
      agencyNotes: allocation.agencyNotes,
      agentNotes: allocation.agentNotes || [],
      agent: {
        id: allocation.agent._id,
        name: allocation.agent.fullName,
        email: allocation.agent.email,
        phone: allocation.agent.phoneNumber,
        whatsapp: allocation.agent.whatsappNumber,
        specialization: allocation.agent.specialization,
        agentType: allocation.agent.agentType,
      },
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
    };

    return success(res, 'Allocation retrieved successfully', {
      allocation: formattedAllocation,
    });
  } catch (error) {
    logger.error('Error fetching allocation', { error: error.message, allocationId: id });
    return failure(res, 500, 'Failed to fetch allocation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/allocation/{id}:
 *   put:
 *     summary: Update a property allocation
 *     description: |
 *       Allows an agency to update title, notes, deadline, and reassign the allocation
 *       to a different agent (only when status is `pending`).
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Allocation ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Property Title"
 *               notes:
 *                 type: string
 *                 example: "Update the photos and highlight sea view."
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-15T00:00:00.000Z"
 *               agentId:
 *                 type: string
 *                 description: New agent ID (only when allocation status is pending)
 *     responses:
 *       200:
 *         description: Allocation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Allocation updated successfully
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
 *                         agent:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                         status:
 *                           type: string
 *                           enum: [pending, in-progress, completed, cancelled]
 *                         deadline:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         agencyNotes:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Validation error (e.g., trying to reassign a non-pending allocation)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Allocation or agent not found
 *       500:
 *         description: Server error
 *
 * @route PUT /api/agency/allocation/:id
 * @desc Update property allocation
 */
const updatePropertyAllocation = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { title, notes, deadline, agentId } = req.body || {};

  try {
    const allocation = await PropertyAllocation.findOne({
      _id: id,
      agency: agencyId,
    });

    if (!allocation) {
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    // Can only reassign if status is pending
    if (agentId && allocation.status !== 'pending') {
      return failure(res, 400, 'Can only reassign allocations with pending status', 'VALIDATION_ERROR');
    }

    // If reassigning agent, validate new agent belongs to agency
    if (agentId && agentId.toString() !== allocation.agent.toString()) {
      const newAgent = await Agent.findOne({
        _id: agentId,
        agency: agencyId,
        isActive: true,
      });

      if (!newAgent) {
        return failure(res, 404, 'New agent not found or does not belong to your agency', 'NOT_FOUND');
      }

      // Remove from old agent's allocatedProperties
      await Agent.findByIdAndUpdate(allocation.agent, {
        $pull: { allocatedProperties: allocation._id },
      });

      // Add to new agent's allocatedProperties
      await Agent.findByIdAndUpdate(agentId, {
        $addToSet: { allocatedProperties: allocation._id },
      });

      allocation.agent = agentId;
    }

    // Update fields
    if (title !== undefined) {
      allocation.title = title.trim();
    }
    if (notes !== undefined) {
      allocation.agencyNotes = notes?.trim() || undefined;
      if (allocation.propertyDetails) {
        allocation.propertyDetails.description = notes?.trim() || undefined;
      }
    }
    if (deadline !== undefined) {
      allocation.deadline = deadline ? new Date(deadline) : undefined;
    }

    await allocation.save();

    const updatedAllocation = await PropertyAllocation.findById(allocation._id)
      .populate('agent', 'fullName email phoneNumber profilePicture preferences fcmTokens')
      .lean();

    if (updatedAllocation?.agent) {
      void sendAllocationUpdatedNotification(updatedAllocation.agent, updatedAllocation);
    }

    return success(res, 'Allocation updated successfully', {
      allocation: {
        id: updatedAllocation._id,
        title: updatedAllocation.title,
        agent: {
          id: updatedAllocation.agent._id,
          name: updatedAllocation.agent.fullName,
          email: updatedAllocation.agent.email,
        },
        status: updatedAllocation.status,
        deadline: updatedAllocation.deadline,
        agencyNotes: updatedAllocation.agencyNotes,
      },
    });
  } catch (error) {
    logger.error('Error updating allocation', { error: error.message, allocationId: id });
    return failure(res, 500, 'Failed to update allocation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/allocation/{id}/cancel:
 *   put:
 *     summary: Cancel a property allocation
 *     description: |
 *       Cancels an allocation (if not already cancelled or completed), stores a cancellation reason,
 *       and notifies the agent by email.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Allocation ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Owner decided to postpone listing."
 *     responses:
 *       200:
 *         description: Allocation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Allocation cancelled successfully
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
 *                         status:
 *                           type: string
 *                           example: cancelled
 *                         cancelledAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error (already cancelled or completed)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Allocation not found
 *       500:
 *         description: Server error
 *
 * @route PUT /api/agency/property-allocation/:id/cancel
 * @desc Cancel property allocation
 */
const cancelPropertyAllocation = asyncHandler(async (req, res) => {
  const agencyId = req.user?.id || req.user?._id;
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const { reason } = req.body;

  try {
    const allocation = await PropertyAllocation.findOne({
      _id: id,
      agency: agencyId,
    }).populate('agent', 'fullName email');

    if (!allocation) {
      return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
    }

    if (allocation.status === 'cancelled') {
      return failure(res, 400, 'Allocation is already cancelled', 'VALIDATION_ERROR');
    }

    if (allocation.status === 'completed') {
      return failure(res, 400, 'Cannot cancel a completed allocation', 'VALIDATION_ERROR');
    }

    // Update status
    allocation.status = 'cancelled';
    if (reason) {
      allocation.agencyNotes = allocation.agencyNotes
        ? `${allocation.agencyNotes}\n\n[Cancelled: ${reason}]`
        : `[Cancelled: ${reason}]`;
    }
    await allocation.save();

    // Send cancellation email to agent
    try {
      const agentName = allocation.agent.fullName || 'Agent';
      const subject = `Property Allocation Cancelled: ${allocation.title}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Property Allocation Cancelled</h2>
            </div>
            <div class="content">
              <p>Hi ${agentName},</p>
              <p>The following property allocation has been cancelled by your agency:</p>
              <div class="details">
                <p><strong>Property:</strong> ${allocation.title}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              <p>If you have any questions, please contact your agency.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      await sendEmail(allocation.agent.email, subject, html);
    } catch (emailError) {
      logger.error('Failed to send cancellation email', { error: emailError.message });
      // Don't fail the request if email fails
    }

    return success(res, 'Allocation cancelled successfully', {
      allocation: {
        id: allocation._id,
        title: allocation.title,
        status: allocation.status,
        cancelledAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error cancelling allocation', { error: error.message, allocationId: id });
    return failure(res, 500, 'Failed to cancel allocation', 'SERVER_ERROR');
  }
});

module.exports = {
  sendPropertyToAgent,
  getAllocatedProperties,
  getPropertyAllocation,
  updatePropertyAllocation,
  cancelPropertyAllocation,
};

