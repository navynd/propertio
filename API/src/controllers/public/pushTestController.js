const asyncHandler = require('express-async-handler');
const { sendPushNotificationToToken } = require('../../services/firebaseService');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const isValidDebugSecret = (secret = '') => {
  const expected = process.env.PUSH_TEST_SECRET || process.env.NOTIFICATION_TEST_SECRET;
  if (!expected) return false;
  return String(secret) === String(expected);
};

const sendWebPushTest = asyncHandler(async (req, res) => {
  const providedSecret = req.headers['x-push-test-secret'] || req.body?.secret;
  if (!isValidDebugSecret(providedSecret)) {
    return failure(res, 401, 'Unauthorized test request', 'UNAUTHORIZED');
  }

  const { token, title, body, data, clickActionUrl } = req.body || {};
  if (!token || typeof token !== 'string') {
    return failure(res, 400, 'token is required', 'VALIDATION_ERROR');
  }

  try {
    const messageId = await sendPushNotificationToToken({
      token: token.trim(),
      title: title || 'Propertyfinder Test',
      body: body || 'Web push test from API',
      data: data && typeof data === 'object' ? data : {},
      webpush: {
        fcmOptions: clickActionUrl ? { link: String(clickActionUrl) } : undefined,
      },
    });

    return success(res, 'Push test sent successfully', { messageId });
  } catch (error) {
    logger.error('Push test send failed', {
      error: error.message,
      code: error.code,
    });
    return failure(
      res,
      500,
      error.message || 'Failed to send push notification',
      'PUSH_SEND_FAILED'
    );
  }
});

module.exports = {
  sendWebPushTest,
};
