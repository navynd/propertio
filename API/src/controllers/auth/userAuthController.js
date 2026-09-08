const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { AUTH_PROVIDERS, USER_ROLES } = require('../../utils/constants');
const {
  hashPassword,
  comparePassword,
  sanitizeUser,
  isEmail,
  isPhone,
  formatPhoneNumber,
  success,
  failure,
} = require('../../utils/helpers');
const { generateOTP, hashOTP, verifyOTP: verifyStoredOtp, getOTPExpiry } = require('../../services/otpService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../services/emailService');
const { generateTokenPair, verifyRefreshToken } = require('../../services/jwtService');
const { logger } = require('../../utils/logger');
const User = require('../../models/usersModel');
const { verifyGoogleToken, isValidGoogleTokenFormat } = require('../../utils/googleAuth');
const { verifyAppleToken, isValidAppleTokenFormat } = require('../../utils/appleAuth');

const normalizeEmail = (email = '') => email.toString().trim().toLowerCase();
const REMEMBER_ME_REFRESH_EXPIRE_IN =
  process.env.JWT_REFRESH_EXPIRE_IN_REMEMBER_ME || '30d';

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
};

/**
 * @swagger
 * /auth/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *               phoneNumber:
 *                 type: string
 *                 example: "+15551234567"
 *               phoneCode:
 *                 type: string
 *                 example: "+1"
 *               phoneNumberWithoutCode:
 *                 type: string
 *                 example: "5551234567"
 *               authProvider:
 *                 type: string
 *                 enum: [email, google, apple]
 *                 default: email
 *     responses:
 *       201:
 *         description: Registration successful and verification OTP sent.
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
 *                   example: Registration successful. Verification OTP sent to email.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           example: prakash
 *                         lastName:
 *                           type: string
 *                           example: kumar
 *                         email:
 *                           type: string
 *                           example: jahadeesh@yopmail.com
 *                         phoneNumber:
 *                           type: string
 *                           example: ""
 *                         phoneCode:
 *                           type: string
 *                           nullable: true
 *                           example: "+1"
 *                         phoneNumberWithoutCode:
 *                           type: string
 *                           nullable: true
 *                           example: "5551234567"
 *                         authProvider:
 *                           type: string
 *                           example: email
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: false
 *                         isPhoneVerified:
 *                           type: boolean
 *                           example: false
 *                         recentSearches:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
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
 *                             savedSearches:
 *                               type: boolean
 *                               example: true
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         loginAttempts:
 *                           type: integer
 *                           example: 0
 *                         _id:
 *                           type: string
 *                           example: "6971b5e943d3fe8fe805dd95"
 *                         savedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchAlerts:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         contactedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchHistory:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T05:30:17.080Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T05:30:17.080Z"
 *                         __v:
 *                           type: integer
 *                           example: 0
 *       400:
 *         description: Missing or invalid fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Missing required fields
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       409:
 *         description: User already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User already exists
 *                 code:
 *                   type: string
 *                   example: CONFLICT
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to register user
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      phoneCode,
      phoneNumberWithoutCode,
      authProvider = AUTH_PROVIDERS.EMAIL,
    } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return failure(res, 400, 'Missing required fields', 'VALIDATION_ERROR');
    }

    if (!isEmail(email)) {
      return failure(res, 400, 'Invalid email address', 'VALIDATION_ERROR');
    }

    if (!Object.values(AUTH_PROVIDERS).includes(authProvider)) {
      return failure(res, 400, 'Invalid authentication provider', 'VALIDATION_ERROR');
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    // If user exists and email is already verified, block duplicate registration
    if (existingUser && existingUser.isEmailVerified) {
      return failure(res, 409, 'User already exists', 'CONFLICT');
    }

    const hashedPassword = await hashPassword(password);
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();
    const normalizedPhone = formatPhoneNumber(phoneNumber);
    const normalizedPhoneCode = phoneCode ? formatPhoneNumber(phoneCode) : null;
    const normalizedPhoneWithoutCode = typeof phoneNumberWithoutCode === 'string'
      ? phoneNumberWithoutCode.trim().replace(/\D/g, '') || null
      : `${phoneNumber || ''}`.trim().replace(/\D/g, '') || null;

    let user;

    if (existingUser && !existingUser.isEmailVerified) {
      // User started registration before but never verified email.
      // Refresh their OTP (and optionally details) instead of throwing an error.
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.phoneNumber = normalizedPhone;
      existingUser.phoneCode = normalizedPhoneCode;
      existingUser.phoneNumberWithoutCode = normalizedPhoneWithoutCode;
      existingUser.authProvider = authProvider;
      existingUser.password = hashedPassword;
      existingUser.passwordResetOTPHash = otpHash;
      existingUser.passwordResetOTPExpires = otpExpiry;
      existingUser.emailVerificationExpires = otpExpiry;
      user = await existingUser.save();
    } else {
      user = await User.create({
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        phoneCode: normalizedPhoneCode,
        phoneNumberWithoutCode: normalizedPhoneWithoutCode,
        authProvider,
        password: hashedPassword,
        passwordResetOTPHash: otpHash,
        passwordResetOTPExpires: otpExpiry,
        emailVerificationExpires: otpExpiry,
        isEmailVerified: false,
      });
    }

    await sendVerificationEmail(normalizedEmail, otp, firstName);

    const safeUser = sanitizeUser(user);
    delete safeUser.passwordResetOTPHash;
    delete safeUser.passwordResetOTPExpires;
    delete safeUser.emailVerificationExpires;

    const message =
      existingUser && !existingUser.isEmailVerified
        ? 'Account exists but email is not verified. New verification OTP sent to email.'
        : 'Registration successful. Verification OTP sent to email.';

    return success(res, message, { user: safeUser }, existingUser ? 200 : 201);
  } catch (error) {
    logger.error('User registration failed', { error: error.message });
    return failure(res, 500, 'Failed to register user', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/login:
 *   post:
 *     summary: Log in with email or phone number
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phoneNumber:
 *                 type: string
 *                 example: "+15551234567"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *               rememberMe:
 *                 type: boolean
 *                 description: Extend the session by keeping the refresh token valid longer.
 *                 example: true
 *     responses:
 *       200:
 *         description: Login successful, returns tokens and user profile.
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
 *                     user:
 *                       type: object
 *                       properties:
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
 *                             savedSearches:
 *                               type: boolean
 *                               example: true
 *                         _id:
 *                           type: string
 *                           example: "6971c2b449ceef637047cc51"
 *                         firstName:
 *                           type: string
 *                           example: prakash
 *                         lastName:
 *                           type: string
 *                           example: kumar
 *                         email:
 *                           type: string
 *                           example: jahadeesh@yopmail.com
 *                         phoneNumber:
 *                           type: string
 *                           example: ""
 *                         authProvider:
 *                           type: string
 *                           example: email
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *                         isPhoneVerified:
 *                           type: boolean
 *                           example: false
 *                         recentSearches:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         loginAttempts:
 *                           type: integer
 *                           example: 0
 *                         savedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchAlerts:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         contactedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchHistory:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:24:52.884Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:28:32.891Z"
 *                         __v:
 *                           type: integer
 *                           example: 0
 *                         access_token:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:28:32.888Z"
 *                         fullName:
 *                           type: string
 *                           example: prakash kumar
 *                         id:
 *                           type: string
 *                           example: "6971c2b449ceef637047cc51"
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         refreshToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Missing credentials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email or phone number and password are required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *                 code:
 *                   type: string
 *                   example: AUTHENTICATION_FAILED
 *       403:
 *         description: Account inactive or email not verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Account is inactive or banned
 *                 code:
 *                   type: string
 *                   example: FORBIDDEN
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: NOT_FOUND
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to log in user
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const login = async (req, res) => {
  try {
    const { email, phoneNumber, password, rememberMe } = req.body || {};

    if ((!email && !phoneNumber) || !password) {
      return failure(res, 400, 'Email or phone number and password are required', 'VALIDATION_ERROR');
    }

    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : null;
    const rememberSession = toBoolean(rememberMe);

    const user = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phoneNumber: normalizedPhone } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return failure(res, 404, 'User not found', 'NOT_FOUND');
    }

    if (!user.isActive || user.isBanned) {
      return failure(res, 403, 'Account is inactive or banned', 'FORBIDDEN');
    }

    if (!user.isEmailVerified) {
      return failure(res, 403, 'Please verify your email before logging in', 'EMAIL_NOT_VERIFIED');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return failure(res, 401, 'Invalid credentials', 'AUTHENTICATION_FAILED');
    }

    const tokens = generateTokenPair(
      {
        userId: user._id.toString(),
        role: USER_ROLES.USER,
        provider: user.authProvider || AUTH_PROVIDERS.EMAIL,
      },
      rememberSession
        ? { refreshTokenExpiresIn: REMEMBER_ME_REFRESH_EXPIRE_IN }
        : undefined
    );

    let refreshExpiry;
    try {
      const decoded = jwt.decode(tokens.refreshToken);
      if (decoded?.exp) {
        refreshExpiry = new Date(decoded.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode refresh token expiry', { error: decodeError.message });
    }

    user.lastLogin = new Date();
    user.access_token = tokens.accessToken;
    user.refresh_token = tokens.refreshToken;
    user.refresh_token_expires_at = refreshExpiry;
    await user.save();

    const safeUser = sanitizeUser(user);
    delete safeUser.refresh_token;
    delete safeUser.refresh_token_expires_at;

    return success(res, 'Login successful', { user: safeUser, tokens });
  } catch (error) {
    logger.error('User login failed', { error: error.message });
    return failure(res, 500, 'Failed to login', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/refresh:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     tags: [UserAuth]
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
 *                 description: Refresh token issued during login
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       400:
 *         description: Refresh token missing.
 *       401:
 *         description: Refresh token invalid or expired.
 *       403:
 *         description: Account inactive or banned.
 *       500:
 *         description: Server error.
 */
