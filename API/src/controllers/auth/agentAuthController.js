const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agent = require('../../models/agentsModel');
const Agency = require('../../models/agenciesModel');
const Developer = require('../../models/developersModel');
const CountriesModel = require('../../models/countriesModel');
const JobTitles = require('../../models/jobTitlesModel');
const LanguagesModel = require('../../models/languagesModel');
const { sendVerificationEmail, sendWelcomeEmail } = require('../../services/emailService');
const { generateOTP, hashOTP, verifyOTP: verifyStoredOtp, getOTPExpiry } = require('../../services/otpService');
const {
    success,
    failure,
    isEmail,
    formatPhoneNumber,
    hasAllowedExtension,
    sanitizeAgent,
    isProfilelessProfilePicture,
} = require('../../utils/helpers');
const { IMAGE_EXTENSIONS } = require('../../utils/constants');
const uploadService = require('../../services/uploadService');
const { logger } = require('../../utils/logger');

const ObjectId = mongoose.Types.ObjectId;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const OTP_LIMIT = 3;
const OTP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PROFILE_PICTURE_FOLDER = 'agent-profile-pictures';

const otpRequestTracker = new Map();

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

const canSendOtp = (key) => {
    const now = Date.now();
    const timestamps = otpRequestTracker.get(key) || [];
    const recent = timestamps.filter((ts) => now - ts < OTP_WINDOW_MS);
    if (recent.length >= OTP_LIMIT) {
        return false;
    }
    recent.push(now);
    otpRequestTracker.set(key, recent);
    return true;
};

const validateProfilePicture = (url) => !url || hasAllowedExtension(url, IMAGE_EXTENSIONS);

// Normalize languages to array of valid ObjectIds (for ref 'Languages')
const normalizeLanguageIds = (languages) => {
    if (!languages) return [];
    const arr = Array.isArray(languages) ? languages : [languages];
    return arr
        .filter(Boolean)
        .map((l) => (typeof l === 'string' ? l.trim() : l.toString()))
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
};

// Avoid duplicate PF expert emails across agency/agent/developer
const findExpertByEmail = async (email) => {
    const normalizedEmail = normalizeEmail(email);

    const agency = await Agency.findOne({ email: normalizedEmail });
    if (agency) return { role: 'agency', entity: agency };

    const agent = await Agent.findOne({ email: normalizedEmail });
    if (agent) return { role: 'agent', entity: agent };

    const developer = await Developer.findOne({ email: normalizedEmail });
    if (developer) return { role: 'developer', entity: developer };

    return null;
};

/**
 * @swagger
 * /auth/agents/accept-invitation:
 *   post:
 *     summary: Accept agent invitation and create agent profile
 *     tags: [AgentAuth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token sent by agency
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phoneNumber
 *               - countryCode
 *               - jobTitle
 *               - experience
 *               - brokerLicenseNumber
 *               - nationality
 *               - languages
 *               - password
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 description: Local phone without country code
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *               jobTitle:
 *                 type: string
 *                 description: Agent specialization/job title
 *               experience:
 *                 type: number
 *                 description: Years of experience
 *               brokerLicenseNumber:
 *                 type: string
 *               nationality:
 *                 type: string
 *                 description: Country ObjectId
 *               linkedin:
 *                 type: string
 *               description:
 *                 type: string
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *               profilePicture:
 *                 type: string
 *                 description: Uploaded image URL (JPG/PNG/WEBP)
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile created, pending admin verification
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
 *                   example: Profile created successfully. Please wait for admin verification.
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                       example: false
 *                     requiresVerification:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error
 *       404:
 *         description: Invitation not found or expired
 *       500:
 *         description: Server error
 */
