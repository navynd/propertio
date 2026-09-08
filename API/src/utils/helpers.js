const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const success = (res, message, data = {}, status = 200) =>
  res.status(status).json({
    status: true,
    message,
    data,
  });

const failure = (res, status, message, code = 'ERROR', details) =>
  res.status(status).json({
    status: false,
    message,
    code,
    ...(details ? { details } : {}),
  });

const generateSlug = (text = '') =>
  text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const generateRandomString = (length = 16) => {
  const size = Math.max(1, Number(length) || 0);
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(size);

  let result = '';
  for (let i = 0; i < size; i += 1) {
    result += charset[bytes[i] % charset.length];
  }

  return result;
};

const formatPhoneNumber = (phone = '') => {
  const raw = `${phone}`.trim();
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';

  const withoutPlus = digits.startsWith('+') ? digits.slice(1) : digits;
  const normalized = withoutPlus.replace(/^0+/, '');

  return normalized ? `+${normalized}` : '';
};

const isEmail = (value = '') => {
  const email = value.toString().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isPhone = (value = '') => {
  const normalized = formatPhoneNumber(value);
  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  return phoneRegex.test(normalized);
};

const hasAllowedExtension = (value = '', allowed = []) => {
  const rawSegment = `${value || ''}`.split('?')[0].trim();
  if (!rawSegment || !allowed.length) return false;
  const lower = rawSegment.toLowerCase();
  return allowed.some((ext) => lower.endsWith(`.${ext}`));
};

const sanitizeUser = (user) => {
  if (!user) return null;

  const source =
    typeof user.toObject === 'function'
      ? user.toObject({ getters: true, virtuals: true })
      : user._doc
        ? { ...user._doc }
        : { ...user };

  const {
    password,
    salt,
    otp,
    otpCode,
    otpExpiresAt,
    otpExpiry,
    resetPasswordToken,
    resetPasswordExpires,
    verificationToken,
    verificationCode,
    firebaseToken,
    fcmTokens,
    refreshToken,
    tokens,
    access_token,
    refresh_token,
    ...safeUser
  } = source;

  if (!Object.prototype.hasOwnProperty.call(safeUser, 'profilePicture') || safeUser.profilePicture == null) {
    safeUser.profilePicture = "profileless.png";
  }

  return safeUser;
};

const sanitizeAgency = (agency) => {
  if (!agency) return null;

  const source =
    typeof agency.toObject === 'function'
      ? agency.toObject({ getters: true, virtuals: true })
      : agency._doc
        ? { ...agency._doc }
        : { ...agency };

  const {
    password,
    fcmTokens,
    emailVerificationToken,
    emailVerificationExpires,
    phoneVerificationOTP,
    phoneVerificationExpires,
    resetPasswordToken,
    resetPasswordExpires,
    invitationToken,
    access_token,
    token_expires_at,
    refresh_token,
    refresh_token_expires_at,
    ...safeAgency
  } = source;

  if (!Object.prototype.hasOwnProperty.call(safeAgency, 'profilePicture') || safeAgency.profilePicture == null) {
    safeAgency.profilePicture = "profileless.png";
  }

  return safeAgency;
};

const sanitizeAgent = (agent) => {
  if (!agent) return null;

  const source =
    typeof agent.toObject === 'function'
      ? agent.toObject({ getters: true, virtuals: true })
      : agent._doc
        ? { ...agent._doc }
        : { ...agent };

  const {
    password,
    fcmTokens,
    emailVerificationToken,
    emailVerificationExpires,
    phoneVerificationOTP,
    phoneVerificationExpires,
    resetPasswordToken,
    resetPasswordExpires,
    invitationToken,
    access_token,
    token_expires_at,
    refresh_token,
    refresh_token_expires_at,
    ...safeAgent
  } = source;

  if (
    !Object.prototype.hasOwnProperty.call(safeAgent, 'profilePicture')
    || safeAgent.profilePicture == null
    || (typeof safeAgent.profilePicture === 'string' && !safeAgent.profilePicture.trim())
  ) {
    safeAgent.profilePicture = 'profileless.png';
  }

  return safeAgent;
};

const PROFILELESS_IMAGE = 'profileless.png';

const isMissingProfileImage = (obj, key) => {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return true;
  const v = obj[key];
  if (v == null) return true;
  return typeof v === 'string' && !v.trim();
};

const sanitizeDeveloper = (developer) => {
  if (!developer) return null;

  const source =
    typeof developer.toObject === 'function'
      ? developer.toObject({ getters: true, virtuals: true })
      : developer._doc
        ? { ...developer._doc }
        : { ...developer };

  const {
    password,
    emailVerificationToken,
    emailVerificationExpires,
    phoneVerificationOTP,
    phoneVerificationExpires,
    invitationToken,
    access_token,
    refresh_token,
    token_expires_at,
    refresh_token_expires_at,
    ...safe
  } = source;

  if (isMissingProfileImage(safe, 'profilePicture')) safe.profilePicture = PROFILELESS_IMAGE;
  if (isMissingProfileImage(safe, 'logo')) safe.logo = PROFILELESS_IMAGE;

  return safe;
};

const generateInvitationToken = () => crypto.randomBytes(32).toString('hex');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
};

const PROFILELESS_PICTURE_BASENAME = 'profileless.png';

/**
 * Stored profile picture value is the shared default asset — never delete from storage.
 * Matches `profileless.png`, `img/.../profileless.png`, case-insensitive basename.
 * @param {unknown} stored
 * @returns {boolean}
 */
const isProfilelessProfilePicture = (stored) => {
  if (stored == null) return false;
  const s = String(stored).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  const base = lower.includes('/') ? lower.split('/').pop() : lower;
  return base === PROFILELESS_PICTURE_BASENAME;
};

module.exports = {
  generateSlug,
  generateRandomString,
  formatPhoneNumber,
  isEmail,
  isPhone,
  success,
  failure,
  sanitizeUser,
  sanitizeAgency,
  sanitizeAgent,
  sanitizeDeveloper,
  generateInvitationToken,
  hashPassword,
  comparePassword,
  hasAllowedExtension,
  isProfilelessProfilePicture,
};
