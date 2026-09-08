const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicAboutPage } = require('../../services/aboutService');

/**
 * @swagger
 * /about:
 *   get:
 *     summary: Get About Us page content
 *     description: Returns hero, business section, stats, timeline, CTA, and SEO settings for the public About page.
 *     tags: [CMS About]
 *     responses:
 *       200:
 *         description: About page content fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Server error
 */
const getAbout = asyncHandler(async (req, res) => {
  try {
    const data = await getPublicAboutPage();
    return success(res, 'About page content fetched successfully', data);
  } catch (error) {
    logger.error('Get about content failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch about content', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getAbout };
