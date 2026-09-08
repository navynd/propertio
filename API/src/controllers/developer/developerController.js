const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Developer = require('../../models/developersModel');
const Notification = require('../../models/notificationModel');
const Agencies = require('../../models/agenciesModel');
const { success, failure, formatPhoneNumber, hasAllowedExtension, sanitizeDeveloper } = require('../../utils/helpers');
const { DOC_EXTENSIONS, IMAGE_EXTENSIONS } = require('../../utils/constants');
const { logger } = require('../../utils/logger');

const DEVELOPER_DOC_EXTENSIONS = [...new Set([...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS])];

const validateDocuments = (docs = []) =>
    Array.isArray(docs) && docs.every((doc) => hasAllowedExtension(doc, DEVELOPER_DOC_EXTENSIONS));
const validateProfilePicture = (url) => !url || hasAllowedExtension(url, IMAGE_EXTENSIONS);
const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['true', '1', 'yes', 'on'].includes(normalized);
    }
    return false;
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
 * /developers/profile:
 *   get:
 *     summary: Get the authenticated developer's profile
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
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
 *                     _id:
 *                       type: string
 *                       example: 671b5e943d3fe8fe805dd95a
 *                     name:
 *                       type: string
 *                       example: Horizon Builders
 *                     phoneNumber:
 *                       type: string
 *                       example: +971501234567
 *                     phoneCode:
 *                       type: string
 *                       nullable: true
 *                       example: +971
 *                     phoneNumberWithoutCode:
 *                       type: string
 *                       nullable: true
 *                       example: "501234567"
 *                     website:
 *                       type: string
 *                       example: https://horizonbuilders.ae
 *                     profilePicture:
 *                       type: string
 *                       nullable: true
 *                       example: https://cdn.example.com/developer-avatar.png
 *                     foundedYear:
 *                       type: integer
 *                       example: 2007
 *                     shortDescription:
 *                       type: string
 *                       example: Premier developer specializing in mixed-use communities.
 *                     longDescription:
 *                       type: string
 *                     description:
 *                       type: string
 *                       example: We are committed to delivering high-rise residential and hospitality projects.
 *                     address:
 *                       type: object
 *                       properties:
 *                         fullAddress:
 *                           type: string
 *                           example: Downtown Dubai, UAE
 *                         street:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         country:
 *                           type: string
 *                         zipCode:
 *                           type: string
 *                     registrationDocuments:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - https://cdn.example.com/docs/license.pdf
 *                     totalProjects:
 *                       type: integer
 *                       example: 38
 *                     completedProjects:
 *                       type: integer
 *                       example: 30
 *                     ongoingProjects:
 *                       type: integer
 *                       example: 5
 *                     offPlanProjects:
 *                       type: integer
 *                       example: 3
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     isPhoneVerified:
 *                       type: boolean
 *                       example: true
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     projectsByLocation:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                           locationName:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     awards:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           year:
 *                             type: integer
 *                     socialLinks:
 *                       type: object
 *                       properties:
 *                         linkedin:
 *                           type: string
 *                         facebook:
 *                           type: string
 *                         instagram:
 *                           type: string
 *                         twitter:
 *                           type: string
 *                         website:
 *                           type: string
 *                     ratings:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                         totalCount:
 *                           type: integer
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         currency:
 *                           type: string
 *                           example: AED
 *                         language:
 *                           type: string
 *                           example: en
 *                         savedSearches:
 *                           type: boolean
 *                           example: true
 *                         notificationSettings:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: boolean
 *                               example: true
 *                             sms:
 *                               type: boolean
 *                               example: false
 *                             push:
 *                               type: boolean
 *                               example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     hasUnreadNotifications:
 *                       type: boolean
 *                       description: True if the developer has any unread (non-archived) notifications.
 *                     unreadNotificationCount:
 *                       type: integer
 *                       description: Number of unread (non-archived) notifications for the developer.
 *       401:
 *         description: Unauthorized or missing token
 *       404:
 *         description: Developer not found
 */
