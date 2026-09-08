const asyncHandler = require('express-async-handler');

const Reports = require('../../models/reportsModel');
const Users = require('../../models/usersModel');
const { success, failure, isEmail } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const uploadService = require('../../services/uploadService');

/**
 * @swagger
 * /reports/create:
 *   post:
 *     summary: Create a new user report
 *     description: |
 *       Creates a report that can be linked to a specific item (property, project, agent, etc.)
 *       or be a general app/problem report with just email and description.
 *
 *       **Authentication:** Optional - works for both logged-in users and guests.
 *       - If authenticated (Bearer token provided): reporter identity is taken from the user account.
 *       - If not authenticated: `email` is required in the request body.
 *
 *       **Supported report types:**
 *       - property
 *       - project
 *       - agent
 *       - agency
 *       - user
 *       - review
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportType:
 *                 type: string
 *                 description: |
 *                   Type of item being reported. Required if `reportedItemId` is provided.
 *                 enum: [property, project, agent, agency, user, review]
 *                 example: property
 *               reportedItemId:
 *                 type: string
 *                 description: |
 *                   ObjectId of the item being reported (property, project, agent, etc.).
 *                   Optional for general app/problem reports.
 *                 example: "65f12f0f9a9b9c0a1b2c3d4e"
 *               userType:
 *                 type: string
 *                 description: Reporter type (e.g., user, developer, agency, agent). Optional.
 *                 example: user
 *               reason:
 *                 type: string
 *                 description: High-level reason for the report (e.g., fraud, spam, incorrect info). Optional but recommended.
 *                 example: fraud
 *               description:
 *                 type: string
 *                 description: Detailed description of the problem or issue. Required.
 *                 example: "This listing looks fraudulent and the agent is asking for payment upfront."
 *               email:
 *                 type: string
 *                 format: email
 *                 description: |
 *                   Reporter email. Required when user is not authenticated.
 *                   For authenticated users, this can override the account email if provided.
 *                 example: "user@example.com"
 *               attachments:
 *                 type: array
 *                 description: Optional list of file URLs (images, pdf, video, audio, etc.).
 *                 items:
 *                   type: string
 *                   example: "https://cdn.example.com/uploads/report/file1.png"
 *               priority:
 *                 type: string
 *                 description: Optional priority for the report.
 *                 enum: [low, medium, high, urgent]
 *                 example: medium
 *           examples:
 *             generalReportGuest:
 *               summary: General app/problem report (guest user)
 *               value:
 *                 email: "guest@example.com"
 *                 description: "App crashes when I try to upload a file."
 *                 attachments:
 *                   - "https://cdn.example.com/uploads/reports/crash-video.mp4"
 *             propertyReportAuthenticated:
 *               summary: Property-specific report (authenticated user)
 *               value:
 *                 reportType: "property"
 *                 reportedItemId: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 userType: "user"
 *                 reason: "fraud"
 *                 description: "This property looks suspicious and the price is unrealistic."
 *                 attachments:
 *                   - "https://cdn.example.com/uploads/reports/screenshot1.png"
 *             projectReportGuest:
 *               summary: Project-specific report (guest user)
 *               value:
 *                 reportType: "project"
 *                 reportedItemId: "65f12f0f9a9b9c0a1b2c3d5e"
 *                 email: "guest2@example.com"
 *                 userType: "user"
 *                 reason: "incorrect-info"
 *                 description: "The project completion date shown here does not match the brochure."
 *     responses:
 *       201:
 *         description: Report created successfully.
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
 *                   example: "Report created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                       description: Created report ID.
 *                       example: "65f12f0f9a9b9c0a1b2c3d7e"
 *       400:
 *         description: Validation error (missing or invalid fields).
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
 *                   example: "description is required"
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *       500:
 *         description: Server error while creating report.
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
 *                   example: "Failed to create report"
 *                 code:
 *                   type: string
 *                   example: "SERVER_ERROR"
 */