const acceptInvitation = asyncHandler(async (req, res) => {
    try {
        const { token } = req.query || {};
        const {
            fullName,
            phoneNumber,
            countryCode,
            jobTitle,
            experience,
            brokerLicenseNumber,
            nationality,
            linkedin,
            description,
            languages,
            password,
            confirmPassword,
            profilePicture,
        } = req.body || {};

        if (!token) {
            return failure(res, 400, 'Invitation token is required', 'VALIDATION_ERROR');
        }

        const agent = await Agent.findOne({ invitationToken: token });
        if (!agent || agent.invitationStatus !== 'pending') {
            return failure(res, 404, 'Invitation token not found or already used', 'NOT_FOUND');
        }

        const invitationDate = agent.invitationSentAt || agent.createdAt;
        if (!invitationDate || Date.now() - new Date(invitationDate).getTime() > INVITATION_EXPIRY_MS) {
            agent.invitationStatus = 'expired';
            await agent.save();
            return failure(res, 404, 'Invitation token expired', 'NOT_FOUND');
        }

        const normalizedEmail = normalizeEmail(agent.email);
        const normalizedPhoneCode = countryCode ? formatPhoneNumber(countryCode) : null;
        const normalizedPhoneWithoutCode = `${phoneNumber || ''}`.trim().replace(/\D/g, '') || null;
        const normalizedPhone = formatPhoneNumber(`${countryCode || ''}${phoneNumber || ''}`) || formatPhoneNumber(phoneNumber);
        const languageIds = normalizeLanguageIds(languages);
        const experienceYears = experience !== undefined && experience !== null && experience !== '' ? Number(experience) : undefined;

        if (
            !fullName ||
            !normalizedPhone ||
            !jobTitle ||
            experienceYears === undefined ||
            Number.isNaN(experienceYears) ||
            !brokerLicenseNumber ||
            !nationality ||
            !password ||
            !confirmPassword ||
            !languageIds.length
        ) {
            return failure(res, 400, 'Missing required fields', 'VALIDATION_ERROR');
        }

        if (!ObjectId.isValid(jobTitle)) {
            return failure(res, 400, 'Invalid job title id', 'VALIDATION_ERROR');
        }
        const jobTitleExists = await JobTitles.exists({ _id: jobTitle, isActive: true });
        if (!jobTitleExists) {
            return failure(res, 404, 'Job title not found', 'NOT_FOUND');
        }

        if (!ObjectId.isValid(nationality)) {
            return failure(res, 400, 'Invalid nationality id', 'VALIDATION_ERROR');
        }
        const countryExists = await CountriesModel.exists({ _id: nationality });
        if (!countryExists) {
            return failure(res, 404, 'Country not found', 'NOT_FOUND');
        }
        const languagesExist = await LanguagesModel.countDocuments({ _id: { $in: languageIds } });
        if (languagesExist !== languageIds.length) {
            return failure(res, 400, 'One or more language ids are invalid', 'VALIDATION_ERROR');
        }

        if (!isEmail(normalizedEmail)) {
            return failure(res, 400, 'Invalid email address', 'VALIDATION_ERROR');
        }

        if (!PASSWORD_REGEX.test(password)) {
            return failure(res, 400, 'Password must be at least 8 characters with uppercase, lowercase, and number', 'VALIDATION_ERROR');
        }

        if (password !== confirmPassword) {
            return failure(res, 400, 'Passwords do not match', 'VALIDATION_ERROR');
        }

        if (!validateProfilePicture(profilePicture)) {
            return failure(res, 400, 'Profile picture must be JPG, PNG, or WEBP', 'VALIDATION_ERROR');
        }

        if (!agent.isEmailVerified || !agent.isPhoneVerified) {
            return failure(res, 400, 'Please verify email and phone before submitting', 'VERIFICATION_REQUIRED');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        agent.fullName = fullName;
        agent.phoneNumber = normalizedPhone;
        agent.phoneCode = normalizedPhoneCode;
        agent.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
        agent.whatsappNumber = normalizedPhone;
        agent.isWhatsappPrimary = true;
        agent.specialization = jobTitle;
        agent.experience = experienceYears;
        agent.brokerLicenseNumber = brokerLicenseNumber;
        agent.nationality = nationality;
        agent.languages = languageIds;
        agent.socialLinks = { ...(agent.socialLinks || {}), linkedin };
        if (description) {
            agent.description = description;
        }
        if (profilePicture) {
            agent.profilePicture = profilePicture;
        }
        agent.password = hashedPassword;

        agent.invitationStatus = 'accepted';
        agent.invitationAcceptedAt = new Date();
        agent.isVerified = false;

        await agent.save();

        try {
            await sendWelcomeEmail(normalizedEmail, agent.fullName || 'Agent', 'agent');
        } catch (emailError) {
            logger.warn('Failed to send welcome email', { error: emailError.message });
        }

        return success(res, 'Profile created successfully. Please wait for admin verification.', {
            email: agent.email,
            name: agent.fullName,
            isVerified: false,
            requiresVerification: true,
        });
    } catch (error) {
        logger.error('Agent accept invitation failed', { error: error.message });
        return failure(res, 500, 'Failed to accept invitation', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /auth/agents/send-email-otp:
 *   post:
 *     summary: Send OTP to agent email
 *     tags: [AgentAuth]
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
 *     responses:
 *       200:
 *         description: OTP sent
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
 *                   example: OTP sent to your email
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Validation error
 *       404:
 *         description: Agent not found
 *       409:
 *         description: Email already used by another PF expert type
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Server error
 */
const sendEmailOTP = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body || {};
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !isEmail(normalizedEmail)) {
            return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
        }

        const existingExpert = await findExpertByEmail(normalizedEmail);
        if (existingExpert && existingExpert.role !== 'agent') {
            return failure(res, 409, `Email already used by ${existingExpert.role}`, 'CONFLICT');
        }

        const agent = existingExpert?.entity && existingExpert.role === 'agent'
            ? existingExpert.entity
            : await Agent.findOne({ email: normalizedEmail });

        if (!agent) {
            return failure(res, 404, 'Agent not found', 'NOT_FOUND');
        }

        if (!canSendOtp(`email:${normalizedEmail}`)) {
            return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
        }

        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);
        const otpExpiry = getOTPExpiry();

        agent.emailVerificationToken = hashedOtp;
        agent.emailVerificationExpires = otpExpiry;

        await sendVerificationEmail(normalizedEmail, otp, agent.fullName || 'Agent');
        await agent.save();

        return success(res, 'OTP sent to your email');
    } catch (error) {
        logger.error('Agent send email OTP failed', { error: error.message });
        return failure(res, 500, 'Failed to send OTP', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /auth/agents/verify-email-otp:
 *   post:
 *     summary: Verify email OTP for agent
 *     tags: [AgentAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
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
 *                   example: Email verified successfully
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
const verifyEmailOTP = asyncHandler(async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !otp) {
            return failure(res, 400, 'Email and OTP are required', 'VALIDATION_ERROR');
        }

        const agent = await Agent.findOne({ email: normalizedEmail });
        if (!agent) {
            return failure(res, 404, 'Agent not found', 'NOT_FOUND');
        }

        if (!agent.emailVerificationToken || !agent.emailVerificationExpires) {
            return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
        }

        if (agent.emailVerificationExpires < new Date()) {
            return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
        }

        const isValid = await verifyStoredOtp(otp, agent.emailVerificationToken);
        if (!isValid) {
            return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
        }

        agent.isEmailVerified = true;
        agent.emailVerificationToken = undefined;
        agent.emailVerificationExpires = undefined;
        await agent.save();

        return success(res, 'Email verified successfully');
    } catch (error) {
        logger.error('Agent verify email OTP failed', { error: error.message });
        return failure(res, 500, 'Failed to verify email OTP', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /auth/agents/send-phone-otp:
 *   post:
 *     summary: Send OTP to agent phone
 *     tags: [AgentAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *     responses:
 *       200:
 *         description: OTP sent
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
 *                   example: OTP sent to your phone
 *                 data:
 *                   type: object
 *                   properties:
 *                     otp:
 *                       type: string
 *                       example: "123456"
 *                   description: OTP is returned for testing environments
 *       400:
 *         description: Validation error
 *       404:
 *         description: Agent not found
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Server error
 */
const sendPhoneOTP = asyncHandler(async (req, res) => {
    try {
        const { email, phoneNumber, countryCode } = req.body || {};
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhoneCode = countryCode ? formatPhoneNumber(countryCode) : null;
        const normalizedPhoneWithoutCode = `${phoneNumber || ''}`.trim().replace(/\D/g, '') || null;
        const normalizedPhone = formatPhoneNumber(`${countryCode || ''}${phoneNumber || ''}`) || formatPhoneNumber(phoneNumber);

        if (!normalizedEmail || !normalizedPhone) {
            return failure(res, 400, 'Email and phone number are required', 'VALIDATION_ERROR');
        }

        const agent = await Agent.findOne({ email: normalizedEmail });
        if (!agent) {
            return failure(res, 404, 'Agent not found', 'NOT_FOUND');
        }

        if (!canSendOtp(`phone:${normalizedEmail}`)) {
            return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
        }

        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);
        const otpExpiry = getOTPExpiry();

        agent.phoneNumber = normalizedPhone;
        agent.phoneCode = normalizedPhoneCode;
        agent.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
        agent.phoneVerificationOTP = hashedOtp;
        agent.phoneVerificationExpires = otpExpiry;
        await agent.save();

        // TODO: integrate SMS provider; returning OTP only for testing environments
        return success(res, 'OTP sent to your phone', { otp });
    } catch (error) {
        logger.error('Agent send phone OTP failed', { error: error.message });
        return failure(res, 500, 'Failed to send phone OTP', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /auth/agents/verify-phone-otp:
 *   post:
 *     summary: Verify phone OTP for agent
 *     tags: [AgentAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phoneNumber, otp]
 *             properties:
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified
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
 *                   example: Phone verified successfully
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
const verifyPhoneOTP = asyncHandler(async (req, res) => {
    try {
        const { email, phoneNumber, countryCode, otp } = req.body || {};
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = formatPhoneNumber(`${countryCode || ''}${phoneNumber || ''}`) || formatPhoneNumber(phoneNumber);

        if (!normalizedEmail || !normalizedPhone || !otp) {
            return failure(res, 400, 'Email, phone number, and OTP are required', 'VALIDATION_ERROR');
        }

        const agent = await Agent.findOne({ email: normalizedEmail, phoneNumber: normalizedPhone });
        if (!agent) {
            return failure(res, 404, 'Agent not found', 'NOT_FOUND');
        }

        if (!agent.phoneVerificationOTP || !agent.phoneVerificationExpires) {
            return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
        }

        if (agent.phoneVerificationExpires < new Date()) {
            return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
        }

        const isValid = await verifyStoredOtp(otp, agent.phoneVerificationOTP);
        if (!isValid) {
            return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
        }

        agent.isPhoneVerified = true;
        agent.phoneVerificationOTP = undefined;
        agent.phoneVerificationExpires = undefined;
        await agent.save();

        return success(res, 'Phone verified successfully');
    } catch (error) {
        logger.error('Agent verify phone OTP failed', { error: error.message });
        return failure(res, 500, 'Failed to verify phone OTP', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /auth/agents/upload-profile-picture:
 *   post:
 *     summary: Upload agent profile picture
 *     tags: [AgentAuth]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: Agent ID whose profile picture should be updated. Alternatively, use invitationToken for pending invitations.
 *               invitationToken:
 *                 type: string
 *                 description: Invitation token (alternative to agentId). Only works for pending invitations.
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               removeProfilePicture:
 *                 type: boolean
 *                 description: Set to true to remove the current profile picture.
 *     responses:
 *       200:
 *         description: Profile picture uploaded
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
 *                   example: Profile picture uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadsBaseUrl:
 *                       type: string
 *                       example: https://cdn.example.com/uploads
 *                     url:
 *                       type: string
 *                       example: https://cdn.example.com/uploads/agent-profile-pictures/example.jpg
 *                     path:
 *                       type: string
 *                       example: agent-profile-pictures/example.jpg
 *                     filename:
 *                       type: string
 *                       example: example.jpg
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
    try {
        const agentId = req.body?.agentId || req.body?.id;
        const invitationToken = req.body?.invitationToken || req.query?.token;

        let agent;

        if (agentId) {
            // Find by ID (for existing profiles)
            agent = await Agent.findById(agentId);
            if (!agent) {
                return failure(res, 404, 'Agent not found', 'NOT_FOUND');
            }
        } else if (invitationToken) {
            // Find by invitation token (for pending invitations)
            agent = await Agent.findOne({ invitationToken });
            if (!agent) {
                return failure(res, 404, 'Invitation token not found', 'NOT_FOUND');
            }
            // Only allow upload if invitation is still pending
            if (agent.invitationStatus !== 'pending') {
                return failure(res, 400, 'Invitation already accepted or expired. Please use agent ID.', 'VALIDATION_ERROR');
            }
        } else {
            return failure(res, 400, 'Either Agent ID or Invitation Token is required', 'VALIDATION_ERROR');
        }

        const removeRequested = toBoolean(req.body?.removeProfilePicture);
        const previousPicture = agent.profilePicture;

        if (removeRequested && !req.file) {
            if (isProfilelessProfilePicture(previousPicture)) {
                const profile = sanitizeAgent(agent);
                const responseData = uploadService.buildStandardResponse(
                    null,
                    { images: 'agents' },
                    { agent: profile }
                );
                return success(res, 'Profile picture removed', responseData);
            }
            if (previousPicture) {
                // Handle backward compatibility: if previousPicture already contains a path, use it as-is
                const previousPicturePath = previousPicture.includes('/') 
                    ? previousPicture 
                    : `img/agents/${previousPicture}`;
                await uploadService.delete(previousPicturePath).catch((error) => {
                    logger.warn('Failed to delete previous profile picture', { error: error.message });
                });
            }

            agent.profilePicture = undefined;
            await agent.save();

            const profile = sanitizeAgent(agent);

            // Build standardized response (no uploads, just baseUrl)
            const responseData = uploadService.buildStandardResponse(
                null,
                { images: 'agents' },
                { agent: profile }
            );

            return success(res, 'Profile picture removed', responseData);
        }

        if (!req.file) {
            return failure(res, 400, 'No profile picture uploaded', 'VALIDATION_ERROR');
        }

        const uploaded = await uploadService.upload(req.file, 'agents', {
            generateThumbnail: false,
        });

        // Save only the filename in the database
        agent.profilePicture = uploaded.filename;
        await agent.save();

        if (previousPicture && previousPicture !== uploaded.filename && !isProfilelessProfilePicture(previousPicture)) {
            // Handle backward compatibility: if previousPicture already contains a path, use it as-is
            const previousPicturePath = previousPicture.includes('/') 
                ? previousPicture 
                : `img/agents/${previousPicture}`;
            await uploadService.delete(previousPicturePath).catch((error) => {
                logger.warn('Failed to delete previous profile picture', { error: error.message });
            });
        }

        const profile = sanitizeAgent(agent);

        // Build standardized response
        const responseData = uploadService.buildStandardResponse(
            uploaded,
            { images: 'agents' },
            { agent: profile }
        );

        return success(res, 'Profile picture uploaded successfully', responseData);
    } catch (error) {
        logger.error('Agent upload profile picture failed', { error: error.message });
        return failure(res, 500, 'Failed to upload profile picture', 'SERVER_ERROR');
    }
});

module.exports = {
    acceptInvitation,
    sendEmailOTP,
    verifyEmailOTP,
    sendPhoneOTP,
    verifyPhoneOTP,
    uploadProfilePicture,
};
