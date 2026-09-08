const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicLegalPage } = require('../../services/legalService');

/**
 * @swagger
 * /legal:
 *   get:
 *     summary: Get legal page content (terms or privacy)
 *     tags: [Legal]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           enum: [terms, privacy]
 *         description: Page group to load
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: ISO country code (e.g. AE)
 *     responses:
 *       200:
 *         description: Legal settings and documents
 */
const getLegal = asyncHandler(async (req, res) => {
  try {
    const pageType = String(req.query.page || 'terms').trim().toLowerCase();
    if (!['terms', 'privacy'].includes(pageType)) {
      return failure(res, 400, 'page must be terms or privacy', 'VALIDATION_ERROR');
    }

    const bundle = await getPublicLegalPage({
      pageType,
      countryCode: req.query.country,
    });

    return success(res, 'Legal content fetched successfully', {
      settings: bundle.settings,
      pageType,
      countryCode: bundle.countryCode,
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
    logger.error('Get legal content failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch legal content', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getLegal };
