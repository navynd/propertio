const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Properties = require('../../models/propertiesModal');
const Amenities = require('../../models/amenitiesModel');
const ListingType = require('../../models/listingTypeModel');
const PropertyType = require('../../models/propertyTypeModel');
const Agents = require('../../models/agentsModel');
const Agencies = require('../../models/agenciesModel');
const ActivityLog = require('../../models/activityLogModel');
const DealClosure = require('../../models/dealClosureModel');

const { success, failure, generateSlug } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { SORT_BY_PROPERTY } = require('../../utils/constants');
const { escapeRegex } = require('../../utils/searchKeyword');

const uploadService = require('../../services/uploadService');
const listingSearchCityService = require('../../services/listingSearchCityService');
const { recalcAgentStatistics } = require('../../services/agentStatsService');
const { recalcAgencyStatistics } = require('../../services/agencyStatsService');

const PROPERTY_IMAGES_FOLDER = 'property-images';
const PROPERTY_VIDEOS_FOLDER = 'property-videos';

const { Types } = mongoose;

/** Public listing site base URL (e.g. FRONTEND_URL in .env) — no trailing slash */
const PROPERTY_DRILLDOWN_FRONTEND_BASE = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');

// Helper to delete all media files for a property (images + video).
// Runs outside DB transactions; failures are logged but do not block the main operation.
const deletePropertyMediaFiles = async (property) => {
    if (!property) return;

    const images = property.images || [];
    const videoTour = property.videoTour;
    const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();

    // Delete images
    for (const image of images) {
        try {
            if (!image || (!image.url && !image.filename)) continue;

            let imageUrl = image.url || image.filename;

            if (!imageUrl.startsWith('http')) {
                if (storage === 's3') {
                    const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                    if (cloudfrontUrl) {
                        const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                        imageUrl = `${baseUrl}/img/property/${imageUrl}`;
                    } else {
                        const bucket = process.env.AWS_S3_BUCKET;
                        const region = process.env.AWS_REGION;
                        imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/img/property/${imageUrl}`;
                    }
                } else {
                    imageUrl = `${
                        uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'
                    }/img/property/${imageUrl}`;
                }
            }

            // Best-effort delete; ignore failures
            // eslint-disable-next-line no-await-in-loop
            await uploadService.delete(imageUrl).catch((err) => {
                logger.warn('Failed to delete property image file', {
                    error: err.message,
                    url: imageUrl,
                });
            });
        } catch (err) {
            logger.warn('Unexpected error when deleting property image file', {
                error: err.message,
            });
        }
    }

    // Delete video
    if (videoTour) {
        try {
            let videoUrl = videoTour;

            if (!videoUrl.startsWith('http')) {
                if (storage === 's3') {
                    const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                    if (cloudfrontUrl) {
                        const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                        videoUrl = `${baseUrl}/vid/property/${videoTour}`;
                    } else {
                        const bucket = process.env.AWS_S3_BUCKET;
                        const region = process.env.AWS_REGION;
                        videoUrl = `https://${bucket}.s3.${region}.amazonaws.com/vid/property/${videoTour}`;
                    }
                } else {
                    videoUrl = `${
                        uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'
                    }/vid/property/${videoTour}`;
                }
            }

            await uploadService.delete(videoUrl).catch((err) => {
                logger.warn('Failed to delete property video file', {
                    error: err.message,
                    url: videoUrl,
                });
            });
        } catch (err) {
            logger.warn('Unexpected error when deleting property video file', {
                error: err.message,
            });
        }
    }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     PropertyCoordinates:
 *       type: object
 *       description: GeoJSON point used internally for storing coordinates.
 *       properties:
 *         type:
 *           type: string
 *           example: Point
 *         coordinates:
 *           type: array
 *           description: "[lng, lat]"
 *           items:
 *             type: number
 *           example: [55.2708, 25.2048]
 *     PropertyLocationInput:
 *       type: object
 *       description: Location details for the property.
 *       properties:
 *         fullAddress:
 *           type: string
 *           example: "Downtown Dubai, Dubai, UAE"
 *         city:
 *           type: string
 *           example: "Dubai"
 *         zone:
 *           type: string
 *           example: "Downtown Dubai"
 *         building:
 *           type: string
 *           example: "Burj Khalifa"
 *         googlePlaceId:
 *           type: string
 *           example: "ChIJ7U8Ytq1DXz4R3O8fJbL3wSg"
 *         coordinates:
 *           $ref: '#/components/schemas/PropertyCoordinates'
 *     PropertyAreaInput:
 *       type: object
 *       properties:
 *         sqm:
 *           type: number
 *           example: 120.5
 *         sqft:
 *           type: number
 *           example: 1297.7
 *     PropertyImageInput:
 *       type: object
 *       description: Image reference used when creating/updating properties. The API stores filenames in DB; URLs are accepted and normalized to filenames.
 *       properties:
 *         url:
 *           type: string
 *           description: "Either a filename (preferred) or a full URL returned by upload-media."
 *           example: "livingroom-550e8400-e29b-41d4-a716-446655440000.webp"
 *         isPrimary:
 *           type: boolean
 *           example: false
 *         order:
 *           type: integer
 *           example: 0
 *         caption:
 *           type: string
 *           nullable: true
 *           example: "Living room"
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-02-04T10:00:00.000Z"
 *     PropertyCreateRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - listingType
 *         - propertyType
 *         - bedrooms
 *         - bathrooms
 *         - price
 *         - dldPermitNumber
 *       properties:
 *         title:
 *           type: string
 *           example: "Luxury 2BR Apartment with Burj View"
 *         description:
 *           type: string
 *           example: "Spacious 2-bedroom apartment in Downtown Dubai..."
 *         listingType:
 *           type: string
 *           description: "ListingType ObjectId"
 *           example: "65f12f0f9a9b9c0a1b2c3d4e"
 *         propertyType:
 *           type: string
 *           description: "PropertyType ObjectId"
 *           example: "65f12f0f9a9b9c0a1b2c3d4e"
 *         bedrooms:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 2
 *         maidBedroom:
 *           type: boolean
 *           example: false
 *         bathrooms:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 2
 *         area:
 *           $ref: '#/components/schemas/PropertyAreaInput'
 *         areaSqm:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Alternative to area.sqm"
 *           example: 120.5
 *         areaSqft:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Alternative to area.sqft"
 *           example: 1297.7
 *         price:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Primary price; if omitted the API will attempt propertyPrice or monthlyRentalPrice."
 *           example: 2500000
 *         propertyPrice:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Alternative to price."
 *           example: 2500000
 *         monthlyRentalPrice:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Alternative to price for rentals."
 *           example: 12000
 *         maintenanceFees:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 1500
 *         serviceCharges:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 500
 *         currency:
 *           type: string
 *           example: "AED"
 *         fullAddress:
 *           type: string
 *           description: "Alternative to location.fullAddress"
 *           example: "Downtown Dubai, Dubai, UAE"
 *         city:
 *           type: string
 *           description: "Alternative to location.city"
 *           example: "Dubai"
 *         zone:
 *           type: string
 *           description: "Alternative to location.zone"
 *           example: "Downtown Dubai"
 *         building:
 *           type: string
 *           description: "Alternative to location.building"
 *           example: "Burj Khalifa"
 *         googlePlaceId:
 *           type: string
 *           description: "Alternative to location.googlePlaceId"
 *           example: "ChIJ7U8Ytq1DXz4R3O8fJbL3wSg"
 *         coordinates:
 *           type: object
 *           description: "Alternative to location.coordinates; accepts lat/lng."
 *           properties:
 *             lat:
 *               oneOf:
 *                 - type: number
 *                 - type: string
 *               example: 25.2048
 *             lng:
 *               oneOf:
 *                 - type: number
 *                 - type: string
 *               example: 55.2708
 *         latitude:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 25.2048
 *         longitude:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           example: 55.2708
 *         location:
 *           $ref: '#/components/schemas/PropertyLocationInput'
 *         dldPermitNumber:
 *           type: string
 *           example: "1234567890"
 *         dldPermitUrl:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/permit.pdf"
 *         furnishedStatus:
 *           type: string
 *           nullable: true
 *           example: "fully"
 *         completionStatus:
 *           type: string
 *           description: "Defaults to 'ready' if not provided."
 *           example: "ready"
 *         amenities:
 *           type: array
 *           description: "Array of Amenities ObjectIds."
 *           items:
 *             type: string
 *           example: ["65f12f0f9a9b9c0a1b2c3d4e", "65f12f0f9a9b9c0a1b2c3d4f"]
 *         images:
 *           type: array
 *           description: "Images array. You can also use propertyImages as an alias."
 *           items:
 *             oneOf:
 *               - type: string
 *               - $ref: '#/components/schemas/PropertyImageInput'
 *         propertyImages:
 *           type: array
 *           description: "Alias for images."
 *           items:
 *             oneOf:
 *               - type: string
 *               - $ref: '#/components/schemas/PropertyImageInput'
 *         videoTour:
 *           type: string
 *           description: "Filename or URL returned by upload-media."
 *           nullable: true
 *           example: "tour-550e8400-e29b-41d4-a716-446655440000.mp4"
 *         propertyVideo:
 *           type: string
 *           description: "Alias for videoTour."
 *           nullable: true
 *           example: "tour-550e8400-e29b-41d4-a716-446655440000.mp4"
 *         virtualTour360:
 *           type: string
 *           nullable: true
 *           example: "https://my-360-tour.example.com/abc"
 *         tour360:
 *           type: string
 *           nullable: true
 *           example: "https://my-360-tour.example.com/abc"
 *         tour360Url:
 *           type: string
 *           nullable: true
 *           example: "https://my-360-tour.example.com/abc"
 *         floorPlan:
 *           type: array
 *           description: "Floor plan references (filenames/URLs). You can also use floorPlans or floorPlanFiles."
 *           items:
 *             type: string
 *           example: ["floorplan-1.webp"]
 *         floorPlans:
 *           type: array
 *           items:
 *             type: string
 *         floorPlanFiles:
 *           type: array
 *           items:
 *             type: string
 *         referenceId:
 *           type: string
 *           nullable: true
 *           example: "REF-2026-0001"
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-02-04T10:00:00.000Z"
 *         metaTitle:
 *           type: string
 *           nullable: true
 *           example: "2BR Apartment Downtown Dubai"
 *         metaDescription:
 *           type: string
 *           nullable: true
 *           example: "Luxury apartment for sale in Downtown Dubai..."
 *         metaKeywords:
 *           type: string
 *           nullable: true
 *           example: "downtown dubai, apartment, 2br"
 *     PropertyMediaUploadResponse:
 *       type: object
 *       properties:
 *         imageBaseUrl:
 *           type: string
 *           example: "http://localhost:5000/uploads/property-images/"
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: "Full URL to the uploaded image (ready for clients)."
 *                 example: "http://localhost:5000/uploads/property-images/livingroom-uuid.webp"
 *               filename:
 *                 type: string
 *                 description: "Filename saved in DB for Properties.images.url."
 *                 example: "livingroom-uuid.webp"
 *               isPrimary:
 *                 type: boolean
 *                 example: false
 *               order:
 *                 type: integer
 *                 example: 0
 *               uploadedAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-02-04T10:00:00.000Z"
 *         imageFileNames:
 *           type: array
 *           items:
 *             type: string
 *           example: ["livingroom-uuid.webp"]
 *         imageUrls:
 *           type: array
 *           description: "Returned only when propertyId is NOT provided (pre-upload for createProperty)."
 *           items:
 *             type: string
 *           example: ["http://localhost:5000/uploads/property-images/livingroom-uuid.webp"]
 *         videoBaseUrl:
 *           type: string
 *           nullable: true
 *           example: "http://localhost:5000/uploads/property-videos/"
 *         video:
 *           type: string
 *           nullable: true
 *           description: "Full URL to the uploaded video (if any)."
 *           example: "http://localhost:5000/uploads/property-videos/tour-uuid.mp4"
 *         videoUrl:
 *           type: string
 *           nullable: true
 *           description: "Returned only when propertyId is NOT provided (pre-upload for createProperty)."
 *           example: "http://localhost:5000/uploads/property-videos/tour-uuid.mp4"
 *         totalImages:
 *           type: integer
 *           description: "Returned only when propertyId IS provided."
 *           example: 6
 *         videoTour:
 *           type: string
 *           nullable: true
 *           description: "Returned only when propertyId IS provided. Filename stored in DB."
 *           example: "tour-uuid.mp4"
 *         removedImages:
 *           type: array
 *           items:
 *             type: string
 *           description: "Returned only when media was removed and propertyId IS provided."
 *           example: ["livingroom-uuid.webp"]
 *         removedImageUrls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["http://localhost:5000/uploads/property-images/livingroom-uuid.webp"]
 *         removedImageFileNames:
 *           type: array
 *           items:
 *             type: string
 *           example: ["livingroom-uuid.webp"]
 *         removedVideo:
 *           type: string
 *           nullable: true
 *           example: "tour-uuid.mp4"
 *         removedVideoUrl:
 *           type: string
 *           nullable: true
 *           example: "http://localhost:5000/uploads/property-videos/tour-uuid.mp4"
 *         removedVideoFileName:
 *           type: string
 *           nullable: true
 *           example: "tour-uuid.mp4"
 */

const normalizeArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
    return [value];
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const ensureUniqueSlug = async (base) => {
    let slug = base || generateSlug();
    if (!slug) {
        slug = generateSlug(`${Date.now()}`);
    }

    let counter = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Properties.exists({ slug })) {
        slug = `${base}-${counter}`;
        counter += 1;
    }

    return slug;
};

