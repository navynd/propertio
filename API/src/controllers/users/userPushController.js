const asyncHandler = require('express-async-handler');
const { success, failure } = require('../../utils/helpers');
const { registerFcmToken, unregisterFcmToken } = require('../../services/fcmTokenService');
const { logger } = require('../../utils/logger');

const getAuthUserId = (req = {}) =>
  req?.user?.userId || req?.user?.id || req?.user?._id;

/**
 * @swagger
 * /users/notifications/push/register:
 *   post:
 *     summary: Register or refresh authenticated user's push token
 *     tags: [Users]
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
 *                 description: Firebase Cloud Messaging registration token.
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
 *         description: Validation error in request body.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Recipient not found.
 */
const registerPushToken = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Authentication required', 'UNAUTHORIZED');
  }

  try {
    await registerFcmToken('user', userId, req.body || {});
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
    logger.error('registerPushToken failed', { error: error.message, userId });
    return failure(res, 500, error.message || 'Failed to register push token', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /users/notifications/push/unregister:
 *   delete:
 *     summary: Unregister authenticated user's push token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: false
 *         description: FCM token to remove (optional if body is sent).
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: false
 *         description: Device id to remove (requires platform).
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, android, ios]
 *         required: false
 *         description: Platform for deviceId-based removal.
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
 *         description: Provide token or deviceId with platform.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Recipient not found.
 */
const unregisterPushToken = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Authentication required', 'UNAUTHORIZED');
  }

  try {
    const body = req.body || {};
    const merged = {
      token: body.token ?? req.query?.token,
      deviceId: body.deviceId ?? req.query?.deviceId,
      platform: body.platform ?? req.query?.platform,
    };
    const result = await unregisterFcmToken('user', userId, merged);
    return success(res, 'Push token removed successfully', result);
  } catch (error) {
    if (error.message === 'Recipient not found') {
      return failure(res, 404, error.message, 'NOT_FOUND');
    }
    if (error.message.includes('Provide token')) {
      return failure(res, 400, error.message, 'VALIDATION_ERROR');
    }
    logger.error('unregisterPushToken failed', { error: error.message, userId });
    return failure(res, 500, error.message || 'Failed to remove push token', 'SERVER_ERROR');
  }
});

module.exports = {
  registerPushToken,
  unregisterPushToken,
};
