const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const path = require('path');

const UsersModel = require('../../models/usersModel');
const CountriesModel = require('../../models/countriesModel');
const Notification = require('../../models/notificationModel');
const uploadService = require('../../services/uploadService');
const { sanitizeUser, formatPhoneNumber, isPhone, success, failure, isProfilelessProfilePicture } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const PROFILE_PICTURE_FOLDER = 'profile-pictures';

const getAuthUserId = (req = {}) => req?.user?.userId || req?.user?.id || req?.user?._id;

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

// Removed getProfileImageBaseUrl - using standardized response format

const buildSafeUser = (user) => {
  const safeUser = sanitizeUser(user);
  delete safeUser.access_token;
  delete safeUser.refresh_token;
  delete safeUser.refresh_token_expires_at;
  delete safeUser.passwordResetOTPHash;
  delete safeUser.passwordResetOTPExpires;
  safeUser.phoneCode = safeUser.phoneCode || null;
  safeUser.phoneNumberWithoutCode = safeUser.phoneNumberWithoutCode || null;

  return safeUser;
};

const normalizePreferences = (preferences) => {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return preferences || {};
  }
  return {
    ...preferences,
    notificationSettings:
      preferences.notificationSettings
      && typeof preferences.notificationSettings === 'object'
      && !Array.isArray(preferences.notificationSettings)
        ? { ...preferences.notificationSettings }
        : preferences.notificationSettings,
  };
};

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "671b5e943d3fe8fe805dd95a"
 *                         firstName:
 *                           type: string
 *                           example: John
 *                         lastName:
 *                           type: string
 *                           example: Doe
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: john@example.com
 *                         phoneNumber:
 *                           type: string
 *                           example: "+971501234567"
 *                         phoneCode:
 *                           type: string
 *                           nullable: true
 *                           example: "+971"
 *                         phoneNumberWithoutCode:
 *                           type: string
 *                           nullable: true
 *                           example: "501234567"
 *                         country:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: United Arab Emirates
 *                             code:
 *                               type: string
 *                               example: AE
 *                             phoneCode:
 *                               type: string
 *                               example: "+971"
 *                             flag:
 *                               type: string
 *                               example: "🇦🇪"
 *                             isActive:
 *                               type: boolean
 *                               example: true
 *                         preferences:
 *                           type: object
 *                           properties:
 *                             notificationSettings:
 *                               type: object
 *                               properties:
 *                                 email:
 *                                   type: boolean
 *                                   example: true
 *                                 sms:
 *                                   type: boolean
 *                                   example: false
 *                                 push:
 *                                   type: boolean
 *                                   example: true
 *                             currency:
 *                               type: string
 *                               example: AED
 *                             language:
 *                               type: string
 *                               example: en
 *                         profilePicture:
 *                           type: string
 *                           nullable: true
 *                           example: "profile-pictures/abc123.jpg"
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *                         isPhoneVerified:
 *                           type: boolean
 *                           example: true
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T05:30:17.080Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T05:30:17.080Z"
 *                     hasUnreadNotifications:
 *                       type: boolean
 *                       description: True if the user has any unread (non-archived) notifications.
 *                       example: false
 *                     unreadNotificationCount:
 *                       type: integer
 *                       description: Number of unread (non-archived) notifications for the user.
 *                       example: 0
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const unreadNotificationFilter = {
    'recipient.recipientId': new mongoose.Types.ObjectId(userId),
    'recipient.recipientType': 'user',
    isRead: false,
    isArchived: false,
  };

  const [user, unreadNotificationCount] = await Promise.all([
    UsersModel.findById(userId)
      .select('-password -passwordResetOTPHash -passwordResetOTPExpires -refresh_token -access_token')
      .populate('country', 'name code phoneCode flag isActive')
      // Include basic details for contacted properties/projects and agents
      .populate({
        path: 'contactedProperties.property',
        select: 'title price currency location images status furnishedStatus completionStatus', populate: {
          path: 'listingType',
          select: 'name',
        },
      })
      // .populate({
      //   path: 'contactedProperties.project',
      //   select: 'projectName launchPrice location images publishStatus completionStatus projectType isFeatured',
      // })
      .populate({
        path: 'contactedProperties.agent',
        select: 'fullName email phoneNumber whatsappNumber agency',
      }),

    Notification.countDocuments(unreadNotificationFilter),
  ]);

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const safeUser = buildSafeUser(user);
  safeUser.preferences = normalizePreferences(safeUser.preferences);
  const hasUnreadNotifications = unreadNotificationCount > 0;
  return success(res, 'Profile fetched successfully', {
    user: safeUser,
    hasUnreadNotifications,
    unreadNotificationCount,
  }, 200);
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phoneNumber:
 *                 type: string
 *                 example: "501234567"
 *               countryId:
 *                 type: string
 *                 description: MongoDB ObjectId of the country.
 *                 example: "6531a6f0b1f3ad27c8b312e9"
 *               phoneCode:
 *                 type: string
 *                 description: Dial code to use when updating the phone number.
 *                 example: "+971"
 *               phoneNumberWithoutCode:
 *                 type: string
 *                 description: Local phone digits without dial code.
 *                 example: "501234567"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   currency:
 *                     type: string
 *                     example: AED
 *                   language:
 *                     type: string
 *                     example: en
 *                   savedSearches:
 *                     type: boolean
 *                     example: true
 *                   notificationSettings:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                         example: true
 *                       sms:
 *                         type: boolean
 *                         example: false
 *                       push:
 *                         type: boolean
 *                         example: true
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: Sanitized user object without sensitive tokens.
 *       400:
 *         description: Invalid input or no valid fields provided.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User or referenced country not found.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const {
    firstName,
    lastName,
    phoneNumber,
    countryId,
    phoneCode,
    preferences,
  } = req.body || {};

  const normalizedFirstName =
    typeof firstName === 'string' ? firstName.trim() : firstName;
  const normalizedLastName =
    typeof lastName === 'string' ? lastName.trim() : lastName;
  let resolvedPhoneCode = (phoneCode || '').trim();

  const user = await UsersModel.findById(userId);
  if (!user) {
    return failure(res, 404, 'User not found');
  }

  let updatesApplied = false;
  let country;

  if (typeof firstName !== 'undefined') {
    if (!normalizedFirstName) {
      return failure(res, 400, 'Invalid first name provided');
    }
    user.firstName = normalizedFirstName;
    updatesApplied = true;
  }

  if (typeof lastName !== 'undefined') {
    if (!normalizedLastName) {
      return failure(res, 400, 'Invalid last name provided');
    }
    user.lastName = normalizedLastName;
    updatesApplied = true;
  }

  if (countryId) {
    country = await CountriesModel.findById(countryId);
    if (!country) {
      return failure(res, 404, 'Selected country not found');
    }

    if (!resolvedPhoneCode && country.phoneCode) {
      resolvedPhoneCode = country.phoneCode;
    }

    user.country = country._id;
    updatesApplied = true;
  }

  const hasPhoneUpdate = typeof phoneNumber !== 'undefined';

  if (hasPhoneUpdate) {
    const normalizedPhoneNumber = `${phoneNumber || ''}`.trim();
    if (!normalizedPhoneNumber) {
      return failure(res, 400, 'Invalid phone number provided');
    }
    if (!/^[\d\s()+-]+$/.test(normalizedPhoneNumber)) {
      return failure(res, 400, 'Phone number can contain only digits and +, -, (, )');
    }

    const localPhoneDigits = normalizedPhoneNumber.replace(/\D/g, '');
    if (localPhoneDigits.length < 6 || localPhoneDigits.length > 12) {
      return failure(res, 400, 'Phone number must be between 6 and 12 digits');
    }

    if (!resolvedPhoneCode) {
      const fallbackCountryId = country ? country._id : user.country;
      if (fallbackCountryId) {
        const fallbackCountry = await CountriesModel.findById(fallbackCountryId).select(
          'phoneCode'
        );
        if (fallbackCountry?.phoneCode) {
          resolvedPhoneCode = fallbackCountry.phoneCode;
        }
      }
    }

    if (!resolvedPhoneCode) {
      return failure(res, 400, 'Country dial code is required for phone updates');
    }

    const normalizedResolvedPhoneCode = formatPhoneNumber(resolvedPhoneCode);
    const normalizedPhone = formatPhoneNumber(`${normalizedResolvedPhoneCode}${normalizedPhoneNumber}`);
    if (!isPhone(normalizedPhone)) {
      return failure(res, 400, 'Invalid phone number format');
    }

    user.phoneNumber = normalizedPhone;
    user.phoneCode = normalizedResolvedPhoneCode || null;
    user.phoneNumberWithoutCode = localPhoneDigits || null;
    updatesApplied = true;
  }

  if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
    user.preferences = normalizePreferences(user.preferences) || {};

    if (typeof preferences.currency !== 'undefined') {
      user.preferences.currency = String(preferences.currency || '').trim() || user.preferences.currency;
      updatesApplied = true;
    }
    if (typeof preferences.language !== 'undefined') {
      user.preferences.language = String(preferences.language || '').trim() || user.preferences.language;
      updatesApplied = true;
    }
    if (typeof preferences.savedSearches !== 'undefined') {
      user.preferences.savedSearches = toBoolean(preferences.savedSearches);
      updatesApplied = true;
    }
    if (
      preferences.notificationSettings
      && typeof preferences.notificationSettings === 'object'
      && !Array.isArray(preferences.notificationSettings)
    ) {
      const ns = preferences.notificationSettings;
      if (typeof ns.email !== 'undefined') {
        if (
          !user.preferences.notificationSettings
          || typeof user.preferences.notificationSettings !== 'object'
          || Array.isArray(user.preferences.notificationSettings)
        ) {
          user.preferences.notificationSettings = {};
        }
        user.preferences.notificationSettings.email = toBoolean(ns.email);
        updatesApplied = true;
      }
      if (typeof ns.sms !== 'undefined') {
        if (
          !user.preferences.notificationSettings
          || typeof user.preferences.notificationSettings !== 'object'
          || Array.isArray(user.preferences.notificationSettings)
        ) {
          user.preferences.notificationSettings = {};
        }
        user.preferences.notificationSettings.sms = toBoolean(ns.sms);
        updatesApplied = true;
      }
      if (typeof ns.push !== 'undefined') {
        if (
          !user.preferences.notificationSettings
          || typeof user.preferences.notificationSettings !== 'object'
          || Array.isArray(user.preferences.notificationSettings)
        ) {
          user.preferences.notificationSettings = {};
        }
        user.preferences.notificationSettings.push = toBoolean(ns.push);
        updatesApplied = true;
      }
    }
  }

  if (!updatesApplied) {
    return failure(res, 400, 'No valid fields provided for update');
  }

  await user.save();
  await user.populate('country', 'name code phoneCode flag isActive');

  const safeUser = buildSafeUser(user);
  safeUser.preferences = normalizePreferences(safeUser.preferences);
  //   const dialCodeToExpose =
  //     user.country?.phoneCode || (resolvedPhoneCode ? resolvedPhoneCode : undefined);
  //   if (dialCodeToExpose) {
  //     safeUser.countryDialCode = dialCodeToExpose;
  //   }

  return success(res, 'Profile updated successfully', { user: safeUser }, 200);
});