const refreshTokens = async (req, res) => {
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

    const user = await User.findOne({ refresh_token: refreshToken });
    if (!user) {
      return failure(res, 401, 'Invalid refresh token', 'AUTHENTICATION_FAILED');
    }

    if (!user.isActive || user.isBanned) {
      return failure(res, 403, 'Account is inactive or banned', 'FORBIDDEN');
    }

    if (user.refresh_token_expires_at && user.refresh_token_expires_at < new Date()) {
      return failure(res, 401, 'Refresh token expired', 'AUTHENTICATION_FAILED');
    }

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      role: USER_ROLES.USER,
      provider: user.authProvider || AUTH_PROVIDERS.EMAIL,
    });

    let refreshExpiry;
    try {
      const decoded = jwt.decode(tokens.refreshToken);
      if (decoded?.exp) {
        refreshExpiry = new Date(decoded.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode refresh token expiry', { error: decodeError.message });
    }

    user.access_token = tokens.accessToken;
    user.refresh_token = tokens.refreshToken;
    user.refresh_token_expires_at = refreshExpiry;
    user.lastActiveAt = new Date();
    await user.save();

    const safeUser = sanitizeUser(user);
    delete safeUser.refresh_token;
    delete safeUser.refresh_token_expires_at;

    return success(res, 'Tokens refreshed', { user: safeUser, tokens });
  } catch (error) {
    logger.error('Refresh token failed', { error: error.message });
    return failure(res, 500, 'Failed to refresh token', 'SERVER_ERROR');
  }
};

