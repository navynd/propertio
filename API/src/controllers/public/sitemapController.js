const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicSitemapPage } = require('../../services/sitemapService');

/**
 * @swagger
 * /sitemap:
 *   get:
 *     summary: Get sitemap page content
 *     tags: [Sitemap]
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sitemap content fetched successfully
 */
const getSitemap = asyncHandler(async (req, res) => {
  try {
    const bundle = await getPublicSitemapPage({
      countryCode: req.query.country,
    });

    return success(res, 'Sitemap content fetched successfully', {
      settings: bundle.settings,
      countryCode: bundle.countryCode,
      locationName: bundle.locationName,
      documents: bundle.documents,
      countries: (bundle.countries || []).map((c) => ({
        _id: c._id,
        name: c.name,
        code: c.code,
        flag: c.flag,
        displayOrder: c.displayOrder,
      })),
    });
  } catch (error) {
    logger.error('Get sitemap content failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch sitemap content', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getSitemap };
