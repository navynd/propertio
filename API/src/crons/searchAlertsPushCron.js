const cron = require('node-cron');
const mongoose = require('mongoose');

const UsersModel = require('../models/usersModel');
const PropertiesModel = require('../models/propertiesModal');
const Notification = require('../models/notificationModel');
const { logger } = require('../utils/logger');
const { sendPushNotificationToToken } = require('../services/firebaseService');
const { sendEmail } = require('../services/emailService');
const {
  pickPrimaryImageRaw,
  ensureNotificationImage,
} = require('../utils/notificationImage');

const { Types } = mongoose;

const FRONTEND_URL = process.env.FRONTEND_URL || '';
const PLATFORMS = ['web', 'android', 'ios'];

const FREQUENCY_INTERVAL_MS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  'every-3-days': 3 * 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const FURNISHED_VALUES = ['fully', 'partially', 'unfurnished', 'any'];

const isValidObjectId = (value) => Types.ObjectId.isValid(value);
const toBooleanEnv = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const isUserPushNotificationEnabled = () =>
  toBooleanEnv(process.env.USER_PUSH_NOTIFICATION);

const isUserEmailNotificationEnabled = () =>
  toBooleanEnv(process.env.USER_MAIL_NOTIFICATION);

const getLastSentAt = (alert) => alert?.lastSentAt || alert?.createdAt || null;

const isAlertDue = (alert, now) => {
  if (!alert || !alert.isActive) return false;
  if (!alert.frequency || alert.frequency === 'off') return false;

  const intervalMs = FREQUENCY_INTERVAL_MS[alert.frequency];
  if (!intervalMs) return false;

  const lastSentAt = getLastSentAt(alert);
  if (!lastSentAt) return true;

  return now.getTime() - new Date(lastSentAt).getTime() >= intervalMs;
};

const buildPropertyFilterForAlert = (alert) => {
  const criteria = alert.searchCriteria || {};

  const filter = {
    isActive: true,
    status: 'active',
  };

  if (alert.alertType) {
    filter.listingType = alert.alertType;
  }

  if (criteria.location) {
    filter['location.city'] = new RegExp(String(criteria.location), 'i');
  }

  if (criteria.propertyType) {
    filter.propertyType = criteria.propertyType;
  }

  if (typeof criteria.bedrooms === 'number') {
    filter.bedrooms = criteria.bedrooms;
  }

  if (typeof criteria.bathrooms === 'number') {
    filter.bathrooms = criteria.bathrooms;
  }

  if (criteria.priceRange && typeof criteria.priceRange === 'object') {
    const priceCond = {};
    const min = typeof criteria.priceRange.min === 'number' ? criteria.priceRange.min : null;
    const max = typeof criteria.priceRange.max === 'number' ? criteria.priceRange.max : null;
    if (min !== null) priceCond.$gte = min;
    if (max !== null) priceCond.$lte = max;
    if (Object.keys(priceCond).length) filter.price = priceCond;
  }

  if (Array.isArray(criteria.amenities) && criteria.amenities.length) {
    filter.amenities = { $all: criteria.amenities };
  }

  if (criteria.furnished && criteria.furnished !== 'any' && FURNISHED_VALUES.includes(criteria.furnished)) {
    filter.furnishedStatus = criteria.furnished;
  }

  if (criteria.completionStatus && criteria.completionStatus !== 'all') {
    filter.completionStatus = criteria.completionStatus;
  }

  if (criteria.petFriendly === true) {
    filter.isPetFriendly = true;
  }

  if (criteria.waterfront === true) {
    filter.isWaterfront = true;
  }

  const since = getLastSentAt(alert);
  if (since) {
    filter.publishedAt = { $gt: new Date(since) };
  }

  return filter;
};

