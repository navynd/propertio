const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const { Types } = mongoose;

const Properties = require('../../models/propertiesModal');
const Agents = require('../../models/agentsModel');
const Agencies = require('../../models/agenciesModel');
const ListingSearchCity = require('../../models/listingSearchCityModel');
const ListingType = require('../../models/listingTypeModel');
const Users = require('../../models/usersModel');
const { success, failure } = require('../../utils/helpers');
const { getPropertyPriceInsights } = require('../../services/propertyPriceInsightsService');
const { buildPropertyKeywordOr, escapeRegex } = require('../../utils/searchKeyword');
const { FURNISHED_STATUS, COMPLETION_STATUS, SORT_BY_PROPERTY, VIRTUAL_VIEWING_TYPES, POSTED_BY } = require('../../utils/constants');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

const buildShareLink = (path, id) => {
  if (!FRONTEND_URL || !id) return null;
  return `${FRONTEND_URL}${path}/${encodeURIComponent(String(id))}`;
};

const getAuthUserId = (req = {}) =>
  req?.user?.userId || req?.user?.id || req?.user?._id;

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1) + 'km';
}

async function fetchNearbyPlaces(lat, lng) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const radius = 10000; //10km radius
  const types = [
    { key: 'restaurants', type: 'restaurant' },
    { key: 'schools', type: 'school' },
    { key: 'hospitals', type: 'hospital' },
    { key: 'transport', type: 'transit_station' },
    { key: 'shoppingMalls', type: 'shopping_mall' },
    { key: 'hotels', type: 'lodging' }
  ];

  const results = await Promise.all(
    types.map(async ({ key, type }) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        const places = (data.results || []).slice(0, 3).map(place => ({
          name: place.name,
          vicinity: place.vicinity,
          distance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng)
        }));
        return { key, places };
      } catch {
        return { key, places: [] };
      }
    })
  );

  return results.reduce((acc, { key, places }) => {
    acc[key] = places;
    return acc;
  }, {});
}

// ─── Private Helpers ──────────────────────────────────────

/**
 * Parse bedroom/bathroom filter value
 * Handles: "3", "2-5", "7+"
 * @param {string} value - Query parameter value
 * @returns {Object|null} - MongoDB condition object or null if invalid
 */
const parseBedBathFilter = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();

  // Handle "7+" format
  if (trimmed.endsWith('+')) {
    const num = parseInt(trimmed.slice(0, -1), 10);
    if (!isNaN(num) && num >= 0) {
      return { $gte: num };
    }
    return null;
  }

  // Handle "2-5" range format
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(p => parseInt(p.trim(), 10));
    if (parts.length === 2 && !parts.some(isNaN) && parts[0] >= 0 && parts[1] >= parts[0]) {
      return { $gte: parts[0], $lte: parts[1] };
    }
    return null;
  }

  // Handle single number "3"
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 0) {
    return num;
  }

  return null;
};

/**
 * Parse array parameter from query string
 * Handles both comma-separated string and array
 * @param {string|Array} value - Query parameter value
 * @returns {Array} - Clean array of strings
 */
const parseArrayParam = (value) => {
  if (!value) return [];
  
  if (Array.isArray(value)) {
    return value.filter(v => v && typeof v === 'string' && v.trim());
  }
  
  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim()).filter(v => v);
  }
  
  return [];
};