const validateObjectId = (id) => Types.ObjectId.isValid(id);

const VALID_AGENT_PROPERTY_SORT = new Set(SORT_BY_PROPERTY.map((s) => s.value));

/** Sale tab → `buy` listing types; Rent tab → `rent`. Accepts `sale` or `buy` for sale. */
const normalizePropertyListTransaction = (raw) => {
    const s = String(raw ?? '').trim().toLowerCase();
    if (!s) return null;
    if (['sale', 'buy'].includes(s)) return 'buy';
    if (s === 'rent') return 'rent';
    return null;
};

const buildAgentPropertyListSort = (sortKey) => {
    const map = {
        featured: { isFeatured: -1, createdAt: -1 },
        newest: { createdAt: -1 },
        'price-high': { price: -1 },
        'price-low': { price: 1 },
        'beds-least': { bedrooms: 1 },
        'beds-most': { bedrooms: -1 },
    };
    return map[sortKey] || map.featured;
};

const buildAgentPropertyDrilldownUrl = (propertyDoc) => {
    if (!PROPERTY_DRILLDOWN_FRONTEND_BASE) return null;
    const rawId = propertyDoc?._id;
    const id = rawId != null && typeof rawId.toString === 'function' ? rawId.toString() : String(rawId || '');
    if (!id) return null;
    return `${PROPERTY_DRILLDOWN_FRONTEND_BASE}/propertydrilldown/${id}`;
};

const AGENT_PROPERTY_DETAIL_POPULATE = [
    { path: 'listingType', select: 'name slug transaction category' },
    { path: 'propertyType', select: 'name slug category' },
    { path: 'amenities', select: 'name slug category icon image' },
    { path: 'agency', select: 'agencyName profilePicture' },
    {
        path: 'agent',
        select: 'fullName profilePicture email phoneNumber',
        populate: { path: 'agency', select: 'agencyName profilePicture' },
    },
];

