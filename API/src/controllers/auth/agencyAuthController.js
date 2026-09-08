const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs-extra');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

const { Types } = require('mongoose');
const Agency = require('../../models/agenciesModel');
const Agent = require('../../models/agentsModel');
const Developer = require('../../models/developersModel');
const { generateTokenPair, verifyRefreshToken } = require('../../services/jwtService');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendExpertPasswordResetOtpEmail,
} = require('../../services/emailService');
const { generateOTP, hashOTP, verifyOTP: verifyStoredOtp, getOTPExpiry } = require('../../services/otpService');
const {
  success,
  failure,
  isEmail,
  formatPhoneNumber,
  sanitizeAgency,
  hasAllowedExtension,
  hashPassword,
  isProfilelessProfilePicture,
} = require('../../utils/helpers');
const { DOC_EXTENSIONS, IMAGE_EXTENSIONS } = require('../../utils/constants');
const { logger } = require('../../utils/logger');
const fileHelpers = require('../../utils/fileHelpers');
const uploadService = require('../../services/uploadService');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const OTP_LIMIT = 3;
const OTP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PROFILE_PICTURE_FOLDER = 'agency-profile-pictures';
const REGISTRATION_DOCS_FOLDER = 'agency-documents';
/** After OTP verify, client must call reset-password within this window */
const PASSWORD_RESET_ELIGIBLE_MS = 15 * 60 * 1000;
const REMEMBER_ME_REFRESH_EXPIRE_IN =
  process.env.JWT_REFRESH_EXPIRE_IN_REMEMBER_ME || '30d';
const PFEXPERT_RESET_OTP_SENT = 'A password reset code has been sent to your email.';

const otpRequestTracker = new Map(); // key -> [timestamps]

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

const validateDocuments = (docs = []) => Array.isArray(docs) && docs.every((doc) => hasAllowedExtension(doc, DOC_EXTENSIONS));

const validateProfilePicture = (url) => !url || hasAllowedExtension(url, IMAGE_EXTENSIONS);

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

/** Same gates as PFExperts login: verified, active, password set; agency must have accepted invite. */
const isPfExpertEligibleForPasswordReset = (role, entity) => {
  if (!entity?.password || entity.isActive === false) return false;
  if (entity.isVerified !== true) return false;
  if (role === 'agency' && entity.invitationStatus !== 'accepted') return false;
  return true;
};

const expertDisplayName = (role, entity) => {
  if (role === 'agency') return entity.agencyName || 'Agency';
  if (role === 'agent') return entity.fullName || 'Agent';
  return entity.name || 'Developer';
};

const clearPfExpertSessionTokens = (doc) => {
  doc.access_token = undefined;
  doc.token_expires_at = undefined;
  doc.refresh_token = undefined;
  doc.refresh_token_expires_at = undefined;
};

const normalizeAddress = (addressInput = {}) => {
  if (typeof addressInput === 'string') {
    return { fullAddress: addressInput };
  }
  return {
    street: addressInput.street,
    city: addressInput.city,
    state: addressInput.state,
    country: addressInput.country,
    zipCode: addressInput.zipCode,
    fullAddress: addressInput.fullAddress || addressInput.address || '',
  };
};

// Removed storeRegistrationDocuments - now using uploadService directly