const createReport = asyncHandler(async (req, res) => {
  try {
    const {
      reportType,
      reportedItemId,
      userType,
      reason,
      description,
      attachments,
      email,
      priority,
    } = req.body || {};

    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!description || !description.toString().trim()) {
      return failure(res, 400, 'description is required', 'VALIDATION_ERROR');
    }

    if (!userId && !email) {
      return failure(
        res,
        400,
        'Either an authenticated user or email is required',
        'VALIDATION_ERROR',
      );
    }

    if (!userId && email && !isEmail(email)) {
      return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
    }

    if (reportedItemId && !reportType) {
      return failure(
        res,
        400,
        'reportType is required when reportedItemId is provided',
        'VALIDATION_ERROR',
      );
    }

    const reportData = {
      description: description.toString().trim(),
    };

    if (reportType) {
      reportData.reportType = reportType;
    }
    if (reportedItemId) {
      reportData.reportedItem = reportedItemId;
    }
    if (userType) {
      reportData.userType = userType;
    }
    if (reason) {
      reportData.reason = reason;
    }
    if (priority) {
      reportData.priority = priority;
    }
    if (Array.isArray(attachments) && attachments.length) {
      reportData.attachments = attachments;
    }

    // Attach reporter identity
    if (userId) {
      reportData.reportedBy = userId;

      // Prefer explicit email from body, otherwise use user email if available
      if (email && isEmail(email)) {
        reportData.reporterEmail = email.toString().trim().toLowerCase();
      } else {
        const user = await Users.findById(userId).select('email').lean();
        if (user?.email) {
          reportData.reporterEmail = user.email;
        }
      }
    } else if (email) {
      reportData.reporterEmail = email.toString().trim().toLowerCase();
    }

    const report = await Reports.create(reportData);

    return success(
      res,
      'Report created successfully',
      { reportId: report._id },
      201,
    );
  } catch (error) {
    logger.error('Create report failed', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return failure(res, 500, 'Failed to create report', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /reports/upload-attachments:
 *   post:
 *     summary: Upload report attachments (images, documents, videos)
 *     description: >
 *       Upload one or more files that can be attached to a user report. This endpoint accepts images,
 *       documents (PDF/DOC/DOCX), and videos (MP4/WebM) and returns normalized URLs and filenames
 *       that you can store in the `attachments` array when calling `/reports/create`.
 *
 *       **Authentication:** Optional - works for both logged-in users and guests.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachments:
 *                 type: array
 *                 description: >
 *                   Files to upload. Supports images (JPG/PNG/WebP), documents (PDF/DOC/DOCX),
 *                   and videos (MP4/WebM). Maximum 10 files per request.
 *                 items:
 *                   type: string
 *                   format: binary
 *           examples:
 *             multipleFiles:
 *               summary: Upload image + PDF + video
 *               value:
 *                 attachments: [ "(binary image)", "(binary pdf)", "(binary video)" ]
 *     responses:
 *       200:
 *         description: Attachments uploaded successfully.
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
 *                   example: "Attachments uploaded successfully"
 *                 data:
 *                   type: object
 *                   description: Standardized upload payload.
 *                   properties:
 *                     baseUrl:
 *                       type: string
 *                       example: "https://cdn.example.com/uploads"
 *                     uploads:
 *                       type: object
 *                       properties:
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               url:
 *                                 type: string
 *                                 example: "https://cdn.example.com/uploads/img/report/uuid.webp"
 *                               filename:
 *                                 type: string
 *                                 example: "uuid.webp"
 *                         videos:
 *                           type: array
 *                           items:
 *                             type: object
 *                         documents:
 *                           type: array
 *                           items:
 *                             type: object
 *                     baseUrls:
 *                       type: object
 *                       properties:
 *                         images:
 *                           type: string
 *                           example: "https://cdn.example.com/uploads/img/report/"
 *                         videos:
 *                           type: string
 *                           example: "https://cdn.example.com/uploads/vid/report/"
 *                         documents:
 *                           type: string
 *                           example: "https://cdn.example.com/uploads/doc/report/"
 *       400:
 *         description: Validation error (no files or invalid payload).
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
 *                   example: "No files uploaded"
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *       500:
 *         description: Server error while uploading attachments.
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
 *                   example: "Failed to upload attachments"
 *                 code:
 *                   type: string
 *                   example: "SERVER_ERROR"
 */
const uploadReportAttachments = asyncHandler(async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return failure(res, 400, 'No files uploaded', 'VALIDATION_ERROR');
    }

    const uploads = await uploadService.uploadMultiple(files, 'report', {
      allowVideo: true,
      allowDocument: true,
      generateThumbnail: false,
    });

    const responseData = uploadService.buildStandardResponse(uploads, {
      images: 'report',
      videos: 'report',
      documents: 'report',
    });

    return success(res, 'Attachments uploaded successfully', responseData);
  } catch (error) {
    logger.error('Upload report attachments failed', {
      error: error.message,
      stack: error.stack,
    });
    return failure(res, 500, 'Failed to upload attachments', 'SERVER_ERROR');
  }
});

module.exports = {
  createReport,
  uploadReportAttachments,
};

