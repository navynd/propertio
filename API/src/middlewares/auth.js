const asyncHandler = require('express-async-handler');
const { verifyAccessToken } = require('../services/jwtService');
const { logger } = require('../utils/logger');

const extractBearerToken = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.trim().split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing or malformed' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

const authorizeRoles = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return next();
  });

const authenticateUser = [authenticate, authorizeRoles('user')];
const authenticateAgent = [authenticate, authorizeRoles('agent')];
const authenticateAgency = [authenticate, authorizeRoles('agency')];
const authenticateDeveloper = [authenticate, authorizeRoles('developer')];
// const authenticateAdmin = [authenticate, authorizeRoles('admin')];

// Optional authentication - sets req.user if token is valid, but doesn't fail if no token
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      logger.warn('Optional authentication failed', { error: error.message });
      // Continue without setting req.user - allow guest access
    }
  }
  // If no token, continue without req.user - allow guest access
  return next();
});

module.exports = {
  authenticate,
  authorizeRoles,
  authenticateUser,
  authenticateAgent,
  authenticateAgency,
  authenticateDeveloper,
  optionalAuthenticate,
  // authenticateAdmin,
};

