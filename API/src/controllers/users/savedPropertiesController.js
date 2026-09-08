const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const UsersModel = require('../../models/usersModel');
const PropertiesModel = require('../../models/propertiesModal');
const { success, failure } = require('../../utils/helpers');

const getAuthUserId = (req = {}) =>
  req?.user?.userId || req?.user?.id || req?.user?._id;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * @swagger
 * /users/saved-properties:
 *   get:
 *     summary: Get authenticated user's saved properties
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
 *         description: Number of items per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search across title, location, agent, agency, and developer name within saved properties.
 *     responses:
 *       200:
 *         description: List of saved properties fetched successfully.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// GET /api/users/saved-properties
const getSavedProperties = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { page = 1, limit = 20, search } = req.query || {};

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const user = await UsersModel.findById(userId)
    .select('savedProperties')
    .populate({
      path: 'savedProperties.property',
      model: 'Properties',
      match: { isActive: true, status: 'active' },
      populate: [
        {
          path: 'listingType',
          model: 'ListingType',
          select: 'name slug transaction category',
        },
        {
          path: 'agent',
          model: 'Agents',
          match: { isVerified: true, isActive: true },
          select: 'fullName profilePicture phoneNumber email brokerLicenseNumber agentType ratings.average ratings.totalCount', populate: {
            path: 'languages',
            model: 'Languages',
            select: 'name code nativeName',
          }
        },
        {
          path: 'agency',
          model: 'Agencies',
          match: { isVerified: true, isActive: true },
          select: 'agencyName profilePicture',
        },
        {
          path: 'propertyType',
          model: 'PropertyType',
          select: 'name',
        },
        {
          path: 'amenities',
          model: 'Amenities',
          select: 'name',
        },
        {
          path: 'developer',
          model: 'Developers',
          select: 'name logo',
          match: { isVerified: true, isActive: true },
        },
      ],
    });

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const saved = (user.savedProperties || []).filter(
    (entry) => entry.property
  );

  let filtered = saved;

  const trimmedSearch =
    typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : '';

  if (trimmedSearch) {
    filtered = saved.filter((entry) => {
      const p = entry.property?.toObject ? entry.property.toObject() : entry.property;
      if (!p) return false;

      const haystack = [
        p.title,
        p.location?.city,
        p.location?.zone,
        p.location?.building,
        p.agent?.fullName,
        p.agency?.agencyName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(trimmedSearch);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;
  const start = (pageNum - 1) * limitNum;
  const paged = filtered.slice(start, start + limitNum);

  const properties = paged.map((entry) => {
    const property = entry.property?.toObject ? entry.property.toObject() : entry.property;
    const {
      viewHistory,
      priceHistory,
      contactCount,
      reportCount,
      isFlagged,
      flaggedReason,
      allocationRef,
      lastContactedAt,
      dealInfo,
      password,
      ...safeProperty
    } = property;

    if (safeProperty.images && Array.isArray(safeProperty.images)) {
      safeProperty.images = safeProperty.images.slice(0, 3);
    }

    // Saved-properties endpoint always contains user's saved listings.
    safeProperty.isSaved = true;
    safeProperty.savedAt = entry.savedAt;

    // Same as property search: rent listings store yearly price on `price`; expose monthly for UI.
    if (safeProperty.listingType?.transaction === 'rent' && typeof safeProperty.price === 'number') {
      safeProperty.rentPricing = {
        yearly: safeProperty.price,
        monthly: Math.round(safeProperty.price / 12),
      };
    } else {
      safeProperty.rentPricing = null;
    }

    return safeProperty;
  });

  const message =
    total === 0
      ? 'No saved properties found'
      : 'Saved properties fetched successfully';

  return success(res, message, {
    properties,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalProperties: total,
      hasNextPage,
      hasPrevPage,
    },
  });
});

/**
 * @swagger
 * /users/saved-properties/add:
 *   post:
 *     summary: Save a property for the authenticated user
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
 *               - propertyId
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: MongoDB ObjectId of the property to save.
 *     responses:
 *       200:
 *         description: Property saved successfully.
 *       400:
 *         description: Validation error or property already saved.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: Property or user not found.
 */
// POST /api/users/saved-properties/add
const saveProperty = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { propertyId } = req.body || {};

  if (!propertyId) {
    return failure(res, 400, 'Property ID is required', 'VALIDATION_ERROR');
  }

  if (!isValidObjectId(propertyId)) {
    return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
  }

  const property = await PropertiesModel.findOne({
    _id: propertyId,
    isActive: true,
    status: 'active',
  }).select('_id');

  if (!property) {
    return failure(
      res,
      404,
      'Property not found or inactive',
      'NOT_FOUND'
    );
  }

  const user = await UsersModel.findById(userId).select('savedProperties');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const alreadySaved =
    user.savedProperties &&
    user.savedProperties.some(
      (entry) =>
        entry.property &&
        entry.property.toString() === propertyId
    );

  if (alreadySaved) {
    // Per requirements: return error 'property.already_saved'
    return failure(
      res,
      400,
      'property.already_saved',
      'property.already_saved'
    );
  }

  user.savedProperties.push({
    property: property._id,
    savedAt: new Date(),
  });

  await user.save();

 
  return success(res, 'property added to saved list successfully');
});

/**
 * @swagger
 * /users/saved-properties/remove/{propertyId}:
 *   delete:
 *     summary: Remove a single saved property
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the property to remove from saved list.
 *     responses:
 *       200:
 *         description: Property removed from saved list.
 *       400:
 *         description: Invalid property ID.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// DELETE /api/users/saved-properties/remove/:propertyId
const unsaveProperty = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const { propertyId } = req.params || {};

  if (!propertyId || !isValidObjectId(propertyId)) {
    return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
  }

  const user = await UsersModel.findById(userId).select('savedProperties');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  const beforeCount = user.savedProperties?.length || 0;

  user.savedProperties = (user.savedProperties || []).filter(
    (entry) =>
      !entry.property ||
      entry.property.toString() !== propertyId
  );

  if ((user.savedProperties?.length || 0) !== beforeCount) {
    await user.save();
  }

 
  return success(res, 'property removed from saved list successfully');
});

/**
 * @swagger
 * /users/saved-properties/remove-all:
 *   delete:
 *     summary: Remove all saved properties for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All saved properties cleared successfully.
 *       401:
 *         description: Authentication required or invalid token.
 *       404:
 *         description: User not found.
 */
// DELETE /api/users/saved-properties/remove-all
const removeAllSaved = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    return failure(res, 401, 'Authentication required');
  }

  const user = await UsersModel.findById(userId).select('savedProperties');

  if (!user) {
    return failure(res, 404, 'User not found');
  }

  if (user.savedProperties && user.savedProperties.length > 0) {
    user.savedProperties = [];
    await user.save();
  }

  return success(res, 'All saved properties removed successfully');
});

module.exports = {
  getSavedProperties,
  saveProperty,
  unsaveProperty,
  removeAllSaved,
};
