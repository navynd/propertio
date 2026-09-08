const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Inquirys = require('../../models/inquirysModel');
const Properties = require('../../models/propertiesModal');
const Agents = require('../../models/agentsModel');
const Newprojects = require('../../models/newprojectsModel');
const Developers = require('../../models/developersModel');
const Users = require('../../models/usersModel');
const LeadAssignment = require('../../models/leadAssignmentModel');
const ProjectLayout = require('../../models/projectLayoutModel');
const { sendInquiryNotification } = require('../../services/emailService');
const { success, failure, isEmail, formatPhoneNumber } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || '';

const {
  pickPrimaryImageRaw,
  ensureNotificationImage,
} = require('../../utils/notificationImage');

/**
 * @swagger
 * /inquiries/create:
 *   post:
 *     summary: Create a new property or project inquiry
 *     description: |
 *       Creates an inquiry for a property or project.
 *
 *       **Authentication:** Optional (Bearer JWT). Works for guests and logged-in users.
 *       - **Logged in:** `customer.userId` is set. For each of `name`, `email`, `phoneNumber`, if the field is sent in the body it is stored on the inquiry; otherwise the value comes from the user profile. At least one source must provide a valid `email` and `phoneNumber` (body or account).
 *       - **Guest:** `name`, `email`, and `phoneNumber` are required in the body.
 *
 *       **Property inquiries:** `propertyId` + `inquiryType` are required. `agentId` is optional (defaults to the property listing agent). `message` is optional.
 *
 *       **Project inquiries:** `projectId`, `layoutId`, and `inquiryType: whatsapp` are required; agent is assigned via round-robin.
 *
 *       **Success response:** Returns `inquiryId`, `inquiryType`, `customer` (stored contact), `agent` (agent email/phone for UI), and `whatsappUrl` only when `inquiryType` is `whatsapp` and a link could be built.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: language
 *         required: false
 *         schema:
 *           type: string
 *           example: en
 *         description: Locale for agent notification email content (default `en`). Same effect as `language` in the JSON body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inquiryType
 *             oneOf:
 *               - required: [propertyId]
 *                 description: Property inquiry (`agentId` optional; defaults to listing agent)
 *               - required: [projectId, layoutId]
 *                 description: Project inquiry (agent auto-assigned)
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: Property ObjectId (property inquiries)
 *                 example: "65f12f0f9a9b9c0a1b2c3d4e"
 *               agentId:
 *                 type: string
 *                 description: Agent ObjectId (optional for property inquiries; must match listing agent loosely checked). Ignored for project inquiries.
 *                 example: "65f12f0f9a9b9c0a1b2c3d4f"
 *               projectId:
 *                 type: string
 *                 description: Project ObjectId (project inquiries)
 *                 example: "65f12f0f9a9b9c0a1b2c3d5e"
 *               layoutId:
 *                 type: string
 *                 description: ProjectLayout ObjectId (project inquiries; round-robin)
 *                 example: "65f12f0f9a9b9c0a1b2c3d6f"
 *               developerId:
 *                 type: string
 *                 description: Developer ObjectId (optional; project inquiries, tracking)
 *                 example: "65f12f0f9a9b9c0a1b2c3d5f"
 *               inquiryType:
 *                 type: string
 *                 enum: [call, email, whatsapp]
 *                 description: Property — call, email, or whatsapp. Project — whatsapp only.
 *                 example: "whatsapp"
 *               message:
 *                 type: string
 *                 description: Optional message from the customer
 *                 example: "I'm interested in this property"
 *               name:
 *                 type: string
 *                 description: Required for guests. When logged in, optional; if sent, overrides account name on this inquiry.
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Required for guests. When logged in, optional; if sent, overrides account email on this inquiry.
 *                 example: "john@example.com"
 *               phoneNumber:
 *                 type: string
 *                 description: "Required for guests. When logged in, optional; if sent, overrides account phone. Format +[country code][number]."
 *                 example: "+971501234567"
 *               language:
 *                 type: string
 *                 description: Optional; same as query `language` (default `en`).
 *                 example: "en"
 *           examples:
 *             propertyInquiryMinimal:
 *               summary: Property — only propertyId + inquiryType (agent and message optional)
 *               value:
 *                 propertyId: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 inquiryType: "whatsapp"
 *             propertyInquiryLoggedInWithContact:
 *               summary: Property — logged-in user sending modal contact fields (no agentId)
 *               value:
 *                 propertyId: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 inquiryType: "email"
 *                 message: "I'm interested in viewing this property"
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 phoneNumber: "+971501234567"
 *             propertyInquiryWithAgent:
 *               summary: Property — explicit agentId (optional)
 *               value:
 *                 propertyId: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 agentId: "65f12f0f9a9b9c0a1b2c3d4f"
 *                 inquiryType: "whatsapp"
 *                 message: "I'm interested in viewing this property"
 *             propertyInquiryGuest:
 *               summary: Property — guest (name, email, phone required)
 *               value:
 *                 propertyId: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 inquiryType: "email"
 *                 message: "Please send me more details about this property"
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 phoneNumber: "+971501234567"
 *             projectInquiry:
 *               summary: Project — whatsapp only, round-robin agent
 *               value:
 *                 projectId: "65f12f0f9a9b9c0a1b2c3d5e"
 *                 layoutId: "65f12f0f9a9b9c0a1b2c3d6f"
 *                 inquiryType: "whatsapp"
 *                 message: "I'm interested in this project"
 *                 name: "Jane Smith"
 *                 email: "jane@example.com"
 *                 phoneNumber: "+971509876543"
 *     responses:
 *       201:
 *         description: Inquiry created successfully
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
 *                   example: "Inquiry created successfully"
 *                 data:
 *                   type: object
 *                   required:
 *                     - inquiryId
 *                     - inquiryType
 *                     - customer
 *                     - agent
 *                   properties:
 *                     inquiryId:
 *                       type: string
 *                       description: Created inquiry ObjectId
 *                       example: "65f12f0f9a9b9c0a1b2c3d6e"
 *                     inquiryType:
 *                       type: string
 *                       enum: [call, email, whatsapp]
 *                     customer:
 *                       type: object
 *                       description: Contact details persisted on the inquiry
 *                       required: [name, email, phoneNumber]
 *                       properties:
 *                         name: { type: string }
 *                         email: { type: string }
 *                         phoneNumber: { type: string }
 *                     agent:
 *                       type: object
 *                       description: Assigned/listing agent contact for client UI (mailto, tel, WhatsApp)
 *                       properties:
 *                         email: { type: string, nullable: true }
 *                         phoneNumber: { type: string, nullable: true }
 *                         whatsappNumber: { type: string, nullable: true }
 *                     whatsappUrl:
 *                       type: string
 *                       nullable: true
 *                       description: Present only when inquiryType is whatsapp and a wa.me link was built; omitted otherwise.
 *                       example: "https://wa.me/971501111111?text=Hello..."
 *             examples:
 *               whatsappProperty:
 *                 summary: WhatsApp property inquiry
 *                 value:
 *                   status: true
 *                   message: "Inquiry created successfully"
 *                   data:
 *                     inquiryId: "65f12f0f9a9b9c0a1b2c3d6e"
 *                     inquiryType: "whatsapp"
 *                     customer:
 *                       name: "John Doe"
 *                       email: "john@example.com"
 *                       phoneNumber: "+971501234567"
 *                     agent:
 *                       email: "agent@example.com"
 *                       phoneNumber: "+971501111111"
 *                       whatsappNumber: "+971501111111"
 *                     whatsappUrl: "https://wa.me/971501111111?text=Hello..."
 *               emailProperty:
 *                 summary: Email (or call) property inquiry — no whatsappUrl
 *                 value:
 *                   status: true
 *                   message: "Inquiry created successfully"
 *                   data:
 *                     inquiryId: "65f12f0f9a9b9c0a1b2c3d6e"
 *                     inquiryType: "email"
 *                     customer:
 *                       name: "John Doe"
 *                       email: "john@example.com"
 *                       phoneNumber: "+971501234567"
 *                     agent:
 *                       email: "agent@example.com"
 *                       phoneNumber: "+971501111111"
 *                       whatsappNumber: "+971501111111"
 *       400:
 *         description: Validation or business rule error (invalid IDs, inactive listing, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *             examples:
 *               missingInquiryType:
 *                 summary: Missing inquiryType
 *                 value:
 *                   status: false
 *                   message: "inquiryType is required"
 *                   code: "VALIDATION_ERROR"
 *               missingPropertyOrProject:
 *                 summary: Neither property nor project
 *                 value:
 *                   status: false
 *                   message: "Either propertyId or projectId is required"
 *                   code: "VALIDATION_ERROR"
 *               guestContact:
 *                 summary: Guest without contact fields
 *                 value:
 *                   status: false
 *                   message: "name, email, and phoneNumber are required when not logged in"
 *                   code: "VALIDATION_ERROR"
 *               loggedInMissingEmail:
 *                 summary: Logged in but no email in body or profile
 *                 value:
 *                   status: false
 *                   message: "email is required — add it to the request or to your account"
 *                   code: "VALIDATION_ERROR"
 *               propertyNoAgent:
 *                 summary: Property has no assignable agent
 *                 value:
 *                   status: false
 *                   message: "Property has no assigned agent"
 *                   code: "VALIDATION_ERROR"
 *       404:
 *         description: Property, project, layout, agent, or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Property not found"
 *                 code:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to create inquiry"
 *                 code:
 *                   type: string
 *                   example: "SERVER_ERROR"
 */