// mock social login
// const socialLogin = async (req, res) => {
//   try {
//     const { provider, token, email, firstName = 'User', lastName = '' } = req.body || {};

//     if (!provider || !token) {
//       return failure(res, 400, 'Provider and token are required', 'VALIDATION_ERROR');
//     }

//     if (![AUTH_PROVIDERS.GOOGLE, AUTH_PROVIDERS.APPLE].includes(provider)) {
//       return failure(res, 400, 'Unsupported social provider', 'VALIDATION_ERROR');
//     }

//     if (!email || !isEmail(email)) {
//       return failure(res, 400, 'Valid email is required for social login', 'VALIDATION_ERROR');
//     }

//     // Mock token verification for now
//     if (typeof token !== 'string' || token.length < 10) {
//       return failure(res, 400, 'Invalid social token', 'AUTHENTICATION_FAILED');
//     }

//     const normalizedEmail = normalizeEmail(email);
//     let user = await User.findOne({ email: normalizedEmail });

//     if (!user) {
//       user = await User.create({
//         firstName,
//         lastName,
//         email: normalizedEmail,
//         authProvider: provider,
//         isEmailVerified: true,
//       });
//     } else {
//       user.authProvider = provider;
//       if (!user.isEmailVerified) {
//         user.isEmailVerified = true;
//       }
//     }

