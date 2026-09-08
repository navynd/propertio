const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { getPublicTestimonials } = require('../../services/testimonialService');

/**
 * @swagger
 * /testimonials:
 *   get:
 *     summary: Get home page testimonials
 *     description: >
 *       Returns customer testimonial section settings and active testimonials for the
 *       home page carousel. Only testimonials with `isActive: true` are included.
 *     tags: [CMS Testimonials]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, role, or quote text.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 50
 *     responses:
 *       200:
 *         description: Testimonials fetched successfully
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
 *                       properties:
 *                         sectionTitle:
 *                           type: string
 *                         sectionSubtitle:
 *                           type: string
 *                     testimonials:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                           quote:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           rating:
 *                             type: integer
 *                             nullable: true
 *                           displayOrder:
 *                             type: integer
 *                     mediaBaseUrl:
 *                       type: object
 *                       properties:
 *                         img:
 *                           type: string
 *       500:
 *         description: Server error
 */
const getTestimonials = asyncHandler(async (req, res) => {
  try {
    const data = await getPublicTestimonials({
      search: req.query.search,
      limit: req.query.limit,
    });
    return success(res, 'Testimonials fetched successfully', data);
  } catch (error) {
    logger.error('Get testimonials failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch testimonials', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getTestimonials };
