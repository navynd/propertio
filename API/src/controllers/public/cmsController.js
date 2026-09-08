const asyncHandler = require('express-async-handler');

const CmsPage = require('../../models/cmsPageModel');
const { success, failure } = require('../../utils/helpers');
const { HELP_FAQ_CATEGORIES } = require('../../utils/constants');

/**
 * @swagger
 * /help/faqs:
 *   get:
 *     summary: Get Help Center FAQs
 *     description: >
 *       Returns Help Center FAQ categories and questions for the mobile Help screen.
 *       Data is stored in the CmsPage collection using `customFields.faqs` and filtered
 *       in-memory by category and free-text search.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, properties, buy, mortgages, account]
 *           default: all
 *         description: >
 *           Category filter key matching HELP_FAQ_CATEGORIES.value.
 *           Use "all" or omit to return FAQs from all categories.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search across question and answer text.
 *     responses:
 *       200:
 *         description: FAQs fetched successfully
 *       400:
 *         description: Validation error (e.g., invalid category)
 *       404:
 *         description: FAQ page not configured or not published
 *       500:
 *         description: Server error
 */
const getHelpFaqs = asyncHandler(async (req, res) => {
  try {
    const { category, search } = req.query;

    const page = await CmsPage.findOne({
      slug: 'help-faqs',
      pageType: 'faq',
      isActive: true,
      isPublished: true
    }).lean();

    const customFields = page?.customFields || {};
    const faqs = Array.isArray(customFields.faqs) ? customFields.faqs : [];

    let filteredFaqs = [...faqs];
    let activeCategory = (category || '').toString().trim().toLowerCase() || 'all';

    // Category filter (skip when "all" or not provided)
    if (activeCategory && activeCategory !== 'all') {
      const allowedCategoryValues = HELP_FAQ_CATEGORIES.map((c) => c.value.toLowerCase());

      if (!allowedCategoryValues.includes(activeCategory)) {
        return failure(res, 400, 'Invalid category', 'VALIDATION_ERROR');
      }

      filteredFaqs = filteredFaqs.filter((f) => {
        const key = (f.categoryKey || f.category || '').toString().trim().toLowerCase();
        return key === activeCategory;
      });
    }

    // Search filter
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filteredFaqs = filteredFaqs.filter((f) => {
        const q = (f.question || '').toString().toLowerCase();
        const a = (f.answer || '').toString().toLowerCase();
        return q.includes(term) || a.includes(term);
      });
    }

    // Sort by order (ascending)
    filteredFaqs.sort((a, b) => (a.order || 0) - (b.order || 0));

    return success(res, 'FAQs fetched successfully', {
      // categories: HELP_FAQ_CATEGORIES,
      activeCategory,
      total: filteredFaqs.length,
      faqs: filteredFaqs
    });
  } catch (error) {
    // Log error in development, keep response generic
    console.error('Get help FAQs error:', error);

    return failure(
      res,
      500,
      'Internal server error',
      'SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

module.exports = {
  getHelpFaqs
};

