const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs-extra');
const asyncHandler = require('express-async-handler');
const { Types } = require('mongoose');

const Developer = require('../../models/developersModel');
const CountriesModel = require('../../models/countriesModel');
const Agency = require('../../models/agenciesModel');
const Agent = require('../../models/agentsModel');
const { sendVerificationEmail, sendWelcomeEmail } = require('../../services/emailService');
const { generateOTP, hashOTP, verifyOTP: verifyStoredOtp, getOTPExpiry } = require('../../services/otpService');
const { success, failure, isEmail, formatPhoneNumber, hasAllowedExtension, sanitizeDeveloper, isProfilelessProfilePicture } = require('../../utils/helpers');
const { DOC_EXTENSIONS, IMAGE_EXTENSIONS } = require('../../utils/constants');
const { logger } = require('../../utils/logger');
const fileHelpers = require('../../utils/fileHelpers');
const uploadService = require('../../services/uploadService');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const OTP_LIMIT = 3;
const OTP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEVELOPER_DOC_EXTENSIONS = [...new Set([...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS])];
const PROFILE_PICTURE_FOLDER = 'developer-profile-pictures';
const REGISTRATION_DOCS_FOLDER = 'developer-documents';

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

const validateDocuments = (docs = []) =>
  Array.isArray(docs) && docs.every((doc) => hasAllowedExtension(doc, DEVELOPER_DOC_EXTENSIONS));

const validateProfilePicture = (url) => !url || hasAllowedExtension(url, IMAGE_EXTENSIONS);

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

// Avoid duplicate PF expert emails across agency/agent/developer
const findExpertByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  const developer = await Developer.findOne({ email: normalizedEmail });
  if (developer) return { role: 'developer', entity: developer };

  const agency = await Agency.findOne({ email: normalizedEmail });
  if (agency) return { role: 'agency', entity: agency };

  const agent = await Agent.findOne({ email: normalizedEmail });
  if (agent) return { role: 'agent', entity: agent };

  return null;
};

const storeRegistrationDocuments = async (files = []) => {
  if (!Array.isArray(files) || !files.length) {
    throw new Error('No documents provided');
  }

  const targetDir = path.join(process.cwd(), 'uploads', REGISTRATION_DOCS_FOLDER);
  await fs.ensureDir(targetDir);

  const uploads = [];

  for (const file of files) {
    fileHelpers.validateDocumentFile(file);
    const buffer = file.buffer || (file.path && (await fs.readFile(file.path)));
    if (!buffer) {
      throw new Error('Invalid document payload');
    }

    const filename = fileHelpers.generateUniqueFilename(
      file.originalname,
      fileHelpers.FILE_CATEGORIES.DOCUMENT
    );
    const absolutePath = path.join(targetDir, filename);
    await fs.writeFile(absolutePath, buffer);

    const relativePath = `${REGISTRATION_DOCS_FOLDER}/${filename}`;
    uploads.push({
      url: uploadService.getUploadUrl(relativePath),
      path: relativePath,
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
    });
  }

  return uploads;
};

