const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const { Types } = mongoose;

const Newprojects = require('../../models/newprojectsModel');
const ListingSearchCity = require('../../models/listingSearchCityModel');
const Agencies = require('../../models/agenciesModel');
const Developers = require('../../models/developersModel');
const ProjectLayout = require('../../models/projectLayoutModel');
// [REVERT: layout contactStatus] Remove if reverting unitsFromDeveloper contact fields
const ProjectUnit = require('../../models/projectUnitModel');
const { success, failure } = require('../../utils/helpers');
const { buildProjectKeywordOr, escapeRegex } = require('../../utils/searchKeyword');
const { COMPLETION_STATUS, DELIVERY_DATE } = require('../../utils/constants');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

const buildShareLink = (path, id) => {
  if (!FRONTEND_URL || !id) return null;
  return `${FRONTEND_URL}${path}/${encodeURIComponent(String(id))}`;
};

/**
 * [REVERT: layout contactStatus]
 * Added for GET /projects/{id} → project.unitsFromDeveloper[].layouts[].
 * Revert: delete this helper and remove contactStatus/soldUnits from layout mapping below.
 *
 * Priority: sold-out > available-to-contact > unavailable
 * - sold-out: totalUnits > 0 and (availableUnits === 0 OR soldUnits >= totalUnits)
 * - available-to-contact: not sold out AND ≥1 active unit in layout has assignedAgents
 * - unavailable: units remain but no agent assigned on any unit in that layout
 */
const getLayoutContactStatus = (layout, hasAssignedAgent) => {
  const totalUnits = layout.totalUnits || 0;
  const availableUnits = layout.availableUnits ?? 0;
  const soldUnits = layout.soldUnits ?? 0;
  const isSoldOut =
    totalUnits > 0 && (availableUnits === 0 || soldUnits >= totalUnits);

  if (isSoldOut) return 'sold-out';
  if (hasAssignedAgent) return 'available-to-contact';
  return 'unavailable';
};

/** Live per-layout counts from ProjectUnit (ProjectLayout cache is often stale after closes). */
const fetchLayoutUnitStatsByProject = async (projectId) => {
  const rows = await ProjectUnit.aggregate([
    {
      $match: {
        project: new Types.ObjectId(String(projectId)),
        isActive: true,
      },
    },
    {
      $group: {
        _id: '$layout',
        totalUnits: { $sum: 1 },
        availableUnits: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
        },
        soldUnits: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
        },
      },
    },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const key = row._id?.toString();
    if (!key) return;
    map.set(key, {
      totalUnits: Number(row.totalUnits) || 0,
      availableUnits: Number(row.availableUnits) || 0,
      soldUnits: Number(row.soldUnits) || 0,
    });
  });
  return map;
};

const resolveLayoutUnitCounts = (layout, statsMap) => {
  const live = statsMap.get(layout._id.toString());
  if (live) return live;
  return {
    totalUnits: layout.totalUnits ?? 0,
    availableUnits: layout.availableUnits ?? 0,
    soldUnits: layout.soldUnits ?? 0,
  };
};

// ─── Private Helpers ──────────────────────────────────────

