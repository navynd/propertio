// utils/appleAuth.js
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { logger } = require('./logger');

// Apple's JWKS endpoint for public keys
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

// Create JWKS client to fetch Apple's public keys
const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const getAppleAudiences = () => {
  const rawValues = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_WEB_CLIENT_ID,
    process.env.APPLE_IOS_CLIENT_ID,
  ].filter(Boolean);

  const expanded = rawValues
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(expanded)];
};

/**
 * Get signing key from Apple's JWKS
 * @param {Object} header - JWT header
 * @returns {Promise<string>} Signing key
 */
const getAppleSigningKey = (header) => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        logger.error('Failed to get Apple signing key', { error: err.message });
        return reject(err);
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
};

/**
 * Verify Apple ID token and extract user information
 * @param {string} token - Apple identity token from client
 * @param {Object} userData - Optional user data from Apple (first sign-in only)
 * @returns {Promise<Object>} User information from Apple
 */
const verifyAppleToken = async (token, userData = null) => {
  try {
    const audiences = getAppleAudiences();
    if (!audiences.length) {
      logger.error('Apple token verification failed: no client id configured');
      throw new Error('APPLE_VERIFICATION_FAILED');
    }

    // Decode token to get header (without verification)
    const decodedHeader = jwt.decode(token, { complete: true });
    
    if (!decodedHeader) {
      throw new Error('APPLE_TOKEN_INVALID');
    }

    // Get Apple's public key
    const signingKey = await getAppleSigningKey(decodedHeader.header);

    // Verify token with Apple's public key
    const payload = jwt.verify(token, signingKey, {
      audience: audiences.length === 1 ? audiences[0] : audiences,
      issuer: 'https://appleid.apple.com',
      algorithms: ['RS256'],
    });

    // Extract user information
    const userInfo = {
      email: payload.email,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      appleId: payload.sub,
      isPrivateEmail: payload.is_private_email === 'true' || payload.is_private_email === true,
    };

    // Apple only provides name on first sign-in via userData
    if (userData && userData.name) {
      userInfo.firstName = userData.name.firstName || '';
      userInfo.lastName = userData.name.lastName || '';
      userInfo.fullName = `${userInfo.firstName} ${userInfo.lastName}`.trim();
    } else {
      // For subsequent logins, name won't be available
      userInfo.firstName = '';
      userInfo.lastName = '';
      userInfo.fullName = '';
    }

    return userInfo;
  } catch (error) {
    logger.error('Apple token verification failed', {
      error: error.message,
      token: token?.substring(0, 20) + '...',
    });

    // Handle specific error cases
    if (error.name === 'TokenExpiredError') {
      throw new Error('APPLE_TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('APPLE_TOKEN_INVALID');
    }

    throw new Error('APPLE_VERIFICATION_FAILED');
  }
};

/**
 * Validate Apple token format before verification
 * @param {string} token - Token to validate
 * @returns {boolean} Whether token format is valid
 */
const isValidAppleTokenFormat = (token) => {
  if (typeof token !== 'string') return false;
  
  // Apple ID tokens are JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Basic length check
  if (token.length < 100 || token.length > 3000) return false;
  
  return true;
};

module.exports = {
  verifyAppleToken,
  isValidAppleTokenFormat,
};