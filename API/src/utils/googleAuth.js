// utils/googleAuth.js
const { OAuth2Client } = require('google-auth-library');
const logger = require('./logger'); // Adjust path as needed

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const client = new OAuth2Client();


/**
 * Verify Google ID token and extract user information
 * @param {string} token - Google ID token from client
 * @returns {Promise<Object>} User information from Google
 */
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      // audience: process.env.GOOGLE_CLIENT_ID,
      audience: [process.env.GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID],
    });

    const payload = ticket.getPayload();

    // Extract user information
    return {
      email: payload.email,
      emailVerified: payload.email_verified,
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      fullName: payload.name || '',
      picture: payload.picture || '',
      googleId: payload.sub,
    };
  } catch (error) {
    logger.error('Google token verification failed', {
      error: error.message,
      token: token?.substring(0, 20) + '...', // Log partial token for debugging
    });

    // Handle specific error cases
    if (error.message.includes('Token used too late')) {
      throw new Error('GOOGLE_TOKEN_EXPIRED');
    }
    if (error.message.includes('Invalid token')) {
      throw new Error('GOOGLE_TOKEN_INVALID');
    }

    throw new Error('GOOGLE_VERIFICATION_FAILED');
  }
};

/**
 * Validate Google token format before verification
 * @param {string} token - Token to validate
 * @returns {boolean} Whether token format is valid
 */
const isValidGoogleTokenFormat = (token) => {
  if (typeof token !== 'string') return false;
  
  // Google ID tokens are JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Basic length check (Google tokens are typically 800-2000 characters)
  if (token.length < 100 || token.length > 3000) return false;
  
  return true;
};

module.exports = {
  verifyGoogleToken,
  isValidGoogleTokenFormat,
};