/**
 * Parse bedroom/bathroom filter value
 * Handles: "3", "2-5", "7+"
 * @param {string} value - Query parameter value
 * @returns {Object|Number|null} - MongoDB condition object, number, or null if invalid
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
 * /projects/search:
 *   post:
 *     summary: Search new off-plan projects with advanced filters
 *     description: >
 *       Search for active new projects (off-plan/ready) with comprehensive filtering options
 *       optional unified `keyword` across project name, slug, descriptions, and location text,
 *       location (ListingSearchCity ObjectId from master data or free text) and projectName filters
 *       (keyword, location, and projectName may be combined with AND), developer, property types, bedrooms, bathrooms, price range,
 *       area, amenities, completion status, delivery date, and more. Returns paginated
 *       results with city counts and sorting options.
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyword:
 *                 type: string
 *                 description: >
 *                   Unified free-text search (case-insensitive partial match) across projectName,
 *                   slug, description, aboutProject, address, city, and zone. Can be combined with
 *                   `location` (city id or text) and `projectName`.
 *               location:
 *                 type: string
 *                 description: >
 *                   ListingSearchCity ObjectId (from project-locations master data) filters by
 *                   `location.city` (exact vs displayName/cityKey, case-insensitive), or legacy
 *                   free-text partial match on city, zone, or address.
 *               nearLat:
 *                 type: number
 *                 format: float
 *                 description: Latitude for nearby project search (used with nearLng and nearRadiusKm)
 *               nearLng:
 *                 type: number
 *                 format: float
 *                 description: Longitude for nearby project search (used with nearLat and nearRadiusKm)
 *               nearRadiusKm:
 *                 type: number
 *                 format: float
 *                 default: 5
 *                 description: Search radius in kilometers around the given lat/lng
 *               projectName:
 *                 type: string
 *                 description: Project name partial match; can be combined with `keyword` and `location`.
 *               developerId:
 *                 type: string
 *                 description: Developer ObjectId
 *               propertyType:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: PropertyType ObjectId(s)
 *               bedrooms:
 *                 type: string
 *                 description: Bedroom filter - "3", "2-4", or "7+"
 *               bathrooms:
 *                 type: string
 *                 description: Bathroom filter - "2", "1-3", or "7+"
 *               priceMin:
 *                 type: number
 *                 description: Minimum launch price
 *               priceMax:
 *                 type: number
 *                 description: Maximum launch price
 *               areaMin:
 *                 type: number
 *                 description: Minimum area in sqft
 *               areaMax:
 *                 type: number
 *                 description: Maximum area in sqft
 *               amenities:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: Amenity ObjectId(s)
 *               hasPostHandover:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter projects with post-handover payment
 *               isDldRegistered:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter DLD registered projects
 *               isVerified:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Filter verified projects
 *               completionStatus:
 *                 type: string
 *                 enum: [off-plan, ready, under-construction, all]
 *                 description: Completion status filter
 *               deliveryDate:
 *                 type: string
 *                 description: Delivery date filter - "all-dates" for all, current year (e.g., "2025"), or "later" for future dates
 *               deliveryDateFrom:
 *                 type: string
 *                 format: date
 *                 description: Delivery date from
 *               deliveryDateTo:
 *                 type: string
 *                 format: date
 *                 description: Delivery date to
 *               sortBy:
 *                 type: string
 *                 enum: [newest, price-low, price-high, delivery-soon]
 *                 default: newest
 *                 description: Sort order
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Page number
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 54
 *                 default: 18
 *                 description: Items per page
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const searchProjects = asyncHandler(async (req, res) => {
  try {
    const {
      keyword,
      location,
      nearLat,
      nearLng,
      nearRadiusKm,
      projectName,
      developerId,
      propertyType,
      bedrooms,
      bathrooms,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      amenities,
      hasPostHandover,
      isDldRegistered,
      isVerified,
      completionStatus,
      deliveryDate,
      deliveryDateFrom,
      deliveryDateTo,
      sortBy,
      page = 1,
      limit = 18,
      clearAll = false
    } = req.body;

    // Step 1: Build base query
    const query = {
      isActive     : true,
      publishStatus: 'published'
    };

    // Track applied filters for response
    const appliedFilters = {};

    let sortByValue = sortBy || 'newest';

    // Step 2: Apply each filter conditionally
    // If clearAll is true, skip all optional filters and only keep isActive
    if (clearAll) {
      // Only apply isActive, skip all other filters
      // Reset sortBy to default
      sortByValue = 'newest';
    } else {

    // Keyword + location (master-data id or text) + projectName — combined with $and when multiple apply
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
            { 'location.address': { $regex: locStr, $options: 'i' } },
          ],
        };
      }
    }

    const keywordFilter = trimmedKeyword ? buildProjectKeywordOr(trimmedKeyword) : null;
    if (trimmedKeyword && keywordFilter) {
      appliedFilters.keyword = trimmedKeyword;
    }

    let projectNameCond = null;
    if (projectName && typeof projectName === 'string' && projectName.trim()) {
      const pn = projectName.trim();
      projectNameCond = { projectName: { $regex: pn, $options: 'i' } };
      appliedFilters.projectName = pn;
    }

    const textClauses = [];
    if (keywordFilter) textClauses.push({ $or: keywordFilter.$or });
    if (locationFilter) textClauses.push(locationFilter);
    if (projectNameCond) textClauses.push(projectNameCond);

    if (textClauses.length === 1) {
      Object.assign(query, textClauses[0]);
    } else if (textClauses.length > 1) {
      query.$and = textClauses;
    }

    // Nearby (geo) filter – requires valid lat, lng, and optional radius
    // NOTE:
    // - `$near`/`$nearSphere` are not valid inside aggregation `$match` contexts.
    // - This controller builds an aggregation pipeline, so use `$geoWithin` + `$centerSphere`.
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

    // Developer filter (public catalog: verified developers only)
    if (developerId) {
      if (!isValidObjectId(developerId)) {
        return failure(res, 400, 'Invalid developerId ObjectId', 'VALIDATION_ERROR');
      }
      const publicDeveloper = await Developers.exists({
        _id: new Types.ObjectId(developerId),
        isActive: true,
        isVerified: true,
      });
      if (!publicDeveloper) {
        return failure(res, 404, 'Developer not found', 'NOT_FOUND');
      }
      query.developer = new Types.ObjectId(developerId);
      appliedFilters.developerId = developerId;
    }

    // PropertyType filter
    if (propertyType) {
      const propertyTypeArray = parseArrayParam(propertyType);
      if (propertyTypeArray.length > 0) {
        const validIds = propertyTypeArray.filter(id => isValidObjectId(id));
        if (validIds.length > 0) {
          query.propertyTypes = { $in: validIds.map(id => new Types.ObjectId(id)) };
          appliedFilters.propertyType = validIds.length === 1 ? validIds[0] : validIds;
        }
      }
    }

    // Bedrooms filter (applied to bedroomOptions array)
    // For number arrays, MongoDB can check if value exists directly
    if (bedrooms) {
      const bedroomsCondition = parseBedBathFilter(bedrooms);
      if (bedroomsCondition !== null) {
        if (typeof bedroomsCondition === 'number') {
          // Exact match: check if number exists in array
          query.bedroomOptions = bedroomsCondition;
        } else if (bedroomsCondition.$gte && bedroomsCondition.$lte) {
          // Range: use $or to check if any value in array is within range
          // MongoDB doesn't support $elemMatch on simple number arrays
          // So we check if any value between min and max exists
          const rangeValues = [];
          for (let i = bedroomsCondition.$gte; i <= bedroomsCondition.$lte; i++) {
            rangeValues.push(i);
          }
          query.bedroomOptions = { $in: rangeValues };
        } else if (bedroomsCondition.$gte) {
          // "7+": check if any value >= 7 exists in array
          // For this, we need to use aggregation or check common high values
          // For simplicity, check if common high values exist (7, 8, 9, 10+)
          query.bedroomOptions = { $gte: bedroomsCondition.$gte };
        }
        appliedFilters.bedrooms = bedrooms;
      }
    }

    // Bathrooms filter on ProjectLayout level
    // Store bathroomsFilter for post-query layout check
    // Since bathrooms not cached on NewProject,
    // we filter via bedroomOptions approximation:
    // For now just track for response — actual bathroom
    // filtering done via aggregation pipeline below
    let bathroomsFilter = null;
    if (bathrooms) {
      const parsed = parseBedBathFilter(bathrooms);
      if (parsed !== null) {
        bathroomsFilter = parsed;
        appliedFilters.bathrooms = bathrooms;
      }
    }

    // Price range filter (launchPrice.startingFrom)
    if (priceMin !== undefined || priceMax !== undefined) {
      query['launchPrice.startingFrom'] = {};
      if (priceMin !== undefined) {
        const min = parseFloat(priceMin);
        if (!isNaN(min) && min >= 0) {
          query['launchPrice.startingFrom'].$gte = min;
          appliedFilters.priceRange = { ...(appliedFilters.priceRange || {}), min };
        }
      }
      if (priceMax !== undefined) {
        const max = parseFloat(priceMax);
        if (!isNaN(max) && max >= 0) {
          query['launchPrice.startingFrom'].$lte = max;
          appliedFilters.priceRange = { ...(appliedFilters.priceRange || {}), max };
        }
      }
      if (Object.keys(query['launchPrice.startingFrom']).length === 0) {
        delete query['launchPrice.startingFrom'];
      }
    }

    // Area range filter
    let areaFilter = null;
    if (areaMin !== undefined || areaMax !== undefined) {
      areaFilter = {};
      if (areaMin !== undefined) {
        const min = parseFloat(areaMin);
        if (!isNaN(min) && min >= 0) {
          areaFilter.$gte = min;
          appliedFilters.areaRange = { ...(appliedFilters.areaRange || {}), min };
        }
      }
      if (areaMax !== undefined) {
        const max = parseFloat(areaMax);
        if (!isNaN(max) && max >= 0) {
          areaFilter.$lte = max;
          appliedFilters.areaRange = { ...(appliedFilters.areaRange || {}), max };
        }
      }
    }

    // Bathrooms + area filtering handled via ProjectLayout
    // sub-query below after main project query
    // No unitDetails $elemMatch needed

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

    // Post-handover payment filter
    if (hasPostHandover === 'true') {
      query.hasPostHandoverPayment = true;
      appliedFilters.hasPostHandover = true;
    }

    // DLD registered filter
    if (isDldRegistered === 'true') {
      query.isDldRegistered = true;
      appliedFilters.isDldRegistered = true;
    }

    // Verified filter
    if (isVerified === 'true') {
      query.isVerified = true;
      appliedFilters.isVerified = true;
    }

    // Completion status filter
    // Only apply filter if value is 'off-plan' or 'ready', skip if 'any' or undefined
    if (completionStatus && completionStatus !== 'any' && COMPLETION_STATUS.some(status => status.value === completionStatus)) {
      query.completionStatus = completionStatus;
      appliedFilters.completionStatus = completionStatus;
    }

    // Delivery date filter
    // Handle deliveryDate from DELIVERY_DATE constant (all-dates, current year, later)
    if (deliveryDate && deliveryDate !== 'all-dates') {
      const currentYear = new Date().getFullYear();
      
      if (deliveryDate === 'later') {
        // Filter for dates after current year
        const nextYearStart = new Date(currentYear + 1, 0, 1);
        query.deliveryDate = { $gte: nextYearStart };
        appliedFilters.deliveryDate = 'later';
      } else {
        // Check if it's a year string (e.g., "2025")
        const yearNum = parseInt(deliveryDate, 10);
        if (!isNaN(yearNum) && yearNum >= currentYear) {
          // Filter for that specific year
          const yearStart = new Date(yearNum, 0, 1);
          const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59, 999);
          query.deliveryDate = { $gte: yearStart, $lte: yearEnd };
          appliedFilters.deliveryDate = deliveryDate;
        }
      }
    }
    
    // Also handle deliveryDateFrom/deliveryDateTo for custom date ranges
    if (deliveryDateFrom || deliveryDateTo) {
      if (!query.deliveryDate) {
        query.deliveryDate = {};
      }
      if (deliveryDateFrom) {
        query.deliveryDate.$gte = new Date(deliveryDateFrom);
        appliedFilters.deliveryDateFrom = deliveryDateFrom;
      }
      if (deliveryDateTo) {
        query.deliveryDate.$lte = new Date(deliveryDateTo);
        appliedFilters.deliveryDateTo = deliveryDateTo;
      }
    }
    } // End of clearAll else block - only apply filters if clearAll is false

    // Public catalog: only projects owned by verified active developers
    const verifiedDeveloperIds = await Developers.find({ isActive: true, isVerified: true })
      .distinct('_id');
    if (!verifiedDeveloperIds.length) {
      return success(res, 'No projects found matching your criteria', {
        projects: [],
        pagination: {
          page: Math.max(1, parseInt(page, 10) || 1),
          limit: Math.min(54, Math.max(1, parseInt(limit, 10) || 18)),
          totalPages: 0,
          totalProjects: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        countByCity: [],
        appliedFilters,
      });
    }
    if (query.developer instanceof Types.ObjectId) {
      if (!verifiedDeveloperIds.some((id) => id.equals(query.developer))) {
        return failure(res, 404, 'Developer not found', 'NOT_FOUND');
      }
    } else {
      query.developer = { $in: verifiedDeveloperIds };
    }

    // Step 3: Build sort object
    let sortObj = {};
    switch (sortByValue) {
      case 'newest':
        sortObj = { isFeatured: -1, publishedAt: -1 };
        break;
      case 'price-low':
        sortObj = { 'launchPrice.startingFrom': 1 };
        break;
      case 'price-high':
        sortObj = { 'launchPrice.startingFrom': -1 };
        break;
      case 'delivery-date-earliest':
        sortObj = { deliveryDate: 1 };
        break;
      case 'delivery-date-latest':
        sortObj = { deliveryDate: -1 };
        break;
      default:
        sortObj = { isFeatured: -1, publishedAt: -1 };
    }
    appliedFilters.sortBy = sortByValue;

    // Step 4: Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(54, Math.max(1, parseInt(limit, 10) || 18));
    const skip = (pageNum - 1) * limitNum;

    // Step 5: Run THREE parallel queries using Promise.all
    const [projects, totalProjects, countByCity] = await Promise.all([
      // Query 1: Projects (paginated list)
      Newprojects.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select(`
          projectName slug description projectType
          completionStatus propertyTypes bedroomOptions
          launchPrice governmentFees deliveryDate
          expectedCompletionDate hasPostHandoverPayment
          isDldRegistered isVerified isFeatured
          location.city location.zone location.address
          location.coordinates images developer
          views publishedAt bookingOpen
          totalUnits availableUnits amenities
          paymentPlans authorizedAgencies
        `)
        .populate({
          path: 'developer',
          model: 'Developers',
          match: { isVerified: true, isActive: true },
          select: 'name logo email phoneNumber website',
        })
        .populate({
          path: 'propertyTypes',
          model: 'PropertyType',
          select: 'name'
        })
        .populate({
          path: 'amenities',
          model: 'Amenities',
          select: 'name icon'
        })
        .lean(),
      // Query 2: Total count
      Newprojects.countDocuments(query),
      // Query 3: Count by city (aggregation)
      Newprojects.aggregate([
        { $match: query },
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { city: '$_id', count: 1, _id: 0 } }
      ])
    ]);

    // Step 6: Map response - process each project
    const mappedProjects = projects.map(project => {
      const imagesCount = Array.isArray(project.images) ? project.images.length : 0;
      const sortedImages = (project.images || [])
        .sort((a, b) => {
          if (b.isPrimary && !a.isPrimary) return 1;
          if (a.isPrimary && !b.isPrimary) return -1;
          return (a.order || 0) - (b.order || 0);
        })
        .slice(0, 3);

      const limitedAmenities = (project.amenities || [])
        .slice(0, 5);

      const bedroomRange = project.bedroomOptions?.length
        ? {
            min: Math.min(...project.bedroomOptions),
            max: Math.max(...project.bedroomOptions)
          }
        : null;

      // Format delivery date as quarter:
      const deliveryQuarter = project.deliveryDate
        ? getQuarter(project.deliveryDate)
        : null;

      // Count payment plans:
      const paymentPlansCount = Array.isArray(project.paymentPlans)
        ? project.paymentPlans.length
        : 0;

      return {
        _id            : project._id,
        projectName    : project.projectName,
        slug           : project.slug,
        description    : project.description,
        projectType    : project.projectType,
        completionStatus: project.completionStatus,
        propertyTypes  : project.propertyTypes,
        bedroomOptions : project.bedroomOptions,
        bedroomRange,
        launchPrice    : project.launchPrice,
        governmentFees : project.governmentFees,
        deliveryDate   : project.deliveryDate,
        deliveryQuarter,
        saleStarted    : project.bookingOpen || null,
        paymentPlansCount,
        hasPostHandoverPayment: project.hasPostHandoverPayment,
        isDldRegistered: project.isDldRegistered,
        isVerified     : project.isVerified,
        isFeatured     : project.isFeatured,
        location       : {
          city       : project.location?.city,
          zone       : project.location?.zone,
          address    : project.location?.address,
          coordinates: project.location?.coordinates
        },
        imagesCount,
        images         : sortedImages,
        amenities      : limitedAmenities,
        developer      : project.developer,
        totalUnits     : project.totalUnits,
        availableUnits : project.availableUnits,
        views          : project.views || 0,
        publishedAt    : project.publishedAt,
        shareLink: buildShareLink('/newprojectdrilldown', project._id)
      };
    });

    // Step 7: Calculate pagination metadata
    const totalPages = Math.ceil(totalProjects / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Step 8: Return response
    const message = totalProjects === 0
      ? 'No projects found matching your criteria'
      : 'Projects fetched successfully';

    return success(res, message, {
      projects: mappedProjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalProjects,
        hasNextPage,
        hasPrevPage
      },
      countByCity: countByCity || [],
      appliedFilters
    });

  } catch (error) {
    // Handle ObjectId conversion errors
    if (error.name === 'CastError' || error.message.includes('ObjectId')) {
      return failure(res, 400, 'Invalid filter parameter format', 'VALIDATION_ERROR');
    }

    // Log error for debugging (in development)
    console.error('Project search error:', error);

    return failure(res, 500, 'Internal server error', 'SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

/**
 * Helper function to compute quarter from date
 * @param {Date|string} date - Date object or date string
 * @returns {string|null} - Quarter string like "Q4 2027" or null
 */