const isAgencyPopulated = (agency) =>
    Boolean(agency && typeof agency === 'object' && agency.agencyName != null);

const attachAgencyDetails = async (properties) => {
    const list = Array.isArray(properties) ? properties : [properties];
    const plains = list.map((doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc));

    const agencyIds = [
        ...new Set(
            plains
                .map((row) => {
                    if (isAgencyPopulated(row?.agency)) return null;
                    const raw = row?.agency;
                    if (!raw) return null;
                    const id = raw._id ?? raw;
                    return Types.ObjectId.isValid(id) ? String(id) : null;
                })
                .filter(Boolean),
        ),
    ];

    if (!agencyIds.length) return plains;

    const agencies = await Agencies.find({ _id: { $in: agencyIds } })
        .select('agencyName profilePicture')
        .lean();
    const agencyById = new Map(agencies.map((row) => [String(row._id), row]));

    return plains.map((row) => {
        if (isAgencyPopulated(row?.agency)) return row;
        const raw = row?.agency;
        if (!raw) return row;
        const doc = agencyById.get(String(raw._id ?? raw));
        return doc ? { ...row, agency: doc } : row;
    });
};

const withRentPricing = (property) => {
    if (!property) return property;
    const source = typeof property.toObject === 'function' ? property.toObject() : property;
    const transaction = source?.listingType?.transaction;
    const amount = source?.price;
    let agency = source?.agency;
    if (!isAgencyPopulated(agency) && isAgencyPopulated(source?.agent?.agency)) {
        agency = source.agent.agency;
    }
    return {
        ...source,
        ...(agency !== source?.agency ? { agency } : {}),
        propertyUrl: buildAgentPropertyDrilldownUrl(source),
        rentPricing:
            transaction === 'rent' && typeof amount === 'number'
                ? {
                      yearly: amount,
                      monthly: Math.round(amount / 12),
                  }
                : null,
    };
};

/**
 * Listing tab: optional `transaction` scopes to all buy-side or all rent-side types from master data.
 * Optional `listingType` (ObjectId) narrows to one row; must match `transaction` when both are sent.
 */
const buildAgentPropertyListFilter = async (agentId, { listingType, transaction, search }) => {
    const filter = { agent: agentId };
    const tabTransaction = normalizePropertyListTransaction(transaction);
    const excludedListingTypeRows = await ListingType.find({ slug: 'new-projects' }).select('_id').lean();
    const excludedListingTypeIds = excludedListingTypeRows.map((row) => row._id);
    const isExcludedListingType = (id) =>
        excludedListingTypeIds.some((excludedId) => excludedId.toString() === id.toString());

    if (listingType && validateObjectId(listingType)) {
        const listingTypeObjectId = new Types.ObjectId(listingType);
        if (isExcludedListingType(listingTypeObjectId)) {
            filter._id = { $in: [] };
        } else {
            filter.listingType = listingTypeObjectId;
        }
        if (tabTransaction) {
            const ltDoc = await ListingType.findById(listingType).select('transaction slug').lean();
            if (!ltDoc) {
                return { error: 'VALIDATION_ERROR', message: 'Invalid listing type' };
            }
            if (ltDoc.slug === 'new-projects') {
                filter._id = { $in: [] };
            }
            if (ltDoc.transaction !== tabTransaction) {
                return {
                    error: 'VALIDATION_ERROR',
                    message: 'Listing type does not match the selected sale/rent tab',
                };
            }
        }
    } else if (tabTransaction) {
        const rows = await ListingType.find({
            isActive: true,
            transaction: tabTransaction,
            slug: { $ne: 'new-projects' },
        })
            .select('_id')
            .lean();
        const ids = rows.map((r) => r._id);
        filter.listingType = ids.length ? { $in: ids } : { $in: [] };
    } else if (excludedListingTypeIds.length) {
        filter.listingType = { $nin: excludedListingTypeIds };
    }

    const searchTrim = search != null ? String(search).trim() : '';
    if (searchTrim) {
        const rx = new RegExp(escapeRegex(searchTrim), 'i');
        filter.$or = [
            { title: rx },
            { 'location.city': rx },
            { 'location.zone': rx },
            { 'location.fullAddress': rx },
        ];
    }

    return { filter };
};

/**
 * @swagger
 * /agents/properties/create:
 *   post:
 *     summary: Create a new property (Agent)
 *     description: >
 *       Creates a property owned by the authenticated agent. This endpoint validates referenced IDs (listingType, propertyType,
 *       amenities), normalizes uploaded media references (stores filenames in DB), and generates a unique slug. Location is inline only (fullAddress, city, zone, etc.) — no Location schema ref.
 *       For best UX, upload images/video first using `/agents/properties/upload-media` and then pass the returned filenames/URLs here.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PropertyCreateRequest'
 *           examples:
 *             saleExample:
 *               summary: Sale listing
 *               value:
 *                 title: "Luxury 2BR Apartment with Burj View"
 *                 description: "Spacious 2-bedroom apartment in Downtown Dubai..."
 *                 listingType: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 propertyType: "65f12f0f9a9b9c0a1b2c3d4f"
 *                 bedrooms: 2
 *                 bathrooms: 2
 *                 area: { sqm: 120.5, sqft: 1297.7 }
 *                 price: 2500000
 *                 currency: "AED"
 *                 dldPermitNumber: "1234567890"
 *                 fullAddress: "Downtown Dubai, Dubai, UAE"
 *                 city: "Dubai"
 *                 zone: "Downtown Dubai"
 *                 building: "Burj Khalifa"
 *                 latitude: 25.2048
 *                 longitude: 55.2708
 *                 amenities: ["65f12f0f9a9b9c0a1b2c3d40", "65f12f0f9a9b9c0a1b2c3d41"]
 *                 images:
 *                   - "livingroom-uuid.webp"
 *                   - { url: "kitchen-uuid.webp", order: 1, isPrimary: false }
 *                 videoTour: "tour-uuid.mp4"
 *             rentalExample:
 *               summary: Rental listing (price via monthlyRentalPrice)
 *               value:
 *                 title: "Modern Studio in Business Bay"
 *                 description: "Fully furnished studio close to the metro..."
 *                 listingType: "65f12f0f9a9b9c0a1b2c3d4e"
 *                 propertyType: "65f12f0f9a9b9c0a1b2c3d4f"
 *                 bedrooms: 0
 *                 bathrooms: 1
 *                 areaSqm: 45
 *                 monthlyRentalPrice: 8500
 *                 currency: "AED"
 *                 dldPermitNumber: "9876543210"
 *                 location:
 *                   fullAddress: "Business Bay, Dubai, UAE"
 *                   city: "Dubai"
 *                   zone: "Business Bay"
 *                   coordinates: { type: "Point", coordinates: [55.2625, 25.185] }
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property created successfully
 *                 data:
 *                   type: object
 *                   description: "Created property document (populated listingType/propertyType/amenities)."
 *       400:
 *         description: Validation error (missing required fields / invalid ObjectId / too many images / location missing)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Agent or referenced resource not found
 *       409:
 *         description: Conflict (duplicate slug/title)
 *       500:
 *         description: Server error
 */