/**
 * @swagger
 * /auth/agency/accept-invitation:
 *   post:
 *     summary: Accept agency invitation and create agency profile
 *     tags: [AgencyAuth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token sent by admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agencyName
 *               - phoneNumber
 *               - countryCode
 *               - orn
 *               - address
 *               - nationality
 *               - password
 *               - confirmPassword
 *             properties:
 *               agencyName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 description: Local phone without country code
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *               orn:
 *                 type: string
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
 *               nationality:
 *                 type: string
 *                 description: Country ObjectId
 *               registrationDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Uploaded document URLs (PDF/DOC/DOCX)
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
 *                       example: agency@example.com
 *                     agencyName:
 *                       type: string
 *                       example: My Agency
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
      agencyName,
      phoneNumber,
      countryCode,
      orn,
      address = {},
      nationality,
      registrationDocuments = [],
      password,
      confirmPassword,
      profilePicture,
    } = req.body || {};

    const normalizedAddress = normalizeAddress(address);

    if (!token) {
      return failure(res, 400, 'Invitation token is required', 'VALIDATION_ERROR');
    }

    if (!agencyName || !phoneNumber || !orn || !normalizedAddress.fullAddress || !nationality || !password || !confirmPassword) {
      console.log('Missing required fields', { agencyName, phoneNumber, orn, address, nationality, password, confirmPassword, token });
      return failure(res, 400, 'Missing required fields', 'VALIDATION_ERROR');
    }

    const agency = await Agency.findOne({ invitationToken: token });
    if (!agency || agency.invitationStatus !== 'pending') {
      return failure(res, 404, 'Invitation token not found or already used', 'NOT_FOUND');
    }

    const invitationDate = agency.invitationSentAt || agency.createdAt;
    if (!invitationDate || Date.now() - new Date(invitationDate).getTime() > INVITATION_EXPIRY_MS) {
      agency.invitationStatus = 'expired';
      await agency.save();
      return failure(res, 404, 'Invitation token expired', 'NOT_FOUND');
    }

    const normalizedEmail = normalizeEmail(agency.email);
    const normalizedPhoneCode = countryCode ? formatPhoneNumber(countryCode) : null;
    const normalizedPhoneWithoutCode = `${phoneNumber || ''}`.trim().replace(/\D/g, '') || null;
    const normalizedPhone = formatPhoneNumber(`${countryCode || ''}${phoneNumber}`);

    if (!isEmail(normalizedEmail)) {
      return failure(res, 400, 'Invalid email address', 'VALIDATION_ERROR');
    }

    if (!normalizedPhone) {
      return failure(res, 400, 'Invalid phone number', 'VALIDATION_ERROR');
    }

    if (!PASSWORD_REGEX.test(password)) {
      return failure(res, 400, 'Password must be at least 8 characters with uppercase, lowercase, and number', 'VALIDATION_ERROR');
    }

    if (password !== confirmPassword) {
      return failure(res, 400, 'Passwords do not match', 'VALIDATION_ERROR');
    }

    const existingOrn = await Agency.findOne({ orn, _id: { $ne: agency._id } });
    if (existingOrn) {
      return failure(res, 409, 'ORN already exists', 'CONFLICT');
    }

    if (!validateDocuments(registrationDocuments)) {
      return failure(res, 400, 'Registration documents must be PDF/DOC/DOCX', 'VALIDATION_ERROR');
    }

    if (!validateProfilePicture(profilePicture)) {
      return failure(res, 400, 'Profile picture must be JPG, PNG, or WEBP', 'VALIDATION_ERROR');
    }

    if (!Types.ObjectId.isValid(nationality)) {
      return failure(res, 400, 'Invalid nationality id', 'VALIDATION_ERROR');
    }

    if (!agency.isEmailVerified || !agency.isPhoneVerified) {
      return failure(res, 400, 'Please verify email and phone before submitting', 'VERIFICATION_REQUIRED');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    agency.agencyName = agencyName;
    agency.phoneNumber = normalizedPhone;
    agency.phoneCode = normalizedPhoneCode;
    agency.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
    agency.orn = orn;
    agency.address = normalizedAddress;
    agency.nationality = nationality;
    agency.registrationDocuments = registrationDocuments;
    agency.password = hashedPassword;
    if (profilePicture) {
      agency.profilePicture = profilePicture;
    }

    agency.invitationStatus = 'accepted';
    agency.invitationAcceptedAt = new Date();
    agency.isVerified = false;

    await agency.save();

    try {
      await sendWelcomeEmail(normalizedEmail, agency.agencyName || 'Agency', 'agency');
    } catch (emailError) {
      logger.warn('Failed to send welcome email', { error: emailError.message });
    }

    return success(res, 'Profile created successfully. Please wait for admin verification.', {
      email: agency.email,
      agencyName: agency.agencyName,
      isVerified: false,
      requiresVerification: true,
    });
  } catch (error) {
    logger.error('Accept invitation failed', { error: error.message });
    return failure(res, 500, 'Failed to accept invitation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/send-email-otp:
 *   post:
 *     summary: Send OTP to agency email
 *     tags: [AgencyAuth]
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
 *       400:
 *         description: Validation error
 *       404:
 *         description: Agency not found
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
    if (existingExpert && existingExpert.role !== 'agency') {
      return failure(res, 409, `Email already used by ${existingExpert.role}`, 'CONFLICT');
    }

    const agency = existingExpert?.entity && existingExpert.role === 'agency'
      ? existingExpert.entity
      : await Agency.findOne({ email: normalizedEmail });
    if (!agency) {
      return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    if (!canSendOtp(`email:${normalizedEmail}`)) {
      return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    agency.emailVerificationToken = hashedOtp;
    agency.emailVerificationExpires = otpExpiry;

    await sendVerificationEmail(normalizedEmail, otp, agency.agencyName || 'Agency');
    await agency.save();

    return success(res, 'OTP sent to your email');
  } catch (error) {
    logger.error('Send email OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/verify-email-otp:
 *   post:
 *     summary: Verify email OTP for agency
 *     tags: [AgencyAuth]
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
 *       400:
 *         description: Invalid/expired OTP
 *       404:
 *         description: Agency not found
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

    const agency = await Agency.findOne({ email: normalizedEmail });
    if (!agency) {
      return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    if (!agency.emailVerificationToken || !agency.emailVerificationExpires) {
      return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
    }

    if (agency.emailVerificationExpires < new Date()) {
      return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, agency.emailVerificationToken);
    if (!isValid) {
      return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
    }

    agency.isEmailVerified = true;
    agency.emailVerificationToken = undefined;
    agency.emailVerificationExpires = undefined;
    await agency.save();

    return success(res, 'Email verified successfully');
  } catch (error) {
    logger.error('Verify email OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify email OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/send-phone-otp:
 *   post:
 *     summary: Send OTP to agency phone
 *     tags: [AgencyAuth]
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
 *     responses:
 *       200:
 *         description: OTP sent
 *       400:
 *         description: Validation error
 *       404:
 *         description: Agency not found
 *       429:
 *         description: Rate limited
 *       500:
 *         description: Server error
 */