//     const tokens = generateTokenPair({
//       userId: user._id.toString(),
//       role: USER_ROLES.USER,
//       provider,
//     });

//     let refreshExpiry;
//     try {
//       const decoded = jwt.decode(tokens.refreshToken);
//       if (decoded?.exp) {
//         refreshExpiry = new Date(decoded.exp * 1000);
//       }
//     } catch (decodeError) {
//       logger.warn('Failed to decode refresh token expiry', { error: decodeError.message });
//     }

//     user.lastLogin = new Date();
//     user.access_token = tokens.accessToken;
//     user.refresh_token = tokens.refreshToken;
//     user.refresh_token_expires_at = refreshExpiry;
//     await user.save();

//     const safeUser = sanitizeUser(user);
//     delete safeUser.refresh_token;
//     delete safeUser.refresh_token_expires_at;

//     return success(res, 'Social login successful', { tokens, user: safeUser });
//   } catch (error) {
//     logger.error('Social login failed', { error: error.message });
//     return failure(res, 500, 'Failed to process social login', 'SERVER_ERROR');
//   }
// };

/**
 * @swagger
 * /auth/users/social-login:
 *   post:
 *     summary: Social login with Google or Apple
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple]
 *                 example: google
 *               token:
 *                 type: string
 *                 description: ID token from the provider
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               user:
 *                 type: object
 *                 description: Apple user payload (only on first sign-in)
 *     responses:
 *       200:
 *         description: Social login successful, returns tokens and user profile.
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
 *                   example: Social login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
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
 *                             savedSearches:
 *                               type: boolean
 *                               example: true
 *                         _id:
 *                           type: string
 *                           example: "6971c2b449ceef637047cc51"
 *                         firstName:
 *                           type: string
 *                           example: prakash
 *                         lastName:
 *                           type: string
 *                           example: kumar
 *                         email:
 *                           type: string
 *                           example: jahadeesh@yopmail.com
 *                         phoneNumber:
 *                           type: string
 *                           example: ""
 *                         authProvider:
 *                           type: string
 *                           example: email
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *                         isPhoneVerified:
 *                           type: boolean
 *                           example: false
 *                         recentSearches:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         loginAttempts:
 *                           type: integer
 *                           example: 0
 *                         savedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchAlerts:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         contactedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchHistory:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:24:52.884Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:28:32.891Z"
 *                         __v:
 *                           type: integer
 *                           example: 0
 *                         access_token:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:28:32.888Z"
 *                         fullName:
 *                           type: string
 *                           example: prakash kumar
 *                         id:
 *                           type: string
 *                           example: "6971c2b449ceef637047cc51"
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         refreshToken:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Provider and token are required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       401:
 *         description: Token verification failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Token verification failed
 *                 code:
 *                   type: string
 *                   example: AUTHENTICATION_FAILED
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to process social login
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const socialLogin = async (req, res) => {
  try {
    const {
      provider,
      token,
      email,
      firstName = 'User',
      lastName = '',
      // Apple-specific: user data is only sent on first sign-in
      user: appleUserData = null
    } = req.body || {};

    if (!provider || !token) {
      return failure(res, 400, 'Provider and token are required', 'VALIDATION_ERROR');
    }

    if (![AUTH_PROVIDERS.GOOGLE, AUTH_PROVIDERS.APPLE].includes(provider)) {
      return failure(res, 400, 'Unsupported social provider', 'VALIDATION_ERROR');
    }

    // Verify token with the appropriate provider
    let verifiedUserInfo;

    try {
      if (provider === AUTH_PROVIDERS.GOOGLE) {
        // Validate token format first
        if (!isValidGoogleTokenFormat(token)) {
          return failure(res, 400, 'Invalid Google token format', 'AUTHENTICATION_FAILED');
        }

        // Verify Google token
        verifiedUserInfo = await verifyGoogleToken(token);

      } else if (provider === AUTH_PROVIDERS.APPLE) {
        // Validate token format first
        if (!isValidAppleTokenFormat(token)) {
          return failure(res, 400, 'Invalid Apple token format', 'AUTHENTICATION_FAILED');
        }

        // Verify Apple token (pass user data if provided)
        verifiedUserInfo = await verifyAppleToken(token, appleUserData);
      }
    } catch (error) {
      // Handle specific verification errors
      const errorMessages = {
        'GOOGLE_TOKEN_EXPIRED': 'Google token has expired',
        'GOOGLE_TOKEN_INVALID': 'Invalid Google token',
        'GOOGLE_VERIFICATION_FAILED': 'Google verification failed',
        'APPLE_TOKEN_EXPIRED': 'Apple token has expired',
        'APPLE_TOKEN_INVALID': 'Invalid Apple token',
        'APPLE_VERIFICATION_FAILED': 'Apple verification failed',
      };

      const message = errorMessages[error.message] || 'Token verification failed';
      logger.error('Social auth token verification error', {
        provider,
        error: error.message
      });

      return failure(res, 401, message, 'AUTHENTICATION_FAILED');
    }

    // Use verified email from provider (more secure than client-provided)
    const normalizedEmail = normalizeEmail(verifiedUserInfo.email);

    // Validate email
    if (!normalizedEmail || !isEmail(normalizedEmail)) {
      return failure(res, 400, 'Valid email is required for social login', 'VALIDATION_ERROR');
    }

    // Check if email is verified by provider
    if (!verifiedUserInfo.emailVerified) {
      return failure(res, 400, 'Email must be verified with provider', 'VALIDATION_ERROR');
    }

    const resolvedFirstName = String(
      verifiedUserInfo.firstName || firstName || 'User'
    ).trim() || 'User';
    const resolvedLastName = String(
      verifiedUserInfo.lastName || lastName || 'User'
    ).trim() || 'User';

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    // Keep social auth behavior aligned with password login restrictions.
    if (user && (!user.isActive || user.isBanned)) {
      return failure(res, 403, 'Account is inactive or banned', 'FORBIDDEN');
    }

    if (!user) {
      // Create new user with verified information from provider
      user = await User.create({
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        email: normalizedEmail,
        authProvider: provider,
        isEmailVerified: true,
        // Store provider-specific IDs for future reference
        ...(provider === AUTH_PROVIDERS.GOOGLE && { googleId: verifiedUserInfo.googleId }),
        ...(provider === AUTH_PROVIDERS.APPLE && { appleId: verifiedUserInfo.appleId }),
        // Store profile picture if available (Google provides this)
        ...(verifiedUserInfo.picture && { profilePicture: verifiedUserInfo.picture }),
      });

      logger.info('New user created via social login', {
        userId: user._id,
        provider,
        email: normalizedEmail
      });
    } else {
      // Update existing user
      user.authProvider = provider;

      // Keep legacy users save-safe for required name fields
      if (!String(user.firstName || '').trim()) {
        user.firstName = resolvedFirstName;
      }
      if (!String(user.lastName || '').trim()) {
        user.lastName = resolvedLastName;
      }

      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }

      // Update provider-specific IDs
      if (provider === AUTH_PROVIDERS.GOOGLE && verifiedUserInfo.googleId) {
        user.googleId = verifiedUserInfo.googleId;
      }
      if (provider === AUTH_PROVIDERS.APPLE && verifiedUserInfo.appleId) {
        user.appleId = verifiedUserInfo.appleId;
      }

      // Update profile picture if not already set and available
      if (!user.profilePicture && verifiedUserInfo.picture) {
        user.profilePicture = verifiedUserInfo.picture;
      }

      logger.info('Existing user logged in via social auth', {
        userId: user._id,
        provider
      });
    }

    // Generate auth tokens
    const tokens = generateTokenPair({
      userId: user._id.toString(),
      role: USER_ROLES.USER,
      provider,
    });

    // Parse refresh token expiry
    let refreshExpiry;
    try {
      const decoded = jwt.decode(tokens.refreshToken);
      if (decoded?.exp) {
        refreshExpiry = new Date(decoded.exp * 1000);
      }
    } catch (decodeError) {
      logger.warn('Failed to decode refresh token expiry', {
        error: decodeError.message
      });
    }

    // Update user session information
    user.lastLogin = new Date();
    user.access_token = tokens.accessToken;
    user.refresh_token = tokens.refreshToken;
    user.refresh_token_expires_at = refreshExpiry;
    await user.save();

    // Prepare safe user object for response
    const safeUser = sanitizeUser(user);
    delete safeUser.refresh_token;
    delete safeUser.refresh_token_expires_at;

    return success(res, 'Social login successful', { user: safeUser, tokens });
  } catch (error) {
    logger.error('Social login failed', {
      error: error.message,
      stack: error.stack
    });
    return failure(res, 500, 'Failed to process social login', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/send-otp:
 *   post:
 *     summary: Send verification OTP to user email
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phoneNumber:
 *                 type: string
 *                 example: "+15551234567"
 *     responses:
 *       200:
 *         description: OTP sent successfully.
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
 *                   example: OTP sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     channel:
 *                       type: string
 *                       example: email
 *       400:
 *         description: Missing or invalid email or phone number.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
const sendOTP = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : null;

    if (!normalizedEmail && !normalizedPhone) {
      return failure(res, 400, 'Email or phone number is required', 'VALIDATION_ERROR');
    }

    if (normalizedEmail && !isEmail(normalizedEmail)) {
      return failure(res, 400, 'Invalid email address', 'VALIDATION_ERROR');
    }

    if (normalizedPhone && !isPhone(normalizedPhone)) {
      return failure(res, 400, 'Invalid phone number', 'VALIDATION_ERROR');
    }

    if (normalizedPhone && !normalizedEmail) {
      return failure(res, 400, 'Phone OTP is not supported yet', 'NOT_IMPLEMENTED');
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhone }
    );

    if (!user) {
      return failure(res, 404, 'User not found', 'NOT_FOUND');
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    user.passwordResetOTPHash = otpHash;
    user.passwordResetOTPExpires = otpExpiry;
    user.emailVerificationExpires = otpExpiry;

    if (normalizedEmail) {
      await sendVerificationEmail(normalizedEmail, otp, user.firstName || 'there');
    } else {
      return failure(res, 400, 'Phone OTP is not supported yet', 'NOT_IMPLEMENTED');
    }

    await user.save();

    return success(res, 'OTP sent successfully', { channel: normalizedEmail ? 'email' : 'phone' });
  } catch (error) {
    logger.error('Send OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to send OTP', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/verify-otp:
 *   post:
 *     summary: Verify an email or phone OTP
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully.
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
 *                   example: OTP verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "6971c2b449ceef637047cc51"
 *                         firstName:
 *                           type: string
 *                           example: prakash
 *                         lastName:
 *                           type: string
 *                           example: kumar
 *                         email:
 *                           type: string
 *                           example: jahadeesh@yopmail.com
 *                         phoneNumber:
 *                           type: string
 *                           example: ""
 *                         authProvider:
 *                           type: string
 *                           example: email
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *                         isPhoneVerified:
 *                           type: boolean
 *                           example: false
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
 *                             savedSearches:
 *                               type: boolean
 *                               example: true
 *                         recentSearches:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         savedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchAlerts:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         contactedProperties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         searchHistory:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         loginAttempts:
 *                           type: integer
 *                           example: 0
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:24:52.884Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2026-01-22T06:28:32.891Z"
 *                         __v:
 *                           type: integer
 *                           example: 0
 *       400:
 *         description: Missing or invalid OTP.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email or phone number and OTP are required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: NOT_FOUND
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to verify OTP
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : null;

    if (!otp || (!normalizedEmail && !normalizedPhone)) {
      return failure(res, 400, 'Email or phone number and OTP are required', 'VALIDATION_ERROR');
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhone }
    );

    if (!user) {
      return failure(res, 404, 'User not found', 'NOT_FOUND');
    }

    if (!user.passwordResetOTPHash || !user.passwordResetOTPExpires) {
      return failure(res, 400, 'No OTP request found', 'INVALID_OTP');
    }

    if (user.passwordResetOTPExpires < new Date()) {
      return failure(res, 400, 'OTP has expired', 'OTP_EXPIRED');
    }

    const isValid = await verifyStoredOtp(otp, user.passwordResetOTPHash);
    if (!isValid) {
      return failure(res, 400, 'Invalid OTP', 'INVALID_OTP');
    }

    if (normalizedEmail) {
      user.isEmailVerified = true;
    } else {
      user.isPhoneVerified = true;
    }

    user.passwordResetOTPHash = undefined;
    user.passwordResetOTPExpires = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const safeUser = sanitizeUser(user);

    return success(res, 'OTP verified successfully', { user: safeUser });
  } catch (error) {
    logger.error('Verify OTP failed', { error: error.message });
    return failure(res, 500, 'Failed to verify OTP', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/reset-password:
 *   post:
 *     summary: Reset password after OTP verification
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Password reset successful.
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
 *                   example: Password reset successful
 *       400:
 *         description: Missing data or OTP not verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email or phone and new password are required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found
 *                 code:
 *                   type: string
 *                   example: NOT_FOUND
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to reset password
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const resetPassword = async (req, res) => {
  try {
    const { email, phoneNumber, newPassword } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const normalizedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : null;

    if (!newPassword || (!normalizedEmail && !normalizedPhone)) {
      return failure(res, 400, 'Email or phone and new password are required', 'VALIDATION_ERROR');
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhone }
    );

    if (!user) {
      return failure(res, 404, 'User not found', 'NOT_FOUND');
    }

    // If an OTP is still stored, it means the user has not verified it yet.
    if (user.passwordResetOTPHash) {
      return failure(res, 400, 'Please verify the OTP before resetting password', 'OTP_NOT_VERIFIED');
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetOTPHash = undefined;
    user.passwordResetOTPExpires = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return success(res, 'Password reset successful');
  } catch (error) {
    logger.error('Reset password failed', { error: error.message });
    return failure(res, 500, 'Failed to reset password', 'SERVER_ERROR');
  }
};

/**
 * @swagger
 * /auth/users/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [UserAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully.
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
 *                   example: Logged out
 *       400:
 *         description: Missing identifiers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User identifier or refresh token is required
 *                 code:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to logout
 *                 code:
 *                   type: string
 *                   example: SERVER_ERROR
 */
const logout = async (req, res) => {
  try {
    const { refreshToken, email, userId } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : null;

    const query = {};
    if (userId) query._id = userId;
    if (normalizedEmail) query.email = normalizedEmail;
    if (refreshToken) query.refresh_token = refreshToken;

    if (!Object.keys(query).length) {
      return failure(res, 400, 'User identifier or refresh token is required', 'VALIDATION_ERROR');
    }

    const user = await User.findOne(query);
    if (!user) {
      return success(res, 'Logged out');
    }

    user.access_token = undefined;
    user.refresh_token = undefined;
    user.refresh_token_expires_at = undefined;
    await user.save();

    return success(res, 'Logged out');
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    return failure(res, 500, 'Failed to logout', 'SERVER_ERROR');
  }
};

module.exports = {
  register,
  requestSignup: register, // alias for existing route
  login,
  socialLogin,
  sendOTP,
  verifyOTP,
  verifyOtp: verifyOTP, // alias for existing route
  resetPassword,
  logout,
  refreshTokens,
};

