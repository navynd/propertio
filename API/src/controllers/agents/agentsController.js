const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agent = require('../../models/agentsModel');
const Notification = require('../../models/notificationModel');
const CountriesModel = require('../../models/countriesModel');
const LanguagesModel = require('../../models/languagesModel');
const { success, failure, formatPhoneNumber, hasAllowedExtension, sanitizeAgent } = require('../../utils/helpers');
const { IMAGE_EXTENSIONS } = require('../../utils/constants');
const { logger } = require('../../utils/logger');

const ObjectId = mongoose.Types.ObjectId;

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

const normalizeLanguages = (languages) => {
  if (!languages) return [];
  if (Array.isArray(languages)) {
    return languages.filter(Boolean).map((lang) => {
      const langStr = lang.toString().trim();
      return ObjectId.isValid(langStr) ? new ObjectId(langStr) : null;
    }).filter(Boolean);
  }
  const langStr = languages.toString().trim();
  return ObjectId.isValid(langStr) ? [new ObjectId(langStr)] : [];
};

/**
 * @swagger
 * /agents/profile:
 *   get:
 *     summary: Get authenticated agent profile
 *     tags: [Agents]
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/AgentProfile'
 *                     - type: object
 *                       properties:
 *                         hasUnreadNotifications:
 *                           type: boolean
 *                           description: True if the agent has any unread (non-archived) notifications.
 *                         unreadNotificationCount:
 *                           type: integer
 *                           description: Number of unread (non-archived) notifications for the agent.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
const getProfile = asyncHandler(async (req, res) => {
  try {
    const agentId = req.user?.id || req.user?._id;
    if (!agentId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const unreadNotificationFilter = {
      'recipient.recipientId': new ObjectId(agentId),
      'recipient.recipientType': 'agent',
      isRead: false,
      isArchived: false,
    };

    const [agent, unreadNotificationCount] = await Promise.all([
      Agent.findById(agentId).populate('nationality', 'name code phoneCode flag isActive'),
      Notification.countDocuments(unreadNotificationFilter),
    ]);

    if (!agent) {
      return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const profile = sanitizeAgent(agent);
    profile.preferences = normalizePreferences(profile.preferences);
    const hasUnreadNotifications = unreadNotificationCount > 0;
    return success(res, 'Profile fetched successfully', {
      ...profile,
      hasUnreadNotifications,
      unreadNotificationCount,
    });
  } catch (error) {
    logger.error('Get agent profile failed', { error: error.message });
    return failure(res, 500, 'Failed to fetch profile', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agents/profile:
 *   put:
 *     summary: Update authenticated agent profile
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               phoneCode:
 *                 type: string
 *                 description: Optional dial code to persist separately.
 *                 example: "+971"
 *               phoneNumberWithoutCode:
 *                 type: string
 *                 description: Optional local phone digits without dial code.
 *                 example: "501234567"
 *               whatsappNumber:
 *                 type: string
 *               isWhatsappPrimary:
 *                 type: boolean
 *               specialization:
 *                 type: string
 *               experience:
 *                 type: number
 *               brokerLicenseNumber:
 *                 type: string
 *               nationality:
 *                 type: string
 *                 description: Country ObjectId
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *               linkedin:
 *                 type: string
 *               description:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 description: Uploaded image URL (JPG/PNG/WEBP)
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
 *                   $ref: '#/components/schemas/AgentProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const agentId = req.user?.id || req.user?._id;
    if (!agentId) {
      return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const {
      fullName,
      phoneNumber,
      phoneCode,
      phoneNumberWithoutCode,
      whatsappNumber,
      isWhatsappPrimary,
      specialization,
      experience,
      brokerLicenseNumber,
      nationality,
      languages,
      linkedin,
      description,
      profilePicture,
      preferences,
    } = req.body || {};

    if (profilePicture && !validateProfilePicture(profilePicture)) {
      return failure(res, 400, 'Profile picture must be JPG, PNG, or WEBP', 'VALIDATION_ERROR');
    }

    const normalizedLanguages = normalizeLanguages(languages);

    if (fullName) agent.fullName = fullName;
    if (specialization) agent.specialization = specialization;
    if (typeof experience !== 'undefined' && experience !== null && experience !== '') {
      const parsedExperience = Number(experience);
      if (Number.isNaN(parsedExperience)) {
        return failure(res, 400, 'Experience must be a number', 'VALIDATION_ERROR');
      }
      agent.experience = parsedExperience;
    }
    if (brokerLicenseNumber) agent.brokerLicenseNumber = brokerLicenseNumber;
    if (nationality) {
      if (!ObjectId.isValid(nationality)) {
        return failure(res, 400, 'Invalid nationality id', 'VALIDATION_ERROR');
      }

      const countryExists = await CountriesModel.exists({ _id: nationality });
      if (!countryExists) {
        return failure(res, 404, 'Country not found', 'NOT_FOUND');
      }

      agent.nationality = nationality;
    }
    if (description) agent.description = description;
    if (profilePicture) agent.profilePicture = profilePicture;
    if (normalizedLanguages.length) {
      // Validate that all language IDs exist and are active
      const validLanguages = await LanguagesModel.find({
        _id: { $in: normalizedLanguages },
        isActive: true
      }).select('_id').lean();

      if (validLanguages.length !== normalizedLanguages.length) {
        return failure(res, 400, 'One or more language IDs are invalid or inactive', 'VALIDATION_ERROR');
      }

      agent.languages = normalizedLanguages;
    }

    if (typeof isWhatsappPrimary !== 'undefined') {
      agent.isWhatsappPrimary = Boolean(isWhatsappPrimary);
    }

    if (whatsappNumber) {
      const normalizedWhatsapp = formatPhoneNumber(whatsappNumber);
      if (!normalizedWhatsapp) {
        return failure(res, 400, 'Invalid WhatsApp number', 'VALIDATION_ERROR');
      }
      agent.whatsappNumber = normalizedWhatsapp;
    }

    if (phoneNumber) {
      const normalizedPhoneCode = phoneCode ? formatPhoneNumber(phoneCode) : agent.phoneCode || null;
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
      if (normalizedPhone !== agent.phoneNumber) {
        agent.phoneNumber = normalizedPhone;
        agent.phoneCode = normalizedPhoneCode;
        agent.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
        agent.isPhoneVerified = false; // changing phone requires re-verification
      }
    }

    if (linkedin) {
      agent.socialLinks = { ...(agent.socialLinks || {}), linkedin };
    }

    if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
      agent.preferences = normalizePreferences(agent.preferences) || {};
      if (typeof preferences.currency !== 'undefined') {
        agent.preferences.currency = String(preferences.currency || '').trim() || agent.preferences.currency;
      }
      if (typeof preferences.language !== 'undefined') {
        agent.preferences.language = String(preferences.language || '').trim() || agent.preferences.language;
      }
      if (typeof preferences.savedSearches !== 'undefined') {
        agent.preferences.savedSearches = toBoolean(preferences.savedSearches);
      }
      if (
        preferences.notificationSettings
        && typeof preferences.notificationSettings === 'object'
        && !Array.isArray(preferences.notificationSettings)
      ) {
        const ns = preferences.notificationSettings;
        if (
          !agent.preferences.notificationSettings
          || typeof agent.preferences.notificationSettings !== 'object'
          || Array.isArray(agent.preferences.notificationSettings)
        ) {
          agent.preferences.notificationSettings = {};
        }
        if (typeof ns.email !== 'undefined') agent.preferences.notificationSettings.email = toBoolean(ns.email);
        if (typeof ns.sms !== 'undefined') agent.preferences.notificationSettings.sms = toBoolean(ns.sms);
        if (typeof ns.push !== 'undefined') agent.preferences.notificationSettings.push = toBoolean(ns.push);
      }
    }

    await agent.save();
    await agent.populate('nationality', 'name code phoneCode flag isActive');

    const profile = sanitizeAgent(agent);
    profile.preferences = normalizePreferences(profile.preferences);
    return success(res, 'Profile updated successfully', profile);
  } catch (error) {
    logger.error('Update agent profile failed', { error: error.message });
    return failure(res, 500, 'Failed to update profile', 'SERVER_ERROR');
  }
});

module.exports = {
  getProfile,
  updateProfile,
};