/**
 * Validate ObjectId string
 * @param {string} id - ObjectId string to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return Types.ObjectId.isValid(id);
};

// ─── Controller ───────────────────────────────────────────

/**
 * @swagger
 * /properties/search:
 *   post:
 *     summary: Search properties with advanced filters
 *     description: >
 *       Search for active properties with comprehensive filtering options including location,
 *       optional unified `keyword` across title, description, slug, and location text fields,
 *       listing title (name) via `propertyName`, location via `location` (ListingSearchCity ObjectId
 *       from master data or legacy free text in city/zone/building). `keyword`, `location`, and
 *       `propertyName` may be combined (AND), plus property type,
 *       bedrooms, bathrooms, price range, area, amenities,
 *       furnished status, completion status, and more. Returns paginated results with sorting options.
 *       When a Bearer token is provided (optional authentication), each result also includes
 *       an `isSaved` flag indicating whether the property is in the authenticated user's saved list.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               listingType:
 *                 type: string
 *                 description: >
 *                   ListingType ObjectId.
 *                   Required unless `isCommercial` is true, in which case the API
 *                   will automatically use the active commercial rent listing type.
 *               keyword:
 *                 type: string
 *                 description: >
 *                   Unified free-text search (case-insensitive partial match) across title,
 *                   description, slug, fullAddress, city, zone, and building. Can be combined with
 *                   `location` (city id or text) and `propertyName`.
 *               location:
 *                 type: string
 *                 description: >
 *                   ListingSearchCity ObjectId (from property-locations master data) filters by
 *                   `location.city` (exact match vs displayName/cityKey, case-insensitive), or
 *                   legacy free-text partial match on city, zone, or building.
 *               propertyName:
 *                 type: string
 *                 description: Partial match on listing title only; can be combined with `keyword` and `location`.
 *               propertyType:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: PropertyType ObjectId(s)
 *               agentId:
 *                 type: string
 *                 description: >
 *                   Agent ObjectId. When provided, results are restricted to properties listed by this agent only.
 *               agencyId:
 *                 type: string
 *                 description: >
 *                   Agency ObjectId. When provided, results are restricted to properties listed under this agency only.
 *               bedrooms:
 *                 type: string
 *                 description: Bedroom filter - "3", "2-4", or "7+"
 *               bathrooms:
 *                 type: string
 *                 description: Bathroom filter - "3", "2-4", or "7+"
 *               priceMin:
 *                 type: number
 *                 description: Minimum price
 *               priceMax:
 *                 type: number
 *                 description: Maximum price
 *               areaMin:
 *                 type: number
 *                 description: Minimum area in sqft
 *               areaMax:
 *                 type: number
 *                 description: Maximum area in sqft
 *               nearLat:
 *                 type: number
 *                 format: float
 *                 description: Latitude for nearby search (used with nearLng and nearRadiusKm)
 *               nearLng:
 *                 type: number
 *                 format: float
 *                 description: Longitude for nearby search (used with nearLat and nearRadiusKm)
 *               nearRadiusKm:
 *                 type: number
 *                 format: float
 *                 default: 5
 *                 description: Search radius in kilometers around the given lat/lng
 *               amenities:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: Amenity ObjectId(s)
 *               furnished:
 *                 type: string
 *                 enum: [fully, partially, unfurnished, any]
 *                 description: Furnished status filter
 *               completionStatus:
 *                 type: string
 *                 enum: [off-plan, ready, any]
 *                 description: Completion status filter - "off-plan", "ready", or "any" for all
 *               petFriendly:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter pet-friendly properties
 *               waterfront:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter waterfront properties
 *               isFeatured:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter featured properties
 *               isVerified:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter verified properties only
 *               postedBy:
 *                 type: string
 *                 enum: [agent, superagent]
 *                 description: Filter by posted by - "agent" for agent listings, "superagent" for super agent listings
 *               virtualViewing:
 *                 type: string
 *                 enum: [360-tour, video-tour, all]
 *                 description: Filter by virtual viewing type - "360-tour" for 360° tour, "video-tour" for video tour, "any" for either
 *               sortBy:
 *                 type: string
 *                 enum: [featured, newest, price-high, price-low, beds-least, beds-most]
 *                 default: featured
 *                 description: Sort order
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Page number
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 20
 *                 description: Items per page
 *               isCommercial:
 *                 type: boolean
 *                 default: false
 *                 description: >
 *                   If true (and listingType is not provided), searches only commercial rent
 *                   properties by automatically selecting the commercial rent ListingType.
 *               clearAll:
 *                 type: boolean
 *                 default: false
 *                 description: If true, clears all optional filters except listingType (required)
 *     responses:
 *       200:
 *         description: Properties fetched successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const searchProperties = asyncHandler(async (req, res) => {
  try {
    const {
      listingType,
      keyword,
      location,
      propertyName,
      propertyType,
      agentId,
      agencyId,
      nearLat,
      nearLng,
      nearRadiusKm,
      bedrooms,
      bathrooms,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      amenities,
      furnished,
      completionStatus,
      petFriendly,
      waterfront,
      isFeatured,
      isVerified,
      postedBy,
      virtualViewing,
      sortBy,
      page = 1,
      limit = 20,
      clearAll = false,
      isCommercial
    } = req.body;

    // Resolve listingType: either use provided listingType or derive from isCommercial
    let effectiveListingType = listingType;

    if (!effectiveListingType && (isCommercial === true || isCommercial === 'true')) {
      const commercialListingType = await ListingType.findOne({
        isActive: true,
        category: 'commercial',
        transaction: 'rent',
      }).select('_id');

      if (!commercialListingType) {
        return failure(res, 400, 'Commercial rent listing type not configured', 'VALIDATION_ERROR');
      }

      effectiveListingType = commercialListingType._id.toString();
    }

    // Step 1: Validate listingType (required)
    if (!effectiveListingType) {
      return failure(res, 400, 'listingType is required', 'VALIDATION_ERROR');
    }

    if (!isValidObjectId(effectiveListingType)) {
      return failure(res, 400, 'Invalid listingType ObjectId', 'VALIDATION_ERROR');
    }

    // Step 2: Build base query
    const query = {
      status: 'active',
      listingType: new Types.ObjectId(effectiveListingType)
    };

    // Track applied filters for response
    const appliedFilters = {
      listingType: effectiveListingType
    };

    // Prepare sortBy value (can be overridden when clearAll is true)
    let sortByValue = sortBy || 'featured';

    // Step 3: Apply optional filters
    // If clearAll is true, skip all optional filters and only keep listingType
    if (clearAll) {
      // Only apply listingType and status, skip all other filters
      // Reset sortBy to default
      sortByValue = 'featured';
    } else {

    // Agent filter (only verified, active agents are publicly searchable by id)
    if (agentId) {
      if (!isValidObjectId(agentId)) {
        return failure(res, 400, 'Invalid agentId ObjectId', 'VALIDATION_ERROR');
      }
      const publicAgent = await Agents.exists({
        _id: new Types.ObjectId(agentId),
        isActive: true,
        isVerified: true,
      });
      if (!publicAgent) {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
      }
      query.agent = new Types.ObjectId(agentId);
      appliedFilters.agentId = agentId;
    }

    // Agency filter (public: verified active agencies only)
    if (agencyId) {
      if (!isValidObjectId(agencyId)) {
        return failure(res, 400, 'Invalid agencyId ObjectId', 'VALIDATION_ERROR');
      }
      const publicAgency = await Agencies.exists({
        _id: new Types.ObjectId(agencyId),
        isActive: true,
        isVerified: true,
      });
      if (!publicAgency) {
        return failure(res, 404, 'Agency not found', 'NOT_FOUND');
      }
      query.agency = new Types.ObjectId(agencyId);
      appliedFilters.agencyId = agencyId;
    }

    // Keyword + location (master-data id or text) + title — combined with $and when multiple apply
    const trimmedKeyword =
      typeof keyword === 'string' && keyword.trim() ? keyword.trim() : '';

    let locationFilter = null;
    if (location !== undefined && location !== null && String(location).trim() !== '') {
      const locStr = String(location).trim();
      if (isValidObjectId(locStr)) {
        const cityDoc = await ListingSearchCity.findById(locStr).select('cityKey displayName').lean();
        if (!cityDoc) {
          return failure(res, 400, 'Invalid location id', 'VALIDATION_ERROR');
        }
        appliedFilters.locationId = locStr;
        const d = escapeRegex(cityDoc.displayName.trim());
        const k = escapeRegex(String(cityDoc.cityKey).trim());
        locationFilter = {
          $or: [
            { 'location.city': { $regex: `^${d}$`, $options: 'i' } },
            { 'location.city': { $regex: `^${k}$`, $options: 'i' } },
          ],
        };
      } else {
        appliedFilters.location = locStr;
        locationFilter = {
          $or: [
            { 'location.city': { $regex: locStr, $options: 'i' } },
            { 'location.zone': { $regex: locStr, $options: 'i' } },
            { 'location.building': { $regex: locStr, $options: 'i' } },
          ],
        };
      }
    }

    const keywordFilter = trimmedKeyword ? buildPropertyKeywordOr(trimmedKeyword) : null;
    if (trimmedKeyword && keywordFilter) {
      appliedFilters.keyword = trimmedKeyword;
    }

    let titleCond = null;
    if (propertyName && typeof propertyName === 'string' && propertyName.trim()) {
      const trimmedName = propertyName.trim();
      titleCond = { title: { $regex: trimmedName, $options: 'i' } };
      appliedFilters.propertyName = trimmedName;
    }

    const textClauses = [];
    if (keywordFilter) textClauses.push({ $or: keywordFilter.$or });
    if (locationFilter) textClauses.push(locationFilter);
    if (titleCond) textClauses.push(titleCond);

    if (textClauses.length === 1) {
      Object.assign(query, textClauses[0]);
    } else if (textClauses.length > 1) {
      query.$and = textClauses;
    }

    // Nearby (geo) filter – requires valid lat, lng, and optional radius
    // NOTE:
    // - `$near`/`$nearSphere` cannot be used inside aggregation `$match` context.
    // - This endpoint builds an aggregation pipeline, so use `$geoWithin` + `$centerSphere`
    //   to keep nearby filtering compatible.
    const parsedLat = nearLat !== undefined ? parseFloat(nearLat) : null;
    const parsedLng = nearLng !== undefined ? parseFloat(nearLng) : null;
    const parsedRadiusKm =
      nearRadiusKm !== undefined ? parseFloat(nearRadiusKm) : 5; // default 5km

    if (parsedLat !== null && !isNaN(parsedLat) &&
        parsedLng !== null && !isNaN(parsedLng)) {
      if (
        parsedLat >= -90 && parsedLat <= 90 &&
        parsedLng >= -180 && parsedLng <= 180 &&
        !isNaN(parsedRadiusKm) && parsedRadiusKm > 0
      ) {
        const radiusInRadians = parsedRadiusKm / 6378.1; // Earth radius in km
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[parsedLng, parsedLat], radiusInRadians],
          },
        };
        appliedFilters.nearby = {
          lat: parsedLat,
          lng: parsedLng,
          radiusKm: parsedRadiusKm,
        };
      }
    }

    // PropertyType filter
    if (propertyType) {
      const propertyTypeArray = parseArrayParam(propertyType);
      if (propertyTypeArray.length > 0) {
        const validIds = propertyTypeArray.filter(id => isValidObjectId(id));
        if (validIds.length > 0) {
          if (validIds.length === 1) {
            query.propertyType = new Types.ObjectId(validIds[0]);
            appliedFilters.propertyType = validIds[0];
          } else {
            query.propertyType = { $in: validIds.map(id => new Types.ObjectId(id)) };
            appliedFilters.propertyType = validIds;
          }
        }
      }
    }

    // Bedrooms filter
    if (bedrooms) {
      const bedroomsCondition = parseBedBathFilter(bedrooms);
      if (bedroomsCondition !== null) {
        if (typeof bedroomsCondition === 'number') {
          query.bedrooms = bedroomsCondition;
        } else {
          query.bedrooms = bedroomsCondition;
        }
        appliedFilters.bedrooms = bedrooms;
      }
    }

    // Bathrooms filter
    if (bathrooms) {
      const bathroomsCondition = parseBedBathFilter(bathrooms);
      if (bathroomsCondition !== null) {
        if (typeof bathroomsCondition === 'number') {
          query.bathrooms = bathroomsCondition;
        } else {
          query.bathrooms = bathroomsCondition;
        }
        appliedFilters.bathrooms = bathrooms;
      }
    }

    // Price range filter
    if (priceMin !== undefined || priceMax !== undefined) {
      query.price = {};
      if (priceMin !== undefined) {
        const min = parseFloat(priceMin);
        if (!isNaN(min) && min >= 0) {
          query.price.$gte = min;
          appliedFilters.priceRange = { ...(appliedFilters.priceRange || {}), min };
        }
      }
      if (priceMax !== undefined) {
        const max = parseFloat(priceMax);
        if (!isNaN(max) && max >= 0) {
          query.price.$lte = max;
          appliedFilters.priceRange = { ...(appliedFilters.priceRange || {}), max };
        }
      }
      if (Object.keys(query.price).length === 0) {
        delete query.price;
      }
    }

    // Area range filter (sqft)
    if (areaMin !== undefined || areaMax !== undefined) {
      query['area.sqft'] = {};
      if (areaMin !== undefined) {
        const min = parseFloat(areaMin);
        if (!isNaN(min) && min >= 0) {
          query['area.sqft'].$gte = min;
          appliedFilters.areaRange = { ...(appliedFilters.areaRange || {}), min };
        }
      }
      if (areaMax !== undefined) {
        const max = parseFloat(areaMax);
        if (!isNaN(max) && max >= 0) {
          query['area.sqft'].$lte = max;
          appliedFilters.areaRange = { ...(appliedFilters.areaRange || {}), max };
        }
      }
      if (Object.keys(query['area.sqft']).length === 0) {
        delete query['area.sqft'];
      }
    }

    // Amenities filter (must have ALL selected amenities)
    if (amenities) {
      const amenitiesArray = parseArrayParam(amenities);
      if (amenitiesArray.length > 0) {
        const validIds = amenitiesArray.filter(id => isValidObjectId(id));
        if (validIds.length > 0) {
          query.amenities = { $all: validIds.map(id => new Types.ObjectId(id)) };
          appliedFilters.amenities = validIds.length === 1 ? validIds[0] : validIds;
        }
      }
    }

    // Furnished status filter
    if (furnished && FURNISHED_STATUS.some(status => status.value === furnished)) {
      query.furnishedStatus = furnished;
      appliedFilters.furnished = furnished;
    }

    // Completion status filter
    // Only apply filter if value is 'off-plan' or 'ready', skip if 'any' or undefined
    if (completionStatus && completionStatus !== 'any' && COMPLETION_STATUS.some(status => status.value === completionStatus)) {
      query.completionStatus = completionStatus;
      appliedFilters.completionStatus = completionStatus;
    }

    // Pet friendly filter
    if (petFriendly === 'true') {
      query.isPetFriendly = true;
      appliedFilters.petFriendly = true;
    }

    // Waterfront filter
    if (waterfront === 'true') {
      query.isWaterfront = true;
      appliedFilters.waterfront = true;
    }

    // Featured filter
    if (isFeatured === 'true') {
      query.isFeatured = true;
      appliedFilters.isFeatured = true;
    }

    // Verified filter
    if (isVerified === 'true') {
      query.isVerified = true;
      appliedFilters.isVerified = true;
    }

    // Posted by filter (agent | superagent)
    if (postedBy && POSTED_BY.some(p => p.value === postedBy)) {
      query.isSuperagentListing = postedBy === 'superagent';
      appliedFilters.postedBy = postedBy;
    }

    // Virtual viewing filter
    if (virtualViewing) {
      if (virtualViewing === '360-tour') {
        query.virtualTour360 = { $exists: true, $ne: null, $ne: '' };
        appliedFilters.virtualViewing = '360-tour';
      } else if (virtualViewing === 'video-tour') {
        query.videoTour = { $exists: true, $ne: null, $ne: '' };
        appliedFilters.virtualViewing = 'video-tour';
      } else if (virtualViewing === 'all') {
        // Properties that have either 360 tour OR video tour
        const viewingOrClause = {
          $or: [
            { virtualTour360: { $exists: true, $ne: null, $ne: '' } },
            { videoTour: { $exists: true, $ne: null, $ne: '' } }
          ]
        };
        if (query.$or) {
          query.$and = [{ $or: query.$or }, viewingOrClause];
          delete query.$or;
        } else if (query.$and) {
          query.$and.push(viewingOrClause);
        } else {
          query.$or = viewingOrClause.$or;
        }
        appliedFilters.virtualViewing = 'all';
      }
    }
    } // End of clearAll else block - only apply filters if clearAll is false

    // Step 4: Build sort object
    let sortObj = {};
    switch (sortByValue) {
      case 'featured':
        sortObj = { 'featured.priority': -1, isFeatured: -1, publishedAt: -1 };
        break;
      case 'newest':
        sortObj = { publishedAt: -1 };
        break;
      case 'price-high':
        sortObj = { price: -1 };
        break;
      case 'price-low':
        sortObj = { price: 1 };
        break;
      case 'beds-least':
        sortObj = { bedrooms: 1 };
        break;
      case 'beds-most':
        sortObj = { bedrooms: -1 };
        break;
      default:
        sortObj = { 'featured.priority': -1, isFeatured: -1, publishedAt: -1 };
    }
    appliedFilters.sortBy = sortByValue;

    // Step 5: Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Step 6: Run query with parallel execution
    const [properties, totalProperties] = await Promise.all([
      Properties.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'listingType',
          model: 'ListingType',
          select: 'name slug transaction category'
        })
        .populate({
          path: 'agent',
          model: 'Agents',
          match: { isVerified: true, isActive: true },
          select: 'fullName profilePicture phoneNumber email  agentType ratings.average ratings.totalCount brokerLicenseNumber',
          populate: {
            path: 'languages',
            model: 'Languages',
            select: 'name code nativeName',
          }
        })
        .populate({
          path: 'agency',
          model: 'Agencies',
          match: { isVerified: true, isActive: true },
          select: 'agencyName profilePicture',
        })
        .populate({
          path: 'propertyType',
          model: 'PropertyType',
          select: 'name'
        })
        .populate({
          path: 'amenities',
          model: 'Amenities',
          select: 'name'
        })
        .populate({
          path: 'developer',
          model: 'Developers',
          select: 'name logo',
          match: { isVerified: true, isActive: true },
        })
        .lean(),
      Properties.countDocuments(query)
    ]);

    // Step 6.1: Determine which properties are saved by the authenticated user (if any)
    let savedPropertyIdsSet = null;
    try {
      const authUserId = getAuthUserId(req);
      if (authUserId) {
        const userWithSaved = await Users.findById(authUserId)
          .select('savedProperties.property')
          .lean();

        if (userWithSaved && Array.isArray(userWithSaved.savedProperties)) {
          savedPropertyIdsSet = new Set(
            userWithSaved.savedProperties
              .filter(entry => entry.property)
              .map(entry => entry.property.toString())
          );
        }
      }
    } catch {
      savedPropertyIdsSet = null;
    }

    // Step 7 & 8: Map response - slice images to first 3 and remove sensitive fields
    const mappedProperties = properties.map(property => {
      const { viewHistory, priceHistory, contactCount, reportCount, isFlagged, ...safeProperty } = property;
      
      // Slice images to first 3
      if (safeProperty.images && Array.isArray(safeProperty.images)) {
        safeProperty.imagesCount = safeProperty.images.length;
        safeProperty.images = safeProperty.images.slice(0, 3);
      } else {
        safeProperty.imagesCount = 0;
      }

      // Rent pricing: store price as yearly and compute monthly
      if (safeProperty.listingType?.transaction === 'rent' && typeof safeProperty.price === 'number') {
        safeProperty.rentPricing = {
          yearly: safeProperty.price,
          monthly: Math.round(safeProperty.price / 12)
        };
      } else {
        safeProperty.rentPricing = null;
      }

      // Ensure publishedAt is always present in the mapped payload
      if (!safeProperty.publishedAt && property.publishedAt) {
        safeProperty.publishedAt = property.publishedAt;
      }

      // Mark whether this property is saved by the authenticated user
      const propertyIdStr = (safeProperty._id || property._id).toString();
      safeProperty.isSaved = savedPropertyIdsSet ? savedPropertyIdsSet.has(propertyIdStr) : false;

      safeProperty.shareLink = buildShareLink('/propertydrilldown', safeProperty._id);

      return safeProperty;
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalProperties / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Step 9: Return response
    const message = totalProperties === 0 
      ? 'No properties found matching your criteria'
      : 'Properties fetched successfully';

    return success(res, message, {
      properties: mappedProperties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalProperties,
        hasNextPage,
        hasPrevPage
      },
      appliedFilters
    });

  } catch (error) {
    // Handle ObjectId conversion errors
    if (error.name === 'CastError' || error.message.includes('ObjectId')) {
      return failure(res, 400, 'Invalid ObjectId format', 'VALIDATION_ERROR');
    }

    // Log error for debugging (in development)
    console.error('Property search error:', error);
    
    return failure(res, 500, 'Internal server error', 'SERVER_ERROR', 
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get single property by ID or slug with related properties and nearby places
 *     description: >
 *       Retrieves a single property by MongoDB ObjectId or slug. Returns full property details
 *       with all populated references (agent, agency, propertyType, amenities, developer, location).
 *       Also returns up to 6 related properties based on similar listing type, property type,
 *       location, and price range, and nearby places (restaurants, schools, hospitals, transport,
 *       shopping malls, hotels) around the property's coordinates when available.
 *       Automatically increments view count.
 *       Optional Bearer authentication is supported and used only to derive
 *       user-based defaults (e.g. mortgage residency) without being required.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property MongoDB ObjectId or slug (e.g., "65f12f0f9a9b9c0a1b2c3d4e" or "omniyat-bespoke-villa-palm-jumeirah")
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *     responses:
 *       200:
 *         description: Property fetched successfully with related properties and nearby places
 *       400:
 *         description: Invalid property ID or slug
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */

