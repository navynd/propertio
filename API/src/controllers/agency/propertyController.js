const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Properties = require('../../models/propertiesModal');
const Amenities = require('../../models/amenitiesModel');
const ListingType = require('../../models/listingTypeModel');
const PropertyType = require('../../models/propertyTypeModel');
const Agents = require('../../models/agentsModel');
const Agencies = require('../../models/agenciesModel');
const ActivityLog = require('../../models/activityLogModel');

const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const uploadService = require('../../services/uploadService');
const listingSearchCityService = require('../../services/listingSearchCityService');
const { recalcAgencyStatistics } = require('../../services/agencyStatsService');

const { Types } = mongoose;

// Get Inquiry model (may be in schema file, using mongoose.model as fallback)
let Inquiry;
try {
    Inquiry = mongoose.model('Inquiry');
} catch (err) {
    // If model doesn't exist, we'll handle it in the delete function
    Inquiry = null;
}

const validateObjectId = (id) => Types.ObjectId.isValid(id);

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

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Human-readable deal state for agency property list/detail (uses dealInfo.dealClosedDate). */
const DEAL_STATUS_OPEN = 'deal-open';
const DEAL_STATUS_CLOSE = 'deal-close';

function propertyDealStatus(plain) {
    const st = String(plain?.status || '').trim().toLowerCase();
    if (st === 'sold' || st === 'rented') {
        return DEAL_STATUS_CLOSE;
    }
    const d = plain?.dealInfo?.dealClosedDate;
    if (d == null) return DEAL_STATUS_OPEN;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return DEAL_STATUS_OPEN;
    return DEAL_STATUS_CLOSE;
}

function attachDealStatus(doc) {
    const plain = doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    return { ...plain, dealStatus: propertyDealStatus(plain) };
}