/**
 * @swagger
 * /users/upload-profile-picture:
 *   post:
 *     summary: Upload or remove the authenticated user's profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Image file to set as the profile picture.
 *               removeProfilePicture:
 *                 type: boolean
 *                 description: Set to true to remove the current profile picture.
 *                 example: false
 *     responses:
 *       200:
 *         description: Profile picture updated or removed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile picture updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageBaseUrl:
 *                       type: string
 *                       example: "https://cdn.example.com/uploads/"
 *                     user:
 *                       type: object
 *                       description: Updated user profile after the picture change.
 *       400:
 *         description: No image provided or invalid request.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const removeRequested = toBoolean(req.body?.removeProfilePicture);

  const user = await UsersModel.findById(userId);
  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const previousPicture = user.profilePicture;

  if (removeRequested && !req.file) {
    if (isProfilelessProfilePicture(previousPicture)) {
      const safeUser = buildSafeUser(user);
      return success(res, 'Profile picture removed', { user: safeUser }, 200);
    }
    if (previousPicture) {
      // Handle backward compatibility: if previousPicture already contains a path, use it as-is
      const previousPicturePath = previousPicture.includes('/') 
        ? previousPicture 
        : `img/user/${previousPicture}`;
      await uploadService.delete(previousPicturePath).catch((error) => {
        logger.warn('Failed to delete previous profile picture', { error: error.message });
      });
    }

    user.profilePicture = undefined;
    await user.save();

    const safeUser = buildSafeUser(user);

    return success(res, 'Profile picture removed', { user: safeUser }, 200);
  }

  if (!req.file) {
    return failure(res, 400, 'No profile picture provided');
  }

  const uploaded = await uploadService.upload(req.file, 'user', {
    generateThumbnail: false,
  });

  // Save only the filename in the database
  user.profilePicture = uploaded.filename;
  await user.save();

  if (previousPicture && previousPicture !== uploaded.filename && !isProfilelessProfilePicture(previousPicture)) {
    // Handle backward compatibility: if previousPicture already contains a path, use it as-is
    const previousPicturePath = previousPicture.includes('/') 
      ? previousPicture 
      : `img/user/${previousPicture}`;
    await uploadService.delete(previousPicturePath).catch((error) => {
      logger.warn('Failed to delete previous profile picture', { error: error.message });
    });
  }

  const safeUser = buildSafeUser(user);

  // Build standardized response
  const responseData = uploadService.buildStandardResponse(
    uploaded,
    { images: 'user' },
    { user: safeUser }
  );

  return success(res, 'Profile picture updated', responseData, 200);
});

/**
 * @swagger
 * /users/account:
 *   delete:
 *     summary: Delete (deactivate) the authenticated user's account
 *     description: >
 *       Deactivates the user's account by setting `isActive` to false, revoking tokens,
 *       and clearing device push tokens and user-specific activity lists. This endpoint
 *       is intended to be used from the mobile app when a user chooses "Delete my account".
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const user = await UsersModel.findById(userId);

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  // Deactivate account and revoke access
  user.isActive = false;
  user.access_token = undefined;
  user.refresh_token = undefined;
  user.token_expires_at = undefined;
  user.refresh_token_expires_at = undefined;

  // Clear device/session tokens and user-specific lists
  user.fcmTokens = [];
  user.savedProperties = [];
  user.searchAlerts = [];
  user.contactedProperties = [];
  user.searchHistory = [];
  user.recentSearches = [];

  await user.save();

  return success(res, 'Account deleted successfully', {}, 200);
});

/**
 * @swagger
 * /users/contacted-properties:
 *   get:
 *     summary: Get the authenticated user's contacted properties and projects
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page.
 *       - in: query
 *         name: contactMethod
 *         schema:
 *           type: string
 *           enum: [call, email, whatsapp]
 *         description: Filter contacted items by contact method.
 *     responses:
 *       200:
 *         description: Contacted properties fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contacted properties fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: array
 *                       description: List of contacted items (properties/projects) with agent and metadata.
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
const getContactedProperties = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const rawPage = Number.parseInt(req.query.page, 10);
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
  const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 10 : Math.min(rawLimit, 100);
  const contactMethod = req.query.contactMethod;

  const allowedMethods = ['call', 'email', 'whatsapp'];
  if (contactMethod && !allowedMethods.includes(contactMethod)) {
    return failure(res, 400, 'Invalid contactMethod. Allowed: call, email, whatsapp');
  }

  const user = await UsersModel.findById(userId)
    .select('contactedProperties')
    .populate({
      path: 'contactedProperties.property',
      select: 'title price currency location images status furnishedStatus completionStatus',
      populate: {
        path: 'listingType',
        select: 'name',
      },
    })
    // .populate({
    //   path: 'contactedProperties.project',
    //   select: 'projectName launchPrice location images publishStatus completionStatus projectType isFeatured',
    // })
    .populate({
      path: 'contactedProperties.agent',
      select: 'fullName email phoneNumber whatsappNumber agency brokerLicenseNumber', populate: {
        path: 'languages',
        select: 'name code nativeName',
      }
    });

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  // Old logic (kept for reference):
  // let items = Array.isArray(user.contactedProperties) ? [...user.contactedProperties] : [];
  let items = Array.isArray(user.contactedProperties)
    ? user.contactedProperties.filter((item) => item?.property)
    : [];

  if (contactMethod) {
    items = items.filter((item) => item.contactMethod === contactMethod);
  }

  // Most recent first
  items.sort((a, b) => {
    const aTime = a.contactedAt ? new Date(a.contactedAt).getTime() : 0;
    const bTime = b.contactedAt ? new Date(b.contactedAt).getTime() : 0;
    return bTime - aTime;
  });

  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  // Old logic (kept for reference):
  // const paginatedItems = items.slice(start, start + limit);
  const paginatedItems = items.slice(start, start + limit).map((item) => {
    const itemObj = typeof item?.toObject === 'function' ? item.toObject() : item;
    const { project, ...propertyOnlyItem } = itemObj;
    return propertyOnlyItem;
  });

  return success(res, 'Contacted properties fetched successfully', {
    properties: paginatedItems,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  });
});

// /**
//  * @swagger
//  * /users/contacted-properties/{id}:
//  *   delete:
//  *     summary: Delete a single contacted property/project entry
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: ID of the contactedProperties entry to delete.
//  *     responses:
//  *       200:
//  *         description: Contacted property deleted successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: Contacted property deleted successfully
//  *       400:
//  *         description: Invalid id provided.
//  *       401:
//  *         description: Authentication required or invalid token.
//  *       404:
//  *         description: Contacted property not found.
//  */
// const deleteContactedProperty = asyncHandler(async (req, res) => {
//   const userId = getAuthUserId(req);

