const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicTeamPage } = require('../../services/teamService');

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Get Team page content
 *     description: >
 *       Returns team page settings, active team members (paginated), and media base URL
 *       for profile images. Only members with `isActive: true` are included.
 *     tags: [CMS Team]
 *     parameters:
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
 *         description: Defaults to page settings `itemsPerPage` when omitted.
 *     responses:
 *       200:
 *         description: Team page content fetched successfully
 *       500:
 *         description: Server error
 */
const getTeams = asyncHandler(async (req, res) => {
  try {
    const data = await getPublicTeamPage({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    return success(res, 'Team page content fetched successfully', data);
  } catch (error) {
    logger.error('Get team content failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch team content', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getTeams };
