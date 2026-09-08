const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const {
  getPublicContactPage,
  createContactSubmission,
} = require('../../services/contactService');

/**
 * @swagger
 * /contact:
 *   get:
 *     summary: Get Contact Us page content
 *     description: >
 *       Returns contact page settings, form subject options, and active office locations
 *       for the public Contact page.
 *     tags: [CMS Contact]
 *     responses:
 *       200:
 *         description: Contact page content fetched successfully
 *       500:
 *         description: Server error
 */
const getContact = asyncHandler(async (req, res) => {
  try {
    const data = await getPublicContactPage();
    return success(res, 'Contact page content fetched successfully', data);
  } catch (error) {
    logger.error('Get contact content failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to fetch contact content', 'SERVER_ERROR', error.message);
  }
});

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit Contact Us form
 *     description: Creates a contact form submission stored for admin review.
 *     tags: [CMS Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               subject:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact form submitted successfully
 *       400:
 *         description: name or email is required
 *       500:
 *         description: Server error
 */
const submitContact = asyncHandler(async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const comments = String(req.body?.comments || '').trim();

    if (!name) {
      return failure(res, 400, 'name is required', 'VALIDATION_ERROR');
    }
    if (!email) {
      return failure(res, 400, 'email is required', 'VALIDATION_ERROR');
    }

    const submission = await createContactSubmission({
      name,
      email,
      phone,
      subject,
      comments,
    });

    return success(res, 'Contact form submitted successfully', { submission });
  } catch (error) {
    logger.error('Submit contact form failed', { error: error.message, stack: error.stack });
    return failure(res, 500, 'Failed to submit contact form', 'SERVER_ERROR', error.message);
  }
});

module.exports = { getContact, submitContact };
