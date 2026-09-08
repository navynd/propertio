const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { registerFcmToken, unregisterFcmToken } = require('../../services/fcmTokenService');
const { logger } = require('../../utils/logger');

const getAuthDeveloperId = (req = {}) =>
  req?.user?.developerId || req?.user?.id || req?.user?._id;

/**
 * @swagger
 * /developers/notifications/push/register:
 *   post:
 *     summary: Register or refresh authenticated developer push token
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, platform]
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [web, android, ios]
 *               deviceId:
 *                 type: string
 *                 nullable: true
 *               deviceModel:
 *                 type: string
 *                 nullable: true
 *               deviceVersion:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Push token registered successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Recipient not found.
 */
const registerPushToken = asyncHandler(async (req, res) => {
  const developerId = getAuthDeveloperId(req);
  if (!developerId) {
    return failure(res, 401, 'Authentication required', 'UNAUTHORIZED');
  }

  try {
    await registerFcmToken('developer', developerId, req.body || {});
    return success(res, 'Push token registered successfully', { ok: true });
  } catch (error) {
    if (error.message === 'Recipient not found') {
      return failure(res, 404, error.message, 'NOT_FOUND');
    }
    if (
      error.message.includes('required') ||
      error.message.includes('platform') ||
      error.message.includes('Invalid recipient')
    ) {
      return failure(res, 400, error.message, 'VALIDATION_ERROR');
    }
    logger.error('developer registerPushToken failed', { error: error.message, developerId });
    return failure(res, 500, error.message || 'Failed to register push token', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /developers/notifications/push/unregister:
 *   delete:
 *     summary: Unregister authenticated developer push token
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, android, ios]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [web, android, ios]
 *     responses:
 *       200:
 *         description: Push token removed successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Recipient not found.
 */
const unregisterPushToken = asyncHandler(async (req, res) => {
  const developerId = getAuthDeveloperId(req);
  if (!developerId) {
    return failure(res, 401, 'Authentication required', 'UNAUTHORIZED');
  }

  try {
    const body = req.body || {};
    const merged = {
      token: body.token ?? req.query?.token,
      deviceId: body.deviceId ?? req.query?.deviceId,
      platform: body.platform ?? req.query?.platform,
    };
    const result = await unregisterFcmToken('developer', developerId, merged);
    return success(res, 'Push token removed successfully', result);
  } catch (error) {
    if (error.message === 'Recipient not found') {
      return failure(res, 404, error.message, 'NOT_FOUND');
    }
    if (error.message.includes('Provide token')) {
      return failure(res, 400, error.message, 'VALIDATION_ERROR');
    }
    logger.error('developer unregisterPushToken failed', { error: error.message, developerId });
    return failure(res, 500, error.message || 'Failed to remove push token', 'SERVER_ERROR');
  }
});

module.exports = {
  registerPushToken,
  unregisterPushToken,
};
