const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Agency = require('../../models/agenciesModel');
const Notification = require('../../models/notificationModel');
const Agent = require('../../models/agentsModel');
const Developer = require('../../models/developersModel');
const { success, failure, formatPhoneNumber, sanitizeAgency, hasAllowedExtension, isEmail } = require('../../utils/helpers');
const { DOC_EXTENSIONS, IMAGE_EXTENSIONS } = require('../../utils/constants');
const { logger } = require('../../utils/logger');
const { sendInvitationEmail } = require('../../services/emailService');

const FRONTEND_URL = process.env.EXPERTS_UI_URL || '';
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const validateDocuments = (docs = []) => Array.isArray(docs) && docs.every((doc) => hasAllowedExtension(doc, DOC_EXTENSIONS));

const validateProfilePicture = (url) => !url || hasAllowedExtension(url, IMAGE_EXTENSIONS);

const normalizeEmail = (email = '') => email.toString().trim().toLowerCase();
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

// Check across PF expert roles to avoid duplicate invitations/accounts
const findExistingExpertByEmail = async (email) => {
    const normalizedEmail = normalizeEmail(email);

    const existingAgency = await Agency.findOne({ email: normalizedEmail });
    if (existingAgency) return { role: 'agency', entity: existingAgency };

    const existingDeveloper = await Developer.findOne({ email: normalizedEmail });
    if (existingDeveloper) return { role: 'developer', entity: existingDeveloper };

    const existingAgent = await Agent.findOne({ email: normalizedEmail });
    if (existingAgent) return { role: 'agent', entity: existingAgent };

    return null;
};

/**
 * @swagger
 * /agency/invite:
 *   post:
 *     summary: Send an invitation from an agency to an agent
 *     description: Creates or refreshes a pending agent record tied to the inviting agency and emails an invitation link.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               fullName:
 *                 type: string
 *                 description: Optional name used in the invitation email
 *     responses:
 *       200:
 *         description: Invitation sent
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
 *                   example: Invitation sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: agent@example.com
 *                     invitationToken:
 *                       type: string
 *                       example: "abc123token"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-31T23:59:59.000Z"
 *                     invitationLink:
 *                       type: string
 *                       example: "https://app.example.com/agent/accept-invitation?token=abc123token"
 *       400:
 *         description: Validation error (e.g., missing or invalid email)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agency not found
 *       409:
 *         description: Email already used by another role or agent already onboarded
 *       500:
 *         description: Server error
 */
/**
 * Send an invitation from an agency to an agent.
 * Creates or refreshes a pending agent record tied to the inviting agency.
 */