/**
 * @swagger
 * /agency/properties:
 *   get:
 *     summary: Get all properties from agency agents
 *     description: >
 *       Returns all properties from all agents belonging to the authenticated agency.
 *       Supports filtering by listingType, status, agentId, location, and dateRange.
 *       Includes sorting, pagination, and statistics.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *         description: Optional ListingType ObjectId filter.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, sold, rented, pending]
 *         description: Optional status filter.
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Optional Property ObjectId. If provided, returns only this property (if owned by agency).
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Alias for propertyId.
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Optional Agent ObjectId filter to get properties from specific agent.
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Optional city filter.
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *         description: Optional zone filter.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional search by property title, city, zone, fullAddress, or building.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional start date for date range filter (publishedAt).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional end date for date range filter (publishedAt).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price-high, price-low, beds-least, beds-most]
 *         description: >
 *           Sorting mode for agency properties.
 *           Allowed values: featured, newest, price-high, price-low, beds-least, beds-most.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (pagination, ignored when propertyId/id is provided).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Page size, max 100 (pagination, ignored when propertyId/id is provided).
 *     responses:
 *       200:
 *         description: Agency properties fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single property response when propertyId/id is provided
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Agency property fetched successfully
 *                     data:
 *                       type: object
 *                 - type: object
 *                   description: Paginated response
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Agency properties fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                         statusCounts:
 *                           type: object
 *                           properties:
 *                             active: { type: integer }
 *                             inactive: { type: integer }
 *                             sold: { type: integer }
 *                             rented: { type: integer }
 *                             pending: { type: integer }
 *       400:
 *         description: Validation error (invalid ObjectId)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const getAgencyProperties = asyncHandler(async (req, res) => {
    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        // Verify agency exists
        const agency = await Agencies.findById(agencyId);
        if (!agency) {
            return failure(res, 404, 'Agency not found', 'NOT_FOUND');
        }

        const {
            listingType,
            status,
            agentId,
            city,
            zone,
            search,
            startDate,
            endDate,
            sortBy,
            page = 1,
            limit = 20,
            propertyId,
            id,
        } = req.query;

        const singleId = propertyId || id;

        // If a specific property id is provided, return only that property
        if (singleId) {
            if (!validateObjectId(singleId)) {
                return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
            }

            const property = await Properties.findOne({
                _id: singleId,
                agency: agencyId,
            }).populate([
                { path: 'agent', select: 'fullName email phoneNumber profilePicture agentType', populate: { path: 'specialization', select: 'title description' } },
                { path: 'listingType', select: 'name slug transaction category' },
                { path: 'propertyType', select: 'name slug category' },
                { path: 'amenities', model: 'Amenities', select: 'name slug category icon image' },
            ]);

            if (!property) {
                return failure(res, 404, 'Property not found', 'NOT_FOUND');
            }

            return success(res, 'Agency property fetched successfully', attachDealStatus(property));
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        // Build filter: all properties from agents in this agency
        const filter = {
            agency: new Types.ObjectId(agencyId),
        };

        // Filter by specific agent if provided
        if (agentId && validateObjectId(agentId)) {
            // Verify agent belongs to this agency
            const agent = await Agents.findOne({ _id: agentId, agency: agencyId });
            if (!agent) {
                return failure(res, 404, 'Agent not found or does not belong to your agency', 'NOT_FOUND');
            }
            filter.agent = new Types.ObjectId(agentId);
        }

        if (listingType && validateObjectId(listingType)) {
            filter.listingType = listingType;
        }

        const statusNorm = status ? String(status).trim().toLowerCase() : '';
        const ALLOWED_STATUSES = new Set(['active', 'inactive', 'sold', 'rented', 'pending']);

        if (statusNorm) {
            if (statusNorm.includes(',')) {
                const parts = statusNorm
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => ALLOWED_STATUSES.has(s));
                if (parts.length === 1) {
                    filter.status = parts[0];
                } else if (parts.length > 1) {
                    filter.status = { $in: parts };
                }
            } else if (ALLOWED_STATUSES.has(statusNorm)) {
                filter.status = statusNorm;
            }
        }

        // Location filters
        if (city) {
            filter['location.city'] = new RegExp(city, 'i');
        }
        if (zone) {
            filter['location.zone'] = new RegExp(zone, 'i');
        }

        const searchTrimmed = search && String(search).trim() ? String(search).trim() : '';
        const searchOr = searchTrimmed
            ? (() => {
                const searchRegex = new RegExp(escapeRegex(searchTrimmed), 'i');
                return [
                    { title: searchRegex },
                    { 'location.city': searchRegex },
                    { 'location.zone': searchRegex },
                    { 'location.fullAddress': searchRegex },
                    { 'location.building': searchRegex },
                ];
            })()
            : null;

        if (searchOr) {
            filter.$or = searchOr;
        }

        // Date range filter
        if (startDate || endDate) {
            filter.publishedAt = {};
            if (startDate) {
                filter.publishedAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.publishedAt.$lte = new Date(endDate);
            }
        }

        // Sorting (aligned with public property search)
        const sortByValue = String(sortBy || '').trim().toLowerCase();
        const sortByNormalized = (() => {
            switch (sortByValue) {
                case 'price_asc':
                case 'price-asc':
                case 'priceasc':
                    return 'price-low';
                case 'price_desc':
                case 'price-desc':
                case 'pricedesc':
                    return 'price-high';
                case 'beds_asc':
                case 'beds-asc':
                case 'bedsasc':
                    return 'beds-least';
                case 'beds_desc':
                case 'beds-desc':
                case 'bedsdesc':
                    return 'beds-most';
                default:
                    return sortByValue;
            }
        })();
        let sort = {};
        switch (sortByNormalized) {
            case 'featured':
                sort = { 'featured.priority': -1, isFeatured: -1, publishedAt: -1 };
                break;
            case 'newest':
                sort = { publishedAt: -1 };
                break;
            case 'price-high':
                sort = { price: -1 };
                break;
            case 'price-low':
                sort = { price: 1 };
                break;
            case 'beds-least':
                sort = { bedrooms: 1 };
                break;
            case 'beds-most':
                sort = { bedrooms: -1 };
                break;
            default:
                sort = { 'featured.priority': -1, isFeatured: -1, publishedAt: -1 };
        }

        // Fetch properties with agent details populated
        const [properties, total, statusAgg] = await Promise.all([
            Properties.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate([
                    { path: 'agent', select: 'fullName email phoneNumber profilePicture agentType',populate: { path: 'specialization', select: 'title description' } },
                    { path: 'listingType', select: 'name slug transaction category' },
                    { path: 'propertyType', select: 'name slug category' },
                    { path: 'amenities', model: 'Amenities', select: 'name slug category icon image' },
                ]),
            Properties.countDocuments(filter),
            // Status counts for this agency
            Properties.aggregate([
                {
                    $match: {
                        agency: new Types.ObjectId(agencyId),
                        ...(listingType && validateObjectId(listingType)
                            ? { listingType: new Types.ObjectId(listingType) }
                            : {}),
                        ...(agentId && validateObjectId(agentId) ? { agent: new Types.ObjectId(agentId) } : {}),
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const totalPages = Math.ceil(total / limitNum) || 1;

        const statusCounts = statusAgg.reduce(
            (acc, item) => {
                acc[item._id] = item.count;
                return acc;
            },
            { active: 0, inactive: 0, sold: 0, rented: 0, pending: 0 },
        );

        const data = {
            items: properties.map((p) => attachDealStatus(p)),
            pagination: {
                total,
                totalPages,
                page: pageNum,
                limit: limitNum,
            },
            statusCounts,
        };

        return success(res, 'Agency properties fetched successfully', data);
    } catch (error) {
        logger.error('Get agency properties failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to fetch properties', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agency/properties/{id}:
 *   put:
 *     summary: Update a property (Agency)
 *     description: >
 *       Updates any property from agents belonging to the authenticated agency.
 *       Agency can edit any property from their agents. Changes are logged with agency admin as the modifier.
 *       If price is changed, a new entry is added to `priceHistory`.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Property fields to update (partial update supported)
 *             additionalProperties: true
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               listingType:
 *                 type: string
 *                 description: ListingType ObjectId
 *               propertyType:
 *                 type: string
 *                 description: PropertyType ObjectId
 *               bedrooms:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               maidBedroom:
 *                 type: boolean
 *               bathrooms:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               area:
 *                 type: object
 *                 properties:
 *                   sqm:
 *                     oneOf:
 *                       - type: number
 *                       - type: string
 *                   sqft:
 *                     oneOf:
 *                       - type: number
 *                       - type: string
 *               areaSqm:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `area.sqm`
 *               areaSqft:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `area.sqft`
 *               price:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               propertyPrice:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `price`
 *               monthlyRentalPrice:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `price`
 *               priceChangeReason:
 *                 type: string
 *               maintenanceFees:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               maintenanceFee:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `maintenanceFees`
 *               serviceCharges:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               serviceCharge:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *                 description: Alias for `serviceCharges`
 *               currency:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 description: Array of amenity ObjectIds
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 description: Images payload (max 50). Supports strings or objects with `url`.
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         isPrimary:
 *                           type: boolean
 *                         order:
 *                           type: number
 *                         caption:
 *                           type: string
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *               propertyImages:
 *                 type: array
 *                 description: Alias for `images`
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         isPrimary:
 *                           type: boolean
 *                         order:
 *                           type: number
 *                         caption:
 *                           type: string
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *               floorPlan:
 *                 type: array
 *                 description: Floor plan files/urls array
 *                 items:
 *                   type: string
 *               floorPlans:
 *                 type: array
 *                 description: Alias for `floorPlan`
 *                 items:
 *                   type: string
 *               floorPlanFiles:
 *                 type: array
 *                 description: Alias for `floorPlan`
 *                 items:
 *                   type: string
 *               virtualTour360:
 *                 type: string
 *               tour360:
 *                 type: string
 *                 description: Alias for `virtualTour360`
 *               tour360Url:
 *                 type: string
 *                 description: Alias for `virtualTour360`
 *               referenceId:
 *                 type: string
 *               status:
 *                 type: string
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               metaKeywords:
 *                 type: string
 *               dldPermitNumber:
 *                 type: string
 *               dldPermitUrl:
 *                 type: string
 *               completionStatus:
 *                 type: string
 *               furnishedStatus:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                   city:
 *                     type: string
 *                   zone:
 *                     type: string
 *                   building:
 *                     type: string
 *                   googlePlaceId:
 *                     type: string
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: Point
 *                       coordinates:
 *                         type: array
 *                         description: [lng, lat]
 *                         items:
 *                           type: number
 *               fullAddress:
 *                 type: string
 *                 description: Alias for `location.fullAddress`
 *               city:
 *                 type: string
 *                 description: Alias for `location.city`
 *               zone:
 *                 type: string
 *                 description: Alias for `location.zone`
 *               zoneLocation:
 *                 type: string
 *                 description: Alias for `location.zone`
 *               building:
 *                 type: string
 *                 description: Alias for `location.building`
 *               googlePlaceId:
 *                 type: string
 *                 description: Alias for `location.googlePlaceId`
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     oneOf:
 *                       - type: number
 *                       - type: string
 *                   lng:
 *                     oneOf:
 *                       - type: number
 *                       - type: string
 *               latitude:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *               longitude:
 *                 oneOf:
 *                   - type: number
 *                   - type: string
 *           example:
 *             title: "Updated 2BR Apartment with Burj View"
 *             description: "Renovated unit with skyline views."
 *             listingType: "65f1a9b2c9f1a9b2c9f1a9b2"
 *             propertyType: "65f1a9b2c9f1a9b2c9f1a9b3"
 *             bedrooms: 3
 *             bathrooms: 3
 *             areaSqm: 125
 *             price: 2550000
 *             priceChangeReason: "Market adjustment"
 *             currency: "AED"
 *             amenities: ["65f1a9b2c9f1a9b2c9f1a9b4", "65f1a9b2c9f1a9b2c9f1a9b5"]
 *             propertyImages:
 *               - url: "image1.jpg"
 *                 isPrimary: true
 *                 order: 0
 *               - "image2.jpg"
 *             floorPlans: ["floorplan1.pdf"]
 *             tour360Url: "https://example.com/virtual-tour"
 *             location:
 *               fullAddress: "Downtown Dubai, UAE"
 *               city: "Dubai"
 *               zone: "Downtown"
 *               building: "Burj Vista"
 *               googlePlaceId: "ChIJ..."
 *             latitude: 25.1972
 *             longitude: 55.2744
 *             status: "active"
 *             publishedAt: "2026-04-08T12:00:00.000Z"
 *             metaTitle: "2BR Apartment Downtown Dubai"
 *             metaDescription: "Spacious 2BR with Burj view."
 *             metaKeywords: "downtown, apartment, burj view"
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (property does not belong to agency)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const updateProperty = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const propertyId = req.params.id;
        if (!validateObjectId(propertyId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
        }

        const property = await Properties.findById(propertyId).session(session);
        if (!property) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Property not found', 'NOT_FOUND');
        }

        // Verify property belongs to this agency
        if (property.agency.toString() !== agencyId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to update this property', 'FORBIDDEN');
        }

        const prevCityRawForSearchIndex = property.location?.city;
        const prevStatusForSearchIndex = property.status;

        // Get agency info for logging
        const agency = await Agencies.findById(agencyId).session(session);

        // Extract update fields (same structure as agent updateProperty)
        const {
            title,
            description,
            listingType,
            propertyType,
            bedrooms,
            maidBedroom,
            bathrooms,
            area,
            areaSqm,
            areaSqft,
            price,
            propertyPrice,
            monthlyRentalPrice,
            maintenanceFees,
            serviceCharges,
            currency,
            location,
            fullAddress,
            city,
            zone,
            building,
            googlePlaceId,
            coordinates,
            latitude,
            longitude,
            dldPermitNumber,
            dldPermitUrl,
            furnishedStatus,
            completionStatus,
            amenities,
            images,
            propertyImages,
            virtualTour360,
            tour360,
            tour360Url,
            floorPlan,
            floorPlans,
            floorPlanFiles,
            referenceId,
            status,
            publishedAt,
            metaTitle,
            metaDescription,
            metaKeywords,
            serviceCharge,
            maintenanceFee,
            zoneLocation,
            priceChangeReason,
        } = req.body || {};

        // Validate optional references if provided
        if (listingType && !validateObjectId(listingType)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid listingType', 'VALIDATION_ERROR');
        }
        if (propertyType && !validateObjectId(propertyType)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid propertyType', 'VALIDATION_ERROR');
        }

        if (listingType) {
            const listingTypeExists = await ListingType.exists({ _id: listingType }).session(session);
            if (!listingTypeExists) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Listing type not found', 'NOT_FOUND');
            }
            property.listingType = listingType;
        }

        if (propertyType) {
            const propertyTypeExists = await PropertyType.exists({ _id: propertyType }).session(session);
            if (!propertyTypeExists) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Property type not found', 'NOT_FOUND');
            }
            property.propertyType = propertyType;
        }

        const amenityIds = normalizeArray(amenities).filter(Boolean);
        if (amenityIds.length) {
            const invalidAmenity = amenityIds.find((id) => !validateObjectId(id));
            if (invalidAmenity) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, `Invalid amenity id: ${invalidAmenity}`, 'VALIDATION_ERROR');
            }
            const foundAmenities = await Amenities.countDocuments({ _id: { $in: amenityIds } }).session(session);
            if (foundAmenities !== amenityIds.length) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'One or more amenities not found', 'NOT_FOUND');
            }
        }

        // Numbers
        const parsedBedrooms = bedrooms !== undefined ? toNumberOrNull(bedrooms) : null;
        const parsedBathrooms = bathrooms !== undefined ? toNumberOrNull(bathrooms) : null;
        const parsedAreaSqm =
            area?.sqm !== undefined || areaSqm !== undefined ? toNumberOrNull(area?.sqm ?? areaSqm) : null;
        const parsedAreaSqft =
            area?.sqft !== undefined || areaSqft !== undefined ? toNumberOrNull(area?.sqft ?? areaSqft) : null;
        const parsedMaintenance =
            maintenanceFees !== undefined || maintenanceFee !== undefined
                ? toNumberOrNull(maintenanceFees ?? maintenanceFee)
                : null;
        const parsedServiceCharges =
            serviceCharges !== undefined || serviceCharge !== undefined
                ? toNumberOrNull(serviceCharges ?? serviceCharge)
                : null;

        const newPrimaryPrice =
            toNumberOrNull(price) ??
            toNumberOrNull(propertyPrice) ??
            toNumberOrNull(monthlyRentalPrice);

        // Track price changes
        if (newPrimaryPrice !== null && newPrimaryPrice !== property.price) {
            property.priceHistory = property.priceHistory || [];
            property.priceHistory.push({
                price: newPrimaryPrice,
                changedAt: new Date(),
                changedBy: agencyId, // Agency ID instead of agent ID
                reason: priceChangeReason,
            });
            property.price = newPrimaryPrice;
        }

        // Basic fields
        if (title !== undefined) property.title = title;
        if (description !== undefined) property.description = description;
        if (parsedBedrooms !== null) property.bedrooms = parsedBedrooms;
        if (maidBedroom !== undefined) property.maidBedroom = Boolean(maidBedroom);
        if (parsedBathrooms !== null) property.bathrooms = parsedBathrooms;

        if (parsedAreaSqm !== null || parsedAreaSqft !== null) {
            property.area = property.area || {};
            if (parsedAreaSqm !== null) property.area.sqm = parsedAreaSqm;
            if (parsedAreaSqft !== null) property.area.sqft = parsedAreaSqft;
        }

        if (amenityIds.length) {
            property.amenities = amenityIds;
        }

        if (parsedMaintenance !== null) property.maintenanceFees = parsedMaintenance;
        if (parsedServiceCharges !== null) property.serviceCharges = parsedServiceCharges;
        if (currency !== undefined) property.currency = currency;

        // Images & floor plans
        const normalizedImagesInput = normalizeArray(images || propertyImages);
        if (normalizedImagesInput.length) {
            if (normalizedImagesInput.length > 50) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'You can upload up to 50 images', 'VALIDATION_ERROR');
            }

            const imagePayload = normalizedImagesInput
                .map((img, idx) => {
                    if (typeof img === 'string') {
                        const filename = img.includes('/') ? img.split('/').pop() : img;
                        return { url: filename, order: idx };
                    }
                    if (img && typeof img === 'object' && img.url) {
                        const filename = img.url.includes('/') ? img.url.split('/').pop() : img.url;
                        return {
                            url: filename,
                            isPrimary: Boolean(img.isPrimary),
                            order: typeof img.order === 'number' ? img.order : idx,
                            caption: img.caption,
                            uploadedAt: img.uploadedAt,
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            property.images = imagePayload;
        }

        const floorPlanPayload = normalizeArray(floorPlan || floorPlans || floorPlanFiles).filter(Boolean);
        if (floorPlanPayload.length) {
            property.floorPlan = floorPlanPayload;
        }

        const virtualTourUrl = tour360Url || tour360 || virtualTour360;
        if (virtualTourUrl !== undefined) {
            property.virtualTour360 = virtualTourUrl || undefined;
        }

        if (referenceId !== undefined) property.referenceId = referenceId;
        if (status !== undefined) property.status = status;
        if (completionStatus !== undefined) property.completionStatus = completionStatus;
        if (furnishedStatus !== undefined) property.furnishedStatus = furnishedStatus;
        if (publishedAt !== undefined) property.publishedAt = publishedAt;
        if (metaTitle !== undefined) property.metaTitle = metaTitle;
        if (metaDescription !== undefined) property.metaDescription = metaDescription;
        if (metaKeywords !== undefined) property.metaKeywords = metaKeywords;
        if (dldPermitNumber !== undefined) property.dldPermitNumber = dldPermitNumber;
        if (dldPermitUrl !== undefined) property.dldPermitUrl = dldPermitUrl;

        // Location updates (only if explicitly provided)
        const hasLocationUpdate =
            location !== undefined ||
            fullAddress !== undefined ||
            city !== undefined ||
            zone !== undefined ||
            zoneLocation !== undefined ||
            building !== undefined ||
            googlePlaceId !== undefined ||
            latitude !== undefined ||
            longitude !== undefined ||
            coordinates !== undefined;

        if (hasLocationUpdate) {
            const incomingLocation = location && typeof location === 'object' ? location : {};

            const nextFullAddress = fullAddress !== undefined ? fullAddress : incomingLocation.fullAddress;
            const nextCity = city !== undefined ? city : incomingLocation.city;
            const nextZone =
                zone !== undefined || zoneLocation !== undefined
                    ? zoneLocation || zone
                    : incomingLocation.zone;
            const nextBuilding = building !== undefined ? building : incomingLocation.building;
            const nextGooglePlaceId =
                googlePlaceId !== undefined ? googlePlaceId : incomingLocation.googlePlaceId;

            if (nextFullAddress !== undefined) property.set('location.fullAddress', nextFullAddress);
            if (nextCity !== undefined) property.set('location.city', nextCity);
            if (nextZone !== undefined) property.set('location.zone', nextZone);
            if (nextBuilding !== undefined) property.set('location.building', nextBuilding);
            if (nextGooglePlaceId !== undefined) property.set('location.googlePlaceId', nextGooglePlaceId);

            const directCoordinates = incomingLocation.coordinates;
            const directValidPoint =
                directCoordinates &&
                typeof directCoordinates === 'object' &&
                directCoordinates.type === 'Point' &&
                Array.isArray(directCoordinates.coordinates) &&
                directCoordinates.coordinates.length === 2 &&
                Number.isFinite(Number(directCoordinates.coordinates[0])) &&
                Number.isFinite(Number(directCoordinates.coordinates[1]));

            let nextPoint = null;
            if (directValidPoint) {
                nextPoint = {
                    type: 'Point',
                    coordinates: [
                        Number(directCoordinates.coordinates[0]),
                        Number(directCoordinates.coordinates[1]),
                    ],
                };
            } else if (latitude !== undefined || longitude !== undefined || coordinates !== undefined) {
                const lat = toNumberOrNull(latitude ?? coordinates?.lat ?? coordinates?.latitude);
                const lng = toNumberOrNull(longitude ?? coordinates?.lng ?? coordinates?.longitude);
                if (lat !== null && lng !== null) {
                    nextPoint = { type: 'Point', coordinates: [lng, lat] };
                }
            }

            if (nextPoint) {
                property.set('location.coordinates', nextPoint);
            }
        }

        const nextCityRawForSearchIndex = property.location?.city;
        const nextStatusForSearchIndex = property.status;

        // System fields - mark as modified by agency
        property.lastModifiedAt = new Date();
        // Note: lastModifiedBy is for agent, but we can track agency changes in activity log
        // Keep the original agent as lastModifiedBy, but log agency action separately

        await property.save({ session });

        // Log activity with agency as actor
        await ActivityLog.create(
            [
                {
                    actor: {
                        actorType: 'agency',
                        actorId: agencyId,
                    },
                    action: 'update',
                    resource: {
                        resourceType: 'property',
                        resourceId: property._id,
                    },
                    description: `Property updated by agency: ${agency?.agencyName || 'Agency'}`,
                    changes: {
                        before: {
                            title: property.title,
                            price: property.price,
                        },
                        after: {
                            title: title || property.title,
                            price: newPrimaryPrice || property.price,
                        },
                    },
                    metadata: {
                        propertyId: property._id,
                        agentId: property.agent,
                        agencyId: agencyId,
                    },
                    status: 'success',
                    timestamp: new Date(),
                },
            ],
            { session },
        );

        await property.populate([
            { path: 'agent', select: 'fullName email phoneNumber' },
            { path: 'listingType', select: 'name slug transaction category' },
            { path: 'propertyType', select: 'name slug category' },
            { path: 'amenities', model: 'Amenities', select: 'name slug category icon' },
        ]);
        await recalcAgencyStatistics(agencyId, session);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService
            .reconcilePropertyListingCity({
                prevCityRaw: prevCityRawForSearchIndex,
                nextCityRaw: nextCityRawForSearchIndex,
                prevStatus: prevStatusForSearchIndex,
                nextStatus: nextStatusForSearchIndex,
            })
            .catch((err) => {
                logger.error('ListingSearchCity reconcile (agency property update) failed', { error: err.message });
            });

        return success(res, 'Property updated successfully', property);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Agency update property failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update property', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agency/properties/{id}:
 *   delete:
 *     summary: Soft delete a property (Agency)
 *     description: >
 *       Soft deletes a property by setting `isActive = false`. Only allowed if property has no active inquiries.
 *       The property is not permanently removed but marked as inactive. Deletion reason is logged.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deletionReason:
 *                 type: string
 *                 description: Reason for deletion (optional)
 *                 example: "Property no longer available"
 *     responses:
 *       200:
 *         description: Property soft deleted successfully
 *       400:
 *         description: Validation error or property has active inquiries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (property does not belong to agency)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const deleteProperty = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const propertyId = req.params.id;
        if (!validateObjectId(propertyId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
        }

        const property = await Properties.findById(propertyId).session(session);
        if (!property) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Property not found', 'NOT_FOUND');
        }

        // Verify property belongs to this agency
        if (property.agency.toString() !== agencyId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to delete this property', 'FORBIDDEN');
        }

        // Check for active inquiries
        if (Inquiry) {
            const activeInquiries = await Inquiry.countDocuments({
                property: propertyId,
                status: { $in: ['new', 'attended'] }, // Active statuses
            }).session(session);

            if (activeInquiries > 0) {
                await session.abortTransaction();
                session.endSession();
                return failure(
                    res,
                    400,
                    `Cannot delete property with ${activeInquiries} active inquiry/inquiries. Please close or resolve them first.`,
                    'VALIDATION_ERROR',
                );
            }
        }

        const { deletionReason } = req.body || {};

        // Soft delete: set isActive = false and status = inactive
        const previousStatus = property.status;
        property.isActive = false;
        property.status = 'inactive';
        property.deactivatedAt = new Date();
        property.deactivatedBy = agencyId; // Store agency ID
        property.lastModifiedAt = new Date();

        await property.save({ session });

        // Get agency info for logging
        const agency = await Agencies.findById(agencyId).session(session);

        // Log activity
        await ActivityLog.create(
            [
                {
                    actor: {
                        actorType: 'agency',
                        actorId: agencyId,
                    },
                    action: 'delete',
                    resource: {
                        resourceType: 'property',
                        resourceId: property._id,
                    },
                    description: `Property soft deleted by agency: ${agency?.agencyName || 'Agency'}`,
                    changes: {
                        before: {
                            isActive: true,
                            status: previousStatus,
                        },
                        after: {
                            isActive: false,
                            status: 'inactive',
                        },
                    },
                    metadata: {
                        deletionReason: deletionReason || 'No reason provided',
                        propertyId: property._id,
                        agentId: property.agent,
                        agencyId: agencyId,
                    },
                    status: 'success',
                    timestamp: new Date(),
                },
            ],
            { session },
        );

        await property.populate([
            { path: 'agent', select: 'fullName email' },
            { path: 'listingType', select: 'name slug' },
            { path: 'propertyType', select: 'name slug' },
        ]);
        await recalcAgencyStatistics(agencyId, session);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService
            .onPropertyRemovedFromSearch(property.location?.city, previousStatus === 'active')
            .catch((err) => {
                logger.error('ListingSearchCity decrement (agency property delete) failed', { error: err.message });
            });

        return success(res, 'Property soft deleted successfully', property);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Agency delete property failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to delete property', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agency/properties/upload-media:
 *   post:
 *     summary: Upload or remove property media (Agency)
 *     description: >
 *       Unified multipart endpoint to upload images and/or one video, and optionally remove existing media
 *       by key (filename, full URL, or image MongoDB _id). If `propertyId` is provided, the property must
 *       belong to the authenticated agency (`property.agency` matches the agency); uploads are persisted on
 *       that listing (DB stores image filenames and `videoTour` filename). If `propertyId` is omitted, works
 *       as a pre-upload: returns URLs/filenames for use when creating or updating properties (same storage
 *       layout as `/agents/properties/upload-media`).
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: Optional property ObjectId. When set, agency must own the property (same agency as listing).
 *                 example: "65f12f0f9a9b9c0a1b2c3d4e"
 *               removeKeys:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: >
 *                   Keys to remove. Supports image filename, image URL, image _id, or video filename/URL.
 *                   `propertyId` is required when removing.
 *                 example: ["livingroom-uuid.webp", "tour-uuid.mp4"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Up to 50 image files (field name `images`).
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: At most one video file (field name `video`).
 *     responses:
 *       200:
 *         description: Media processed successfully
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
 *                   example: Media processed successfully
 *                 data:
 *                   description: Standard upload payload (baseUrl, uploads.images/videos, baseUrls) plus optional nested `property` when propertyId was provided
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Validation error (invalid propertyId, too many files, remove without propertyId, multer limits, etc.)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (property does not belong to this agency)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const uploadAgencyPropertyMedia = asyncHandler(async (req, res) => {
    try {
        const agencyId = req.user?.id || req.user?._id;
        if (!agencyId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { propertyId, removeKeys } = req.body;
        const removeKeyArray = Array.isArray(removeKeys) ? removeKeys : removeKeys ? [removeKeys] : [];

        let property = null;

        if (propertyId) {
            if (!validateObjectId(propertyId)) {
                return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
            }

            property = await Properties.findById(propertyId);
            if (!property) {
                return failure(res, 404, 'Property not found', 'NOT_FOUND');
            }

            if (property.agency.toString() !== agencyId.toString()) {
                return failure(res, 403, 'You do not have permission to modify this property', 'FORBIDDEN');
            }
        }

        const removedImages = [];
        const removedImageUrls = [];
        let removedVideo = null;
        let removedVideoUrl = null;

        if (removeKeyArray.length > 0) {
            if (!property) {
                return failure(res, 400, 'Property ID is required to remove media', 'VALIDATION_ERROR');
            }

            for (const removeKey of removeKeyArray) {
                const removeFilename = removeKey.includes('/')
                    ? removeKey.split('/').pop()
                    : removeKey;

                const imageIndex = property.images?.findIndex((img) => {
                    const imgFilename = img.url.includes('/') ? img.url.split('/').pop() : img.url;
                    return (
                        img.url === removeKey ||
                        img.url === removeFilename ||
                        imgFilename === removeFilename ||
                        img._id?.toString() === removeKey
                    );
                });

                if (imageIndex !== -1 && imageIndex !== undefined) {
                    const imageToRemove = property.images[imageIndex];
                    let imageUrl = imageToRemove.url;
                    if (!imageUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                imageUrl = `${baseUrl}/img/property/${imageToRemove.url}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/img/property/${imageToRemove.url}`;
                            }
                        } else {
                            imageUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/img/property/${imageToRemove.url}`;
                        }
                    }

                    await uploadService.delete(imageUrl).catch((err) => {
                        logger.warn('Failed to delete image file (agency)', { error: err.message, url: imageUrl });
                    });
                    property.images.splice(imageIndex, 1);
                    removedImages.push(imageToRemove.url);
                    removedImageUrls.push(imageUrl);
                } else {
                    const videoFilename = property.videoTour?.includes('/')
                        ? property.videoTour.split('/').pop()
                        : property.videoTour;

                    if (property.videoTour && (property.videoTour === removeKey || videoFilename === removeFilename)) {
                        let videoUrl = property.videoTour;
                        if (!videoUrl.startsWith('http')) {
                            const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                            if (storage === 's3') {
                                const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                                if (cloudfrontUrl) {
                                    const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                    videoUrl = `${baseUrl}/vid/property/${property.videoTour}`;
                                } else {
                                    const bucket = process.env.AWS_S3_BUCKET;
                                    const region = process.env.AWS_REGION;
                                    videoUrl = `https://${bucket}.s3.${region}.amazonaws.com/vid/property/${property.videoTour}`;
                                }
                            } else {
                                videoUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/vid/property/${property.videoTour}`;
                            }
                        }

                        await uploadService.delete(videoUrl).catch((err) => {
                            logger.warn('Failed to delete video file (agency)', { error: err.message, url: videoUrl });
                        });
                        removedVideo = property.videoTour;
                        removedVideoUrl = videoUrl;
                        property.videoTour = null;
                    }
                }
            }
        }

        const uploadedImages = [];
        let uploadedVideo = null;

        if (req.files?.images && Array.isArray(req.files.images)) {
            if (req.files.images.length > 50) {
                return failure(res, 400, 'You can upload up to 50 images', 'VALIDATION_ERROR');
            }

            if (property) {
                const currentImagesCount = property.images?.length || 0;
                if (currentImagesCount + req.files.images.length > 50) {
                    return failure(
                        res,
                        400,
                        `Total images cannot exceed 50. You have ${currentImagesCount} existing images.`,
                        'VALIDATION_ERROR'
                    );
                }
            }

            const baseOrder = property ? (property.images?.length || 0) : 0;
            for (const [idx, imageFile] of req.files.images.entries()) {
                const uploaded = await uploadService.upload(imageFile, 'property', {
                    generateThumbnail: false,
                });

                const filename = uploaded.path.split('/').pop() || uploaded.filename;

                const imageData = {
                    url: uploaded.url,
                    path: uploaded.path,
                    filename,
                    size: uploaded.size,
                    mimetype: uploaded.mimetype || imageFile.mimetype || 'image/webp',
                    isPrimary: false,
                    order: baseOrder + idx,
                    uploadedAt: new Date(),
                };
                uploadedImages.push(imageData);

                if (property) {
                    property.images = [
                        ...(property.images || []),
                        {
                            url: filename,
                            isPrimary: false,
                            order: baseOrder + idx,
                            uploadedAt: new Date(),
                        },
                    ];
                }
            }
        }

        if (req.files?.video && Array.isArray(req.files.video) && req.files.video.length > 0) {
            if (req.files.video.length > 1) {
                return failure(res, 400, 'You can upload only one video', 'VALIDATION_ERROR');
            }

            const videoFile = req.files.video[0];
            const uploaded = await uploadService.uploadVideo(videoFile, 'property');
            uploadedVideo = uploaded.url;

            const videoFilename = uploaded.path.split('/').pop() || uploaded.filename;

            if (property) {
                if (property.videoTour) {
                    let oldVideoUrl = property.videoTour;
                    if (!oldVideoUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                oldVideoUrl = `${baseUrl}/vid/property/${property.videoTour}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                oldVideoUrl = `https://${bucket}.s3.${region}.amazonaws.com/vid/property/${property.videoTour}`;
                            }
                        } else {
                            oldVideoUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/vid/property/${property.videoTour}`;
                        }
                    }
                    await uploadService.delete(oldVideoUrl).catch((err) => {
                        logger.warn('Failed to delete old video (agency)', { error: err.message });
                    });
                }
                property.videoTour = videoFilename;
            }
        }

        if (property) {
            property.lastModifiedAt = new Date();
            await property.save();
        }

        const allUploads = [...uploadedImages];
        if (uploadedVideo) {
            allUploads.push({
                url: uploadedVideo,
                path: `vid/property/${uploadedVideo.split('/').pop()}`,
                filename: uploadedVideo.split('/').pop(),
                size: 0,
                mimetype: 'video/mp4',
            });
        }

        const responseData = uploadService.buildStandardResponse(
            allUploads,
            {
                images: 'property',
                videos: 'property',
            },
            property
                ? {
                      property: {
                          id: property._id,
                          totalImages: property.images?.length || 0,
                          videoTour: property.videoTour || null,
                          ...(removedImages.length > 0 && {
                              removedImages: removedImages.map((value) =>
                                  value.includes('/') ? value.split('/').pop() : value
                              ),
                              removedImageUrls,
                          }),
                          ...(removedVideo && {
                              removedVideo: removedVideo.includes('/') ? removedVideo.split('/').pop() : removedVideo,
                              removedVideoUrl,
                          }),
                      },
                  }
                : {}
        );

        return success(res, 'Media processed successfully', responseData);
    } catch (error) {
        logger.error('Agency upload property media failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to process media', 'SERVER_ERROR');
    }
});

module.exports = {
    getAgencyProperties,
    updateProperty,
    deleteProperty,
    uploadAgencyPropertyMedia,
};

