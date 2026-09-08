const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const UsersModel = require('../../models/usersModel');
const PropertiesModel = require('../../models/propertiesModal');
const ListingTypeModel = require('../../models/listingTypeModel');
const PropertyTypeModel = require('../../models/propertyTypeModel');
const { SEARCH_ALERT_FREQUENCIES } = require('../../utils/constants');
const { success, failure } = require('../../utils/helpers');

const { Types } = mongoose;

const getAuthUserId = (req = {}) =>
  req?.user?.userId || req?.user?.id || req?.user?._id;

const isValidObjectId = (value) => Types.ObjectId.isValid(value);

const VALID_FREQUENCIES = SEARCH_ALERT_FREQUENCIES.map((item) => item.value);

const FURNISHED_VALUES = ['fully', 'partially', 'unfurnished', 'any'];

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  return [value];
};

const normalizeSearchCriteria = (raw = {}) => {
  const criteria = {};

  if (raw.location) {
    criteria.location = String(raw.location).trim();
  }

  if (raw.propertyType && isValidObjectId(raw.propertyType)) {
    criteria.propertyType = raw.propertyType;
  }

  const bedrooms = toNumberOrNull(raw.bedrooms);
  if (bedrooms !== null) {
    criteria.bedrooms = bedrooms;
  }

  const bathrooms = toNumberOrNull(raw.bathrooms);
  if (bathrooms !== null) {
    criteria.bathrooms = bathrooms;
  }

  if (raw.priceRange && typeof raw.priceRange === 'object') {
    const min = toNumberOrNull(raw.priceRange.min);
    const max = toNumberOrNull(raw.priceRange.max);
    if (min !== null || max !== null) {
      criteria.priceRange = {};
      if (min !== null) criteria.priceRange.min = min;
      if (max !== null) criteria.priceRange.max = max;
    }
  }

  const amenities = normalizeArray(raw.amenities).filter(Boolean);
  if (amenities.length) {
    criteria.amenities = amenities;
  }

  if (raw.furnished && FURNISHED_VALUES.includes(raw.furnished)) {
    criteria.furnished = raw.furnished;
  }

  if (raw.completionStatus && ['off-plan', 'ready', 'all'].includes(raw.completionStatus)) {
    criteria.completionStatus = raw.completionStatus;
  }

  if (typeof raw.petFriendly === 'boolean') {
    criteria.petFriendly = raw.petFriendly;
  }

  if (typeof raw.waterfront === 'boolean') {
    criteria.waterfront = raw.waterfront;
  }

  return criteria;
};

const validateSearchCriteria = (criteria) => {
  if (!criteria || typeof criteria !== 'object') {
    return 'searchCriteria must be an object';
  }

  if (criteria.priceRange && typeof criteria.priceRange !== 'object') {
    return 'priceRange must be an object';
  }

  if (criteria.furnished && !FURNISHED_VALUES.includes(criteria.furnished)) {
    return 'Invalid furnished value';
  }

  if (
    criteria.completionStatus &&
    !['off-plan', 'ready', 'all'].includes(criteria.completionStatus)
  ) {
    return 'Invalid completionStatus value';
  }

  return null;
};

const buildPropertyFilterForAlert = (alert) => {
  const criteria = alert.searchCriteria || {};

  const filter = {
    isActive: true,
    status: 'active',
  };

  if (alert.alertType) {
    filter.listingType = alert.alertType;
  }

  if (criteria.location) {
    filter['location.city'] = new RegExp(criteria.location, 'i');
  }

  if (criteria.propertyType) {
    filter.propertyType = criteria.propertyType;
  }

  if (typeof criteria.bedrooms === 'number') {
    filter.bedrooms = criteria.bedrooms;
  }

  if (typeof criteria.bathrooms === 'number') {
    filter.bathrooms = criteria.bathrooms;
  }

  if (criteria.priceRange) {
    const priceCond = {};
    if (typeof criteria.priceRange.min === 'number') {
      priceCond.$gte = criteria.priceRange.min;
    }
    if (typeof criteria.priceRange.max === 'number') {
      priceCond.$lte = criteria.priceRange.max;
    }
    if (Object.keys(priceCond).length) {
      filter.price = priceCond;
    }
  }

  if (criteria.amenities && criteria.amenities.length) {
    filter.amenities = { $all: criteria.amenities };
  }

  if (criteria.furnished && criteria.furnished !== 'any') {
    filter.furnishedStatus = criteria.furnished;
  }

  if (criteria.completionStatus && criteria.completionStatus !== 'all') {
    filter.completionStatus = criteria.completionStatus;
  }

  if (criteria.petFriendly === true) {
    filter.isPetFriendly = true;
  }

  if (criteria.waterfront === true) {
    filter.isWaterfront = true;
  }

  const since = alert.lastSentAt || alert.createdAt;
  if (since) {
    filter.publishedAt = { $gt: since };
  }

  return filter;
};