const createProperty = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const agent = await Agents.findById(agentId).session(session);
        if (!agent) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Agent not found', 'NOT_FOUND');
        }

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
            videoTour,
            propertyVideo,
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
            zoneLocation
        } = req.body || {};

        const parsedBedrooms = toNumberOrNull(bedrooms);
        const parsedBathrooms = toNumberOrNull(bathrooms);
        const parsedAreaSqm = toNumberOrNull(area?.sqm ?? areaSqm);
        const parsedAreaSqft = toNumberOrNull(area?.sqft ?? areaSqft);
        const parsedMaintenance = toNumberOrNull(maintenanceFees ?? maintenanceFee);
        const parsedServiceCharges = toNumberOrNull(serviceCharges ?? serviceCharge);

        const primaryPrice =
            toNumberOrNull(price) ??
            toNumberOrNull(propertyPrice) ??
            toNumberOrNull(monthlyRentalPrice);

        const requiredFieldsMissing = [
            [title, 'title'],
            [description, 'description'],
            [listingType, 'listingType'],
            [propertyType, 'propertyType'],
            [parsedBedrooms, 'bedrooms'],
            [parsedBathrooms, 'bathrooms'],
            [parsedAreaSqm, 'area'],
            [primaryPrice, 'price'],
            [dldPermitNumber, 'dldPermitNumber']
        ].filter(([value]) => value === null || value === undefined || value === '');

        if (requiredFieldsMissing.length) {
            const missing = requiredFieldsMissing.map(([, key]) => key).join(', ');
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, `Missing required fields: ${missing}`, 'VALIDATION_ERROR');
        }

        if (!validateObjectId(listingType)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid listingType', 'VALIDATION_ERROR');
        }
        if (!validateObjectId(propertyType)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid propertyType', 'VALIDATION_ERROR');
        }

        const [listingTypeDoc, propertyTypeExists] = await Promise.all([
            ListingType.findById(listingType).select('slug').session(session),
            PropertyType.exists({ _id: propertyType }).session(session),
        ]);

        if (!listingTypeDoc) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Listing type not found', 'NOT_FOUND');
        }
        if (String(listingTypeDoc.slug || '').toLowerCase() === 'new-projects') {
            await session.abortTransaction();
            session.endSession();
            return failure(
                res,
                400,
                'Creating properties with listingType "new-projects" is not allowed',
                'VALIDATION_ERROR',
            );
        }
        if (!propertyTypeExists) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Property type not found', 'NOT_FOUND');
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

        // Location is inline only (fullAddress, city, zone, building, googlePlaceId, coordinates) — no Location schema ref
        const hasLocation =
            (location && typeof location === 'object' && (location.fullAddress || location.city || location.zone)) ||
            fullAddress ||
            city ||
            zone;
        if (!hasLocation) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Location is required (fullAddress, city, or zone)', 'VALIDATION_ERROR');
        }

        const normalizedImagesInput = normalizeArray(images || propertyImages);
        if (normalizedImagesInput.length > 50) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'You can upload up to 50 images', 'VALIDATION_ERROR');
        }

        const imagePayload = normalizedImagesInput
            .map((img, idx) => {
                if (typeof img === 'string') {
                    // Extract filename if it's a URL, otherwise use as-is
                    const filename = img.includes('/') ? img.split('/').pop() : img;
                    return { url: filename, order: idx };
                }
                if (img && typeof img === 'object' && img.url) {
                    // Extract filename if it's a URL
                    const filename = img.url.includes('/') ? img.url.split('/').pop() : img.url;
                    return {
                        url: filename, // Store only filename
                        isPrimary: Boolean(img.isPrimary),
                        order: typeof img.order === 'number' ? img.order : idx,
                        caption: img.caption,
                        uploadedAt: img.uploadedAt,
                    };
                }
                return null;
            })
            .filter(Boolean);

        const floorPlanPayload = normalizeArray(floorPlan || floorPlans || floorPlanFiles).filter(
            Boolean,
        );

        const videoTourInput = propertyVideo || videoTour || null;
        const videoTourUrl = videoTourInput
            ? videoTourInput.includes('/')
                ? videoTourInput.split('/').pop()
                : videoTourInput
            : null;
        const virtualTourUrl = tour360Url || tour360 || virtualTour360 || null;

        const locationData = {
            ...(location && typeof location === 'object' ? location : {}),
            fullAddress: fullAddress || location?.fullAddress,
            city: city || location?.city,
            zone: zoneLocation || zone || location?.zone,
            building: building || location?.building,
            googlePlaceId: googlePlaceId || location?.googlePlaceId,
        };

        if (!locationData.coordinates && (latitude || longitude || coordinates)) {
            const lat = toNumberOrNull(latitude ?? coordinates?.lat ?? coordinates?.latitude);
            const lng = toNumberOrNull(longitude ?? coordinates?.lng ?? coordinates?.longitude);
            if (lat !== null && lng !== null) {
                locationData.coordinates = { type: 'Point', coordinates: [lng, lat] };
            }
        }

        // const furnishedOptions = ['fully', 'partially', 'unfurnished'];
        // if (!furnishedOptions.includes(furnishedStatus)) {
        //     return failure(res, 400, 'Invalid furnishedStatus', 'VALIDATION_ERROR');
        // }

        const baseSlug = generateSlug(title);
        const slug = await ensureUniqueSlug(baseSlug);

        // Check for duplicate slug in transaction
        const existingSlug = await Properties.exists({ slug }).session(session);
        if (existingSlug) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 409, 'Property with this title already exists', 'CONFLICT');
        }

        const propertyData = {
            title,
            description,
            listingType,
            propertyType,
            agent: agent._id,
            agency: agent.agency,
            bedrooms: parsedBedrooms,
            maidBedroom: Boolean(maidBedroom),
            bathrooms: parsedBathrooms,
            area: {
                sqm: parsedAreaSqm,
                ...(parsedAreaSqft !== null ? { sqft: parsedAreaSqft } : {}),
            },
            amenities: amenityIds,
            price: primaryPrice,
            maintenanceFees: parsedMaintenance,
            serviceCharges: parsedServiceCharges,
            currency: currency || 'AED',
            images: imagePayload,
            virtualTour360: virtualTourUrl,
            videoTour: videoTourUrl,
            floorPlan: floorPlanPayload,
            location: locationData,
            dldPermitNumber,
            dldPermitUrl,
            referenceId,
            status: 'active',
            completionStatus: completionStatus || 'ready',
            furnishedStatus,
            slug,
            publishedAt: publishedAt || new Date(),
            metaTitle,
            metaDescription,
            metaKeywords,
        };

        const created = await Properties.create([propertyData], { session });
        const property = created[0];

        await property.populate([
            { path: 'listingType', select: 'name slug transaction category' },
            { path: 'propertyType', select: 'name slug category' },
            { path: 'amenities', model: 'Amenities', select: 'name slug category icon' },
        ]);
        await recalcAgentStatistics(agentId, session);
        await recalcAgencyStatistics(agent.agency, session);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService.bumpPropertyCity(locationData.city).catch((err) => {
            logger.error('ListingSearchCity bump (property) failed', { error: err.message });
        });

        return success(res, 'Property created successfully', property, 201);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Create property failed', { error: error.message, stack: error.stack });

        // Handle duplicate key errors (e.g., duplicate slug)
        if (error.code === 11000) {
            return failure(res, 409, 'Property with this title or slug already exists', 'CONFLICT');
        }

        return failure(res, 500, 'Failed to create property', 'SERVER_ERROR');
    }
});



