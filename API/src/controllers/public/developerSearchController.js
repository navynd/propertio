const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Developers = require('../../models/developersModel');
const Location = require('../../models/locationsModel');
const ListingSearchCity = require('../../models/listingSearchCityModel');
const { success, failure } = require('../../utils/helpers');
const { escapeRegex } = require('../../utils/searchKeyword');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

const { Types } = mongoose;
const buildShareLink = (path, id) => {
  if (!FRONTEND_URL || !id) return null;
  return `${FRONTEND_URL}${path}/${encodeURIComponent(String(id))}`;
};

/**
 * @swagger
 * /developers/search:
 *   get:
 *     summary: Search developers with filters
 *     description: >
 *       Search for active, admin-verified developers by name or location. Results are paginated and ordered by total projects.
 *       Pass `locationId` (ListingSearchCity ObjectId from project-locations master data) to filter developers
 *       that have projects in that city (`projectsByLocation.locationName` matched to displayName / cityKey).
 *       Alternatively, `location` may be the same ObjectId, or free text for legacy name/slug search.
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Developer name (partial match, case-insensitive)
 *         example: "Emaar"
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: >
 *           ListingSearchCity ObjectId (project locations master). Filters developers with at least one
 *           `projectsByLocation` entry whose `locationName` matches that city's display name or cityKey.
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: >
 *           If a valid ObjectId, treated as ListingSearchCity id (same as `locationId`). Otherwise,
 *           city/location free text matched against legacy Location name/slug and `projectsByLocation.locationName`.
 *         example: "Dubai"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of developers returned per page (max 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: Developers fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           logo:
 *                             type: string
 *                             nullable: true
 *                           foundedYear:
 *                             type: integer
 *                             nullable: true
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           totalProjects:
 *                             type: integer
 *                           completedProjects:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
const projectsByLocationClauseFromListingSearchCity = (cityDoc) => {
  const d = escapeRegex(cityDoc.displayName.trim());
  const k = escapeRegex(String(cityDoc.cityKey).trim());
  return {
    $or: [
      { 'projectsByLocation.locationName': { $regex: `^${d}$`, $options: 'i' } },
      { 'projectsByLocation.locationName': { $regex: `^${k}$`, $options: 'i' } },
    ],
  };
};

const searchDevelopers = asyncHandler(async (req, res) => {
  const { name, location, locationId, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true, isVerified: true };

  // Filter by name (partial match, case-insensitive)
  if (name) {
    const nameStr = String(name).trim();
    if (nameStr) {
      filter.name = { $regex: new RegExp(nameStr, 'i') };
    }
  }

  // Master-data location: ListingSearchCity ObjectId (`locationId` takes precedence over `location`)
  const masterLocationId =
    (locationId && String(locationId).trim()) ||
    (location && Types.ObjectId.isValid(String(location).trim()) ? String(location).trim() : '');

  if (masterLocationId) {
    if (!Types.ObjectId.isValid(masterLocationId)) {
      return failure(res, 400, 'Invalid locationId', 'VALIDATION_ERROR');
    }
    const cityDoc = await ListingSearchCity.findById(masterLocationId)
      .select('cityKey displayName')
      .lean();
    if (!cityDoc) {
      return failure(res, 400, 'Invalid location id', 'VALIDATION_ERROR');
    }
    filter.$and = filter.$and || [];
    filter.$and.push(projectsByLocationClauseFromListingSearchCity(cityDoc));
  } else if (location) {
    // Legacy free-text location: Location model + projectsByLocation.locationName
    const locationStr = String(location).trim();
    if (locationStr) {
      const locationDoc = await Location.findOne({
        $or: [
          { name: { $regex: new RegExp(locationStr, 'i') } },
          { slug: { $regex: new RegExp(locationStr, 'i') } },
        ],
        isActive: true,
      });

      const locationFilter = {
        $or: [
          { 'projectsByLocation.locationName': { $regex: new RegExp(locationStr, 'i') } },
        ],
      };

      if (locationDoc) {
        locationFilter.$or.push({ 'projectsByLocation.location': locationDoc._id });
      }

      filter.$and = filter.$and || [];
      filter.$and.push(locationFilter);
    }
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [developers, total] = await Promise.all([
    Developers.find(filter)
      .select('name logo profilePicture foundedYear description shortDescription totalProjects completedProjects')
      .sort({ totalProjects: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Developers.countDocuments(filter)
  ]);

  const items = developers.map(dev => ({
    _id: dev._id,
    name: dev.name,
    logo: dev.logo || dev.profilePicture || 'profileless.png',
    foundedYear: dev.foundedYear,
    description: dev.description || dev.shortDescription || '',
    totalProjects: dev.totalProjects || 0,
    completedProjects: dev.completedProjects || 0
  }));

  return success(res, 'Developers fetched successfully', {
    items,
    pagination: {
      total,
      totalPages: Math.ceil(total / limitNum),
      page: pageNum,
      limit: limitNum
    }
  });
});

/**
 * @swagger
 * /developers/{id}:
 *   get:
 *     summary: Get public developer profile
 *     description: >
 *       Returns full public data for an active, verified developer including projects by location.
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Developer ObjectId
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *     responses:
 *       200:
 *         description: Developer profile fetched successfully
 *       400:
 *         description: Invalid developer ID
 *       404:
 *         description: Developer not found or not verified
 *       500:
 *         description: Server error
 */
const getDeveloperProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid developer ID', 'VALIDATION_ERROR');
  }

  const developer = await Developers.findOne({ _id: id, isActive: true, isVerified: true })
    .select('name logo profilePicture foundedYear shortDescription description longDescription aboutUs email phoneNumber website totalProjects completedProjects ongoingProjects awards projectsByLocation')
    .lean();

  if (!developer) {
    return failure(res, 404, 'Developer not found or not verified', 'NOT_FOUND');
  }

  const profile = {
    _id: developer._id,
    name: developer.name,
    logo: developer.logo || developer.profilePicture || 'profileless.png',
    foundedYear: developer.foundedYear,
    shortDescription: developer.shortDescription,
    description: developer.longDescription || developer.shortDescription,
    aboutUs: developer.aboutUs || developer.longDescription,
    email: developer.email,
    phoneNumber: developer.phoneNumber,
    website: developer.website,
    statistics: {
      totalProjects: developer.totalProjects || 0,
      completedProjects: developer.completedProjects || 0,
      ongoingProjects: developer.ongoingProjects || 0,
      offPlanProjects: developer.offPlanProjects || 0
    },
    awards: developer.awards || [],
    projectsByLocation: developer.projectsByLocation || [],
    shareLink: buildShareLink('/developerdetails', developer._id)
  };

  return success(res, 'Developer profile fetched successfully', profile);
});

module.exports = {
  searchDevelopers,
  getDeveloperProfile
};