/**
 * @swagger
 * /users/alerts:
 *   get:
 *     summary: Get authenticated user's search alerts
 *     description: >
 *       Returns the list of search alerts created by the logged-in user, including
 *       a count of **new matching properties** for each alert since it was
 *       last sent (or created).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page (max 100).
 *     responses:
 *       200:
 *         description: List of search alerts fetched successfully.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */

// GET /api/users/alerts
const getSearchAlerts = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { page = 1, limit = 20 } = req.query || {};

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const user = await UsersModel.findById(userId).select('searchAlerts');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const alerts = user.searchAlerts || [];
  const total = alerts.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const start = (pageNum - 1) * limitNum;
  const pagedAlerts = alerts.slice(start, start + limitNum);

  const countsPromises = pagedAlerts.map((alert) => {
    const filter = buildPropertyFilterForAlert(alert);
    return PropertiesModel.countDocuments(filter);
  });

  const counts = await Promise.all(countsPromises);

  const items = pagedAlerts.map((alert, idx) => ({
    _id: alert._id,
    alertName: alert.alertName,
    alertType: alert.alertType,
    searchCriteria: alert.searchCriteria,
    frequency: alert.frequency,
    isActive: alert.isActive,
    lastSentAt: alert.lastSentAt,
    createdAt: alert.createdAt,
    newMatchesCount: counts[idx] || 0,
  }));

  return success(res, 'Search alerts fetched successfully', {
    items,
    pagination: {
      total,
      totalPages,
      page: pageNum,
      limit: limitNum,
    },
  });
});

/**
 * @swagger
 * /users/alerts/create:
 *   post:
 *     summary: Create a new search alert
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertType
 *               - searchCriteria
 *             properties:
 *               alertName:
 *                 type: string
 *                 description: Optional custom name for the alert (shown in UI).
 *                 example: "Properties for Rent in UAE"
 *               alertType:
 *                 type: string
 *                 description: ListingType ObjectId for this alert.
 *                 example: "65f12f0f9a9b9c0a1b2c3d4e"
 *               searchCriteria:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                     example: "Dubai"
 *                   propertyType:
 *                     type: string
 *                     description: PropertyType ObjectId.
 *                     example: "65f12f0f9a9b9c0a1b2c3d4e"
 *                   bedrooms:
 *                     type: integer
 *                     example: 2
 *                   bathrooms:
 *                     type: integer
 *                     example: 2
 *                   priceRange:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                         example: 50000
 *                       max:
 *                         type: number
 *                         example: 150000
 *                   amenities:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Array of Amenity ObjectIds.
 *                   furnished:
 *                     type: string
 *                     enum: [fully, partially, unfurnished, any]
 *                   completionStatus:
 *                     type: string
 *                     enum: [off-plan, ready, all]
 *                   petFriendly:
 *                     type: boolean
 *                   waterfront:
 *                     type: boolean
 *               frequency:
 *                 type: string
 *                 enum: [hourly, daily, every-3-days]
 *                 default: daily
 *     responses:
 *       200:
 *         description: Search alert created successfully.
 *       400:
 *         description: Validation error (invalid alertType, frequency, or criteria).
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// POST /api/users/alerts/create
const createSearchAlert = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { alertType, searchCriteria, frequency, alertName } = req.body || {};

  if (!alertType || !isValidObjectId(alertType)) {
    return failure(res, 400, 'Invalid alertType', 'VALIDATION_ERROR');
  }

  if (!searchCriteria || typeof searchCriteria !== 'object') {
    return failure(res, 400, 'searchCriteria is required', 'VALIDATION_ERROR');
  }

  const validationError = validateSearchCriteria(searchCriteria);
  if (validationError) {
    return failure(res, 400, validationError, 'VALIDATION_ERROR');
  }

  if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
    return failure(res, 400, 'Invalid frequency', 'VALIDATION_ERROR');
  }

  // Validate propertyType if provided
  if (searchCriteria.propertyType) {
    if (!isValidObjectId(searchCriteria.propertyType)) {
      return failure(res, 400, 'Invalid propertyType', 'VALIDATION_ERROR');
    }
  }

  const [listingTypeExists, propertyTypeExists, user] = await Promise.all([
    ListingTypeModel.exists({ _id: alertType }),
    searchCriteria.propertyType
      ? PropertyTypeModel.exists({ _id: searchCriteria.propertyType })
      : Promise.resolve(true),
    UsersModel.findById(userId).select('searchAlerts'),
  ]);

  if (!listingTypeExists) {
    return failure(res, 404, 'Listing type not found', 'NOT_FOUND');
  }

  if (searchCriteria.propertyType && !propertyTypeExists) {
    return failure(res, 404, 'Property type not found', 'NOT_FOUND');
  }

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const normalizedCriteria = normalizeSearchCriteria(searchCriteria);

  const newAlert = {
    alertName: alertName ? String(alertName).trim() : undefined,
    alertType,
    searchCriteria: normalizedCriteria,
    frequency: frequency || 'daily',
    isActive: true,
    lastSentAt: null,
    createdAt: new Date(),
  };

  user.searchAlerts = user.searchAlerts || [];
  user.searchAlerts.push(newAlert);

  await user.save();

  const created = user.searchAlerts[user.searchAlerts.length - 1];

  return success(res, 'User alert created successfully', {
    _id: created._id,
    alertName: created.alertName,
    alertType: created.alertType,
    searchCriteria: created.searchCriteria,
    frequency: created.frequency,
    isActive: created.isActive,
    lastSentAt: created.lastSentAt,
    createdAt: created.createdAt,
  });
});

/**
 * @swagger
 * /users/alerts/{alertId}:
 *   put:
 *     summary: Update a search alert's settings
 *     description: Update the frequency, active status, or name of an existing alert.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Search alert ObjectId.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alertName:
 *                 type: string
 *                 description: Optional new name for the alert.
 *               frequency:
 *                 type: string
 *                 enum: [hourly, daily, every-3-days]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Search alert updated successfully.
 *       400:
 *         description: Validation error (invalid alertId or frequency).
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User or alert not found.
 */
