const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicBanners } = require('../../services/bannerService');

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get active banners for a page placement
 *     description: >
 *       Returns carousel settings and active banners for the requested placement.
 *       Used by listing pages for the hero banner carousel.
 *     tags: [CMS Banners]
 *     parameters:
 *       - in: query
 *         name: placement
 *         required: true
 *         schema:
 *           type: string
 *           enum: [home-page, search-page, listing-page, agent-page, agency-page, project-page]
 *         description: Page where banners should appear (e.g. listing-page, project-page).
 *     responses:
 *       200:
 *         description: Banners fetched successfully
 *       400:
 *         description: Invalid placement
 *       500:
 *         description: Server error
 */
const getBanners = asyncHandler(async (req, res) => {
  try {
    const placement = String(req.query.placement || '').trim();
    if (!placement) {
      return failure(res, 400, 'placement query parameter is required', 'VALIDATION_ERROR');
    }

    const data = await getPublicBanners({ placement });
    return success(res, 'Banners fetched successfully', data);
  } catch (error) {
    logger.error('Get banners failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch banners', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getBanners };