const sendAgentInvitation = asyncHandler(async (req, res) => {
    try {
        const agencyId = req.user?.id || req.user?._id;
        const { email, fullName } = req.body || {};

        if (!agencyId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        if (!email || !isEmail(email)) {
            return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
        }

        const agency = await Agency.findById(agencyId);
        if (!agency) {
            return failure(res, 404, 'Agency not found', 'NOT_FOUND');
        }

        const existingExpert = await findExistingExpertByEmail(email);
        if (existingExpert && existingExpert.role !== 'agent') {
            return failure(res, 409, `Email already used by ${existingExpert.role}`, 'CONFLICT');
        }

        const normalizedEmail = normalizeEmail(email);
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
        const invitationLink = `${FRONTEND_URL}/agent/accept-invitation?token=${token}`;

        const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

        let agent = existingExpert?.entity;

        if (agent && agent.invitationStatus === 'accepted') {
            return failure(res, 409, 'Agent already onboarded', 'CONFLICT');
        }

        if (!agent) {
            agent = await Agent.create({
                email: normalizedEmail,
                fullName: fullName || undefined,
                agency: agency._id,
                invitationToken: token,
                invitationStatus: 'pending',
                invitationSentAt: new Date(),
                invitationExpiry: expiresAt,
                isActive: false,
                isVerified: false,
                isEmailVerified: false,
                isPhoneVerified: false,
                password: tempPassword,
            });
        } else {
            agent.fullName = fullName || agent.fullName;
            agent.invitationToken = token;
            agent.invitationStatus = 'pending';
            agent.invitationSentAt = new Date();
            agent.invitationExpiry = expiresAt;
            agent.isVerified = false;
            agent.isEmailVerified = false;
            agent.isPhoneVerified = false;
            agent.password = tempPassword; // reset placeholder password
            agent.agency = agency._id; // ensure linkage
            agent.isActive = false;
            agent.deactivationReason = undefined;
            agent.deactivatedAt = undefined;
            await agent.save();
        }

        try {
            await sendInvitationEmail(
                normalizedEmail,
                fullName || 'Agent',
                invitationLink,
                agency.agencyName || 'Agency',
                'Agent Partner'
            );
        } catch (emailError) {
            logger.warn('Failed to send agent invitation email', { error: emailError.message });
        }

        return success(res, 'Invitation sent successfully', {
            email: agent.email,
            invitationToken: token,
            expiresAt,
            invitationLink,
        });
    } catch (error) {
        logger.error('Send agent invitation failed', { error: error.message });
        return failure(res, 500, 'Failed to send invitation', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agency/profile:
 *   get:
 *     summary: Get the authenticated agency's profile
 *     tags: [Agency]
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
 *                       example: "671b5e943d3fe8fe805dd95a"
 *                     agencyName:
 *                       type: string
 *                       example: Prime Properties
 *                     email:
 *                       type: string
 *                       example: contact@prime.com
 *                     phoneNumber:
 *                       type: string
 *                       example: "+971501234567"
 *                     phoneCode:
 *                       type: string
 *                       nullable: true
 *                       example: "+971"
 *                     phoneNumberWithoutCode:
 *                       type: string
 *                       nullable: true
 *                       example: "501234567"
 *                     orn:
 *                       type: string
 *                       example: "12345"
 *                     profilePicture:
 *                       type: string
 *                       nullable: true
 *                       example: "https://cdn.example.com/profile.png"
 *                     address:
 *                       type: object
 *                       properties:
 *                         fullAddress:
 *                           type: string
 *                           example: "123 Main St, Dubai, UAE"
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
 *                     nationality:
 *                       type: string
 *                       description: Country ObjectId
 *                       example: "6531a6f0b1f3ad27c8b312e9"
 *                     registrationDocuments:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "https://cdn.example.com/documents/license.pdf"
 *                     website:
 *                       type: string
 *                       example: "https://prime.com"
 *                     foundedYear:
 *                       type: integer
 *                       example: 2010
 *                     description:
 *                       type: string
 *                       example: "Award-winning brokerage specializing in luxury villas."
 *                     aboutUs:
 *                       type: string
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
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-22T05:30:17.080Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-22T05:30:17.080Z"
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         currency:
 *                           type: string
 *                         language:
 *                           type: string
 *                         savedSearches:
 *                           type: boolean
 *                         notificationSettings:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: boolean
 *                             sms:
 *                               type: boolean
 *                             push:
 *                               type: boolean
 *                     hasUnreadNotifications:
 *                       type: boolean
 *                       description: True if the agency has any unread (non-archived) notifications.
 *                     unreadNotificationCount:
 *                       type: integer
 *                       description: Number of unread (non-archived) notifications for the agency.
 *       401:
 *         description: Unauthorized or missing token
 *       404:
 *         description: Agency not found
 */
const getProfile = asyncHandler(async (req, res) => {
    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const unreadNotificationFilter = {
            'recipient.recipientId': new mongoose.Types.ObjectId(agencyId),
            'recipient.recipientType': 'agency',
            isRead: false,
            isArchived: false,
        };

        const [agency, unreadNotificationCount] = await Promise.all([
            Agency.findById(agencyId),
            Notification.countDocuments(unreadNotificationFilter),
        ]);

        if (!agency) {
            return failure(res, 404, 'Agency not found', 'NOT_FOUND');
        }

        const profile = sanitizeAgency(agency);
        profile.preferences = normalizePreferences(profile.preferences);
        const hasUnreadNotifications = unreadNotificationCount > 0;
        return success(res, 'Profile fetched successfully', {
            ...profile,
            hasUnreadNotifications,
            unreadNotificationCount,
        });
    } catch (error) {
        logger.error('Get profile failed', { error: error.message });
        return failure(res, 500, 'Failed to fetch profile', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agency/profile:
 *   put:
 *     summary: Update the authenticated agency's profile
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agencyName:
 *                 type: string
 *                 example: Prime Properties
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number in international format; verification resets when changed.
 *                 example: "+971501234567"
 *               phoneCode:
 *                 type: string
 *                 description: Optional dial code to persist separately.
 *                 example: "+971"
 *               phoneNumberWithoutCode:
 *                 type: string
 *                 description: Optional local phone digits without dial code.
 *                 example: "501234567"
 *               address:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                     example: "123 Main St, Dubai, UAE"
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
 *               nationality:
 *                 type: string
 *                 description: Country ObjectId
 *                 example: "6531a6f0b1f3ad27c8b312e9"
 *               profilePicture:
 *                 type: string
 *                 description: URL ending with jpg/jpeg/png
 *                 example: "https://cdn.example.com/profile.png"
 *               registrationDocuments:
 *                 type: array
 *                 description: URLs ending with pdf/doc/docx
 *                 items:
 *                   type: string
 *                 example:
 *                   - "https://cdn.example.com/documents/license.pdf"
 *               website:
 *                 type: string
 *                 example: "https://prime.com"
 *               foundedYear:
 *                 type: integer
 *                 example: 2010
 *               description:
 *                 type: string
 *                 example: "Award-winning brokerage specializing in luxury villas."
 *               aboutUs:
 *                 type: string
 *                 example: "We have served the Dubai market since 2010."
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
 *                   description: Sanitized agency profile with sensitive fields removed.
 *       400:
 *         description: Invalid input (e.g., updating ORN/email or unsupported file extensions)
 *       401:
 *         description: Unauthorized or missing token
 *       404:
 *         description: Agency not found
 */
const updateProfile = asyncHandler(async (req, res) => {
    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const agency = await Agency.findById(agencyId);
        if (!agency) {
            return failure(res, 404, 'Agency not found', 'NOT_FOUND');
        }

        const {
            agencyName,
            phoneNumber,
            phoneCode,
            phoneNumberWithoutCode,
            address,
            nationality,
            profilePicture,
            registrationDocuments,
            website,
            foundedYear,
            description,
            aboutUs,
            preferences,
        } = req.body || {};

        if (req.body?.orn || req.body?.email) {
            return failure(res, 400, 'ORN and email cannot be updated', 'VALIDATION_ERROR');
        }

        if (registrationDocuments && !validateDocuments(registrationDocuments)) {
            return failure(res, 400, 'Registration documents must be PDF/DOC/DOCX', 'VALIDATION_ERROR');
        }

        if (profilePicture && !validateProfilePicture(profilePicture)) {
            return failure(res, 400, 'Profile picture must be JPG or PNG', 'VALIDATION_ERROR');
        }

        if (agencyName) agency.agencyName = agencyName;
        if (nationality) agency.nationality = nationality;
        if (website) agency.website = website;
        if (typeof foundedYear !== 'undefined') agency.foundedYear = foundedYear;
        if (description) agency.description = description;
        if (aboutUs) agency.aboutUs = aboutUs;
        if (profilePicture) agency.profilePicture = profilePicture;
        if (registrationDocuments) agency.registrationDocuments = registrationDocuments;

        if (address) {
            agency.address = {
                ...agency.address,
                ...address,
            };
        }

        if (phoneNumber) {
            const normalizedPhoneCode = phoneCode ? formatPhoneNumber(phoneCode) : agency.phoneCode || null;
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
            if (normalizedPhone !== agency.phoneNumber) {
                agency.phoneNumber = normalizedPhone;
                agency.phoneCode = normalizedPhoneCode;
                agency.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
                agency.isPhoneVerified = false;
            }
        }

        if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
            agency.preferences = normalizePreferences(agency.preferences) || {};

            if (typeof preferences.currency !== 'undefined') {
                agency.preferences.currency = String(preferences.currency || '').trim() || agency.preferences.currency;
            }
            if (typeof preferences.language !== 'undefined') {
                agency.preferences.language = String(preferences.language || '').trim() || agency.preferences.language;
            }
            if (typeof preferences.savedSearches !== 'undefined') {
                agency.preferences.savedSearches = toBoolean(preferences.savedSearches);
            }
            if (
                preferences.notificationSettings
                && typeof preferences.notificationSettings === 'object'
                && !Array.isArray(preferences.notificationSettings)
            ) {
                const ns = preferences.notificationSettings;
                if (
                    !agency.preferences.notificationSettings
                    || typeof agency.preferences.notificationSettings !== 'object'
                    || Array.isArray(agency.preferences.notificationSettings)
                ) {
                    agency.preferences.notificationSettings = {};
                }
                if (typeof ns.email !== 'undefined') agency.preferences.notificationSettings.email = toBoolean(ns.email);
                if (typeof ns.sms !== 'undefined') agency.preferences.notificationSettings.sms = toBoolean(ns.sms);
                if (typeof ns.push !== 'undefined') agency.preferences.notificationSettings.push = toBoolean(ns.push);
            }
        }

        await agency.save();

        const profile = sanitizeAgency(agency);
        profile.preferences = normalizePreferences(profile.preferences);
        return success(res, 'Profile updated successfully', profile);
    } catch (error) {
        logger.error('Update profile failed', { error: error.message });
        return failure(res, 500, 'Failed to update profile', 'SERVER_ERROR');
    }
});

module.exports = {
    sendAgentInvitation,
    getProfile,
    updateProfile,
};