const getQuarter = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
};

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get single project by ID or slug with full details
 *     description: >
 *       Retrieves a single project by MongoDB ObjectId or slug. Returns full project details
 *       with all populated references, authorized agencies, FAQs, payment plans, timeline,
 *       similar projects, and `unitsFromDeveloper` (layouts grouped by building).
 *       Automatically increments view count.
 *
 *       **Layout contact fields (added for public drilldown):** each item in
 *       `project.unitsFromDeveloper[].layouts[]` includes `soldUnits` and `contactStatus`
 *       (`sold-out` | `available-to-contact` | `unavailable`). See schema below.
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project MongoDB ObjectId or slug
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *     responses:
 *       200:
 *         description: Project fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Project fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       type: object
 *                       properties:
 *                         unitsFromDeveloper:
 *                           type: array
 *                           description: Active layouts grouped by building/tower
 *                           items:
 *                             type: object
 *                             properties:
 *                               buildingId:
 *                                 type: string
 *                                 nullable: true
 *                               buildingName:
 *                                 type: string
 *                                 nullable: true
 *                                 example: Tower B
 *                               propertyTypeFilter:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     _id:
 *                                       type: string
 *                                     name:
 *                                       type: string
 *                                     slug:
 *                                       type: string
 *                               layouts:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     layoutId:
 *                                       type: string
 *                                     layoutName:
 *                                       type: string
 *                                       example: 2BR Type 2
 *                                     propertyType:
 *                                       type: object
 *                                       properties:
 *                                         _id:
 *                                           type: string
 *                                         name:
 *                                           type: string
 *                                         slug:
 *                                           type: string
 *                                     bedrooms:
 *                                       type: number
 *                                     maidBedroom:
 *                                       type: boolean
 *                                     bathrooms:
 *                                       type: number
 *                                     areaSqm:
 *                                       type: number
 *                                     areaSqft:
 *                                       type: number
 *                                     startingPrice:
 *                                       type: object
 *                                       properties:
 *                                         amount:
 *                                           type: number
 *                                         currency:
 *                                           type: string
 *                                           example: AED
 *                                     floorPlans:
 *                                       type: array
 *                                       items:
 *                                         type: string
 *                                     totalUnits:
 *                                       type: number
 *                                     availableUnits:
 *                                       type: number
 *                                     soldUnits:
 *                                       type: number
 *                                       description: Closed/sold unit count for this layout (from ProjectLayout)
 *                                     contactStatus:
 *                                       type: string
 *                                       enum: [sold-out, available-to-contact, unavailable]
 *                                       description: |
 *                                         Single UI state for layout contact CTA.
 *                                         sold-out — all units sold; do not show contact.
 *                                         available-to-contact — units remain and ≥1 unit has an assigned agent.
 *                                         unavailable — units remain but no agent assigned yet.
 *                     authorizedAgencies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     similarProjects:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid project ID or slug
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
const getProjectById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Build query (ObjectId or slug)
    let query = { isActive: true };

    if (Types.ObjectId.isValid(id)) {
      query._id = new Types.ObjectId(id);
    } else {
      query.slug = id;
    }

    // Step 2: Find project with all populates
    const project = await Newprojects.findOne(query)
      .populate({
        path: 'developer',
        model: 'Developers',
        match: { isVerified: true, isActive: true },
        select: 'name logo description foundedYear totalProjects completedProjects address.city address.country socialLinks website ratings.average ratings.totalCount awards phoneNumber email',
      })
      .populate({
        path: 'propertyTypes',
        model: 'PropertyType',
        select: 'name'
      })
      .populate({
        path: 'amenities',
        model: 'Amenities',
        select: 'name icon image category'
      })
      .lean();

    // Step 3: 404 if not found
    if (!project) {
      return failure(res, 404, 'Project not found', 'NOT_FOUND');
    }

    const projectDevRef = await Newprojects.findById(project._id).select('developer').lean();
    if (projectDevRef?.developer && !project.developer) {
      return failure(res, 404, 'Project not found', 'NOT_FOUND');
    }

    const verifiedDeveloperIds = await Developers.find({ isActive: true, isVerified: true }).distinct('_id');

    // Step 4: Fire-and-forget view increment
    Newprojects.findByIdAndUpdate(project._id, { $inc: { views: 1 } }).exec().catch(() => {
      // Silently fail - don't block response
    });

    // Step 5: Fetch authorizedAgencies and similarProjects in parallel
    const [authorizedAgencies, similarProjects] = await Promise.all([
      // Query 1: Authorized agencies
      project.authorizedAgencies && project.authorizedAgencies.length > 0
        ? Agencies.find({
            _id: { $in: project.authorizedAgencies.map((id) => new Types.ObjectId(id)) },
            isActive: true,
            isVerified: true,
          })
            .select('agencyName profilePicture isVerified statistics.totalActiveListings')
            .lean()
        : Promise.resolve([]),
      // Query 2: Similar projects
      (async () => {
        const similarQuery = {
          isActive: true,
          _id: { $ne: project._id },
          completionStatus: project.completionStatus,
          ...(verifiedDeveloperIds.length ? { developer: { $in: verifiedDeveloperIds } } : { developer: { $in: [] } }),
        };

        // Build location or propertyType match
        const locationConditions = [];
        if (project.location?.city) {
          locationConditions.push({ 'location.city': project.location.city });
        }

        const propertyTypeIds = project.propertyTypes?.map(pt => pt._id || pt) || [];
        if (propertyTypeIds.length > 0) {
          similarQuery.$or = [
            ...locationConditions,
            { propertyTypes: { $in: propertyTypeIds } }
          ];
        } else if (locationConditions.length > 0) {
          similarQuery.$or = locationConditions;
        }

        return Newprojects.find(similarQuery)
          .select('projectName slug projectType completionStatus propertyTypes bedroomOptions launchPrice deliveryDate hasPostHandoverPayment location.city location.zone location.address images isFeatured isVerified developer')
          .populate({
            path: 'developer',
            model: 'Developers',
            match: { isVerified: true, isActive: true },
            select: 'name logo',
          })
          .populate({
            path: 'propertyTypes',
            model: 'PropertyType',
            select: 'name'
          })
          .sort({ isFeatured: -1, publishedAt: -1 })
          .limit(6)
          .lean();
      })()
    ]);

    // Fetch layout stats for similar projects (bathroom/area ranges)
    const similarProjectIds = (similarProjects || [])
      .map((sp) => sp?._id)
      .filter(Boolean);
    const similarLayoutStats = similarProjectIds.length
      ? await ProjectLayout.aggregate([
          {
            $match: {
              project: { $in: similarProjectIds },
              isActive: true,
            },
          },
          {
            $group: {
              _id: '$project',
              minBathrooms: { $min: '$bathrooms' },
              maxBathrooms: { $max: '$bathrooms' },
              minAreaSqft: { $min: '$areaSqft' },
              maxAreaSqft: { $max: '$areaSqft' },
            },
          },
        ])
      : [];
    const similarLayoutStatsMap = new Map(
      (similarLayoutStats || []).map((row) => [String(row._id), row])
    );

    // Step 6: Build keyInformation object
    const keyInformation = {
      deliveryDate: project.deliveryDate,
      deliveryQuarter: getQuarter(project.deliveryDate),
      location: {
        city: project.location?.city,
        zone: project.location?.zone
      },
      governmentFees: project.governmentFees ?? 0,
      paymentPlans: project.hasPostHandoverPayment
        ? 'Customized plans available'
        : 'Standard plan',
      propertyTypes: project.propertyTypes?.map(pt => pt.name).join(', ') || '',
      completionStatus: project.completionStatus,
      constructionProgress: project.constructionProgress,
      progressStatus: project.progressStatus || null,
      expectedCompletionDate: project.expectedCompletionDate || null,
      isDldRegistered: project.isDldRegistered,
      hasPostHandoverPayment: project.hasPostHandoverPayment,
      postHandoverDetails: project.postHandoverDetails || null,
      totalUnits: project.totalUnits,
      availableUnits: project.availableUnits
    };

    // Step 7: Build paymentPlans response
    const paymentPlanResponse = {
      totalPlansAvailable: Array.isArray(project.paymentPlans)
        ? project.paymentPlans.length
        : 0,
      plans: Array.isArray(project.paymentPlans)
        ? project.paymentPlans.map((plan, index) => ({
            planName          : plan.planName || `Option ${index + 1}`,
            downPayment       : plan.downPayment,
            duringConstruction: plan.duringConstruction,
            onHandover        : plan.onHandover
          }))
        : []
    };

    // ── Units from developer ─────────────────────────
    // [REVERT: layout contactStatus] Start — restore single ProjectLayout.find() only (no ProjectUnit)
    // Parallel fetch: layouts + layout IDs that have ≥1 unit with assignedAgents (agent assigned)
    const [projectLayouts, layoutsWithAssignedAgent, layoutUnitStatsMap] =
      await Promise.all([
        ProjectLayout.find({
          project: project._id,
          isActive: true,
        })
          .populate('building', 'buildingName')
          .populate('propertyType', 'name slug')
          .lean(),
        ProjectUnit.distinct('layout', {
          project: project._id,
          isActive: true,
          status: { $ne: 'closed' },
          'assignedAgents.0': { $exists: true },
        }),
        fetchLayoutUnitStatsByProject(project._id),
      ]);

    const layoutIdsWithAgent = new Set(
      layoutsWithAssignedAgent.map((layoutId) => layoutId.toString()),
    );
    // [REVERT: layout contactStatus] End — remove block above; use only projectLayouts query

    // Group layouts by building:
    const buildingMap = {};
    projectLayouts.forEach(layout => {
      const buildingKey = layout.building
        ? layout.building._id.toString()
        : 'no-building';
      const buildingName = layout.building
        ? layout.building.buildingName
        : null;

      if (!buildingMap[buildingKey]) {
        buildingMap[buildingKey] = {
          buildingId  : layout.building?._id || null,
          buildingName: buildingName,
          propertyTypeFilter: [],
          layouts     : []
        };
      }

      if (layout.propertyType?._id) {
        const exists = buildingMap[buildingKey].propertyTypeFilter.some(
          pt => String(pt._id) === String(layout.propertyType._id)
        );
        if (!exists) {
          buildingMap[buildingKey].propertyTypeFilter.push({
            _id: layout.propertyType._id,
            name: layout.propertyType.name,
            slug: layout.propertyType.slug
          });
        }
      }

      const unitCounts = resolveLayoutUnitCounts(layout, layoutUnitStatsMap);

      buildingMap[buildingKey].layouts.push({
        layoutId      : layout._id,
        layoutName    : layout.layoutName,
        propertyType  : layout.propertyType,
        bedrooms      : layout.bedrooms,
        maidBedroom   : layout.maidBedroom,
        bathrooms     : layout.bathrooms,
        areaSqm       : layout.areaSqm,
        areaSqft      : layout.areaSqft,
        startingPrice : layout.startingPrice,
        floorPlans    : layout.floorPlans || [],
        totalUnits    : unitCounts.totalUnits,
        availableUnits: unitCounts.availableUnits,
        soldUnits     : unitCounts.soldUnits,
        contactStatus : getLayoutContactStatus(
          unitCounts,
          layoutIdsWithAgent.has(layout._id.toString()),
        ),
      });
    });

    const unitsFromDeveloper = Object.values(buildingMap);

    // Step 8: Build projectTimeline
    const projectTimeline = [];
    
    if (project.projectAnnouncement || project.createdAt) {
      projectTimeline.push({
        milestone: 'Project announcement',
        date: project.projectAnnouncement || project.createdAt,
        status: 'completed',
        quarter: getQuarter(project.projectAnnouncement || project.createdAt)
      });
    }

    if (project.bookingOpen) {
      projectTimeline.push({
        milestone: 'Sales launch',
        date: project.bookingOpen,
        status: 'completed',
        quarter: getQuarter(project.bookingOpen)
      });
    } else if (project.launchDate) {
      projectTimeline.push({
        milestone: 'Sales launch',
        date: project.launchDate,
        status: 'completed',
        quarter: getQuarter(project.launchDate)
      });
    }

    if (project.constructionStarted) {
      projectTimeline.push({
        milestone: 'Construction started',
        date: project.constructionStarted,
        status: 'completed',
        quarter: getQuarter(project.constructionStarted)
      });
    }

    if (project.expectedCompletionDate) {
      projectTimeline.push({
        milestone: 'Expected completion',
        date: project.expectedCompletionDate,
        status: project.completionStatus === 'ready' ? 'completed' : 'upcoming',
        quarter: getQuarter(project.expectedCompletionDate)
      });
    }

    // Step 9: Sort images (primary first, then by order)
    const sortedImages = (project.images || [])
      .sort((a, b) => {
        if (b.isPrimary && !a.isPrimary) return 1;
        if (a.isPrimary && !b.isPrimary) return -1;
        return (a.order || 0) - (b.order || 0);
      });

    // Step 10: Process FAQs (sort by order)
    const sortedFaqs = (project.faqs || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(faq => ({
        question: faq.question,
        answer: faq.answer
      }));

    // Step 11: Build developer response
    let developerResponse = null;
    if (project.developer) {
      developerResponse = {
        _id: project.developer._id,
        name: project.developer.name,
        logo: project.developer.logo,
        description: project.developer.description || project.developer.shortDescription || project.developer.longDescription,
        foundedYear: project.developer.foundedYear,
        totalProjects: project.developer.totalProjects || 0,
        completedProjects: project.developer.completedProjects || 0,
        ratings: {
          average: project.developer.ratings?.average || 0,
          totalCount: project.developer.ratings?.totalCount || 0
        },
        website: project.developer.website,
        socialLinks: project.developer.socialLinks || {},
        awards: project.developer.awards || [],
        phoneNumber: project.developer.phoneNumber,
        email: project.developer.email,
      };
    }

    // Step 12: Build DLD registration response
    const dldRegistration = {
      isDldRegistered: project.isDldRegistered || false,
      dldRegistrationNumber: project.dldRegistrationNumber || null,
      registrationDetails: project.registrationDetails ? {
        permitNumber: project.registrationDetails.permitNumber,
        permitUrl: project.registrationDetails.permitUrl,
        issuedDate: project.registrationDetails.issuedDate,
        expiryDate: project.registrationDetails.expiryDate
      } : null
    };

    // Step 13: Process similar projects
    const similarProjectsResponse = (similarProjects || []).map(similar => {
      const imagesCount = Array.isArray(similar.images) ? similar.images.length : 0;
      // Sort and slice images to first 3
      const sortedSimilarImages = (similar.images || [])
        .sort((a, b) => {
          if (b.isPrimary && !a.isPrimary) return 1;
          if (a.isPrimary && !b.isPrimary) return -1;
          return (a.order || 0) - (b.order || 0);
        })
        .slice(0, 3);

      // Compute bedroomRange
      const bedroomRange = similar.bedroomOptions?.length
        ? {
            min: Math.min(...similar.bedroomOptions),
            max: Math.max(...similar.bedroomOptions)
          }
        : null;
      const layoutStats = similarLayoutStatsMap.get(String(similar._id));
      const bathroomRange =
        layoutStats &&
        Number.isFinite(layoutStats.minBathrooms) &&
        Number.isFinite(layoutStats.maxBathrooms)
          ? {
              min: layoutStats.minBathrooms,
              max: layoutStats.maxBathrooms,
            }
          : null;
      const areaRange =
        layoutStats &&
        Number.isFinite(layoutStats.minAreaSqft) &&
        Number.isFinite(layoutStats.maxAreaSqft)
          ? {
              min: layoutStats.minAreaSqft,
              max: layoutStats.maxAreaSqft,
            }
          : null;

      return {
        ...similar,
        imagesCount,
        images: sortedSimilarImages,
        bedroomRange,
        bathroomRange,
        areaRange,
      };
    });

    // Step 14: Build final project response (exclude sensitive fields)
    const {
      viewHistory,
      soldUnits,
      reservedUnits,
      password,
      access_token,
      token_expires_at,
      refresh_token,
      refresh_token_expires_at,
      ...safeProject
    } = project;

    const projectResponse = {
      _id: safeProject._id,
      projectName: safeProject.projectName,
      slug: safeProject.slug,
      description: safeProject.description,
      aboutProject: safeProject.aboutProject,
      projectType: safeProject.projectType,
      completionStatus: safeProject.completionStatus,
      constructionProgress: safeProject.constructionProgress,
      isVerified: safeProject.isVerified,
      isFeatured: safeProject.isFeatured,
      views: safeProject.views || 0,
      inquiries: safeProject.inquiries || 0,
      likes: safeProject.likes || 0,
      shares: safeProject.shares || 0,
      publishedAt: safeProject.publishedAt,
      lastModifiedAt: safeProject.lastModifiedAt,
      launchPrice: safeProject.launchPrice,
      governmentFees: safeProject.governmentFees ?? 0,
      deliveryDate: safeProject.deliveryDate ?? null,
      deliveryQuarter: getQuarter(safeProject.deliveryDate),
      totalUnits: safeProject.totalUnits ?? 0,
      availableUnits: safeProject.availableUnits ?? 0,
      isDldRegistered: safeProject.isDldRegistered ?? false,
      progressStatus: safeProject.progressStatus ?? null,
      expectedCompletionDate: safeProject.expectedCompletionDate ?? null,
      projectAnnouncement: safeProject.projectAnnouncement ?? null,
      bookingOpen: safeProject.bookingOpen ?? null,
      launchDate: safeProject.launchDate ?? null,
      constructionStarted: safeProject.constructionStarted ?? null,
      hasPostHandoverPayment: safeProject.hasPostHandoverPayment,
      postHandoverDetails: safeProject.postHandoverDetails,
      saleStarted: safeProject.bookingOpen || safeProject.launchDate || null,
      keyInformation,
      paymentPlan: paymentPlanResponse,
      paymentPlansCount: paymentPlanResponse.totalPlansAvailable,
      projectTimeline,
      location: {
        city: safeProject.location?.city,
        zone: safeProject.location?.zone,
        address: safeProject.location?.address,
        googlePlaceId: safeProject.location?.googlePlaceId ?? null,
        coordinates: safeProject.location?.coordinates
      },
      imagesCount: Array.isArray(project.images) ? project.images.length : 0,
      images: sortedImages,
      masterPlan: safeProject.masterPlan || [],
      brochure: safeProject.brochure,
      projectPlan: safeProject.projectPlan,
      virtualTour360: safeProject.virtualTour360,
      videoTour: safeProject.videoTour,
      propertyTypes: safeProject.propertyTypes || [],
      bedroomOptions: safeProject.bedroomOptions || [],
      amenities: safeProject.amenities || [],
      dldRegistration,
      faqs: sortedFaqs,
      developer: developerResponse,
      // [REVERT: layout contactStatus] layouts include soldUnits + contactStatus (see getLayoutContactStatus)
      unitsFromDeveloper: unitsFromDeveloper || [],
      shareLink: buildShareLink('/newprojectdrilldown', safeProject._id)
    };

    // Step 17: Return response
    return success(res, 'Project fetched successfully', {
      project: projectResponse,
      authorizedAgencies: authorizedAgencies || [],
      similarProjects: similarProjectsResponse
    });

  } catch (error) {
    // Handle CastError (invalid ObjectId) → 400
    if (error.name === 'CastError' || error.message.includes('ObjectId')) {
      return failure(res, 400, 'Invalid project ID or slug', 'VALIDATION_ERROR');
    }

    // Log error for debugging (in development)
    console.error('Get project by ID error:', error);
    
    return failure(res, 500, 'Internal server error', 'SERVER_ERROR', 
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

// ─── Exports ──────────────────────────────────────────────
module.exports = { searchProjects, getProjectById };