const safeSendPush = async ({ token, title, body, data, link }) => {
  // Firebase Admin expects data values to be strings
  const dataObj = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [String(k), v == null ? '' : String(v)]),
  );

  return sendPushNotificationToToken({
    token,
    title,
    body,
    data: dataObj,
    webpush: {
      notification: {
        icon: `${FRONTEND_URL}/favicon.ico`,
      },
      fcmOptions: link ? { link: String(link) } : undefined,
    },
  });
};

let isSearchAlertsPushCronRunning = false;

const processSearchAlertsPush = async () => {
  if (isSearchAlertsPushCronRunning) return;
  isSearchAlertsPushCronRunning = true;

  const now = new Date();
  const startedAt = now;
  let usersProcessed = 0;
  let notificationsCreated = 0;
  let pushesAttempted = 0;
  let pushesSucceeded = 0;
  let emailsAttempted = 0;
  let emailsSucceeded = 0;

  try {
    // Pull candidate users; actual due-ness is checked in JS due to array-subdoc timing logic.
    const users = await UsersModel.find(
      {
        'searchAlerts.isActive': true,
        'searchAlerts.frequency': { $in: Object.keys(FREQUENCY_INTERVAL_MS) },
        isActive: true,
        isBanned: false,
      },
    )
      .select('searchAlerts email fullName preferences.notificationSettings fcmTokens');

    if (!users.length) return;

    for (const user of users) {
      usersProcessed += 1;
      const pushEnabled = isUserPushNotificationEnabled()
        && user?.preferences?.notificationSettings?.push !== false;
      const emailEnabled = isUserEmailNotificationEnabled()
        && user?.preferences?.notificationSettings?.email !== false;
      const pushTokens = (user.fcmTokens || []).filter(
        (t) => t && t.isActive && t.token && PLATFORMS.includes(t.platform),
      );

      let userChanged = false;

      const alerts = user.searchAlerts || [];
      // console.log('this is alerts-->', alerts);
      for (const alert of alerts) {
        if (!isAlertDue(alert, now)) continue;

        const since = getLastSentAt(alert);
        const filter = buildPropertyFilterForAlert(alert);

        // Count only (V1): aggregated “X new properties posted” notification.
        // console.log('this is filter--->',filter)
        const matchesCount = await PropertiesModel.countDocuments(filter);
        

        // Always advance lastSentAt to prevent repeated scanning for the same time window.
        alert.lastSentAt = startedAt;
        userChanged = true;

        if (!matchesCount || matchesCount <= 0) continue;

        const matchedProperties = await PropertiesModel.find(filter)
          .sort({ publishedAt: -1 })
          .limit(Math.min(matchesCount, 25))
          .select('_id title images listingType')
          .lean();

        const primaryProperty = matchedProperties[0] || null;
        const imageFilename = ensureNotificationImage(
          pickPrimaryImageRaw(primaryProperty?.images),
          'property',
        );
        const propertyIds = matchedProperties.map((p) => String(p._id));

        const title = `${matchesCount} new ${matchesCount === 1 ? 'property' : 'properties'} ${
          matchesCount === 1 ? 'is' : 'are'
        } posted`;
        const message =
          alert.alertName && String(alert.alertName).trim()
            ? String(alert.alertName).trim()
            : 'New matching properties';

        const notification = await Notification.create({
          recipient: {
            recipientType: 'user',
            recipientId: user._id,
          },
          title,
          message,
          notificationType: 'alert',
          priority: 'medium',
          relatedItem: primaryProperty
            ? { itemType: 'property', itemId: primaryProperty._id }
            : undefined,
          actionUrl: `${FRONTEND_URL}/notifications`,
          actionText: 'View',
          channels: {
            email: emailEnabled,
            sms: false,
            push: pushEnabled,
            inApp: true,
          },
          metadata: {
            alertId: alert._id ? String(alert._id) : null,
            alertName: alert.alertName ? String(alert.alertName).trim() : null,
            alertType: alert.alertType || null,
            frequency: alert.frequency,
            matchesCount,
            since: since ? new Date(since).toISOString() : null,
            propertyId: primaryProperty ? String(primaryProperty._id) : null,
            propertyName: primaryProperty?.title?.trim() || null,
            propertyIds,
            image: imageFilename,
          },
        });

        notificationsCreated += 1;

        if (emailEnabled && user?.email) {
          emailsAttempted += 1;
          const subject = title;
          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
              <h2 style="margin: 0 0 12px;">${title}</h2>
              <p>Hi ${user.fullName || 'there'},</p>
              <p>${matchesCount} new matching ${matchesCount === 1 ? 'property has' : 'properties have'} been posted for your saved alert.</p>
              <p><strong>Alert:</strong> ${message}</p>
              <p><a href="${FRONTEND_URL}/notifications">View Notifications</a></p>
            </div>
          `;
          try {
            await sendEmail(user.email, subject, html);
            emailsSucceeded += 1;
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                'deliveryStatus.email.sent': true,
                'deliveryStatus.email.sentAt': new Date(),
              },
            });
          } catch (emailErr) {
            logger.error('searchAlertsPushCron email send failed', {
              error: emailErr.message,
              userId: user._id,
              alertId: alert?._id,
            });
          }
        }

        // Send push to each token (V1 direct cron + push).
        if (pushEnabled && pushTokens.length) {
          const link = `${FRONTEND_URL}/notifications`;
          const data = {
            notificationId: String(notification._id),
            notificationType: 'alert',
            alertId: String(alert._id),
            matchesCount: String(matchesCount),
            propertyId: primaryProperty ? String(primaryProperty._id) : '',
            image: imageFilename,
          };

          const titleForPush = title;
          const bodyForPush = `${matchesCount} new properties are posted`;

          const tokensToSend = pushTokens.map((t) => t.token).filter(Boolean);
          const results = await Promise.allSettled(
            tokensToSend.map(async (token) => {
              pushesAttempted += 1;
          
              try {
                await safeSendPush({
                  token,
                  title: titleForPush,
                  body: bodyForPush,
                  data,
                  link,
                });
                return { success: true, token };
              } catch (err) {
                return { success: false, token, error: err };
              }
            }),
          );
          
          const invalidTokens = [];
          
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value.success) {
              pushesSucceeded += 1;
            } else {
              const error = r.reason || r.value?.error;
          
              console.error("🔥 Push Error:", {
                error: error?.message,
                code: error?.code,
              });
          
              if (
                error?.code === 'messaging/registration-token-not-registered' ||
                error?.code === 'messaging/invalid-registration-token'
              ) {
                invalidTokens.push(r.value?.token);
              }
            }
          });

          if (invalidTokens.length) {
            await UsersModel.updateOne(
              { _id: user._id },
              {
                $pull: {
                  fcmTokens: { token: { $in: invalidTokens } }
                }
              }
            );
          }

          const anySuccess = results.some(
            (r) => r.status === 'fulfilled' && r.value?.success === true,
          );
          if (anySuccess) {
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                'deliveryStatus.push.sent': true,
                'deliveryStatus.push.sentAt': new Date(),
              },
            });
          }
        }
      }

      if (userChanged) {
        await user.save();
      }
    }
  } catch (err) {
    logger.error('searchAlertsPushCron failed', { error: err.message });
  } finally {
    isSearchAlertsPushCronRunning = false;
    logger.info('searchAlertsPushCron completed', {
      startedAt,
      endedAt: new Date(),
      usersProcessed,
      notificationsCreated,
      pushesAttempted,
      pushesSucceeded,
      emailsAttempted,
      emailsSucceeded,
    });
  }
};

const startSearchAlertsPushCron = () => {
  // Runs frequently; each alert decides if it is “due” by lastSentAt + frequency.
  cron.schedule('0 * * * *', async () => {
    await processSearchAlertsPush();
  }, { timezone: 'Asia/Dubai' });

  logger.info('searchAlertsPushCron registered', {
    schedule: '0 * * * *',
    timezone: 'Asia/Dubai',
  });
};

module.exports = { startSearchAlertsPushCron };