/**
 * @swagger
 * /agents/properties/upload-media:
 *   post:
 *     summary: Upload or remove property media (Agent)
 *     description: >
 *       Unified endpoint to upload images and/or a video, and optionally remove existing media by key (filename, URL, or image id).
 *       If `propertyId` is provided, uploaded media is saved directly to the property (DB stores filenames). If `propertyId` is omitted,
 *       this endpoint works as a "pre-upload" and returns URLs that can be passed into `/agents/properties/create`.
 *     tags: [Agents]
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
 *                 description: "Optional property ObjectId. If provided, agent must own the property."
 *                 example: "65f12f0f9a9b9c0a1b2c3d4e"
 *               removeKeys:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: >
 *                   Keys to remove. Supports image filename, image URL, image _id, or video filename/URL. When removing,
 *                   `propertyId` is required.
 *                 example: ["livingroom-uuid.webp", "tour-uuid.mp4"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Up to 50 image files."
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: "One video file."
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
 *         description: Validation error (invalid propertyId, too many images, too many videos, removing without propertyId, etc.)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (agent does not own property)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const uploadPropertyMedia = asyncHandler(async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { propertyId, removeKeys } = req.body;
        const removeKeyArray = Array.isArray(removeKeys) ? removeKeys : removeKeys ? [removeKeys] : [];

        let property = null;

        // If propertyId is provided, validate and fetch property
        if (propertyId) {
            if (!validateObjectId(propertyId)) {
                return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
            }

            property = await Properties.findById(propertyId);
            if (!property) {
                return failure(res, 404, 'Property not found', 'NOT_FOUND');
            }

            // Verify agent owns this property
            if (property.agent.toString() !== agentId.toString()) {
                return failure(res, 403, 'You do not have permission to modify this property', 'FORBIDDEN');
            }
        }

        // Handle removal of images/videos by keys
        const removedImages = [];
        const removedImageUrls = [];
        let removedVideo = null;
        let removedVideoUrl = null;

        if (removeKeyArray.length > 0) {
            if (!property) {
                return failure(res, 400, 'Property ID is required to remove media', 'VALIDATION_ERROR');
            }

            for (const removeKey of removeKeyArray) {
                // Extract filename from removeKey (could be URL or filename)
                const removeFilename = removeKey.includes('/')
                    ? removeKey.split('/').pop()
                    : removeKey;

                // Try to find and remove image
                const imageIndex = property.images?.findIndex((img) => {
                    // Support filename, URL, or id
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
                    // Reconstruct full URL for deletion
                    let imageUrl = imageToRemove.url;
                    if (!imageUrl.startsWith('http')) {
                        // Need to reconstruct URL - check if S3 or local
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

                    // Delete file from storage
                    await uploadService.delete(imageUrl).catch((err) => {
                        logger.warn('Failed to delete image file', { error: err.message, url: imageUrl });
                    });
                    property.images.splice(imageIndex, 1);
                    removedImages.push(imageToRemove.url);
                    removedImageUrls.push(imageUrl);
                } else {
                    // Check if it's the video
                    const videoFilename = property.videoTour?.includes('/')
                        ? property.videoTour.split('/').pop()
                        : property.videoTour;

                    if (property.videoTour && (property.videoTour === removeKey || videoFilename === removeFilename)) {
                        // Reconstruct full URL for deletion
                        let videoUrl = property.videoTour;
                        if (!videoUrl.startsWith('http')) {
                            // Need to reconstruct URL - check if S3 or local
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
                            logger.warn('Failed to delete video file', { error: err.message, url: videoUrl });
                        });
                        removedVideo = property.videoTour; // filename
                        removedVideoUrl = videoUrl; // full url used to delete
                        property.videoTour = null;
                    }
                }
            }
        }

        const uploadedImages = [];
        let uploadedVideo = null;

        // Handle image uploads
        if (req.files?.images && Array.isArray(req.files.images)) {
            if (req.files.images.length > 50) {
                return failure(res, 400, 'You can upload up to 50 images', 'VALIDATION_ERROR');
            }

            // Check total images count if property exists
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

                // Extract filename from path
                const filename = uploaded.path.split('/').pop() || uploaded.filename;

                const imageData = {
                    url: uploaded.url, // Full URL for response
                    path: uploaded.path,
                    filename, // Store only filename
                    size: uploaded.size,
                    mimetype: uploaded.mimetype || imageFile.mimetype || 'image/webp',
                    isPrimary: false,
                    order: baseOrder + idx,
                    uploadedAt: new Date(),
                };
                uploadedImages.push(imageData);

                // If property exists, add to property immediately (store only filename)
                if (property) {
                    property.images = [
                        ...(property.images || []),
                        {
                            url: filename, // Store only filename in DB
                            isPrimary: false,
                            order: baseOrder + idx,
                            uploadedAt: new Date(),
                        },
                    ];
                }
            }
        }

        // Handle video upload
        if (req.files?.video && Array.isArray(req.files.video) && req.files.video.length > 0) {
            if (req.files.video.length > 1) {
                return failure(res, 400, 'You can upload only one video', 'VALIDATION_ERROR');
            }

            const videoFile = req.files.video[0];
            const uploaded = await uploadService.uploadVideo(videoFile, 'property');
            uploadedVideo = uploaded.url;

            // Extract filename from path
            const videoFilename = uploaded.path.split('/').pop() || uploaded.filename;

            // If property exists, handle video replacement
            if (property) {
                // Delete old video if exists
                if (property.videoTour) {
                    // Reconstruct full URL for deletion if only filename is stored
                    let oldVideoUrl = property.videoTour;
                    if (!oldVideoUrl.startsWith('http')) {
                        // Need to reconstruct URL - check if S3 or local
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
                        logger.warn('Failed to delete old video', { error: err.message });
                    });
                }
                property.videoTour = videoFilename; // Store only filename in DB
            }
        }

        // Save property if it exists
        if (property) {
            await property.save();
        }

        // Combine all uploads for standardized response
        const allUploads = [...uploadedImages];
        if (uploadedVideo) {
            allUploads.push({
                url: uploadedVideo,
                path: `vid/property/${uploadedVideo.split('/').pop()}`,
                filename: uploadedVideo.split('/').pop(),
                size: 0, // Video size not tracked in current implementation
                mimetype: 'video/mp4'
            });
        }

        // Build standardized response
        const responseData = uploadService.buildStandardResponse(
            allUploads,
            {
                images: 'property',
                videos: 'property'
            },
            property ? {
                property: {
                    id: property._id,
                    totalImages: property.images?.length || 0,
                    videoTour: property.videoTour || null,
                    ...(removedImages.length > 0 && {
                        removedImages: removedImages.map((value) =>
                            value.includes('/') ? value.split('/').pop() : value
                        ),
                        removedImageUrls: removedImageUrls
                    }),
                    ...(removedVideo && {
                        removedVideo: removedVideo.includes('/') ? removedVideo.split('/').pop() : removedVideo,
                        removedVideoUrl: removedVideoUrl
                    })
                }
            } : {}
        );

        return success(res, 'Media processed successfully', responseData);
    } catch (error) {
        logger.error('Upload property media failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to process media', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agents/properties/{id}:
 *   put:
 *     summary: Update a property (Agent)
 *     description: >
 *       Updates an existing property owned by the authenticated agent. Agent cannot change `agent` or `agency`.
 *       If price is changed, a new entry is added to `priceHistory`. Also updates `lastModifiedAt` and `lastModifiedBy`.
 *     tags: [Agents]
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
 *             description: >
 *               Partial update payload. Send only fields you want to change.
 *               `agent` and `agency` are ignored even if provided.
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
 *                 type: number
 *               maidBedroom:
 *                 type: boolean
 *               bathrooms:
 *                 type: number
 *               area:
 *                 type: object
 *                 properties:
 *                   sqm:
 *                     type: number
 *                   sqft:
 *                     type: number
 *               areaSqm:
 *                 type: number
 *                 description: Alias for area.sqm
 *               areaSqft:
 *                 type: number
 *                 description: Alias for area.sqft
 *               price:
 *                 type: number
 *                 description: Primary price field
 *               propertyPrice:
 *                 type: number
 *                 description: Alias for price
 *               monthlyRentalPrice:
 *                 type: number
 *                 description: Alias for price
 *               priceChangeReason:
 *                 type: string
 *                 description: Optional reason stored in priceHistory when price changes
 *               maintenanceFees:
 *                 type: number
 *               maintenanceFee:
 *                 type: number
 *                 description: Alias for maintenanceFees
 *               serviceCharges:
 *                 type: number
 *               serviceCharge:
 *                 type: number
 *                 description: Alias for serviceCharges
 *               currency:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Amenity ObjectIds (replaces current list when non-empty)
 *               images:
 *                 type: array
 *                 description: >
 *                   Replaces current images when non-empty. Supports array of filenames/URLs
 *                   OR array of image objects { url, isPrimary, order, caption, uploadedAt }.
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url: { type: string }
 *                         isPrimary: { type: boolean }
 *                         order: { type: integer }
 *                         caption: { type: string }
 *                         uploadedAt: { type: string, format: date-time }
 *               propertyImages:
 *                 type: array
 *                 description: Alias for images
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *               floorPlan:
 *                 type: array
 *                 items:
 *                   type: string
 *               floorPlans:
 *                 type: array
 *                 description: Alias for floorPlan
 *                 items:
 *                   type: string
 *               floorPlanFiles:
 *                 type: array
 *                 description: Alias for floorPlan
 *                 items:
 *                   type: string
 *               virtualTour360:
 *                 type: string
 *                 description: Virtual tour URL
 *               tour360:
 *                 type: string
 *                 description: Alias for virtualTour360
 *               tour360Url:
 *                 type: string
 *                 description: Alias for virtualTour360
 *               location:
 *                 type: object
 *                 properties:
 *                   fullAddress: { type: string }
 *                   city: { type: string }
 *                   zone: { type: string }
 *                   building: { type: string }
 *                   googlePlaceId: { type: string }
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [Point]
 *                       coordinates:
 *                         type: array
 *                         minItems: 2
 *                         maxItems: 2
 *                         items:
 *                           type: number
 *                     description: GeoJSON Point [longitude, latitude]
 *               fullAddress:
 *                 type: string
 *                 description: Alias for location.fullAddress
 *               city:
 *                 type: string
 *                 description: Alias for location.city
 *               zone:
 *                 type: string
 *                 description: Alias for location.zone
 *               zoneLocation:
 *                 type: string
 *                 description: Alias for zone
 *               building:
 *                 type: string
 *                 description: Alias for location.building
 *               googlePlaceId:
 *                 type: string
 *                 description: Alias for location.googlePlaceId
 *               latitude:
 *                 type: number
 *                 description: Used with longitude to set location.coordinates if coordinates is not provided
 *               longitude:
 *                 type: number
 *                 description: Used with latitude to set location.coordinates if coordinates is not provided
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat: { type: number }
 *                   lng: { type: number }
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *                 description: Lat/lng alias object used to derive location.coordinates
 *               dldPermitNumber:
 *                 type: string
 *               dldPermitUrl:
 *                 type: string
 *               referenceId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, sold, rented, pending]
 *               completionStatus:
 *                 type: string
 *                 enum: [off-plan, ready]
 *               furnishedStatus:
 *                 type: string
 *                 enum: [fully, partially, unfurnished]
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               metaKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *           examples:
 *             basicUpdate:
 *               summary: Minimal partial update example
 *               value:
 *                 title: "Updated 2BR Apartment with Burj View"
 *                 price: 2550000
 *                 priceChangeReason: "Market adjustment"
 *                 bedrooms: 3
 *                 area:
 *                   sqm: 127
 *                 zoneLocation: "Downtown Dubai"
 *                 tour360Url: "https://example.com/tours/property-123"
 *                 propertyImages:
 *                   - "property-1.webp"
 *                   - "property-2.webp"
 *                 amenities:
 *                   - "65f12f0f9a9b9c0a1b2c3d40"
 *                   - "65f12f0f9a9b9c0a1b2c3d41"
 *             allOptionalFields:
 *               summary: Full optional-fields reference payload
 *               value:
 *                 title: "Luxury Apartment Updated"
 *                 description: "Fully upgraded unit with skyline view"
 *                 listingType: "65f12f0f9a9b9c0a1b2c3d11"
 *                 propertyType: "65f12f0f9a9b9c0a1b2c3d22"
 *                 bedrooms: 3
 *                 maidBedroom: true
 *                 bathrooms: 4
 *                 area:
 *                   sqm: 145
 *                   sqft: 1560
 *                 areaSqm: 145
 *                 areaSqft: 1560
 *                 price: 2600000
 *                 propertyPrice: 2600000
 *                 monthlyRentalPrice: 220000
 *                 priceChangeReason: "Quarterly pricing refresh"
 *                 maintenanceFees: 12000
 *                 maintenanceFee: 12000
 *                 serviceCharges: 5000
 *                 serviceCharge: 5000
 *                 currency: "AED"
 *                 amenities:
 *                   - "65f12f0f9a9b9c0a1b2c3d40"
 *                   - "65f12f0f9a9b9c0a1b2c3d41"
 *                 images:
 *                   - url: "property-main.webp"
 *                     isPrimary: true
 *                     order: 0
 *                     caption: "Main living room"
 *                     uploadedAt: "2026-04-21T10:30:00.000Z"
 *                   - "property-balcony.webp"
 *                 propertyImages:
 *                   - "property-1.webp"
 *                   - "property-2.webp"
 *                 floorPlan:
 *                   - "floorplan-main.webp"
 *                 floorPlans:
 *                   - "floorplan-alt.webp"
 *                 floorPlanFiles:
 *                   - "floorplan-extra.webp"
 *                 virtualTour360: "https://example.com/tours/property-virtual"
 *                 tour360: "https://example.com/tours/property-tour"
 *                 tour360Url: "https://example.com/tours/property-tour-url"
 *                 location:
 *                   fullAddress: "Unit 1203, Downtown View Tower"
 *                   city: "Dubai"
 *                   zone: "Downtown Dubai"
 *                   building: "Downtown View Tower"
 *                   googlePlaceId: "ChIJExamplePlace123"
 *                   coordinates:
 *                     type: "Point"
 *                     coordinates: [55.2744, 25.1972]
 *                 fullAddress: "Unit 1203, Downtown View Tower"
 *                 city: "Dubai"
 *                 zone: "Downtown Dubai"
 *                 zoneLocation: "Downtown Dubai"
 *                 building: "Downtown View Tower"
 *                 googlePlaceId: "ChIJExamplePlace123"
 *                 latitude: 25.1972
 *                 longitude: 55.2744
 *                 coordinates:
 *                   lat: 25.1972
 *                   lng: 55.2744
 *                   latitude: 25.1972
 *                   longitude: 55.2744
 *                 dldPermitNumber: "DLD-1234567890"
 *                 dldPermitUrl: "https://dubailand.gov.ae/permit/DLD-1234567890"
 *                 referenceId: "PF-REF-2026-0001"
 *                 status: "active"
 *                 completionStatus: "ready"
 *                 furnishedStatus: "fully"
 *                 publishedAt: "2026-04-21T10:30:00.000Z"
 *                 metaTitle: "Luxury Apartment in Downtown Dubai"
 *                 metaDescription: "Updated apartment listing with premium amenities"
 *                 metaKeywords:
 *                   - "downtown dubai"
 *                   - "luxury apartment"
 *                   - "burj view"
 *     responses:
 *       200:
 *         description: Property updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error (invalid ObjectId, invalid amenities/location, etc.)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (agent does not own property)
 *       404:
 *         description: Property or referenced resource not found
 *       500:
 *         description: Server error
 */