// PUT /api/users/alerts/:alertId
const updateSearchAlert = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { alertId } = req.params || {};

  if (!alertId || !isValidObjectId(alertId)) {
    return failure(res, 400, 'Invalid alertId', 'VALIDATION_ERROR');
  }

  const { frequency, isActive, alertName } = req.body || {};

  if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
    return failure(res, 400, 'Invalid frequency', 'VALIDATION_ERROR');
  }

  const user = await UsersModel.findById(userId).select('searchAlerts');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const alert = user.searchAlerts.id(alertId);

  if (!alert) {
    return failure(res, 404, 'Alert not found', 'NOT_FOUND');
  }

  if (frequency) {
    alert.frequency = frequency;
  }

  if (typeof isActive === 'boolean') {
    alert.isActive = isActive;
  }

  if (alertName !== undefined) {
    alert.alertName = alertName ? String(alertName).trim() : undefined;
  }

  await user.save();

  return success(res, 'Search alert updated successfully', {
    _id: alert._id,
    alertName: alert.alertName,
    alertType: alert.alertType,
    searchCriteria: alert.searchCriteria,
    frequency: alert.frequency,
    isActive: alert.isActive,
    lastSentAt: alert.lastSentAt,
    createdAt: alert.createdAt,
  });
});

/**
 * @swagger
 * /users/alerts/{alertId}:
 *   delete:
 *     summary: Delete a single search alert
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Search alert ObjectId to delete.
 *     responses:
 *       200:
 *         description: Search alert deleted successfully.
 *       400:
 *         description: Validation error (invalid alertId).
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// DELETE /api/users/alerts/:alertId
const deleteSearchAlert = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { alertId } = req.params || {};

  if (!alertId || !isValidObjectId(alertId)) {
    return failure(res, 400, 'Invalid alertId', 'VALIDATION_ERROR');
  }

  const user = await UsersModel.findById(userId).select('searchAlerts');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const beforeCount = user.searchAlerts?.length || 0;

  user.searchAlerts = (user.searchAlerts || []).filter(
    (alert) => !alert._id || alert._id.toString() !== alertId,
  );

  if ((user.searchAlerts?.length || 0) !== beforeCount) {
    await user.save();
  }

  return success(res, 'Search alert deleted successfully');
});

/**
 * @swagger
 * /users/alerts/delete-all:
 *   delete:
 *     summary: Delete all search alerts for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All search alerts deleted successfully.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// DELETE /api/users/alerts/delete-all
const deleteAllAlerts = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const user = await UsersModel.findById(userId).select('searchAlerts');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  user.searchAlerts = [];
  await user.save();

  return success(res, 'All search alerts deleted successfully');
});

module.exports = {
  getSearchAlerts,
  createSearchAlert,
  updateSearchAlert,
  deleteSearchAlert,
  deleteAllAlerts,
};