const getProfile = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const unreadNotificationFilter = {
            'recipient.recipientId': new mongoose.Types.ObjectId(developerId),
            'recipient.recipientType': 'developer',
            isRead: false,
            isArchived: false,
        };

        const [developer, unreadNotificationCount] = await Promise.all([
            Developer.findById(developerId),
            Notification.countDocuments(unreadNotificationFilter),
        ]);

        if (!developer) {
            return failure(res, 404, 'Developer not found', 'NOT_FOUND');
        }

        const profile = sanitizeDeveloper(developer);
        profile.preferences = normalizePreferences(profile.preferences);
        const hasUnreadNotifications = unreadNotificationCount > 0;
        return success(res, 'Profile fetched successfully', {
            ...profile,
            hasUnreadNotifications,
            unreadNotificationCount,
        });
    } catch (error) {
        logger.error('Get developer profile failed', { error: error.message });
        return failure(res, 500, 'Failed to fetch profile', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/profile:
 *   put:
 *     summary: Update the authenticated developer's profile
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Fields that can be updated; documents and pictures must use allowed extensions.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Horizon Builders
 *               phoneNumber:
 *                 type: string
 *                 description: Changing this resets phone verification.
 *                 example: +971509876543
 *               phoneCode:
 *                 type: string
 *                 description: Optional dial code to persist separately.
 *                 example: +971
 *               phoneNumberWithoutCode:
 *                 type: string
 *                 description: Optional local phone digits without dial code.
 *                 example: "509876543"
 *               address:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               foundedYear:
 *                 type: integer
 *                 example: 2012
 *               shortDescription:
 *                 type: string
 *                 example: Leading developer of waterfront communities.
 *               longDescription:
 *                 type: string
 *               description:
 *                 type: string
 *                 example: Expertise in residential towers and integrated retail.
 *               profilePicture:
 *                 type: string
 *                 description: URL ending with .jpg/.jpeg/.png/.webp
 *               registrationDocuments:
 *                 type: array
 *                 description: URLs ending with allowed doc/image extensions.
 *                 items:
 *                   type: string
 *               website:
 *                 type: string
 *                 example: https://horizonbuilders.ae
 *               preferences:
 *                 type: object
 *                 properties:
 *                   currency:
 *                     type: string
 *                   language:
 *                     type: string
 *                   savedSearches:
 *                     type: boolean
 *                   notificationSettings:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                       sms:
 *                         type: boolean
 *                       push:
 *                         type: boolean
 *             required: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   description: Sanitized developer profile with sensitive verification/token fields removed.
 *       400:
 *         description: Invalid input (e.g., invalid phone format or unsupported document/picture extension)
 *       401:
 *         description: Unauthorized or missing token
 *       404:
 *         description: Developer not found
 */
const updateProfile = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const developer = await Developer.findById(developerId);
        if (!developer) {
            return failure(res, 404, 'Developer not found', 'NOT_FOUND');
        }

        const {
            name,
            phoneNumber,
            phoneCode,
            phoneNumberWithoutCode,
            address,
            foundedYear,
            shortDescription,
            longDescription,
            description,
            profilePicture,
            registrationDocuments,
            website,
            preferences,
        } = req.body || {};

        if (registrationDocuments && !validateDocuments(registrationDocuments)) {
            return failure(res, 400, 'Registration documents must be PDF/JPG/PNG', 'VALIDATION_ERROR');
        }

        if (profilePicture && !validateProfilePicture(profilePicture)) {
            return failure(res, 400, 'Profile picture must be JPG/PNG/WEBP', 'VALIDATION_ERROR');
        }

        if (name) developer.name = name;
        if (website) developer.website = website;
        if (typeof foundedYear !== 'undefined') developer.foundedYear = foundedYear;
        if (shortDescription) developer.shortDescription = shortDescription;
        if (longDescription) developer.longDescription = longDescription;
        if (description) developer.description = description;
        if (profilePicture) developer.profilePicture = profilePicture;
        if (registrationDocuments) developer.registrationDocuments = registrationDocuments;

        if (address) {
            developer.address = {
                ...developer.address,
                ...address,
            };
        }

        if (phoneNumber) {
            const normalizedPhoneCode = phoneCode ? formatPhoneNumber(phoneCode) : developer.phoneCode || null;
            const normalizedPhoneWithoutCode = typeof phoneNumberWithoutCode === 'string'
                ? phoneNumberWithoutCode.trim().replace(/\D/g, '') || null
                : `${phoneNumber}`.trim().replace(/\D/g, '') || null;
            const normalizedPhone = formatPhoneNumber(
                normalizedPhoneCode && normalizedPhoneWithoutCode
                    ? `${normalizedPhoneCode}${normalizedPhoneWithoutCode}`
                    : phoneNumber
            );
            if (!normalizedPhone) {
                return failure(res, 400, 'Invalid phone number', 'VALIDATION_ERROR');
            }
            if (normalizedPhone !== developer.phoneNumber) {
                developer.phoneNumber = normalizedPhone;
                developer.phoneCode = normalizedPhoneCode;
                developer.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
                developer.isPhoneVerified = false;
            }
        }

        if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
            developer.preferences = normalizePreferences(developer.preferences) || {};

            if (typeof preferences.currency !== 'undefined') {
                developer.preferences.currency = String(preferences.currency || '').trim() || developer.preferences.currency;
            }
            if (typeof preferences.language !== 'undefined') {
                developer.preferences.language = String(preferences.language || '').trim() || developer.preferences.language;
            }
            if (typeof preferences.savedSearches !== 'undefined') {
                developer.preferences.savedSearches = toBoolean(preferences.savedSearches);
            }
            if (
                preferences.notificationSettings
                && typeof preferences.notificationSettings === 'object'
                && !Array.isArray(preferences.notificationSettings)
            ) {
                const ns = preferences.notificationSettings;
                if (
                    !developer.preferences.notificationSettings
                    || typeof developer.preferences.notificationSettings !== 'object'
                    || Array.isArray(developer.preferences.notificationSettings)
                ) {
                    developer.preferences.notificationSettings = {};
                }
                if (typeof ns.email !== 'undefined') developer.preferences.notificationSettings.email = toBoolean(ns.email);
                if (typeof ns.sms !== 'undefined') developer.preferences.notificationSettings.sms = toBoolean(ns.sms);
                if (typeof ns.push !== 'undefined') developer.preferences.notificationSettings.push = toBoolean(ns.push);
            }
        }

        await developer.save();

        const profile = sanitizeDeveloper(developer);
        profile.preferences = normalizePreferences(profile.preferences);
        return success(res, 'Profile updated successfully', profile);
    } catch (error) {
        logger.error('Update developer profile failed', { error: error.message });
        return failure(res, 500, 'Failed to update profile', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/agency:
 *   get:
 *     summary: List active verified agencies (developer dropdown)
 *     description: Returns all agencies where isActive and isVerified are true, sorted by name, for use in developer flows such as assigning agencies to projects.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agencies fetched successfully
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
 *                   example: Agencies fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     agencies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Agency MongoDB ObjectId
 *                             example: 671b5e943d3fe8fe805dd95a
 *                           name:
 *                             type: string
 *                             description: Agency display name (agencyName)
 *                             example: Horizon Realty
 *       401:
 *         description: Unauthorized or missing developer token
 *       500:
 *         description: Failed to fetch agencies
 */
const getDropdown = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const rows = await Agencies.find({ isActive: true, isVerified: true })
            .select('agencyName')
            .sort({ agencyName: 1 })
            .lean();

        const agencies = rows.map((a) => ({
            id: a._id,
            name: a.agencyName || ''
        }));

        return success(res, 'Agencies fetched successfully', { agencies });
    } catch (error) {
        logger.error('Developer agency dropdown failed', { error: error.message });
        return failure(res, 500, 'Failed to fetch agencies', 'SERVER_ERROR');
    }
});

module.exports = {
    getProfile,
    updateProfile,
    getDropdown,
};