const createInquiry = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      propertyId,
      agentId,
      projectId,
      developerId,
      inquiryType,
      message,
      name,
      email,
      phoneNumber,
      layoutId,
    } = req.body || {};
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    // Determine inquiry category
    const isProjectInquiry = !!projectId;
    const isPropertyInquiry = !!propertyId;

    // Validate required fields
    if (!inquiryType) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'inquiryType is required', 'VALIDATION_ERROR');
    }

    if (!isPropertyInquiry && !isProjectInquiry) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Either propertyId or projectId is required', 'VALIDATION_ERROR');
    }

    if (isProjectInquiry && !layoutId) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'layoutId is required for project inquiries', 'VALIDATION_ERROR');
    }

    if (isProjectInquiry && !mongoose.Types.ObjectId.isValid(layoutId)) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Invalid layoutId', 'VALIDATION_ERROR');
    }

    // Validate inquiryType
    if (!['call', 'email', 'whatsapp'].includes(inquiryType)) {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'inquiryType must be call, email, or whatsapp', 'VALIDATION_ERROR');
    }

    // For project inquiries, only whatsapp is allowed
    if (isProjectInquiry && inquiryType !== 'whatsapp') {
      await session.abortTransaction();
      session.endSession();
      return failure(res, 400, 'Project inquiries can only be of type whatsapp', 'VALIDATION_ERROR');
    }

    // Get customer information
    let customerInfo = {};
    if (userId) {
      const user = await Users.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 404, 'User not found', 'NOT_FOUND');
      }

      const bodyName = typeof name === 'string' ? name.trim() : '';
      const bodyEmail = typeof email === 'string' ? email.trim() : '';
      const bodyPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

      const resolvedName =
        bodyName || user.fullName || user.name || 'User';

      let resolvedEmail = '';
      if (bodyEmail) {
        if (!isEmail(bodyEmail)) {
          await session.abortTransaction();
          session.endSession();
          return failure(res, 400, 'Invalid email format', 'VALIDATION_ERROR');
        }
        resolvedEmail = bodyEmail.toLowerCase();
      } else {
        resolvedEmail = (user.email || '').trim().toLowerCase();
      }

      let resolvedPhone = '';
      if (bodyPhone) {
        const formattedPhone = formatPhoneNumber(bodyPhone);
        if (!formattedPhone) {
          await session.abortTransaction();
          session.endSession();
          return failure(res, 400, 'Invalid phone number format', 'VALIDATION_ERROR');
        }
        resolvedPhone = formattedPhone;
      } else {
        resolvedPhone = user.phoneNumber || '';
      }

      if (!resolvedEmail) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'email is required — add it to the request or to your account',
          'VALIDATION_ERROR'
        );
      }
      if (!resolvedPhone) {
        await session.abortTransaction();
        session.endSession();
        return failure(
          res,
          400,
          'phoneNumber is required — add it to the request or to your account',
          'VALIDATION_ERROR'
        );
      }

      customerInfo = {
        userId: user._id,
        name: resolvedName,
        email: resolvedEmail,
        phoneNumber: resolvedPhone,
      };
    } else {
      // User not logged in - get from body
      if (!name || !email || !phoneNumber) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'name, email, and phoneNumber are required when not logged in', 'VALIDATION_ERROR');
      }

      if (!isEmail(email)) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Invalid email format', 'VALIDATION_ERROR');
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Invalid phone number format', 'VALIDATION_ERROR');
      }

      customerInfo = {
        userId: null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: formattedPhone,
      };
    }

    // Handle property inquiries
    let property = null;
    let agent = null;
    let agencyId = null;
    let project = null;
    let developer = null;
    let itemTitle = '';
    let itemId = null;

    if (isPropertyInquiry) {
      if (agentId && !mongoose.Types.ObjectId.isValid(agentId)) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Invalid agentId', 'VALIDATION_ERROR');
      }

      // Find and validate property (populate listingType to get enum value)
      property = await Properties.findById(propertyId).populate('listingType').session(session);
      if (!property) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 404, 'Property not found', 'NOT_FOUND');
      }

      // Check if property is active
      if (property.status !== 'active') {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Property is not available for inquiries', 'INVALID_STATUS');
      }

      const resolvedAgentId =
        agentId ||
        (property.agent ? property.agent.toString() : null);
      if (!resolvedAgentId || !mongoose.Types.ObjectId.isValid(resolvedAgentId)) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Property has no assigned agent', 'VALIDATION_ERROR');
      }

      // Find and validate agent (public inquiries: verified agents only)
      agent = await Agents.findOne({
        _id: resolvedAgentId,
        isActive: true,
        isVerified: true,
      })
        .populate({
          path: 'agency',
          match: { isActive: true, isVerified: true },
        })
        .session(session);
      if (!agent) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
      }

      // Verify agent is associated with the property (optional check)
      if (agentId && property.agent && property.agent.toString() !== agentId) {
        logger.warn('Agent mismatch', { propertyAgent: property.agent, requestedAgent: agentId });
      }

      // Get agency ID
      agencyId = agent.agency?._id || agent.agency || null;
      if (!agencyId) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Agent must be associated with an agency', 'VALIDATION_ERROR');
      }

      itemTitle = property.title;
      itemId = propertyId;
    } else {
      // Handle project inquiries via round robin
      project = await Newprojects.findById(projectId)
        .populate('developer')
        .session(session);
      if (!project) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 404, 'Project not found', 'NOT_FOUND');
      }

      // Check if project is active and published
      if (!project.isActive) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Project is not available for inquiries', 'INVALID_STATUS');
      }

      if (project.publishStatus && project.publishStatus !== 'published') {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Project is not published', 'INVALID_STATUS');
      }

      const projectDeveloperId = project.developer?._id || project.developer;
      const developerOk =
        projectDeveloperId &&
        (await Developers.exists({
          _id: projectDeveloperId,
          isActive: true,
          isVerified: true,
        }));
      if (!developerOk) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Project is not available for inquiries', 'INVALID_STATUS');
      }

      // Verify layout belongs to project
      const layout = await ProjectLayout.findOne({
        _id: layoutId,
        project: projectId,
        isActive: true,
      }).session(session);

      if (!layout) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 404, 'Layout not found in this project', 'NOT_FOUND');
      }

      // ── Round Robin Assignment ───────────────────────
      const config = await LeadAssignment.findOne({
        project: projectId,
        layout: layoutId,
      }).session(session);

      if (!config || !Array.isArray(config.agencyQueue) || config.agencyQueue.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'No agencies assigned to this layout yet', 'VALIDATION_ERROR');
      }

      let assignedAgent = null;
      let assignedAgency = null;
      let newAgencyPointer = config.agencyPointer || 0;
      let foundValidAssignment = false;

      for (let i = 0; i < config.agencyQueue.length; i += 1) {
        const agencyIndex = (config.agencyPointer + i) % config.agencyQueue.length;
        const agencyEntry = config.agencyQueue[agencyIndex];

        if (!agencyEntry.agentQueue || agencyEntry.agentQueue.length === 0) {
          continue; // skip agencies with no agents
        }

        const currentAgentPointer = agencyEntry.agentPointer || 0;
        const agentIndex = currentAgentPointer % agencyEntry.agentQueue.length;
        const agentEntry = agencyEntry.agentQueue[agentIndex];

        const agentDoc = await Agents.findOne({
          _id: agentEntry.agent,
          isActive: true,
          isVerified: true,
        })
          .populate({
            path: 'agency',
            match: { isActive: true, isVerified: true },
          })
          .session(session);

        if (!agentDoc) {
          // Agent inactive — skip and advance pointer
          agencyEntry.agentPointer = (agentIndex + 1) % agencyEntry.agentQueue.length;
          continue;
        }

        assignedAgent = agentDoc;
        assignedAgency = agentDoc.agency;
        newAgencyPointer = (agencyIndex + 1) % config.agencyQueue.length;

        // Advance agentPointer for this agency
        config.agencyQueue[agencyIndex].agentPointer =
          (agentIndex + 1) % agencyEntry.agentQueue.length;

        foundValidAssignment = true;
        break;
      }

      if (!foundValidAssignment) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'No active agents available for this layout', 'VALIDATION_ERROR');
      }

      // Persist new pointers + increment counter
      await LeadAssignment.findByIdAndUpdate(
        config._id,
        {
          $set: {
            agencyPointer: newAgencyPointer,
            agencyQueue: config.agencyQueue,
          },
          $inc: { totalInquiries: 1 },
        },
        { session },
      );

      // Set agent + agency for rest of function
      const agencyDoc = assignedAgency;
      const agencyIdFromAgent = agencyDoc?._id || agencyDoc || null;

      if (!agencyIdFromAgent) {
        await session.abortTransaction();
        session.endSession();
        return failure(res, 400, 'Assigned agent has no agency', 'VALIDATION_ERROR');
      }

      agent = assignedAgent;
      agencyId = agencyIdFromAgent;

      // Get developer reference (optional)
      if (projectDeveloperId) {
        developer = await Developers.findOne({
          _id: projectDeveloperId,
          isActive: true,
          isVerified: true,
        }).session(session);
      }

      itemTitle = project.projectName;
      itemId = projectId;
    }

    // Property inquiry rate limit (logged-in users only): one inquiry per 24 hours per property.
    if (isPropertyInquiry && userId) {
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - twentyFourHoursMs);
      const recentInquiry = await Inquirys.findOne({
        inquiryCategory: 'property',
        property: propertyId,
        'customer.userId': userId,
        inquiredAt: { $gte: cutoff },
      })
        .sort({ inquiredAt: -1 })
        .select('_id inquiredAt inquiryType customer')
        .session(session)
        .lean();

      if (recentInquiry?.inquiredAt) {
        const nextInquiryAt = new Date(
          new Date(recentInquiry.inquiredAt).getTime() + twentyFourHoursMs
        );
        // Ensure contactedProperties contains this property even when inquiry is rate-limited.
        const now = new Date();
        const updateExisting = await Users.updateOne(
          {
            _id: userId,
            'contactedProperties.property': propertyId,
          },
          {
            $set: {
              'contactedProperties.$.agent': agent._id,
              'contactedProperties.$.contactMethod': inquiryType,
              'contactedProperties.$.contactedAt': now,
            },
          },
          { session }
        );

        if (!updateExisting.matchedCount) {
          await Users.findByIdAndUpdate(
            userId,
            {
              $push: {
                contactedProperties: {
                  property: propertyId,
                  agent: agent._id,
                  contactMethod: inquiryType,
                  contactedAt: now,
                },
              },
            },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
        return success(
          res,
          `Inquiry already created for this property. You can create the next inquiry at ${nextInquiryAt.toISOString()}.`,
          {
            inquiryId: recentInquiry._id,
            inquiryType: recentInquiry.inquiryType,
            customer: {
              name: recentInquiry.customer?.name || customerInfo.name,
              email: recentInquiry.customer?.email || customerInfo.email,
              phoneNumber: recentInquiry.customer?.phoneNumber || customerInfo.phoneNumber,
            },
            agent: {
              email: agent?.email || null,
              phoneNumber: agent?.phoneNumber || null,
              whatsappNumber: agent?.whatsappNumber || null,
            },
            nextInquiryAt: nextInquiryAt.toISOString(),
            isRateLimited: true,
          },
          200
        );
      }
    }

    // Get language from query or default to 'en'
    const language = req.query?.language || req.body?.language || 'en';

    // Create inquiry record
    const inquiryData = {
      inquiryCategory: isProjectInquiry ? 'project' : 'property',
      customer: customerInfo,
      inquiryType,
      message: message?.trim() || undefined,
      status: 'new',
      source: isProjectInquiry ? 'project-listing' : 'property-listing',
      inquiredAt: new Date(),
    };

    // Agent and Agency are required for all inquiries (agents manage all inquiries)
    // For project inquiries, agent/agency come from round robin
    inquiryData.agent = agent?._id || agentId;
    inquiryData.agency = agencyId;

    if (isPropertyInquiry) {
      inquiryData.property = propertyId;
      inquiryData.propertyTitle = property.title;
      inquiryData.propertyType = property.propertyType?.toString() || undefined;
      // Store listingType as ObjectId reference (same as property model)
      inquiryData.listingType = property.listingType || undefined;
    } else {
      // Project inquiry - assigned via round robin
      inquiryData.project = projectId;
      inquiryData.projectTitle = project.projectName;
      inquiryData.propertyTitle = project.projectName; // Also set for consistency
      inquiryData.assignedViaRoundRobin = true;
      inquiryData.layout = layoutId;
      // Developer is optional reference (for tracking)
      if (developer && developer._id) {
        inquiryData.developer = developer._id;
      }
    }

    const inquiry = await Inquirys.create([inquiryData], { session });
    const createdInquiry = inquiry[0];

    // Increment inquiries count
    if (isPropertyInquiry) {
      await Properties.findByIdAndUpdate(
        propertyId,
        { $inc: { inquiries: 1 }, $set: { lastContactedAt: new Date() } },
        { session }
      );
    } else {
      await Newprojects.findByIdAndUpdate(
        projectId,
        { $inc: { inquiries: 1 } },
        { session }
      );
    }

    // Increment agent statistics (agents manage all inquiries)
    await Agents.findByIdAndUpdate(
      agent._id,
      {
        $inc: {
          'statistics.totalInquiries': 1,
          'statistics.newInquiries': 1,
        },
      },
      { session }
    );

    // If user is logged in, upsert contactedProperties.
    if (userId && (isPropertyInquiry || isProjectInquiry)) {
      if (isPropertyInquiry) {
        const now = new Date();
        const updateExisting = await Users.updateOne(
          {
            _id: userId,
            'contactedProperties.property': propertyId,
          },
          {
            $set: {
              'contactedProperties.$.agent': agent._id,
              'contactedProperties.$.contactMethod': inquiryType,
              'contactedProperties.$.contactedAt': now,
            },
          },
          { session }
        );

        if (!updateExisting.matchedCount) {
          await Users.findByIdAndUpdate(
            userId,
            {
              $push: {
                contactedProperties: {
                  property: propertyId,
                  agent: agent._id,
                  contactMethod: inquiryType,
                  contactedAt: now,
                },
              },
            },
            { session }
          );
        }
      } else {
        const contactEntry = {
          project: projectId,
          agent: agent._id,
          contactMethod: inquiryType,
          contactedAt: new Date(),
        };

        await Users.findByIdAndUpdate(
          userId,
          {
            $addToSet: {
              contactedProperties: contactEntry,
            },
          },
          { session }
        );
      }
    }

    // Send notification based on inquiryType (always to agent - agents manage all inquiries)
    let whatsappUrl = null;
    const recipientEmail = agent.email;
    const recipientPhone = agent.whatsappNumber || agent.phoneNumber || '';

    if (inquiryType === 'whatsapp') {
      // Generate WhatsApp URL
      if (recipientPhone) {
        const phoneDigits = recipientPhone.replace(/[^\d]/g, '');
        const itemType = isProjectInquiry ? 'project' : 'property';
        const encodedMessage = encodeURIComponent(
          `Hello, I'm interested in the ${itemType}: ${itemTitle}${message ? `\n\n${message}` : ''}`
        );
        whatsappUrl = `https://wa.me/${phoneDigits}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
      }
    } else {
      // Send email notification for call or email inquiries (always to agent)
      if (recipientEmail) {
        try {
          const itemType = isProjectInquiry ? 'project' : 'property';
          await sendInquiryNotification(
            recipientEmail,
            customerInfo,
            { title: itemTitle, propertyTitle: itemTitle },
            message || `Customer ${inquiryType === 'call' ? 'wants to call you about' : 'sent an inquiry about'} this ${itemType}.`,
            language
          );
        } catch (emailError) {
          logger.error('Failed to send inquiry notification email', {
            error: emailError.message,
            recipientEmail,
            inquiryId: createdInquiry._id,
          });
          // Don't fail the request if email fails
        }
      }
    }

    // Create notification for agent (agents manage all inquiries)
    try {
      const Notification = mongoose.model('Notification');
      const notificationTitle = inquiryType === 'whatsapp'
        ? `New WhatsApp Inquiry${isProjectInquiry ? ' (Project)' : ''}`
        : inquiryType === 'call'
        ? 'New Call Inquiry'
        : 'New Email Inquiry';

      const itemType = isProjectInquiry ? 'project' : 'property';
      const notificationMessage = `${customerInfo.name} ${inquiryType === 'call' ? 'wants to call you about' : inquiryType === 'whatsapp' ? 'sent a WhatsApp inquiry about' : 'sent an inquiry about'} ${itemTitle}`;

      const inquiryImage = isProjectInquiry
        ? ensureNotificationImage(pickPrimaryImageRaw(project?.images), 'project')
        : ensureNotificationImage(pickPrimaryImageRaw(property?.images), 'property');

      const inquiryMetadata = isProjectInquiry
        ? {
            inquiryCategory: 'project',
            projectId: projectId ? String(projectId) : null,
            projectName: itemTitle,
            image: inquiryImage,
          }
        : {
            inquiryCategory: 'property',
            propertyId: propertyId ? String(propertyId) : null,
            propertyName: itemTitle,
            image: inquiryImage,
          };

      await Notification.create(
        [
          {
            recipient: {
              recipientType: 'agent',
              recipientId: agent._id,
            },
            title: notificationTitle,
            message: notificationMessage,
            notificationType: 'inquiry',
            priority: 'high',
            relatedItem: {
              itemType: 'inquiry',
              itemId: createdInquiry._id,
            },
            actionUrl: `${FRONTEND_URL}/agent/inquiries/${createdInquiry._id}`,
            actionText: 'View Inquiry',
            channels: {
              email: inquiryType !== 'whatsapp',
              inApp: true,
            },
            metadata: inquiryMetadata,
          },
        ],
        { session }
      );
    } catch (notificationError) {
      logger.error('Failed to create notification', {
        error: notificationError.message,
        inquiryId: createdInquiry._id,
      });
      // Don't fail the request if notification creation fails
    }

    await session.commitTransaction();
    session.endSession();

    const responseData = {
      inquiryId: createdInquiry._id,
      inquiryType,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phoneNumber: customerInfo.phoneNumber,
      },
      agent: {
        email: agent.email || null,
        phoneNumber: agent.phoneNumber || null,
        whatsappNumber: agent.whatsappNumber || null,
      },
    };

    if (inquiryType === 'whatsapp' && whatsappUrl) {
      responseData.whatsappUrl = whatsappUrl;
    }

    return success(res, 'Inquiry created successfully', responseData, 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Create inquiry error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return failure(res, 500, error.message || 'Failed to create inquiry', 'SERVER_ERROR');
  }
});

module.exports = {
  createInquiry,
};