const updateProperty = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
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

        if (property.agent.toString() !== agentId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to update this property', 'FORBIDDEN');
        }

        const prevCityRawForSearchIndex = property.location?.city;
        const prevStatusForSearchIndex = property.status;

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
            status, // status changes should generally go through changePropertyStatus, but allow here if needed
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
            area?.sqm !== undefined || areaSqm !== undefined
                ? toNumberOrNull(area?.sqm ?? areaSqm)
                : null;
        const parsedAreaSqft =
            area?.sqft !== undefined || areaSqft !== undefined
                ? toNumberOrNull(area?.sqft ?? areaSqft)
                : null;
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
                changedBy: agentId,
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

        // Images & floor plans (expect filenames, same normalization as createProperty)
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

        // System fields
        property.lastModifiedAt = new Date();
        property.lastModifiedBy = agentId;

        await property.save({ session });

        await property.populate([
            { path: 'listingType', select: 'name slug transaction category' },
            { path: 'propertyType', select: 'name slug category' },
            { path: 'amenities', model: 'Amenities', select: 'name slug category icon' },
        ]);
        await recalcAgentStatistics(agentId, session);
        await recalcAgencyStatistics(property.agency, session);

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
                logger.error('ListingSearchCity reconcile (property update) failed', { error: err.message });
            });

        return success(res, 'Property updated successfully', property);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Update property failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update property', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agents/properties:
 *   get:
 *     summary: Get properties for logged-in agent
 *     description: >
 *       Returns properties for the authenticated agent. Supports filtering, sorting, and pagination.
 *       If `propertyId` (or `id`) is provided, returns that single property (if owned by the agent).
 *       For the properties management UI: use `transaction` (sale/rent tab) with optional `listingType` (master ObjectId for Buy, Commercial Buy, Rent, Commercial Rent).
 *       When `listingType` is omitted, `transaction` limits results to all active listing types on that side (buy vs rent). `sortBy` uses the same values as admin master `sortbyproperty` / agent dashboard.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Optional Property ObjectId. If provided, returns only this property (if owned by the agent).
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Alias for propertyId.
 *       - in: query
 *         name: transaction
 *         schema:
 *           type: string
 *           enum: [sale, buy, rent]
 *         description: >
 *           Sale vs rent tab: `sale` or `buy` = all buy-side listing types (residential + commercial buy) when `listingType` is omitted.
 *           `rent` = all rent-side types when `listingType` is omitted. Omit for no transaction scoping (all listing types).
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *         description: Alias for `transaction` (e.g. same values as the UI tab).
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *         description: >
 *           Optional ListingType ObjectId from master data (e.g. Buy, Commercial Buy, Rent, Commercial Rent).
 *           If set together with `transaction`/`tab`, the listing type must belong to that transaction (`buy` vs `rent`).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional case-insensitive match on title or location (city, zone, fullAddress).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, sold, rented, pending]
 *         description: Optional status filter.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price-high, price-low, beds-least, beds-most]
 *           default: featured
 *         description: Property sort options (same `value` field as admin master `sortbyproperty`). Invalid values default to `featured`.
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
 *         description: Properties fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single property when propertyId or id query is set and the agent owns it
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Agent property fetched successfully
 *                     data:
 *                       type: object
 *                       description: Property document (populated listingType, propertyType, amenities)
 *                 - type: object
 *                   description: Paginated list when propertyId/id is omitted
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Agent properties fetched successfully
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             description: Property document
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
 *                           description: Counts by status (transaction, listingType, and search match the list; status query filter is not applied)
 *                           properties:
 *                             active: { type: integer }
 *                             inactive: { type: integer }
 *                             sold: { type: integer }
 *                             rented: { type: integer }
 *                             pending: { type: integer }
 *       400:
 *         description: Invalid property id, invalid listing type, or listing type does not match sale/rent tab
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: boolean, example: false }
 *                 message: { type: string }
 *                 code: { type: string, example: VALIDATION_ERROR }
 *       401:
 *         description: Missing or invalid agent token
 *       404:
 *         description: Property not found or not owned by this agent (only when fetching by propertyId/id)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: boolean, example: false }
 *                 message: { type: string }
 *                 code: { type: string, example: NOT_FOUND }
 *       500:
 *         description: Server error
 */