const RELATED_PROPERTIES_SELECT =
  'title slug price currency bedrooms bathrooms area location.fullAddress location.city location.zone images isFeatured isVerified isSuperagentListing completionStatus furnishedStatus views publishedAt propertyType';

const RELATED_PROPERTIES_POPULATE = {
  path: 'propertyType',
  model: 'PropertyType',
  select: 'name',
};

const toObjectId = (id) => {
  if (!id) return null;
  if (id instanceof Types.ObjectId) return id;
  if (Types.ObjectId.isValid(id)) return new Types.ObjectId(id);
  return null;
};

const buildRelatedLocationOr = (location) => {
  const conditions = [];
  const city = location?.city?.trim();
  const zone = location?.zone?.trim();
  if (city) {
    conditions.push({
      'location.city': new RegExp(`^${escapeRegex(city)}$`, 'i'),
    });
  }
  if (zone) {
    conditions.push({
      'location.zone': new RegExp(`^${escapeRegex(zone)}$`, 'i'),
    });
  }
  return conditions.length ? { $or: conditions } : null;
};

/**
 * Related listings with progressive relax — strict match often returns 0 rows.
 */
const fetchRelatedProperties = async (property, limit = 6) => {
  const propertyId = property._id;
  const listingTypeId = toObjectId(
    property.listingType?._id || property.listingType,
  );
  const propertyTypeId = toObjectId(
    property.propertyType?._id || property.propertyType,
  );
  const locationOr = buildRelatedLocationOr(property.location);
  const price = Number(property.price);
  const hasPrice = Number.isFinite(price) && price > 0;

  const base = {
    status: 'active',
    isActive: true,
  };

  const runQuery = (extra, take, excludeIds) =>
    Properties.find({
      ...base,
      ...extra,
      _id: { $nin: [propertyId, ...excludeIds] },
    })
      .select(RELATED_PROPERTIES_SELECT)
      .populate(RELATED_PROPERTIES_POPULATE)
      .sort({ isFeatured: -1, publishedAt: -1 })
      .limit(take)
      .lean();

  const collected = [];
  const exclude = [];

  const tiers = [];

  if (listingTypeId) {
    const strict = { listingType: listingTypeId };
    if (propertyTypeId) strict.propertyType = propertyTypeId;
    if (locationOr) Object.assign(strict, locationOr);
    if (hasPrice) {
      strict.price = { $gte: price * 0.7, $lte: price * 1.3 };
    }
    tiers.push(strict);

    const noPrice = { listingType: listingTypeId };
    if (propertyTypeId) noPrice.propertyType = propertyTypeId;
    if (locationOr) Object.assign(noPrice, locationOr);
    tiers.push(noPrice);

    const typeAndPlace = { listingType: listingTypeId };
    if (locationOr) Object.assign(typeAndPlace, locationOr);
    tiers.push(typeAndPlace);

    tiers.push({ listingType: listingTypeId });
  }

  if (locationOr) {
    tiers.push(locationOr);
  }

  tiers.push({});

  for (const tier of tiers) {
    if (collected.length >= limit) break;
    const batch = await runQuery(tier, limit - collected.length, exclude);
    for (const doc of batch) {
      const idStr = doc._id.toString();
      if (collected.some((p) => p._id.toString() === idStr)) continue;
      collected.push(doc);
      exclude.push(doc._id);
    }
  }

  return collected.slice(0, limit);
};

