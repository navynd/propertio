const asyncHandler = require('express-async-handler');
const uploadService = require('../services/uploadService');
const {
  getTeamAdminBundle,
  saveTeamSettings,
  saveTeamMember,
  deleteTeamMember,
  normalizeImageFilename,
} = require('../services/teamService');
const { success, failure } = require('../utils/helpers');
const { logger } = require('../utils/logger');

/**
 * @swagger
 * /cms/team:
 *   get:
 *     summary: Get Team CMS data
 *     description: >
 *       Returns team page settings, paginated team members, and optional single member
 *       when `memberId` is provided. Includes `mediaBaseUrl` for profile images.
 *     tags: [CMS Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *         description: Optional team member ObjectId for detail edit.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, job title, email, or phone.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Team CMS data fetched successfully
 *       500:
 *         description: Server error
 */
const getTeamAdmin = asyncHandler(async (req, res) => {
  try {
    const data = await getTeamAdminBundle({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      memberId: req.query.memberId,
    });
    return success(res, 'Team CMS data fetched successfully', data);
  } catch (error) {
    logger.error('Get team admin failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch team CMS data', 'SERVER_ERROR', error.message);
  }
});

/**
 * @swagger
 * /cms/team:
 *   post:
 *     summary: Team CMS mutations
 *     description: >
 *       Consolidated admin write endpoint.
 *       Supported actions: `save-settings`, `save-member`, `delete-member`.
 *       For `save-member`, send multipart/form-data with optional `profileImage` file.
 *     tags: [CMS Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [save-settings, save-member, delete-member]
 *               settings:
 *                 type: object
 *                 description: Required for save-settings (pageTitle, pageSubtitle, itemsPerPage, seo).
 *               memberId:
 *                 type: string
 *                 description: Required for delete-member; optional for save-member (update).
 *               fullName:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               profileImage:
 *                 type: string
 *                 description: Existing stored filename when not uploading a new file.
 *               removeImage:
 *                 type: boolean
 *               search:
 *                 type: string
 *                 description: List refresh filter after save-settings or delete-member.
 *               page:
 *                 type: integer
 *               limit:
 *                 type: integer
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [save-settings, save-member, delete-member]
 *               memberId:
 *                 type: string
 *               fullName:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               removeImage:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings saved, member saved, or member deleted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Team member not found
 *       500:
 *         description: Server error (including profile image upload failure)
 */
const mutateTeamAdmin = asyncHandler(async (req, res) => {
  try {
    const action = String(req.body?.action || '').trim().toLowerCase();
    const adminId = req.admin?._id;

    if (action === 'save-settings') {
      await saveTeamSettings(req.body.settings || {}, adminId);
      const data = await getTeamAdminBundle({
        search: req.body.search,
        page: req.body.page,
        limit: req.body.limit,
      });
      return success(res, 'Team page settings saved successfully', data);
    }

    if (action === 'save-member') {
      const payload = { ...req.body };

      if (req.body?.removeImage === true || req.body?.removeImage === 'true') {
        payload.removeImage = true;
      } else if (req.file) {
        try {
          const uploaded = await uploadService.upload(req.file, 'team', {
            generateThumbnail: false,
          });
          payload.profileImage =
            uploadService.toStoredProfileFilename(uploaded.filename) || uploaded.filename || '';
        } catch (error) {
          logger.error('Team member image upload failed', { error: error.message });
          return failure(res, 500, 'Failed to upload profile image', 'SERVER_ERROR');
        }
      } else if (req.body?.profileImage) {
        payload.profileImage = normalizeImageFilename(req.body.profileImage);
      }

      const member = await saveTeamMember(payload);
      return success(res, 'Team member saved successfully', { member });
    }

    if (action === 'delete-member') {
      const memberId = req.body.memberId || req.body.id;
      await deleteTeamMember(memberId);
      const data = await getTeamAdminBundle({
        search: req.body.search,
        page: req.body.page,
        limit: req.body.limit,
      });
      return success(res, 'Team member deleted successfully', data);
    }

    return failure(
      res,
      400,
      'Invalid action. Use save-settings, save-member, or delete-member',
      'VALIDATION_ERROR'
    );
  } catch (error) {
    logger.error('Mutate team admin failed', { error: error.message, stack: error.stack });
    const status = /not found/i.test(error.message) ? 404 : 500;
    return failure(
      res,
      status,
      error.message || 'Failed to save team data',
      status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
      error.message
    );
  }
});

module.exports = { getTeamAdmin, mutateTeamAdmin };