//   if (!userId) {
//     return failure(res, 401, 'Authentication required');
//   }

//   const { id } = req.params || {};

//   if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//     return failure(res, 400, 'Valid contacted property id is required');
//   }

//   const result = await UsersModel.updateOne(
//     { _id: userId },
//     {
//       $pull: {
//         contactedProperties: { _id: id },
//       },
//     },
//   );

//   if (!result.modifiedCount) {
//     return failure(res, 404, 'Contacted property not found');
//   }

//   return success(res, 'Contacted property deleted successfully', {});
// });

/**
 * @swagger
 * /users/contacted-properties:
 *   delete:
 *     summary: Delete multiple contacted properties/projects entries by IDs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 description: Array of contactedProperties entry IDs to delete.
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Selected contacted properties deleted successfully.
 *       400:
 *         description: Invalid ids provided.
 *       401:
 *         description: Authentication required or invalid token.
 */
const deleteMultipleContactedProperties = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

  if (!ids.length) {
    return failure(res, 400, 'At least one contacted property id is required');
  }

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!validIds.length) {
    return failure(res, 400, 'No valid contacted property ids provided');
  }

  const result = await UsersModel.updateOne(
    { _id: userId },
    {
      $pull: {
        contactedProperties: { _id: { $in: validIds } },
      },
    },
  );

  if (!result.modifiedCount) {
    return failure(res, 404, 'No contacted properties found for the given ids');
  }

  return success(res, 'Selected contacted properties deleted successfully', {});
});

/**
 * @swagger
 * /users/contacted-properties/delete-all:
 *   delete:
 *     summary: Delete all contacted properties/projects for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All contacted properties deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All contacted properties deleted successfully
 *       401:
 *         description: Authentication required or invalid token.
 */
const deleteAllContactedProperties = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  await UsersModel.updateOne(
    { _id: userId },
    {
      $set: {
        contactedProperties: [],
      },
    },
  );

  return success(res, 'All contacted properties deleted successfully', {});
});

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  getContactedProperties,
  // deleteContactedProperty,
  deleteMultipleContactedProperties,
  deleteAllContactedProperties,
  deleteAccount,
};
