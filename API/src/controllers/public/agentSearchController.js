const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agents = require('../../models/agentsModel');
const Agencies = require('../../models/agenciesModel');
const Properties = require('../../models/propertiesModal');
const ListingType = require('../../models/listingTypeModel');
const Location = require('../../models/locationsModel');
const PropertyType = require('../../models/propertyTypeModel');
const Languages = require('../../models/languagesModel');
const Countries = require('../../models/countriesModel');
const JobTitles = require('../../models/jobTitlesModel');
const { success, failure } = require('../../utils/helpers');
const { SERVICES_NEEDED } = require('../../utils/constants');
const {
  aggregateActivePropertyCountsByAgents,
  aggregateClosedDealStatsByAgents,
  getAgentTrackRecordsFromClosedDeals,
  enrichExpertiseAreasWithLocations,
  getAgentExpertiseAreasFromClosedDeals,
} = require('../../services/agentStatsService');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

const { Types } = mongoose;
const buildShareLink = (path, id) => {
  if (!FRONTEND_URL || !id) return null;
  return `${FRONTEND_URL}${path}/${encodeURIComponent(String(id))}`;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const emptyAgentSearchResult = (page, limit) => ({
  items: [],
  pagination: {
    total: 0,
    totalPages: 0,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  },
});

/**
 * Only agents tied to an active, verified agency are public (same rule as populate match).
 * Applying this on the Mongo filter before skip/limit avoids dropping agents after pagination.
 */
const applyPublicAgencyFilter = async (filter, agencyId) => {
  if (agencyId) {
    if (!Types.ObjectId.isValid(agencyId)) {
      return { ok: false, error: 'Invalid agencyId' };
    }
    const agency = await Agencies.findOne({
      _id: new Types.ObjectId(agencyId),
      isActive: true,
      isVerified: true,
    })
      .select('_id')
      .lean();
    if (!agency) {
      return { ok: false, empty: true };
    }
    filter.agency = agency._id;
    return { ok: true };
  }

  const agencyIds = await Agencies.find({
    isActive: true,
    isVerified: true,
  }).distinct('_id');

  if (!agencyIds.length) {
    return { ok: false, empty: true };
  }

  filter.agency = { $in: agencyIds };
  return { ok: true };
};

/** Populated JobTitles doc → API shape (agents use `specialization` ref, not `position`). */
const formatSpecialization = (spec) => {
  if (!spec || typeof spec !== 'object' || !spec._id) return null;
  return {
    _id: spec._id,
    title: spec.title ?? null,
    description: spec.description ?? null
  };
};

/** Populated Countries doc (agent `nationality`) or bare ObjectId → API shape. */
const formatNationality = (nat) => {
  if (nat == null) return null;
  if (typeof nat === 'object' && nat._id != null) {
    return {
      _id: nat._id,
      name: nat.name ?? null,
    };
  }
  if (Types.ObjectId.isValid(nat)) {
    return { _id: nat };
  }
  return null;
};

/**
 * Map serviceNeeded to listingType query
 */
const getListingTypeForService = async (serviceNeeded) => {
  const mapping = {
    'residential-sale': { transaction: 'buy', category: 'residential' },
    'residential-rent': { transaction: 'rent', category: 'residential' },
    'commercial-sale': { transaction: 'buy', category: 'commercial' },
    'commercial-rent': { transaction: 'rent', category: 'commercial' }
  };

  const criteria = mapping[serviceNeeded];
  if (!criteria) return null;

  const listingType = await ListingType.findOne({
    transaction: criteria.transaction,
    category: criteria.category,
    isActive: true
  });

  return listingType ? listingType._id : null;
};

/**
 * @swagger
 * /agents/search:
 *   get:
 *     summary: Search agents with filters
 *     description: >
 *       Search for active and verified agents based on various filters including location, service needed,
 *       languages, nationality, agent type, rating, and property type. Returns paginated results sorted by
 *       agent type (superagent first) and rating.
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: >
 *           Searches fullName and job title (JobTitles). If `location` is sent with the **same** value
 *           (typical single search box), results match **name/job OR location** (not both). If `location`
 *           differs, this is combined with location using AND.
 *         example: "John Doe"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: >
 *           City/area text — agents with listings or expertise in that area. Same rules as `name`: if
 *           `name` has the **same** string, that one query matches name/job **or** location; otherwise AND with `name`.
 *         example: "Dubai Marina"
 *       - in: query
 *         name: serviceNeeded
 *         schema:
 *           type: string
 *           enum: [residential-sale, residential-rent, commercial-sale, commercial-rent]
 *         description: Service type needed - filters agents who have properties matching this service type
 *         example: "residential-sale"
 *       - in: query
 *         name: language
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Language ObjectId(s) - filters agents who speak any of these languages
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *       - in: query
 *         name: nationality
 *         schema:
 *           type: string
 *         description: Country ObjectId - filters agents by nationality
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *       - in: query
 *         name: agentType
 *         schema:
 *           type: string
 *           enum: [agent, superagent, all]
 *           default: all
 *         description: Filter by agent type. Use 'all' to include both types
 *         example: "superagent"
 *       - in: query
 *         name: agencyId
 *         schema:
 *           type: string
 *         description: Agency ObjectId - filters agents that belong to this agency
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum average rating (1-5)
 *         example: 4.0
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: PropertyType ObjectId - filters agents who have properties of this type
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
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
 *         description: Number of items per page (max 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: Agents fetched successfully
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
 *                   example: "Agents fetched successfully"
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
 *                             example: "65f12f0f9a9b9c0a1b2c3d4e"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           profilePicture:
 *                             type: string
 *                             nullable: true
 *                             example: "https://cdn.example.com/agent-profile.jpg"
 *                           agentType:
 *                             type: string
 *                             enum: [agent, superagent]
 *                             example: "superagent"
 *                           specialization:
 *                             type: object
 *                             nullable: true
 *                             description: Populated job title (JobTitles)
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                                 example: "Senior Sales Consultant"
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                           ratings:
 *                             type: object
 *                             properties:
 *                               average:
 *                                 type: number
 *                                 example: 4.5
 *                               totalCount:
 *                                 type: integer
 *                                 example: 120
 *                           nationality:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                                 example: "United Arab Emirates"
 *                               code:
 *                                 type: string
 *                                 example: "AE"
 *                               flag:
 *                                 type: string
 *                                 nullable: true
 *                           languages:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                   example: "English"
 *                                 code:
 *                                   type: string
 *                                   example: "en"
 *                                 nativeName:
 *                                   type: string
 *                                   nullable: true
 *                             example:
 *                               - _id: "65f12f0f9a9b9c0a1b2c3d4e"
 *                                 name: "English"
 *                                 code: "en"
 *                           responseTime:
 *                             type: string
 *                             example: "within 24 hours"
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               totalSaleProperties:
 *                                 type: integer
 *                                 example: 45
 *                               totalRentProperties:
 *                                 type: integer
 *                                 example: 32
 *                           agency:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                                 example: "Premium Real Estate"
 *                               logo:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "https://cdn.example.com/agency-logo.png"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
const searchAgents = asyncHandler(async (req, res) => {
  const {
    name,
    location,
    serviceNeeded,
    language,
    nationality,
    agentType,
    agencyId,
    minRating,
    propertyType,
    page = 1,
    limit = 20
  } = req.query;

  const nameTrim = name != null && String(name).trim() ? String(name).trim() : '';
  const locationTrim =
    location != null && String(location).trim() ? String(location).trim() : '';
  /**
   * One search box often sends the same string as both `name` and `location`.
   * Then we must OR: match agent name/job title OR match location — not AND (which drops everyone).
   */
  const unifiedTextSearch = nameTrim.length > 0 && nameTrim === locationTrim;

  const buildNameSearchConditions = async (str) => {
    const rx = new RegExp(escapeRegex(str), 'i');
    const jobTitleMatches = await JobTitles.find({ title: rx, isActive: true })
      .select('_id')
      .lean();
    const specIds = jobTitleMatches.map((j) => j._id);
    const conds = [{ fullName: rx }];
    if (specIds.length > 0) {
      conds.push({ specialization: { $in: specIds } });
    }
    return conds;
  };

  // Build base filter
  const filter = {
    isActive: true,
    isVerified: true,
  };

  const agencyFilterResult = await applyPublicAgencyFilter(filter, agencyId);
  if (!agencyFilterResult.ok) {
    return failure(res, 400, agencyFilterResult.error, 'VALIDATION_ERROR');
  }
  if (agencyFilterResult.empty) {
    return success(res, 'No agents found', emptyAgentSearchResult(page, limit));
  }

  // Filter by agentType
  if (agentType && agentType !== 'all') {
    if (['agent', 'superagent'].includes(agentType)) {
      filter.agentType = agentType;
    }
  }

  // Filter by nationality (country ID)
  if (nationality && Types.ObjectId.isValid(nationality)) {
    filter.nationality = new Types.ObjectId(nationality);
  }

  // Filter by languages (language IDs)
  if (language) {
    const languageIds = Array.isArray(language) ? language : [language];
    const validLanguageIds = languageIds.filter(id => Types.ObjectId.isValid(id));
    
    if (validLanguageIds.length > 0) {
      // Verify languages exist and are active
      const validLanguages = await Languages.find({
        _id: { $in: validLanguageIds.map(id => new Types.ObjectId(id)) },
        isActive: true
      }).select('_id').lean();
      
      if (validLanguages.length > 0) {
        filter.languages = { $in: validLanguages.map(lang => lang._id) };
      } else {
        // No valid languages found, return empty result
        return success(res, 'No agents found', {
          items: [],
          pagination: {
            total: 0,
            totalPages: 0,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });
      }
    }
  }

  // Filter by rating
  if (minRating) {
    const rating = parseFloat(minRating);
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      filter['ratings.average'] = { $gte: rating };
    }
  }

  // Handle location, serviceNeeded, and propertyType filtering
  let agentIdsForLocation = null;
  let agentIdsForService = null;
  let agentIdsForPropertyType = null;

  // Filter by location: agents with properties in location OR expertiseAreas includes location
  if (locationTrim) {
    const locRx = new RegExp(escapeRegex(locationTrim), 'i');

    // Find location by name (case-insensitive)
    const locationDoc = await Location.findOne({
      $or: [{ name: locRx }, { slug: locRx }],
      isActive: true
    });

    // Get agents with properties in this location
    // Properties store location inline only (city, zone, fullAddress) — no Location ref
    const propertyLocationFilter = {
      isActive: true,
      status: 'active',
      $or: [
        { 'location.city': locRx },
        { 'location.zone': locRx },
        { 'location.fullAddress': locRx }
      ]
    };

    const propertiesInLocation = await Properties.find(propertyLocationFilter).distinct('agent');
    agentIdsForLocation = new Set(propertiesInLocation.map(id => id.toString()));

    // Also check expertiseAreas (only base filters: isActive and isVerified)
    const agentsWithExpertise = await Agents.find({
      isActive: true,
      isVerified: true,
      $or: [
        { 'expertiseAreas.locationName': locRx },
        ...(locationDoc ? [{ 'expertiseAreas.location': locationDoc._id }] : [])
      ]
    }).select('_id');

    agentsWithExpertise.forEach(agent => {
      agentIdsForLocation.add(agent._id.toString());
    });
  }

  // Filter by serviceNeeded: agents with properties matching the listingType
  if (serviceNeeded) {
    const validServiceValues = SERVICES_NEEDED.map(s => s.value);
    if (validServiceValues.includes(serviceNeeded)) {
      const listingTypeId = await getListingTypeForService(serviceNeeded);
      
      if (listingTypeId) {
        const propertiesForService = await Properties.find({
          listingType: listingTypeId,
          isActive: true,
          status: 'active'
        }).distinct('agent');
        
        agentIdsForService = new Set(propertiesForService.map(id => id.toString()));
      }
    }
  }

  // Filter by propertyType: agents with properties matching the propertyType
  if (propertyType && Types.ObjectId.isValid(propertyType)) {
    const propertiesForPropertyType = await Properties.find({
      propertyType: new Types.ObjectId(propertyType),
      isActive: true,
      status: 'active'
    }).distinct('agent');
    
    agentIdsForPropertyType = new Set(propertiesForPropertyType.map(id => id.toString()));
  }

  /**
   * Service / propertyType narrow which agents are eligible (listing-based).
   * For unified text search, location is OR'd with name — do not intersect empty location with service first.
   */
  const listingConstraintSets = [];
  if (agentIdsForService) listingConstraintSets.push(agentIdsForService);
  if (agentIdsForPropertyType) listingConstraintSets.push(agentIdsForPropertyType);

  let mandatoryListingIds = null;
  if (listingConstraintSets.length > 0) {
    let ids = [...listingConstraintSets[0]];
    for (let i = 1; i < listingConstraintSets.length; i++) {
      ids = ids.filter((id) => listingConstraintSets[i].has(id));
    }
    if (ids.length === 0) {
      return success(res, 'No agents found', {
        items: [],
        pagination: {
          total: 0,
          totalPages: 0,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    }
    mandatoryListingIds = ids.map((id) => new Types.ObjectId(id));
  }

  if (unifiedTextSearch) {
    const orConds = await buildNameSearchConditions(nameTrim);
    if (agentIdsForLocation && agentIdsForLocation.size > 0) {
      orConds.push({
        _id: { $in: [...agentIdsForLocation].map((id) => new Types.ObjectId(id)) }
      });
    }
    const andClauses = [{ $or: orConds }];
    if (mandatoryListingIds) {
      andClauses.push({ _id: { $in: mandatoryListingIds } });
    }
    filter.$and = andClauses;
  } else {
    if (nameTrim) {
      filter.$or = await buildNameSearchConditions(nameTrim);
    }
    const geoListingSets = [];
    if (agentIdsForLocation) geoListingSets.push(agentIdsForLocation);
    if (agentIdsForService) geoListingSets.push(agentIdsForService);
    if (agentIdsForPropertyType) geoListingSets.push(agentIdsForPropertyType);

    if (geoListingSets.length > 0) {
      let combinedIds = [...geoListingSets[0]];
      for (let i = 1; i < geoListingSets.length; i++) {
        combinedIds = combinedIds.filter((id) => geoListingSets[i].has(id));
      }
      if (combinedIds.length === 0) {
        return success(res, 'No agents found', {
          items: [],
          pagination: {
            total: 0,
            totalPages: 0,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });
      }
      filter._id = { $in: combinedIds.map((id) => new Types.ObjectId(id)) };
    }
  }

  // Pagination
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const total = await Agents.countDocuments(filter);

  // Sort superagent first, then rating, then name — before skip/limit (not after).
  const pagedIds = await Agents.aggregate([
    { $match: filter },
    {
      $addFields: {
        _sortSuperagent: {
          $cond: [{ $eq: ['$agentType', 'superagent'] }, 0, 1],
        },
        _sortRating: { $ifNull: ['$ratings.average', 0] },
      },
    },
    { $sort: { _sortSuperagent: 1, _sortRating: -1, fullName: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    { $project: { _id: 1 } },
  ]);

  const orderedIds = pagedIds.map((row) => row._id);
  const orderIndex = new Map(
    orderedIds.map((id, index) => [id.toString(), index]),
  );

  const agentsRaw =
    orderedIds.length > 0
      ? await Agents.find({ _id: { $in: orderedIds } })
          .populate({
            path: 'agency',
            select: 'agencyName profilePicture logo',
            match: { isActive: true, isVerified: true },
          })
          .populate({
            path: 'nationality',
            select: 'name code flag phoneCode isActive',
          })
          .populate({
            path: 'languages',
            select: 'name code nativeName',
            match: { isActive: true },
          })
          .populate({
            path: 'specialization',
            select: 'title description isActive',
            match: { isActive: true },
          })
          .select(
            'fullName profilePicture agentType specialization ratings nationality languages responseTime statistics.totalSaleProperties statistics.totalRentProperties agency',
          )
          .lean()
      : [];

  const agents = agentsRaw
    .filter((agent) => agent.agency)
    .sort(
      (a, b) =>
        (orderIndex.get(a._id.toString()) ?? 0) -
        (orderIndex.get(b._id.toString()) ?? 0),
    );

  const propertyCountsByAgent = await aggregateActivePropertyCountsByAgents(
    agents.map((agent) => agent._id),
  );

  // Format response
  const items = agents.map((agent) => {
    const liveCounts =
      propertyCountsByAgent.get(agent._id.toString()) || {
        totalSaleProperties: 0,
        totalRentProperties: 0,
      };

    return {
      _id: agent._id,
      name: agent.fullName,
      profilePicture: agent.profilePicture,
      agentType: agent.agentType,
      specialization: formatSpecialization(agent.specialization),
      ratings: agent.ratings || { average: 0, totalCount: 0 },
      nationality: formatNationality(agent.nationality),
      languages: agent.languages || [],
      responseTime: agent.responseTime,
      statistics: {
        totalSaleProperties: liveCounts.totalSaleProperties,
        totalRentProperties: liveCounts.totalRentProperties,
      },
      agency: agent.agency
        ? {
            _id: agent.agency._id,
            name: agent.agency.agencyName,
            logo: agent.agency.logo || agent.agency.profilePicture,
          }
        : null,
    };
  });

  return success(res, 'Agents fetched successfully', {
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
 * /agents/{id}:
 *   get:
 *     summary: Get public agent profile
 *     description: >
 *       Get detailed public profile of an active agent including track records (last 12 months),
 *       expertise areas, awards, and paginated list of their properties. Properties can be
 *       filtered by listingType.
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
//  *       - in: query
//  *         name: listingType
//  *         schema:
//  *           type: string
//  *         description: ListingType ObjectId to filter agent's properties (Buy/Rent filter)
//  *         example: "65f12f0f9a9b9c0a1b2c3d4e"
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *           enum: [newest, featured, price-low, price-high, beds-least, beds-most]
//  *           default: newest
//  *         description: Sort properties by - newest, featured, price (low/high), or beds (least/most)
//  *         example: "featured"
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: Page number for property pagination
//  *         example: 1
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 100
//  *           default: 20
//  *         description: Number of properties per page (max 100)
//  *         example: 20
 *     responses:
 *       200:
 *         description: Agent profile fetched successfully
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
 *                   example: "Agent profile fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "65f12f0f9a9b9c0a1b2c3d4e"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     profilePicture:
 *                       type: string
 *                       nullable: true
 *                       example: "https://cdn.example.com/agent-profile.jpg"
 *                     agentType:
 *                       type: string
 *                       enum: [agent, superagent]
 *                       example: "superagent"
 *                     specialization:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         _id:
 *                           type: string
 *                         title:
 *                           type: string
 *                           example: "Senior Sales Consultant"
 *                         description:
 *                           type: string
 *                           nullable: true
 *                     experience:
 *                       type: integer
 *                       nullable: true
 *                       example: 10
 *                     experienceSince:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                       example: "2014-01-15"
 *                     ratings:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                           example: 4.5
 *                         totalCount:
 *                           type: integer
 *                           example: 120
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             fiveStar:
 *                               type: integer
 *                             fourStar:
 *                               type: integer
 *                             threeStar:
 *                               type: integer
 *                             twoStar:
 *                               type: integer
 *                             oneStar:
 *                               type: integer
 *                     responseTime:
 *                       type: string
 *                       example: "within 24 hours"
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "+971501234567"
 *                     whatsappNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "+971501234567"
 *                     isWhatsappPrimary:
 *                       type: boolean
 *                       example: false
 *                     brokerLicenseNumber:
 *                       type: string
 *                       nullable: true
 *                       example: "12345"
 *                     nationality:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                         flag:
 *                           type: string
 *                           nullable: true
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           nativeName:
 *                             type: string
 *                             nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     aboutMe:
 *                       type: string
 *                       nullable: true
 *                     socialLinks:
 *                       type: object
 *                       properties:
 *                         linkedin:
 *                           type: string
 *                           nullable: true
 *                         facebook:
 *                           type: string
 *                           nullable: true
 *                         instagram:
 *                           type: string
 *                           nullable: true
 *                         twitter:
 *                           type: string
 *                           nullable: true
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalRevenueSales:
 *                           type: number
 *                         totalRevenueRent:
 *                           type: number
 *                         activeListings:
 *                           type: integer
 *                         totalListings:
 *                           type: integer
 *                         totalRentProperties:
 *                           type: integer
 *                         totalSaleProperties:
 *                           type: integer
 *                         totalInquiries:
 *                           type: integer
 *                         dealsClosedSales:
 *                           type: integer
 *                         dealsClosedRent:
 *                           type: integer
 *                         totalDeals:
 *                           type: integer
 *                         totalDealsClosed:
 *                           type: integer
 *                           description: Total deals closed (sales + rent)
 *                         totalRevenue:
 *                           type: number
 *                           description: Total revenue from all deals (sales + rent)
 *                     awards:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           awardedBy:
 *                             type: string
 *                           year:
 *                             type: integer
 *                           image:
 *                             type: string
 *                             nullable: true
 *                           addedAt:
 *                             type: string
 *                             format: date-time
 *                     trackRecords:
 *                       type: array
 *                       description: Track records from last 12 months (max 50)
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                           dealClosedDate:
 *                             type: string
 *                             format: date
 *                           dealType:
 *                             type: string
 *                             enum: [rent, sale]
 *                           propertyType:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                           bedrooms:
 *                             type: integer
 *                             nullable: true
 *                           dealAmount:
 *                             type: number
 *                             nullable: true
 *                           propertyId:
 *                             type: string
 *                             nullable: true
 *                           inquiryId:
 *                             type: string
 *                             nullable: true
 *                     expertiseAreas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                             nullable: true
 *                           locationName:
 *                             type: string
 *                           locationDetails:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               coordinates:
 *                                 type: object
 *                                 nullable: true
 *                           totalDeals:
 *                             type: integer
 *                           rentDeals:
 *                             type: integer
 *                           saleDeals:
 *                             type: integer
 *                           averageRating:
 *                             type: number
 *                           totalRevenue:
 *                             type: number
 *                           listingImage:
 *                             type: string
 *                             nullable: true
 *                             description: Location cover image or first gallery image
 *                     agency:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                           example: "Premium Real Estate"
 *                         logo:
 *                           type: string
 *                           nullable: true
 *                           example: "https://cdn.example.com/agency-logo.png"
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         website:
 *                           type: string
 *                           nullable: true
 *                         address:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             street:
 *                               type: string
 *                             city:
 *                               type: string
 *                             state:
 *                               type: string
 *                             country:
 *                               type: string
 *                             zipCode:
 *                               type: string
 *                             fullAddress:
 *                               type: string
 *                         ratings:
 *                           type: object
 *                           properties:
 *                             average:
 *                               type: number
 *                             totalCount:
 *                               type: integer
//  *                     properties:
//  *                       type: object
//  *                       properties:
//  *                         items:
//  *                           type: array
//  *                           items:
//  *                             type: object
//  *                             properties:
//  *                               _id:
//  *                                 type: string
//  *                               title:
//  *                                 type: string
//  *                               images:
//  *                                 type: array
//  *                                 items:
//  *                                   type: object
//  *                                   properties:
//  *                                     url:
//  *                                       type: string
//  *                                     isPrimary:
//  *                                       type: boolean
//  *                                     order:
//  *                                       type: integer
//  *                               price:
//  *                                 type: number
//  *                               currency:
//  *                                 type: string
//  *                               bedrooms:
//  *                                 type: integer
//  *                               bathrooms:
//  *                                 type: integer
//  *                               area:
//  *                                 type: object
//  *                                 properties:
//  *                                   sqm:
//  *                                     type: number
//  *                                   sqft:
//  *                                     type: number
//  *                                     nullable: true
//  *                               location:
//  *                                 type: object
//  *                                 properties:
//  *                                   fullAddress:
//  *                                     type: string
//  *                                     nullable: true
//  *                                   city:
//  *                                     type: string
//  *                                     nullable: true
//  *                                   zone:
//  *                                     type: string
//  *                                     nullable: true
//  *                                   building:
//  *                                     type: string
//  *                                     nullable: true
//  *                               listingType:
//  *                                 type: object
//  *                                 nullable: true
//  *                                 properties:
//  *                                   _id:
//  *                                     type: string
//  *                                   name:
//  *                                     type: string
//  *                                   slug:
//  *                                     type: string
//  *                               propertyType:
//  *                                 type: object
//  *                                 nullable: true
//  *                                 properties:
//  *                                   _id:
//  *                                     type: string
//  *                                   name:
//  *                                     type: string
//  *                                   slug:
//  *                                     type: string
//  *                               status:
//  *                                 type: string
//  *                                 enum: [active, inactive, sold, rented, pending]
//  *                               publishedAt:
//  *                                 type: string
//  *                                 format: date-time
//  *                                 nullable: true
//  *                         pagination:
//  *                           type: object
//  *                           properties:
//  *                             total:
//  *                               type: integer
//  *                             totalPages:
//  *                               type: integer
//  *                             page:
//  *                               type: integer
//  *                             limit:
//  *                               type: integer
 *       400:
 *         description: Invalid agent ID
 *       404:
 *         description: Agent not found or agent agency not found/inactive
 *       500:
 *         description: Server error
 */
const getAgentProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // const { 
  //   listingType, 
  //   sortBy = 'newest', // newest, featured, price-low, price-high, beds-least, beds-most
  //   page = 1, 
  //   limit = 20 
  // } = req.query;

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid agent ID', 'VALIDATION_ERROR');
  }

  // Find agent - select all needed fields (public profile: verified agents only)
  const agent = await Agents.findOne({
    _id: id,
    isActive: true,
    isVerified: true,
  })
    .select('fullName profilePicture agentType specialization experience experienceSince brokerLicenseNumber ratings responseTime nationality languages description aboutMe socialLinks statistics awards trackRecords expertiseAreas phoneNumber whatsappNumber isWhatsappPrimary agency')
    .populate({
      path: 'agency',
      match: { isActive: true, isVerified: true },
      select: 'agencyName profilePicture logo description website address ratings',
    })
    .populate({
      path: 'nationality',
      select: 'name'
    })
    .populate({
      path: 'languages',
      select: 'name code nativeName',
      match: { isActive: true }
    })
    .populate({
      path: 'specialization',
      select: 'title description isActive',
      match: { isActive: true }
    })
    .lean();

  if (!agent) {
    return failure(res, 404, 'Agent not found', 'NOT_FOUND');
  }

  if (!agent.agency) {
    return failure(res, 404, 'Agent agency not found, inactive, or not verified', 'NOT_FOUND');
  }

  const populatedTrackRecords = await getAgentTrackRecordsFromClosedDeals(
    agent._id,
    { limit: 30 },
  );

  const embeddedExpertise = agent.expertiseAreas || [];
  const expertiseRatings = agent.ratings || { average: 0, totalCount: 0 };
  const expertiseAreas = embeddedExpertise.length
    ? await enrichExpertiseAreasWithLocations(embeddedExpertise, {
        agentRatings: expertiseRatings,
      })
    : await getAgentExpertiseAreasFromClosedDeals(agent._id, {
        agentRatings: expertiseRatings,
      });

  // Get properties with filters and sorting
  // const propertyFilter = {
  //   agent: agent._id,
  //   isActive: true,
  //   status: 'active'
  // };

  // Filter by listingType if provided (Buy/Rent)
  // if (listingType && Types.ObjectId.isValid(listingType)) {
  //   propertyFilter.listingType = new Types.ObjectId(listingType);
  // }

  // Build sort based on sortBy parameter
  // let sort = {};
  // switch (sortBy) {
  //   case 'featured':
  //     sort = { 'featured.isFeatured': -1, 'featured.priority': -1, publishedAt: -1 };
  //     break;
  //   case 'price-low':
  //     sort = { price: 1, publishedAt: -1 };
  //     break;
  //   case 'price-high':
  //     sort = { price: -1, publishedAt: -1 };
  //     break;
  //   case 'beds-least':
  //     sort = { bedrooms: 1, publishedAt: -1 };
  //     break;
  //   case 'beds-most':
  //     sort = { bedrooms: -1, publishedAt: -1 };
  //     break;
  //   case 'newest':
  //   default:
  //     sort = { publishedAt: -1 };
  //     break;
  // }

  // const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  // const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  // const skip = (pageNum - 1) * limitNum;

  // const [properties, totalProperties] = await Promise.all([
  //   Properties.find(propertyFilter)
  //     .populate('listingType', 'name slug')
  //     .populate('propertyType', 'name slug')
  //     .select('title images price currency bedrooms bathrooms area location listingType propertyType status publishedAt featured isFeatured')
  //     .sort(sort)
  //     .skip(skip)
  //     .limit(limitNum)
  //     .lean(),
  //   Properties.countDocuments(propertyFilter)
  // ]);

  // Format properties
  // const formattedProperties = properties.map(prop => ({
  //   _id: prop._id,
  //   title: prop.title,
  //   images: prop.images || [],
  //   price: prop.price,
  //   currency: prop.currency,
  //   bedrooms: prop.bedrooms,
  //   bathrooms: prop.bathrooms,
  //   area: prop.area,
  //   location: prop.location,
  //   listingType: prop.listingType,
  //   propertyType: prop.propertyType,
  //   status: prop.status,
  //   publishedAt: prop.publishedAt,
  //   isFeatured: prop.featured?.isFeatured || prop.isFeatured || false,
  //   featuredPriority: prop.featured?.priority || 0
  // }));

  const agentIdStr = agent._id.toString();
  const [propertyCountsByAgent, dealStatsByAgent] = await Promise.all([
    aggregateActivePropertyCountsByAgents([agent._id]),
    aggregateClosedDealStatsByAgents([agent._id]),
  ]);

  const livePropertyCounts = propertyCountsByAgent.get(agentIdStr) || {
    totalSaleProperties: 0,
    totalRentProperties: 0,
  };
  const liveDealStats = dealStatsByAgent.get(agentIdStr) || {
    totalRevenueSales: 0,
    totalRevenueRent: 0,
    dealsClosedSales: 0,
    dealsClosedRent: 0,
  };

  const stats = agent.statistics || {};
  const totalDealsClosed =
    liveDealStats.dealsClosedSales + liveDealStats.dealsClosedRent;
  const totalRevenue =
    liveDealStats.totalRevenueSales + liveDealStats.totalRevenueRent;

  // Format response
  const profile = {
    _id: agent._id,
    name: agent.fullName,
    profilePicture: agent.profilePicture,
    agentType: agent.agentType,
    specialization: formatSpecialization(agent.specialization),
    experience: agent.experience,
    experienceSince: agent.experienceSince,
    brokerLicenseNumber: agent.brokerLicenseNumber,
    ratings: agent.ratings || { average: 0, totalCount: 0, breakdown: {} },
    responseTime: agent.responseTime,
    nationality: formatNationality(agent.nationality),
    languages: agent.languages || [],
    phoneNumber: agent.phoneNumber,
    whatsappNumber: agent.whatsappNumber,
    isWhatsappPrimary: agent.isWhatsappPrimary || false,
    description: agent.description,
    aboutMe: agent.aboutMe,
    socialLinks: agent.socialLinks || {},
    statistics: {
      ...stats,
      totalRevenueSales: liveDealStats.totalRevenueSales,
      totalRevenueRent: liveDealStats.totalRevenueRent,
      dealsClosedSales: liveDealStats.dealsClosedSales,
      dealsClosedRent: liveDealStats.dealsClosedRent,
      totalDeals: totalDealsClosed,
      totalDealsClosed,
      totalRevenue,
      totalSaleProperties: livePropertyCounts.totalSaleProperties,
      totalRentProperties: livePropertyCounts.totalRentProperties,
    },
    // awards: agent.awards || ["awards02.png"],
    awards: ["awards02.png"],
    trackRecords: populatedTrackRecords,
    expertiseAreas: expertiseAreas,
    agency: {
      _id: agent.agency._id,
      name: agent.agency.agencyName,
      logo: agent.agency.profilePicture || agent.agency.logo,
      description: agent.agency.description,
      website: agent.agency.website,
      address: agent.agency.address,
      ratings: agent.agency.ratings || { average: 0, totalCount: 0 }
    },
    shareLink: buildShareLink('/agentdetails', agent._id),
    // properties: {
    //   items: formattedProperties,
    //   pagination: {
    //     total: totalProperties,
    //     totalPages: Math.ceil(totalProperties / limitNum),
    //     page: pageNum,
    //     limit: limitNum
    //   }
    // }
  };

  return success(res, 'Agent profile fetched successfully', profile);
});

module.exports = {
  searchAgents,
  getAgentProfile
};