/**
 * @swagger
 * /auth/developers/accept-invitation:
 *   post:
 *     summary: Accept developer invitation and create developer profile
 *     tags: [DeveloperAuth]
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
 *               - name
 *               - phoneNumber
 *               - countryCode
 *               - address
 *               - nationality
 *               - foundedYear
 *               - shortDescription
 *               - longDescription
 *               - password
 *               - confirmPassword
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *                 description: Local phone without country code
 *               countryCode:
 *                 type: string
 *                 example: "+971"
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
 *               shortDescription:
 *                 type: string
 *               longDescription:
 *                 type: string
 *               description:
 *                 type: string
 *                 description: Optional description shown in UI
 *               registrationDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Uploaded document URLs (PDF/JPG/PNG)
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
      name,
      phoneNumber,
      countryCode,
      address = {},
      nationality,
      foundedYear,
      shortDescription,
      longDescription,
      description,
      registrationDocuments = [],
      password,
      confirmPassword,
      profilePicture,
    } = req.body || {};

    if (!token) {
      return failure(res, 400, 'Invitation token is required', 'VALIDATION_ERROR');
    }

    const normalizedAddress = normalizeAddress(address);

    if (
      !name ||
      !phoneNumber ||
      !normalizedAddress.fullAddress ||
      !nationality ||
      !password ||
      !confirmPassword ||
      !foundedYear ||
      !shortDescription ||
      !longDescription
    ) {
      return failure(res, 400, 'Missing required fields', 'VALIDATION_ERROR');
    }

    const developer = await Developer.findOne({ invitationToken: token });
    if (!developer || developer.invitationStatus !== 'pending') {
      return failure(res, 404, 'Invitation token not found or already used', 'NOT_FOUND');
    }

    const invitationDate = developer.invitationSentAt || developer.createdAt;
    if (!invitationDate || Date.now() - new Date(invitationDate).getTime() > INVITATION_EXPIRY_MS) {
      developer.invitationStatus = 'expired';
      await developer.save();
      return failure(res, 404, 'Invitation token expired', 'NOT_FOUND');
    }

    const normalizedEmail = normalizeEmail(developer.email);
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

    if (!validateDocuments(registrationDocuments)) {
      return failure(res, 400, 'Registration documents must be PDF/DOC/DOCX', 'VALIDATION_ERROR');
    }

    if (!validateProfilePicture(profilePicture)) {
      return failure(res, 400, 'Profile picture must be JPG, PNG, or WEBP', 'VALIDATION_ERROR');
    }

    if (!Types.ObjectId.isValid(nationality)) {
      return failure(res, 400, 'Invalid nationality id', 'VALIDATION_ERROR');
    }

    const countryExists = await CountriesModel.exists({ _id: nationality });
    if (!countryExists) {
      return failure(res, 400, 'Nationality country not found', 'VALIDATION_ERROR');
    }

    if (!developer.isEmailVerified || !developer.isPhoneVerified) {
      return failure(res, 400, 'Please verify email and phone before submitting', 'VERIFICATION_REQUIRED');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    developer.name = name;
    developer.phoneNumber = normalizedPhone;
    developer.phoneCode = normalizedPhoneCode;
    developer.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
    developer.nationality = nationality;
    developer.address = normalizedAddress;
    developer.registrationDocuments = registrationDocuments;
    developer.password = hashedPassword;
    developer.foundedYear = foundedYear;
    developer.shortDescription = shortDescription;
    developer.longDescription = longDescription;
    if (description) {
      developer.description = description;
    }
    if (profilePicture) {
      developer.profilePicture = profilePicture;
    }

    developer.invitationStatus = 'accepted';
    developer.invitationAcceptedAt = new Date();
    developer.isVerified = false;

    await developer.save();

    try {
      await sendWelcomeEmail(normalizedEmail, developer.name || 'Developer', 'developer');
    } catch (emailError) {
      logger.warn('Failed to send welcome email', { error: emailError.message });
    }

    return success(res, 'Profile created successfully. Please wait for admin verification.', {
      email: developer.email,
      name: developer.name,
      isVerified: false,
      requiresVerification: true,
    });
  } catch (error) {
    logger.error('Developer accept invitation failed', { error: error.message });
    return failure(res, 500, 'Failed to accept invitation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/send-email-otp:
 *   post:
 *     summary: Send OTP to developer email
 *     tags: [DeveloperAuth]
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
 *         description: Developer not found
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
    if (existingExpert && existingExpert.role !== 'developer') {
      return failure(res, 409, `Email already used by ${existingExpert.role}`, 'CONFLICT');
    }

    const developer = existingExpert?.entity && existingExpert.role === 'developer'
      ? existingExpert.entity
      : await Developer.findOne({ email: normalizedEmail });
    if (!developer) {
      return failure(res, 404, 'Developer not found', 'NOT_FOUND');
    }

    if (!canSendOtp(`email:${normalizedEmail}`)) {
      return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    developer.emailVerificationToken = hashedOtp;
    developer.emailVerificationExpires = otpExpiry;

    await sendVerificationEmail(normalizedEmail, otp, developer.name || 'Developer');
    await developer.save();

    return success(res, 'OTP sent to your email');
  } catch (error) {
    logger.error('Developer send email OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/verify-email-otp:
 *   post:
 *     summary: Verify email OTP for developer
 *     tags: [DeveloperAuth]
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
 *         description: Developer not found
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

    const developer = await Developer.findOne({ email: normalizedEmail });
    if (!developer) {
      return failure(res, 404, 'Developer not found', 'NOT_FOUND');
    }

    if (!developer.emailVerificationToken || !developer.emailVerificationExpires) {
      return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
    }

    if (developer.emailVerificationExpires < new Date()) {
      return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, developer.emailVerificationToken);
    if (!isValid) {
      return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
    }

    developer.isEmailVerified = true;
    developer.emailVerificationToken = undefined;
    developer.emailVerificationExpires = undefined;
    await developer.save();

    return success(res, 'Email verified successfully');
  } catch (error) {
    logger.error('Developer verify email OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify email OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/send-phone-otp:
 *   post:
 *     summary: Send OTP to developer phone
 *     tags: [DeveloperAuth]
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
 *         description: Developer not found
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

    const developer = await Developer.findOne({ email: normalizedEmail });
    if (!developer) {
      return failure(res, 404, 'Developer not found', 'NOT_FOUND');
    }

    if (!canSendOtp(`phone:${normalizedEmail}`)) {
      return failure(res, 429, 'Too many OTP requests. Please try again later.', 'RATE_LIMITED');
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    developer.phoneNumber = normalizedPhone;
    developer.phoneCode = null;
    developer.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
    developer.phoneVerificationOTP = hashedOtp;
    developer.phoneVerificationExpires = otpExpiry;
    await developer.save();

    return success(res, 'OTP sent to your phone', { otp }); // TODO: remove otp from response in production
  } catch (error) {
    logger.error('Developer send phone OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send phone OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/verify-phone-otp:
 *   post:
 *     summary: Verify phone OTP for developer
 *     tags: [DeveloperAuth]
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
 *         description: Developer not found
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

    const developer = await Developer.findOne({ email: normalizedEmail, phoneNumber: normalizedPhone });
    if (!developer) {
      return failure(res, 404, 'Developer not found', 'NOT_FOUND');
    }

    if (!developer.phoneVerificationOTP || !developer.phoneVerificationExpires) {
      return failure(res, 400, 'No OTP requested', 'INVALID_OTP');
    }

    if (developer.phoneVerificationExpires < new Date()) {
      return failure(res, 400, 'OTP expired', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, developer.phoneVerificationOTP);
    if (!isValid) {
      return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
    }

    developer.isPhoneVerified = true;
    developer.phoneVerificationOTP = undefined;
    developer.phoneVerificationExpires = undefined;
    await developer.save();

    return success(res, 'Phone verified successfully');
  } catch (error) {
    logger.error('Developer verify phone OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify phone OTP', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/upload-registration-documents:
 *   post:
 *     summary: Upload developer registration documents (PDF/JPG/PNG)
 *     tags: [DeveloperAuth]
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
    const uploads = await uploadService.uploadMultipleDocuments(files, 'developer');

    // Build standardized response
    const responseData = uploadService.buildStandardResponse(
      uploads,
      { documents: 'developer' }
    );

    return success(res, 'Documents uploaded successfully', responseData);
  } catch (error) {
    logger.error('Developer upload registration documents failed', { error: error.message });
    return failure(res, 500, 'Failed to upload documents', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /auth/developers/upload-profile-picture:
 *   post:
 *     summary: Upload developer profile picture
 *     tags: [DeveloperAuth]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               developerId:
 *                 type: string
 *                 description: Developer ID whose profile picture should be updated. Alternatively, use invitationToken for pending invitations.
 *               invitationToken:
 *                 type: string
 *                 description: Invitation token (alternative to developerId). Only works for pending invitations.
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *               removeProfilePicture:
 *                 type: boolean
 *                 description: Set to true to remove the current profile picture.
 *     responses:
 *       200:
 *         description: Profile picture uploaded
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const uploadProfilePicture = asyncHandler(async (req, res) => {
  try {
    const developerId = req.body?.developerId || req.body?.id;
    const invitationToken = req.body?.invitationToken || req.query?.token;

    let developer;

    if (developerId) {
      // Find by ID (for existing profiles)
      developer = await Developer.findById(developerId);
      if (!developer) {
        return failure(res, 404, 'Developer not found', 'NOT_FOUND');
      }
    } else if (invitationToken) {
      // Find by invitation token (for pending invitations)
      developer = await Developer.findOne({ invitationToken });
      if (!developer) {
        return failure(res, 404, 'Invitation token not found', 'NOT_FOUND');
      }
      // Only allow upload if invitation is still pending
      if (developer.invitationStatus !== 'pending') {
        return failure(res, 400, 'Invitation already accepted or expired. Please use developer ID.', 'VALIDATION_ERROR');
      }
    } else {
      return failure(res, 400, 'Either Developer ID or Invitation Token is required', 'VALIDATION_ERROR');
    }

    const removeRequested = toBoolean(req.body?.removeProfilePicture);
    const previousPicture = developer.profilePicture;

    if (removeRequested && !req.file) {
      if (isProfilelessProfilePicture(previousPicture)) {
        const profile = sanitizeDeveloper(developer);
        const responseData = uploadService.buildStandardResponse(
          null,
          { images: 'developer' },
          { developer: profile }
        );
        return success(res, 'Profile picture removed', responseData);
      }
      if (previousPicture) {
        // Handle backward compatibility: if previousPicture already contains a path, use it as-is
        const previousPicturePath = previousPicture.includes('/') 
          ? previousPicture 
          : `img/developer/${previousPicture}`;
        await uploadService.delete(previousPicturePath).catch((error) => {
          logger.warn('Failed to delete previous profile picture', { error: error.message });
        });
      }

      developer.profilePicture = undefined;
      developer.logo = undefined;
      await developer.save();

      const profile = sanitizeDeveloper(developer);

      // Build standardized response (no uploads, just baseUrl)
      const responseData = uploadService.buildStandardResponse(
        null,
        { images: 'developer' },
        { developer: profile }
      );

      return success(res, 'Profile picture removed', responseData);
    }

    if (!req.file) {
      return failure(res, 400, 'No profile picture uploaded', 'VALIDATION_ERROR');
    }

    const uploaded = await uploadService.upload(req.file, 'developer', {
      generateThumbnail: false,
    });

    // Save only the filename in the database
    developer.profilePicture = uploaded.filename;
    developer.logo = uploaded.filename;
    await developer.save();

    if (previousPicture && previousPicture !== uploaded.filename && !isProfilelessProfilePicture(previousPicture)) {
      // Handle backward compatibility: if previousPicture already contains a path, use it as-is
      const previousPicturePath = previousPicture.includes('/') 
        ? previousPicture 
        : `img/developer/${previousPicture}`;
      await uploadService.delete(previousPicturePath).catch((error) => {
        logger.warn('Failed to delete previous profile picture', { error: error.message });
      });
    }

    const profile = sanitizeDeveloper(developer);

    // Build standardized response
    const responseData = uploadService.buildStandardResponse(
      uploaded,
      { images: 'developer' },
      { developer: profile }
    );

    return success(res, 'Profile picture uploaded successfully', responseData);
  } catch (error) {
    logger.error('Developer upload profile picture failed', { error: error.message });
    return failure(res, 500, 'Failed to upload profile picture', 'SERVER_ERROR');
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
};