const sendPhoneOTP = asyncHandler(async (req, res) => {
  try {
    const { email, phoneNumber } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhoneWithoutCode = `${phoneNumber || ''}`.trim().replace(/\D/g, '') || null;
    const normalizedPhone = formatPhoneNumber(phoneNumber);

    if (!normalizedEmail || !normalizedPhone) {
      return failure(res, 400, 'Email and phone number are required', 'VALIDATION_ERROR');
    }

    const agency = await Agency.findOne({ email: normalizedEmail });
    if (!agency) {
      return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    if (!canSendOtp(`phone:${normalizedEmail}`)) {
      return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    agency.phoneNumber = normalizedPhone;
    agency.phoneCode = null;
    agency.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
    agency.phoneVerificationOTP = hashedOtp;
    agency.phoneVerificationExpires = otpExpiry;
    await agency.save();

    return success(res, 'OTP sent to your phone', { otp }); // TODO: remove otp from response in production
  } catch (error) {
    logger.error('Send phone OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send phone OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/verify-phone-otp:
 *   post:
 *     summary: Verify phone OTP for agency
 *     tags: [AgencyAuth]
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
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified
 *       400:
 *         description: Invalid/expired OTP
 *       404:
 *         description: Agency not found
 *       500:
 *         description: Server error
 */
const verifyPhoneOTP = asyncHandler(async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = formatPhoneNumber(phoneNumber);

    if (!normalizedEmail || !normalizedPhone || !otp) {
      return failure(res, 400, 'Email, phone number, and OTP are required', 'VALIDATION_ERROR');
    }

    const agency = await Agency.findOne({ email: normalizedEmail, phoneNumber: normalizedPhone });
    if (!agency) {
      return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    if (!agency.phoneVerificationOTP || !agency.phoneVerificationExpires) {
      return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
    }

    if (agency.phoneVerificationExpires < new Date()) {
      return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, agency.phoneVerificationOTP);
    if (!isValid) {
      return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
    }

    agency.isPhoneVerified = true;
    agency.phoneVerificationOTP = undefined;
    agency.phoneVerificationExpires = undefined;
    await agency.save();

    return success(res, 'Phone verified successfully');
  } catch (error) {
    logger.error('Verify phone OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify phone OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/upload-registration-documents:
 *   post:
 *     summary: Upload agency registration documents (PDF/DOC/DOCX)
 *     tags: [AgencyAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded
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
 *                   example: Documents uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadsBaseUrl:
 *                       type: string
 *                       example: "https://cdn.example.com/uploads"
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                           path:
 *                             type: string
 *                           filename:
 *                             type: string
 *                           mimetype:
 *                             type: string
 *                             example: application/pdf
 *                           size:
 *                             type: integer
 *                             example: 12345
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const uploadRegistrationDocuments = asyncHandler(async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return failure(res, 400, 'No documents uploaded', 'VALIDATION_ERROR');
    }

    // Upload all documents using uploadService
    const uploads = await uploadService.uploadMultipleDocuments(files, 'agency');

    // Build standardized response
    const responseData = uploadService.buildStandardResponse(
      uploads,
      { documents: 'agency' }
    );

    return success(res, 'Documents uploaded successfully', responseData);
  } catch (error) {
    logger.error('Upload registration documents failed', { error: error.message });
    return failure(res, 500, 'Failed to upload documents', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/agency/upload-profile-picture:
 *   post:
 *     summary: Upload agency profile picture
 *     tags: [AgencyAuth]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               agencyId:
 *                 type: string
 *                 description: Agency ID whose profile picture should be updated. Alternatively, use invitationToken for pending invitations.
 *               invitationToken:
 *                 type: string
 *                 description: Invitation token (alternative to agencyId). Only works for pending invitations.
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadsBaseUrl:
 *                       type: string
 *                       example: "https://cdn.example.com/uploads"
 *                     url:
 *                       type: string
 *                     path:
 *                       type: string
 *                     filename:
 *                       type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
  try {
    const agencyId = req.body?.agencyId || req.body?.id;
    const invitationToken = req.body?.invitationToken || req.query?.token;

    let agency;

    if (agencyId) {
      // Find by ID (for existing profiles)
      agency = await Agency.findById(agencyId);
      if (!agency) {
        return failure(res, 404, 'Agency not found', 'NOT_FOUND');
      }
    } else if (invitationToken) {
      // Find by invitation token (for pending invitations)
      agency = await Agency.findOne({ invitationToken });
      if (!agency) {
        return failure(res, 404, 'Invitation token not found', 'NOT_FOUND');
      }
      // Only allow upload if invitation is still pending
      if (agency.invitationStatus !== 'pending') {
        return failure(res, 400, 'Invitation already accepted or expired. Please use agency ID.', 'VALIDATION_ERROR');
      }
    } else {
      return failure(res, 400, 'Either Agency ID or Invitation Token is required', 'VALIDATION_ERROR');
    }

    const removeRequested = toBoolean(req.body?.removeProfilePicture);
    const previousPicture = agency.profilePicture;

    if (removeRequested && !req.file) {
      if (isProfilelessProfilePicture(previousPicture)) {
        const profile = sanitizeAgency(agency);
        const responseData = uploadService.buildStandardResponse(
          null,
          { images: 'agency' },
          { agency: profile }
        );
        return success(res, 'Profile picture removed', responseData);
      }
      if (previousPicture) {
        // Handle backward compatibility: if previousPicture already contains a path, use it as-is
        const previousPicturePath = previousPicture.includes('/') 
          ? previousPicture 
          : `img/agency/${previousPicture}`;
        await uploadService.delete(previousPicturePath).catch((error) => {
          logger.warn('Failed to delete previous profile picture', { error: error.message });
        });
      }

      agency.profilePicture = undefined;
      await agency.save();

      const profile = sanitizeAgency(agency);

      // Build standardized response (no uploads, just baseUrl)
      const responseData = uploadService.buildStandardResponse(
        null,
        { images: 'agency' },
        { agency: profile }
      );

      return success(res, 'Profile picture removed', responseData);
    }

    if (!req.file) {
      return failure(res, 400, 'No profile picture uploaded', 'VALIDATION_ERROR');
    }

    const uploaded = await uploadService.upload(req.file, 'agency', {
      generateThumbnail: false,
    });

    // Save only the filename in the database
    agency.profilePicture = uploaded.filename;
    await agency.save();

    if (previousPicture && previousPicture !== uploaded.filename && !isProfilelessProfilePicture(previousPicture)) {
      // Handle backward compatibility: if previousPicture already contains a path, use it as-is
      const previousPicturePath = previousPicture.includes('/') 
        ? previousPicture 
        : `img/agency/${previousPicture}`;
      await uploadService.delete(previousPicturePath).catch((error) => {
        logger.warn('Failed to delete previous profile picture', { error: error.message });
      });
    }

    const profile = sanitizeAgency(agency);

    // Build standardized response
    const responseData = uploadService.buildStandardResponse(
      uploaded,
      { images: 'agency' },
      { agency: profile }
    );

    return success(res, 'Profile picture uploaded successfully', responseData);
  } catch (error) {
    logger.error('Upload profile picture failed', { error: error.message });
    return failure(res, 500, 'Failed to upload profile picture', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/login:
 *   post:
 *     summary: Login for PFExperts (agency/agent/developer)
 *     tags: [PFExpertsAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               rememberMe:
 *                 type: boolean
 *                 description: When true, refresh token uses JWT_REFRESH_EXPIRE_IN_REMEMBER_ME (default 30d).
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: agency
 *                         name:
 *                           type: string
 *                           example: Agency Name
 *                         isVerified:
 *                           type: boolean
 *                         profilePicture:
 *                           type: string
 *                           nullable: true
 *                         isEmailVerified:
 *                           type: boolean
 *                         isPhoneVerified:
 *                           type: boolean
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not verified/active
 *       500:
 *         description: Server error
 */
const login = asyncHandler(async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const rememberSession = toBoolean(rememberMe);

    if (!normalizedEmail || !password) {
      return failure(res, 400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    let user = await Agency.findOne({ email: normalizedEmail });
    let role = 'agency';
    let nameField = 'agencyName';

    if (!user) {
      user = await Agent.findOne({ email: normalizedEmail });
      role = 'agent';
      nameField = 'fullName';
    }

    if (!user) {
      user = await Developer.findOne({ email: normalizedEmail });
      role = 'developer';
      nameField = 'name';
    }

    if (!user) {
      return failure(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    if (!user.password) {
      return failure(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return failure(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    if (role === 'agency' && user.invitationStatus !== 'accepted') {
      return failure(res, 403, 'Invitation not accepted yet', 'FORBIDDEN');
    }

    // Login only when account is active and explicitly verified (all roles).
    if (user.isVerified !== true) {
      if (role === 'agency') {
        return failure(res, 403, 'Account not verified by admin', 'FORBIDDEN');
      }
      if (role === 'agent') {
        return failure(res, 403, 'Account not verified by agency', 'FORBIDDEN');
      }
      return failure(res, 403, 'Account not verified by admin', 'FORBIDDEN');
    }

    if (user.isActive === false) {
      return failure(res, 403, 'Account not active', 'FORBIDDEN');
    }

    const tokens = generateTokenPair(
      {
        id: user._id,
        email: user.email,
        role,
        name: user[nameField],
        isVerified: user.isVerified,
      },
      rememberSession ? { refreshTokenExpiresIn: REMEMBER_ME_REFRESH_EXPIRE_IN } : undefined
    );

    let accessExpiry;
    try {
      const decodedAccess = jwt.decode(tokens.accessToken);
      if (decodedAccess?.exp) {
        accessExpiry = new Date(decodedAccess.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode access token expiry', { error: decodeError.message });
    }

    let refreshExpiry;
    try {
      const decodedRefresh = jwt.decode(tokens.refreshToken);
      if (decodedRefresh?.exp) {
        refreshExpiry = new Date(decodedRefresh.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode refresh token expiry', { error: decodeError.message });
    }

    user.lastLogin = new Date();
    user.lastActiveAt = new Date();
    user.access_token = tokens.accessToken;
    user.token_expires_at = accessExpiry;
    user.refresh_token = tokens.refreshToken;
    user.refresh_token_expires_at = refreshExpiry;
    await user.save();

    const profile = sanitizeAgency(user);

    return success(res, 'Login successful', {
      token: tokens.accessToken,
      tokens,
      user: {
        id: user._id,
        email: user.email,
        role,
        name: user[nameField],
        isVerified: Boolean(user.isVerified),
        profilePicture: user.profilePicture || null,
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        ...(profile || {}),
      },
    });
  } catch (error) {
    logger.error('Agency login failed', { error: error.message });
    return failure(res, 500, 'Failed to login', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/send-otp:
 *   post:
 *     summary: Send email OTP to start PFExperts password reset
 *     tags: [PFExpertsAuth]
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
 *         description: OTP email sent to a registered PF Experts account
 *       400:
 *         description: Validation error
 *       403:
 *         description: Account exists but password reset is not allowed (e.g. not verified or inactive)
 *       404:
 *         description: No PF Experts account for this email
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
const sendPasswordResetOtp = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isEmail(normalizedEmail)) {
      return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
    }

    if (!canSendOtp(`pfexpert-pwd-reset:${normalizedEmail}`)) {
      return failure(res, 429, 'Too many reset requests. Please try again later.', 'RATE_LIMITED');
    }

    const expert = await findExpertByEmail(normalizedEmail);
    if (!expert?.entity) {
      return failure(res, 404, 'Account does not exist for this email', 'NOT_FOUND');
    }

    const { entity } = expert;
    if (!isPfExpertEligibleForPasswordReset(expert.role, entity)) {
      return failure(
        res,
        403,
        'Password reset is not available for this account. It may be inactive, unverified, or not fully registered.',
        'FORBIDDEN'
      );
    }

    entity.passwordResetEligibleUntil = undefined;
    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    entity.passwordResetOTPHash = hashedOtp;
    entity.passwordResetOTPExpires = getOTPExpiry();
    await entity.save();

    try {
      await sendExpertPasswordResetOtpEmail(
        normalizedEmail,
        otp,
        expertDisplayName(expert.role, entity)
      );
    } catch (emailErr) {
      logger.error('PFExperts password reset email failed', { error: emailErr.message });
      entity.passwordResetOTPHash = undefined;
      entity.passwordResetOTPExpires = undefined;
      await entity.save();
      return failure(res, 500, 'Failed to send reset code', 'SERVER_ERROR');
    }

    return success(res, PFEXPERT_RESET_OTP_SENT);
  } catch (error) {
    logger.error('PFExperts send password reset OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send reset code', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/verify-otp:
 *   post:
 *     summary: Verify email OTP for PFExperts password reset
 *     tags: [PFExpertsAuth]
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
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified; you may now call reset-password within the allowed window
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
 *                   example: "Verification successful. You can set a new password now."
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetAllowedUntil:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-04-07T06:15:00.000Z"
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Server error
 */
const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return failure(res, 400, 'Email and OTP are required', 'VALIDATION_ERROR');
    }

    const expert = await findExpertByEmail(normalizedEmail);
    if (!expert?.entity) {
      return failure(res, 400, 'Invalid or expired verification code', 'INVALID_OTP');
    }

    const { entity } = expert;
    if (!entity.passwordResetOTPHash || !entity.passwordResetOTPExpires) {
      return failure(res, 400, 'Invalid or expired verification code', 'INVALID_OTP');
    }

    if (entity.passwordResetOTPExpires < new Date()) {
      entity.passwordResetOTPHash = undefined;
      entity.passwordResetOTPExpires = undefined;
      await entity.save();
      return failure(res, 400, 'Invalid or expired verification code', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, entity.passwordResetOTPHash);
    if (!isValid) {
      return failure(res, 400, 'Invalid or expired verification code', 'INVALID_OTP');
    }

    entity.passwordResetOTPHash = undefined;
    entity.passwordResetOTPExpires = undefined;
    entity.passwordResetEligibleUntil = new Date(Date.now() + PASSWORD_RESET_ELIGIBLE_MS);
    await entity.save();

    return success(res, 'Verification successful. You can set a new password now.', {
      resetAllowedUntil: entity.passwordResetEligibleUntil,
    });
  } catch (error) {
    logger.error('PFExperts verify password reset OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify code', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/reset-password:
 *   post:
 *     summary: Set new password after verify-password-reset-otp
 *     tags: [PFExpertsAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated
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
 *                   example: "Password reset successful"
 *                 data:
 *                   type: object
 *                   example: {}
 *       400:
 *         description: Validation error or reset window expired
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
const resetExpertPassword = asyncHandler(async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !newPassword) {
      return failure(res, 400, 'Email and new password are required', 'VALIDATION_ERROR');
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return failure(
        res,
        400,
        'Password must be at least 8 characters and include uppercase, lowercase, and a number',
        'VALIDATION_ERROR'
      );
    }

    const expert = await findExpertByEmail(normalizedEmail);
    if (!expert?.entity) {
      return failure(res, 404, 'Account not found', 'NOT_FOUND');
    }

    const { entity } = expert;
    if (!entity.passwordResetEligibleUntil || entity.passwordResetEligibleUntil < new Date()) {
      return failure(
        res,
        400,
        'Password reset session expired. Please request a new code and verify it again.',
        'RESET_SESSION_EXPIRED'
      );
    }

    entity.password = await hashPassword(newPassword);
    entity.passwordResetEligibleUntil = undefined;
    entity.passwordResetOTPHash = undefined;
    entity.passwordResetOTPExpires = undefined;
    clearPfExpertSessionTokens(entity);
    await entity.save();

    return success(res, 'Password reset successful');
  } catch (error) {
    logger.error('PFExperts reset password failed', { error: error.message });
    return failure(res, 500, 'Failed to reset password', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/refresh:
 *   post:
 *     summary: Refresh access token for PFExperts (agency/agent/developer)
 *     tags: [PFExpertsAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token issued during PFExperts login
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully.
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
 *                   example: Tokens refreshed
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                     user:
 *                       type: object
 *                       description: Sanitized PFExpert profile
 *       400:
 *         description: Refresh token missing.
 *       401:
 *         description: Refresh token invalid or expired.
 *       403:
 *         description: Account inactive or not verified.
 *       500:
 *         description: Server error.
 */
const refreshTokens = asyncHandler(async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return failure(res, 400, 'Refresh token is required', 'VALIDATION_ERROR');
    }

    try {
      verifyRefreshToken(refreshToken);
    } catch (error) {
      logger.warn('Invalid refresh token', { error: error.message });
      return failure(res, 401, 'Invalid or expired refresh token', 'AUTHENTICATION_FAILED');
    }

    let user = await Agency.findOne({ refresh_token: refreshToken });
    let role = 'agency';
    let nameField = 'agencyName';

    if (!user) {
      user = await Agent.findOne({ refresh_token: refreshToken });
      role = 'agent';
      nameField = 'fullName';
    }

    if (!user) {
      user = await Developer.findOne({ refresh_token: refreshToken });
      role = 'developer';
      nameField = 'name';
    }

    if (!user) {
      return failure(res, 401, 'Invalid refresh token', 'AUTHENTICATION_FAILED');
    }

    if (user.isActive === false) {
      return failure(res, 403, 'Account not active', 'FORBIDDEN');
    }

    if (role === 'agency' && user.invitationStatus !== 'accepted') {
      return failure(res, 403, 'Invitation not accepted yet', 'FORBIDDEN');
    }

    if (user.isVerified !== true) {
      if (role === 'agency') {
        return failure(res, 403, 'Account not verified by admin', 'FORBIDDEN');
      }
      if (role === 'agent') {
        return failure(res, 403, 'Account not verified by agency', 'FORBIDDEN');
      }
      return failure(res, 403, 'Account not verified', 'FORBIDDEN');
    }

    if (user.refresh_token_expires_at && user.refresh_token_expires_at < new Date()) {
      return failure(res, 401, 'Refresh token expired', 'AUTHENTICATION_FAILED');
    }

    const tokens = generateTokenPair({
      id: user._id,
      email: user.email,
      role,
      name: user[nameField],
      isVerified: user.isVerified,
    });

    let accessExpiry;
    try {
      const decodedAccess = jwt.decode(tokens.accessToken);
      if (decodedAccess?.exp) {
        accessExpiry = new Date(decodedAccess.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode access token expiry', { error: decodeError.message });
    }

    let refreshExpiry;
    try {
      const decodedRefresh = jwt.decode(tokens.refreshToken);
      if (decodedRefresh?.exp) {
        refreshExpiry = new Date(decodedRefresh.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode refresh token expiry', { error: decodeError.message });
    }

    user.access_token = tokens.accessToken;
    user.token_expires_at = accessExpiry;
    user.refresh_token = tokens.refreshToken;
    user.refresh_token_expires_at = refreshExpiry;
    user.lastActiveAt = new Date();
    await user.save();

    const profile = sanitizeAgency(user);

    return success(res, 'Tokens refreshed', {
      token: tokens.accessToken,
      tokens,
      user: {
        id: user._id,
        email: user.email,
        role,
        name: user[nameField],
        isVerified: Boolean(user.isVerified),
        profilePicture: user.profilePicture || null,
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        ...(profile || {}),
      },
    });
  } catch (error) {
    logger.error('PFExperts refresh failed', { error: error.message });
    return failure(res, 500, 'Failed to refresh token', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/pfexperts/logout:
 *   post:
 *     summary: Logout PFExpert (agency/agent/developer) and invalidate tokens
 *     tags: [PFExpertsAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token issued during PFExperts login
 *               email:
 *                 type: string
 *                 format: email
 *                 description: PFExpert email (agency/agent/developer)
 *               id:
 *                 type: string
 *                 description: PFExpert id
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Missing identifiers
 *       500:
 *         description: Server error
 */
const logout = asyncHandler(async (req, res) => {
  try {
    const { refreshToken, email, id, userId } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : null;

    const query = {};
    if (refreshToken) query.refresh_token = refreshToken;
    if (userId || id) query._id = userId || id;
    if (normalizedEmail) query.email = normalizedEmail;

    if (!Object.keys(query).length) {
      return failure(res, 400, 'User identifier or refresh token is required', 'VALIDATION_ERROR');
    }

    let user = await Agency.findOne(query);
    if (!user) {
      user = await Agent.findOne(query);
    }
    if (!user) {
      user = await Developer.findOne(query);
    }

    if (!user) {
      return success(res, 'Logged out');
    }

    user.access_token = undefined;
    user.refresh_token = undefined;
    user.refresh_token_expires_at = undefined;
    await user.save();

    return success(res, 'Logged out');
  } catch (error) {
    logger.error('PFExperts logout failed', { error: error.message });
    return failure(res, 500, 'Failed to logout', 'SERVER_ERROR');
  }
});

module.exports = {
  acceptInvitation,
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
  uploadRegistrationDocuments,
  uploadProfilePicture,
  login,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetExpertPassword,
  refreshTokens,
  logout
};