const getAgentProperties = asyncHandler(async (req, res) => {
    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            listingType,
            status,
            sortBy,
            page = 1,
            limit = 20,
            propertyId,
            id,
            transaction,
            tab,
            search,
        } = req.query;

        const singleId = propertyId || id;

        // If a specific property id is provided, return only that property
        if (singleId) {
            if (!validateObjectId(singleId)) {
                return failure(res, 400, 'Invalid property ID', 'VALIDATION_ERROR');
            }

            const property = await Properties.findOne({
                _id: singleId,
                agent: agentId,
            }).populate(AGENT_PROPERTY_DETAIL_POPULATE);

            if (!property) {
                return failure(res, 404, 'Property not found', 'NOT_FOUND');
            }

            const [enriched] = await attachAgencyDetails([property]);
            return success(res, 'Agent property fetched successfully', withRentPricing(enriched));
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        const transactionParam = transaction ?? tab;
        const listFilterResult = await buildAgentPropertyListFilter(agentId, {
            listingType,
            transaction: transactionParam,
            search,
        });
        if (listFilterResult.error) {
            return failure(res, 400, listFilterResult.message, listFilterResult.error);
        }

        const filter = { ...listFilterResult.filter };
        if (status) {
            filter.status = status;
        }

        const sortByRaw = String(sortBy ?? '')
            .trim()
            .toLowerCase();
        const sortKey =
            sortByRaw && VALID_AGENT_PROPERTY_SORT.has(sortByRaw) ? sortByRaw : 'featured';
        const sort = buildAgentPropertyListSort(sortKey);

        const statusAggMatch = { ...listFilterResult.filter };
        delete statusAggMatch.status;
        statusAggMatch.agent = new Types.ObjectId(agentId);

        const [properties, total, statusAgg] = await Promise.all([
            Properties.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate(AGENT_PROPERTY_DETAIL_POPULATE),
            Properties.countDocuments(filter),
            Properties.aggregate([
                { $match: statusAggMatch },
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

        const enrichedProperties = await attachAgencyDetails(properties);

        const data = {
            items: enrichedProperties.map(withRentPricing),
            pagination: {
                total,
                totalPages,
                page: pageNum,
                limit: limitNum,
            },
            statusCounts,
        };

        return success(res, 'Agent properties fetched successfully', data);
    } catch (error) {
        logger.error('Get agent properties failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to fetch properties', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agents/properties/{id}/status:
 *   put:
 *     summary: Change property status (Agent)
 *     description: >
 *       Changes the status of a property owned by the authenticated agent. Records the change in the activity log.
 *       When setting status to `sold` or `rented`, `dealInfo` is required.
 *     tags: [Agents]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, sold, rented]
 *                 description: New status for the property.
 *               dealInfo:
 *                 type: object
 *                 description: Required when status is `sold` or `rented`.
 *                 properties:
 *                   dealAmount:
 *                     type: number
 *                   dealClosedDate:
 *                     type: string
 *                     format: date-time
 *                   customer:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *           examples:
 *             markInactive:
 *               summary: Deactivate a property
 *               value:
 *                 status: inactive
 *             markSold:
 *               summary: Mark property as sold
 *               value:
 *                 status: sold
 *                 dealInfo:
 *                   dealAmount: 2500000
 *                   dealClosedDate: "2026-02-04T10:00:00.000Z"
 *                   customer:
 *                     name: "John Doe"
 *                     email: "john@example.com"
 *                     phone: "+971500000000"
 *     responses:
 *       200:
 *         description: Property status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property status updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error (invalid status, missing dealInfo for sold/rented, invalid ObjectId)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (agent does not own property)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const changePropertyStatus = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
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

        const { status, dealInfo } = req.body || {};
        const allowedStatuses = ['active', 'inactive', 'sold', 'rented'];
        if (!status || !allowedStatuses.includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid or missing status', 'VALIDATION_ERROR');
        }

        const property = await Properties.findById(propertyId).session(session);
        if (!property) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Property not found', 'NOT_FOUND');
        }

        if (property.agent.toString() !== agentId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to update this property', 'FORBIDDEN');
        }

        const previousStatus = property.status;
        const previousStatusNorm = String(previousStatus || '').toLowerCase();
        if (previousStatusNorm === 'sold' || previousStatusNorm === 'rented') {
            await session.abortTransaction();
            session.endSession();
            return failure(
                res,
                400,
                'This property is already sold or rented. Status can no longer be changed.',
                'VALIDATION_ERROR',
            );
        }

        /** Used for `property.dealInfo` and `DealClosure.closedDate` when closing via sold/rented. */
        let dealClosedDateVal = null;

        // Validate deal info for sold/rented
        if (status === 'sold' || status === 'rented') {
            if (!dealInfo || typeof dealInfo !== 'object') {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'dealInfo is required when marking as sold or rented', 'VALIDATION_ERROR');
            }

            const { dealAmount, dealClosedDate, customer } = dealInfo;
            if (dealAmount === undefined || dealAmount === null || Number.isNaN(Number(dealAmount))) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'dealInfo.dealAmount is required and must be a number', 'VALIDATION_ERROR');
            }
            if (!customer || !customer.name) {
                await session.abortTransaction();
                session.endSession();
                return failure(
                    res,
                    400,
                    'dealInfo.dealAmount and dealInfo.customer.name are required',
                    'VALIDATION_ERROR',
                );
            }

            dealClosedDateVal = dealClosedDate ? new Date(dealClosedDate) : new Date();
            if (Number.isNaN(dealClosedDateVal.getTime())) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Invalid dealClosedDate', 'VALIDATION_ERROR');
            }

            property.dealInfo = {
                dealType: status === 'sold' ? 'sale' : 'rent',
                dealAmount,
                dealClosedDate: dealClosedDateVal,
                dealClosedBy: agentId,
                customer: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                },
            };
        }

        property.status = status;
        property.isActive = status === 'active';

        if (status === 'inactive' || status === 'sold' || status === 'rented') {
            property.deactivatedAt = new Date();
            property.deactivatedBy = agentId;
        } else if (status === 'active') {
            property.deactivatedAt = null;
            property.deactivatedBy = null;
        }

        property.lastModifiedAt = new Date();
        property.lastModifiedBy = agentId;

        await property.save({ session });

        let dealClosureId = null;
        // Mirror `/agents/inquiries/:id/close-deal` — persist closure on DealClosure for reporting/stats.
        if (status === 'sold' || status === 'rented') {
            const { dealAmount, customer } = dealInfo;
            const custName = String(customer.name).trim();
            const custEmail = String(customer.email || '').trim() || 'not-provided@example.com';
            const custPhone = String(customer.phone || customer.phoneNumber || '').trim() || 'not-provided';

            const [dealClosure] = await DealClosure.create(
                [
                    {
                        dealCategory: 'property',
                        property: property._id,
                        agent: agentId,
                        agency: property.agency,
                        customer: {
                            name: custName,
                            email: custEmail,
                            phoneNumber: custPhone,
                        },
                        dealType: status === 'sold' ? 'sale' : 'rent',
                        dealAmount: Number(dealAmount),
                        currency: dealInfo.currency || property.currency || 'AED',
                        commission:
                            dealInfo.commission != null && !Number.isNaN(Number(dealInfo.commission))
                                ? { amount: Number(dealInfo.commission) }
                                : undefined,
                        notes: dealInfo.notes ? String(dealInfo.notes) : undefined,
                        closedDate: dealClosedDateVal,
                        closedBy: agentId,
                        status: 'approved',
                        metadata: {
                            source: 'agent-property-status',
                            previousPropertyStatus: previousStatus,
                        },
                    },
                ],
                { session },
            );
            dealClosureId = dealClosure?._id;
        }

        await ActivityLog.create(
            [
                {
                    actor: {
                        actorType: 'agent',
                        actorId: agentId,
                    },
                    action: 'update',
                    resource: {
                        resourceType: 'property',
                        resourceId: property._id,
                    },
                    description: `Property status changed from ${previousStatus} to ${status}`,
                    changes: {
                        before: { status: previousStatus },
                        after: { status },
                    },
                    metadata: {
                        dealInfo: property.dealInfo || null,
                        dealClosureId: dealClosureId || null,
                    },
                    status: 'success',
                    timestamp: new Date(),
                },
            ],
            { session },
        );

        await property.populate([
            { path: 'listingType', select: 'name slug transaction category' },
            { path: 'propertyType', select: 'name slug category' },
            { path: 'amenities', model: 'Amenities', select: 'name slug category icon' },
        ]);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService
            .reconcilePropertyListingCity({
                prevCityRaw: property.location?.city,
                nextCityRaw: property.location?.city,
                prevStatus: previousStatus,
                nextStatus: status,
            })
            .catch((err) => {
                logger.error('ListingSearchCity reconcile (property status) failed', { error: err.message });
            });

        return success(res, 'Property status updated successfully', property);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Change property status failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to change property status', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /agents/properties/{id}:
 *   delete:
 *     summary: Delete a property (Agent)
 *     description: >
 *       Permanently deletes a property owned by the authenticated agent. This will remove the property document
 *       and attempt to delete all associated media files (images and video) from storage. Use with caution.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property deleted successfully
 *                 data:
 *                   type: object
 *                   description: Snapshot of the deleted property
 *       400:
 *         description: Validation error (invalid ObjectId)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (agent does not own property)
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
const deleteProperty = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agentId = req.user?.id || req.user?._id;
        if (!agentId) {
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

        if (property.agent.toString() !== agentId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to delete this property', 'FORBIDDEN');
        }

        const propertySnapshot = property.toObject ? property.toObject() : property;
        const wasActiveForSearchIndex = property.status === 'active';
        const cityRawForSearchIndex = property.location?.city;

        await Properties.deleteOne({ _id: propertyId }).session(session);

        await ActivityLog.create(
            [
                {
                    actor: {
                        actorType: 'agent',
                        actorId: agentId,
                    },
                    action: 'delete',
                    resource: {
                        resourceType: 'property',
                        resourceId: property._id,
                    },
                    description: 'Property deleted by agent',
                    changes: {
                        before: {
                            status: property.status,
                        },
                        after: null,
                    },
                    metadata: {
                        slug: property.slug,
                        title: property.title,
                        agency: property.agency,
                    },
                    status: 'success',
                    timestamp: new Date(),
                },
            ],
            { session },
        );

        await recalcAgentStatistics(agentId, session);
        await recalcAgencyStatistics(property.agency, session);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService
            .onPropertyRemovedFromSearch(cityRawForSearchIndex, wasActiveForSearchIndex)
            .catch((err) => {
                logger.error('ListingSearchCity decrement (property delete) failed', { error: err.message });
            });

        // Best-effort media cleanup (runs after property is removed from DB)
        deletePropertyMediaFiles(propertySnapshot).catch((err) => {
            logger.warn('Failed to cleanup property media after delete', {
                error: err.message,
                propertyId,
            });
        });

        return success(res, 'Property deleted successfully', propertySnapshot);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Delete property failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to delete property', 'SERVER_ERROR');
    }
});

module.exports = {
    createProperty,
    uploadPropertyMedia,
    updateProperty,
    getAgentProperties,
    changePropertyStatus,
    deleteProperty,
};