const getPropertyById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Build query (ObjectId or slug)
    let query = { status: 'active' };

    if (Types.ObjectId.isValid(id)) {
      query._id = new Types.ObjectId(id);
    } else {
      query.slug = id;
    }

    // Step 2: Find property with all populates
    const property = await Properties.findOne(query)
      .populate({
        path: 'listingType',
        model: 'ListingType',
        select: 'name slug transaction category'
      })
      .populate({
        path: 'agent',
        model: 'Agents',
        match: { isVerified: true, isActive: true },
        select: 'fullName profilePicture email phoneNumber agentType brokerLicenseNumber ratings.average ratings.totalCount responseTime statistics.dealsClosedSales statistics.dealsClosedRent statistics.totalListings statistics.activeListings languages agency',
        populate: {
          path: 'languages',
          model: 'Languages',
          select: 'name code nativeName',
        },
      })
      .populate({
        path: 'agency',
        model: 'Agencies',
        match: { isVerified: true, isActive: true },
        select: 'agencyName profilePicture phoneNumber email statistics.totalActiveListings isVerified',
      })
      .populate({
        path: 'propertyType',
        model: 'PropertyType',
        select: 'name'
      })
      .populate({
        path: 'amenities',
        model: 'Amenities',
        select: 'name icon image category'
      })
      .populate({
        path: 'developer',
        model: 'Developers',
        select: 'name logo',
        match: { isVerified: true, isActive: true },
      })
      .lean();

    // Step 3: 404 if not found
    if (!property) {
      return failure(res, 404, 'Property not found', 'NOT_FOUND');
    }

    // Required agent/agency must pass public verified rules; optional developer is omitted if unverified
    const listingRefs = await Properties.findById(property._id).select('agent agency developer').lean();
    if (listingRefs?.agent && !property.agent) {
      return failure(res, 404, 'Property not found', 'NOT_FOUND');
    }
    if (listingRefs?.agency && !property.agency) {
      return failure(res, 404, 'Property not found', 'NOT_FOUND');
    }

    // Step 4: Fire-and-forget view increment
    Properties.findByIdAndUpdate(property._id, { $inc: { views: 1 } }).exec().catch(() => {
      // Silently fail - don't block response
    });

    // Step 5: Determine default residency status for mortgage calculator
    let residencyStatus = 'uae-resident';

    try {
      const userId = req.user?.id || req.user?._id;
      if (userId) {
        const user = await Users.findById(userId)
          .populate('country', 'code')
          .lean();

        if (user && user.country) {
          const countryCode = (user.country.code || '').toUpperCase();

          if (countryCode === 'AE') {
            residencyStatus = 'uae-national';
          } else {
            residencyStatus = 'non-resident';
          }
        }
      }
    } catch {
      // If anything goes wrong, keep default 'uae-resident'
      residencyStatus = 'uae-resident';
    }

    const getMinDownPct = (status, price) => {
      if (!price || price <= 0) return 0;
      if (status === 'uae-national') return price <= 5000000 ? 15 : 30;
      if (status === 'uae-resident') return price <= 5000000 ? 20 : 30;
      if (status === 'non-resident') return 25;
      return 0;
    };

    const coords = property.location?.coordinates?.coordinates;
    const hasCoords = coords && coords.length === 2;

    const [relatedProperties, nearbyPlaces, areaPropertiesCount, agentListingsCount] = await Promise.all([
      fetchRelatedProperties(property, 6),
      hasCoords
        ? fetchNearbyPlaces(coords[1], coords[0])
        : Promise.resolve({}),
      Properties.countDocuments({
        'location.zone': property.location?.zone,
        status: 'active',
        isActive: true,
        _id: { $ne: property._id }
      }),
      Properties.countDocuments({
        agent: property.agent?._id || property.agent,
        status: 'active',
        isActive: true,
        _id: { $ne: property._id }
      })
    ]);

    // Step 6.1: Determine if this property is saved by the authenticated user (if any)
    let isSaved = false;
    try {
      const authUserId = getAuthUserId(req);
      if (authUserId) {
        const userWithSaved = await Users.findById(authUserId)
          .select('savedProperties.property')
          .lean();

        if (userWithSaved && Array.isArray(userWithSaved.savedProperties)) {
          isSaved = userWithSaved.savedProperties.some(
            (entry) =>
              entry.property &&
              entry.property.toString() === property._id.toString()
          );
        }
      }
    } catch {
      isSaved = false;
    }

    // Step 7: Build clean response objects

    // Build agent response
    let agentResponse = null;
    if (property.agent) {
      const closedDeals = (property.agent.statistics?.dealsClosedSales || 0) + 
                         (property.agent.statistics?.dealsClosedRent || 0);
      
      agentResponse = {
        _id: property.agent._id,
        fullName: property.agent.fullName,
        email: property.agent.email,
        phoneNumber: property.agent.phoneNumber,
        profilePicture: property.agent.profilePicture,
        agentType: property.agent.agentType,
        brokerLicenseNumber: property.agent.brokerLicenseNumber || null,
        ratings: {
          average: property.agent.ratings?.average || 0,
          totalCount: property.agent.ratings?.totalCount || 0
        },
        responseTime: property.agent.responseTime,
        closedDeals,
        statistics: {
          totalListings: property.agent.statistics?.totalListings || 0,
          activeListings: property.agent.statistics?.activeListings || 0
        },
        languages: property.agent.languages || [],
        agency: property.agent.agency // ObjectId for frontend linking
      };
    }

    // Build agency response
    let agencyResponse = null;
    if (property.agency) {
      agencyResponse = {
        _id: property.agency._id,
        agencyName: property.agency.agencyName,
        profilePicture: property.agency.profilePicture,
        phoneNumber: property.agency.phoneNumber,
        email: property.agency.email,
        statistics: {
          totalActiveListings: property.agency.statistics?.totalActiveListings || 0
        },
        isVerified: property.agency.isVerified || false
      };
    }

    // Build property response (exclude sensitive fields)
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

    // Build final property object with all required fields
    const propertyResponse = {
      _id: safeProperty._id,
      title: safeProperty.title,
      slug: safeProperty.slug,
      description: safeProperty.description,
      listingType: safeProperty.listingType,
      completionStatus: safeProperty.completionStatus,
      furnishedStatus: safeProperty.furnishedStatus,
      status: safeProperty.status,
      publishedAt: safeProperty.publishedAt,
      lastModifiedAt: safeProperty.lastModifiedAt,
      price: safeProperty.price,
      currency: safeProperty.currency,
      rentPricing:
        safeProperty.listingType?.transaction === 'rent' && typeof safeProperty.price === 'number'
          ? {
              yearly: safeProperty.price,
              monthly: Math.round(safeProperty.price / 12)
            }
          : null,
      maintenanceFees: safeProperty.maintenanceFees,
      serviceCharges: safeProperty.serviceCharges,
      bedrooms: safeProperty.bedrooms,
      bathrooms: safeProperty.bathrooms,
      maidBedroom: safeProperty.maidBedroom,
      area: {
        sqm: safeProperty.area?.sqm,
        sqft: safeProperty.area?.sqft
      },
      images: safeProperty.images || [],
      virtualTour360: safeProperty.virtualTour360,
      videoTour: safeProperty.videoTour,
      floorPlan: safeProperty.floorPlan || [],
      location: {
        fullAddress: safeProperty.location?.fullAddress,
        city: safeProperty.location?.city,
        zone: safeProperty.location?.zone,
        building: safeProperty.location?.building,
        coordinates: safeProperty.location?.coordinates,
        googlePlaceId: safeProperty.location?.googlePlaceId
      },
      amenities: safeProperty.amenities || [],
      isFeatured: safeProperty.isFeatured,
      isVerified: safeProperty.isVerified,
      isSuperagentListing: safeProperty.isSuperagentListing,
      isPetFriendly: safeProperty.isPetFriendly,
      isWaterfront: safeProperty.isWaterfront,
      regulatoryInformation: {
        referenceId: safeProperty.referenceId || null,
        agencyName: agencyResponse?.agencyName || null,
        brokerLicenseNumber: agentResponse?.brokerLicenseNumber || null,
        zoneName: safeProperty.location?.zone || null,
        dldPermitNumber: safeProperty.dldPermitNumber || null,
        dldPermitUrl: safeProperty.dldPermitUrl || null
      },
      views: safeProperty.views || 0,
      likes: safeProperty.likes || 0,
      inquiries: safeProperty.inquiries || 0,
      agent: agentResponse,
      agency: agencyResponse,
      propertyType: property.propertyType ? {
        _id: property.propertyType._id,
        name: property.propertyType.name
      } : null,
      developer: property.developer ? {
        _id: property.developer._id,
        name: property.developer.name,
        logo: property.developer.logo
      } : null,
      areaPropertiesCount: areaPropertiesCount || 0,
      // agentListingsCount: agentListingsCount || 0,
      isSaved,
      shareLink: buildShareLink('/propertydrilldown', safeProperty._id)
    };

    // Mortgage calculator defaults based on property price and user residency
    let mortgageCalculatorDefaults = null;
    const purchasePrice = typeof safeProperty.price === 'number' ? safeProperty.price : null;

    if (purchasePrice && purchasePrice > 0) {
      const minDownPaymentPct = getMinDownPct(residencyStatus, purchasePrice);
      const downPayment = Math.round(purchasePrice * (minDownPaymentPct / 100));
      const downPaymentPct = minDownPaymentPct;
      const loanAmount = purchasePrice - downPayment;
      const loanAmountPct = 100 - downPaymentPct;
      const loanPeriod = 25;
      const interestRate = 3.75;

      mortgageCalculatorDefaults = {
        purchasePrice,
        residencyStatus,
        downPayment,
        downPaymentPct,
        loanAmount,
        loanAmountPct,
        loanPeriod,
        interestRate,
      };
    }

    // Process related properties - slice images to first 3
    const relatedPropertiesResponse = (relatedProperties || []).map(relProp => {
      const { images, ...rest } = relProp;
      return {
        ...rest,
        imagesCount: Array.isArray(images) ? images.length : 0,
        images: images ? images.slice(0, 3) : []
      };
    });

    // Step 8: Return response
    return success(res, 'Property fetched successfully', {
      property: propertyResponse,
      relatedProperties: relatedPropertiesResponse,
      nearbyPlaces: nearbyPlaces || {},
      mortgageCalculatorDefaults,
      priceInsights:null,
      priceTrends:null
    });

  } catch (error) {
    // Handle CastError (invalid ObjectId) → 400
    if (error.name === 'CastError' || error.message.includes('ObjectId')) {
      return failure(res, 400, 'Invalid property ID or slug', 'VALIDATION_ERROR');
    }

    // Log error for debugging (in development)
    console.error('Get property by ID error:', error);
    
    return failure(res, 500, 'Internal server error', 'SERVER_ERROR', 
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

/**
 * @openapi
 * /properties/price-insights/{id}:
 *   get:
 *     tags: [Public]
 *     summary: Price insights for a property (sold, rent, trends)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property MongoDB ObjectId or slug
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Max rows per sold/rent tab
 *     responses:
 *       200:
 *         description: Price insights fetched
 *       404:
 *         description: Property not found
 */
const getPropertyPriceInsightsById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit;

    const data = await getPropertyPriceInsights(id, { limit });
    if (!data) {
      return failure(res, 404, 'Property not found', 'NOT_FOUND');
    }

    return success(res, 'Price insights fetched successfully', data);
  } catch (error) {
    if (error.name === 'CastError' || error.message?.includes('ObjectId')) {
      return failure(res, 400, 'Invalid property ID or slug', 'VALIDATION_ERROR');
    }
    console.error('Get property price insights error:', error);
    return failure(
      res,
      500,
      'Internal server error',
      'SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined,
    );
  }
});

// ─── Exports ──────────────────────────────────────────────
module.exports = {
  searchProperties,
  getPropertyById,
  getPropertyPriceInsightsById,
};

