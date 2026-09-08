const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agencies = require('../../models/agenciesModel');
const Agents = require('../../models/agentsModel');
const Properties = require('../../models/propertiesModal');
const ListingType = require('../../models/listingTypeModel');
const Location = require('../../models/locationsModel');
const Countries = require('../../models/countriesModel');
const { success, failure } = require('../../utils/helpers');
const { SERVICES_NEEDED } = require('../../utils/constants');
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

const { Types } = mongoose;
const buildShareLink = (path, id) => {
  if (!FRONTEND_URL || !id) return null;
  return `${FRONTEND_URL}${path}/${encodeURIComponent(String(id))}`;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Populated Countries doc or ObjectId → API shape for agency `nationality`. */
const formatNationality = (nat) => {
  if (nat == null) return null;
  if (typeof nat === 'object' && nat._id != null) {
    return {
      _id: nat._id,
      name: nat.name ?? null,
      code: nat.code ?? null,
      flag: nat.flag ?? null,
      phoneCode: nat.phoneCode ?? null
    };
  }
  if (Types.ObjectId.isValid(nat)) {
    return { _id: nat };
  }
  return null;
};

const buildAgencyNameSearchConditions = (str) => {
  const rx = new RegExp(escapeRegex(str), 'i');
  return [{ agencyName: rx }, { description: rx }];
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
 * /agency/search:
 *   get:
 *     summary: Search agencies with filters
 *     description: >
 *       Search for active and verified agencies based on location, service needed, and rating.
 *       Returns paginated results sorted by total active listings and rating.
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: >
 *           Matches agencyName and description. If `location` is the **same** string (single search box),
 *           results are **name/description OR listings location**; otherwise combined with AND.
 *         example: "Premium Real Estate"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: >
 *           Agencies with active listings in this area. Same string as `name` ⇒ OR with name search; else AND.
 *         example: "Dubai Marina"
 *       - in: query
 *         name: serviceNeeded
 *         schema:
 *           type: string
 *           enum: [residential-sale, residential-rent, commercial-sale, commercial-rent]
 *         description: Service type needed - filters agencies who have properties matching this service type
 *         example: "residential-sale"
 *       - in: query
 *         name: nationality
 *         schema:
 *           type: string
 *         description: Country ObjectId - filters agencies by nationality
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
 *         description: Agencies fetched successfully
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
 *                   example: "Agencies fetched successfully"
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
 *                           orn:
 *                             type: string
 *                             nullable: true
 *                           address:
 *                             type: object
 *                             nullable: true
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               totalActiveListings:
 *                                 type: integer
 *                               totalInactiveListings:
 *                                 type: integer
 *                               totalSaleListings:
 *                                 type: integer
 *                               totalRentListings:
 *                                 type: integer
 *                           totalAgents:
 *                             type: integer
 *                             description: Total number of active agents
 *                           totalSuperAgents:
 *                             type: integer
 *                             description: Total number of active superagents
 *                           ratings:
 *                             type: object
 *                             properties:
 *                               average:
 *                                 type: number
 *                               totalCount:
 *                                 type: integer
 *                           nationality:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                               flag:
 *                                 type: string
 *                                 nullable: true
 *                     pagination:
 *                       type: object
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
const searchAgencies = asyncHandler(async (req, res) => {
  const {
    name,
    location,
    serviceNeeded,
    nationality,
    minRating,
    page = 1,
    limit = 20
  } = req.query;

  const nameTrim = name != null && String(name).trim() ? String(name).trim() : '';
  const locationTrim =
    location != null && String(location).trim() ? String(location).trim() : '';
  const unifiedTextSearch = nameTrim.length > 0 && nameTrim === locationTrim;

  // Build base filter
  const filter = {
    isActive: true,
    isVerified: true
  };

  // Filter by nationality (country ID)
  if (nationality && Types.ObjectId.isValid(nationality)) {
    filter.nationality = new Types.ObjectId(nationality);
  }

  // Filter by rating
  if (minRating) {
    const rating = parseFloat(minRating);
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      filter['ratings.average'] = { $gte: rating };
    }
  }

  // Handle location and serviceNeeded filtering
  let agencyIdsForLocation = null;
  let agencyIdsForService = null;

  // Filter by location: agencies with properties in location
  if (locationTrim) {
    const locRx = new RegExp(escapeRegex(locationTrim), 'i');

    const propertyLocationFilter = {
      isActive: true,
      status: 'active',
      $or: [
        { 'location.city': locRx },
        { 'location.zone': locRx },
        { 'location.fullAddress': locRx }
      ]
    };

    const propertiesInLocation = await Properties.find(propertyLocationFilter).distinct('agency');
    agencyIdsForLocation = new Set(propertiesInLocation.map(id => id.toString()));
  }

  // Filter by serviceNeeded: agencies with properties matching the listingType
  if (serviceNeeded) {
    const validServiceValues = SERVICES_NEEDED.map(s => s.value);
    if (validServiceValues.includes(serviceNeeded)) {
      const listingTypeId = await getListingTypeForService(serviceNeeded);
      
      if (listingTypeId) {
        const propertiesForService = await Properties.find({
          listingType: listingTypeId,
          isActive: true,
          status: 'active'
        }).distinct('agency');
        
        agencyIdsForService = new Set(propertiesForService.map(id => id.toString()));
      }
    }
  }

  let mandatoryServiceAgencyIds = null;
  if (agencyIdsForService && agencyIdsForService.size > 0) {
    mandatoryServiceAgencyIds = [...agencyIdsForService].map((id) => new Types.ObjectId(id));
  } else if (serviceNeeded && agencyIdsForService && agencyIdsForService.size === 0) {
    return success(res, 'No agencies found', {
      items: [],
      pagination: {
        total: 0,
        totalPages: 0,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }

  if (unifiedTextSearch) {
    const orConds = buildAgencyNameSearchConditions(nameTrim);
    if (agencyIdsForLocation && agencyIdsForLocation.size > 0) {
      orConds.push({
        _id: { $in: [...agencyIdsForLocation].map((id) => new Types.ObjectId(id)) }
      });
    }
    const andClauses = [{ $or: orConds }];
    if (mandatoryServiceAgencyIds) {
      andClauses.push({ _id: { $in: mandatoryServiceAgencyIds } });
    }
    filter.$and = andClauses;
  } else {
    if (nameTrim) {
      filter.$or = buildAgencyNameSearchConditions(nameTrim);
    }
    const geoServiceSets = [];
    if (agencyIdsForLocation) geoServiceSets.push(agencyIdsForLocation);
    if (agencyIdsForService) geoServiceSets.push(agencyIdsForService);

    if (geoServiceSets.length > 0) {
      let combinedIds = [...geoServiceSets[0]];
      for (let i = 1; i < geoServiceSets.length; i++) {
        combinedIds = combinedIds.filter((id) => geoServiceSets[i].has(id));
      }

      if (combinedIds.length === 0) {
        return success(res, 'No agencies found', {
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

  // Sort: totalActiveListings DESC, then ratings.average DESC
  const sort = {
    'statistics.totalActiveListings': -1,
    'ratings.average': -1
  };

  // Get buy and rent listing type IDs once (optimization)
  const [buyListingTypes, rentListingTypes] = await Promise.all([
    ListingType.find({ transaction: 'buy', isActive: true }).select('_id').lean(),
    ListingType.find({ transaction: 'rent', isActive: true }).select('_id').lean()
  ]);

  const buyListingTypeIds = buyListingTypes.map(lt => lt._id);
  const rentListingTypeIds = rentListingTypes.map(lt => lt._id);

  // Get agencies
  const agencies = await Agencies.find(filter)
    .populate({
      path: 'nationality',
      select: 'name code flag phoneCode isActive'
    })
    .select('agencyName profilePicture orn address statistics ratings nationality')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get agent counts and listing counts for each agency
  const agenciesWithCounts = await Promise.all(
    agencies.map(async (agency) => {
      // Get agent counts
      const agentCounts = await Agents.aggregate([
        {
          $match: {
            agency: agency._id,
            isActive: true,
            isVerified: true
          }
        },
        {
          $group: {
            _id: '$agentType',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalAgents = agentCounts.reduce((sum, item) => sum + item.count, 0);
      const totalSuperAgents = agentCounts.find(item => item._id === 'superagent')?.count || 0;

      // Get listing counts by type (active listings for sale and rent)
      const [totalSaleListings, totalRentListings] = await Promise.all([
        Properties.countDocuments({
          agency: agency._id,
          listingType: { $in: buyListingTypeIds },
          isActive: true,
          status: 'active'
        }),
        Properties.countDocuments({
          agency: agency._id,
          listingType: { $in: rentListingTypeIds },
          isActive: true,
          status: 'active'
        })
      ]);

      return {
        ...agency,
        totalAgents,
        totalSuperAgents,
        totalSaleListings,
        totalRentListings
      };
    })
  );

  // Get total count
  const total = await Agencies.countDocuments(filter);

  // Format response
  const items = agenciesWithCounts.map(agency => ({
    _id: agency._id,
    name: agency.agencyName,
    logo: agency.profilePicture,
    orn: agency.orn,
    address: agency.address,
    statistics: {
      totalActiveListings: agency.statistics?.totalActiveListings || 0,
      totalInactiveListings: agency.statistics?.totalInactiveListings || 0,
      totalSaleListings: agency.totalSaleListings || 0,
      totalRentListings: agency.totalRentListings || 0
    },
    totalAgents: agency.totalAgents,
    totalSuperAgents: agency.totalSuperAgents,
    ratings: agency.ratings || { average: 0, totalCount: 0 },
    nationality: formatNationality(agency.nationality)
  }));

  return success(res, 'Agencies fetched successfully', {
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
 * /agency/{id}:
 *   get:
 *     summary: Get public agency profile
 *     description: >
 *       Get detailed public profile of an active and verified agency including all agents,
 *       properties, and awards. Properties can be filtered and sorted.
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agency ObjectId
 *         example: "65f12f0f9a9b9c0a1b2c3d4e"
//  *       - in: query
//  *         name: listingType
//  *         schema:
//  *           type: string
//  *         description: ListingType ObjectId to filter agency's properties (Buy/Rent filter)
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
//  *       - in: query
//  *         name: agentPage
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: Page number for agents pagination
//  *         example: 1
//  *       - in: query
//  *         name: agentLimit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 100
//  *           default: 20
//  *         description: Number of agents per page (max 100)
//  *         example: 20
 *     responses:
 *       200:
 *         description: Agency profile fetched successfully
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
 *                   example: "Agency profile fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     logo:
 *                       type: string
 *                       nullable: true
 *                     orn:
 *                       type: string
 *                       nullable: true
 *                     address:
 *                       type: object
 *                       nullable: true
 *                     email:
 *                       type: string
 *                       nullable: true
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     website:
 *                       type: string
 *                       nullable: true
 *                     foundedYear:
 *                       type: integer
 *                       nullable: true
 *                     aboutUs:
 *                       type: string
 *                       nullable: true
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalActiveListings:
 *                           type: integer
 *                         totalSaleListings:
 *                           type: integer
 *                         totalRentListings:
 *                           type: integer
 *                     ratings:
 *                       type: object
 *                     nationality:
 *                       type: object
 *                       nullable: true
 *                     totalAgents:
 *                       type: integer
 *                     totalSuperAgents:
 *                       type: integer
 *                     awards:
 *                       type: array
 *                     listingsByLocation:
 *                       type: array
//  *                     agents:
//  *                       type: object
//  *                       properties:
//  *                         items:
//  *                           type: array
//  *                         pagination:
//  *                           type: object
//  *                     properties:
//  *                       type: object
//  *                       properties:
//  *                         items:
//  *                           type: array
//  *                         pagination:
//  *                           type: object
 *       400:
 *         description: Invalid agency ID
 *       404:
 *         description: Agency not found or not verified
 *       500:
 *         description: Server error
 */
const getAgencyProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // const { 
  //   listingType, 
  //   sortBy = 'newest',
  //   page = 1, 
  //   limit = 20,
  //   agentPage = 1,
  //   agentLimit = 20
  // } = req.query;

  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid agency ID', 'VALIDATION_ERROR');
  }

  // Find agency - select all needed fields
  const agency = await Agencies.findOne({
    _id: id,
    isActive: true,
    isVerified: true
  })
    .populate({
      path: 'nationality',
      match: { isActive: true }
    })
    .select('agencyName profilePicture orn address email phoneNumber description website foundedYear statistics ratings awards aboutUs nationality listingsByLocation')
    .lean();

  if (!agency) {
    return failure(res, 404, 'Agency not found or not verified', 'NOT_FOUND');
  }

  // Get agents with pagination
  // const agentPageNum = Math.max(parseInt(agentPage, 10) || 1, 1);
  // const agentLimitNum = Math.min(Math.max(parseInt(agentLimit, 10) || 20, 1), 100);
  // const agentSkip = (agentPageNum - 1) * agentLimitNum;

  // const [agents, totalAgentsCount] = await Promise.all([
  //   Agents.find({
  //     agency: agency._id,
  //     isActive: true,
  //     isVerified: true
  //   })
  //     .populate({
  //       path: 'nationality',
  //       select: 'name code flag',
  //       match: { isActive: true }
  //     })
  //     .populate({
  //       path: 'languages',
  //       select: 'name code nativeName',
  //       match: { isActive: true }
  //     })
  //     .select('fullName profilePicture agentType position ratings specialization nationality languages statistics.totalSaleProperties statistics.totalRentProperties')
  //     .sort({ agentType: -1, 'ratings.average': -1 })
  //     .skip(agentSkip)
  //     .limit(agentLimitNum)
  //     .lean(),
  //   Agents.countDocuments({
  //     agency: agency._id,
  //     isActive: true,
  //     isVerified: true
  //   })
  // ]);

  // Get agent counts
  const agentCounts = await Agents.aggregate([
    {
      $match: {
        agency: agency._id,
        isActive: true,
        isVerified: true
      }
    },
    {
      $group: {
        _id: '$agentType',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalAgents = agentCounts.reduce((sum, item) => sum + item.count, 0);
  const totalSuperAgents = agentCounts.find(item => item._id === 'superagent')?.count || 0;

  // Get properties with filters and sorting
  // const propertyFilter = {
  //   agency: agency._id,
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

  // Calculate total active listings for sale and rent
  // Get buy and rent listing type IDs
  // const [buyListingTypes, rentListingTypes] = await Promise.all([
  //   ListingType.find({ transaction: 'buy', isActive: true }).select('_id').lean(),
  //   ListingType.find({ transaction: 'rent', isActive: true }).select('_id').lean()
  // ]);

  // const buyListingTypeIds = buyListingTypes.map(lt => lt._id);
  // const rentListingTypeIds = rentListingTypes.map(lt => lt._id);

  // const [totalSaleListings, totalRentListings] = await Promise.all([
  //   Properties.countDocuments({
  //     agency: agency._id,
  //     listingType: { $in: buyListingTypeIds },
  //     isActive: true,
  //     status: 'active'
  //   }),
  //   Properties.countDocuments({
  //     agency: agency._id,
  //     listingType: { $in: rentListingTypeIds },
  //     isActive: true,
  //     status: 'active'
  //   })
  // ]);

  // Format response
  const profile = {
    _id: agency._id,
    name: agency.agencyName,
    logo: agency.profilePicture,
    orn: agency.orn,
    address: agency.address,
    email: agency.email,
    phoneNumber: agency.phoneNumber,
    description: agency.description,
    website: agency.website,
    foundedYear: agency.foundedYear,
    aboutUs: agency.aboutUs,
    statistics: {
      ...agency.statistics,
      totalActiveListings: agency.statistics?.totalActiveListings || 0,
      // totalSaleListings,
      // totalRentListings
    },
    ratings: agency.ratings || { average: 0, totalCount: 0 },
    nationality: agency.nationality,
    totalAgents,
    totalSuperAgents,
    awards: agency.awards || [],
    listingsByLocation: agency.listingsByLocation || [],
    shareLink: buildShareLink('/companydetails', agency._id),
    // agents: {
    //   items: agents.map(agent => ({
    //     _id: agent._id,
    //     name: agent.fullName,
    //     profilePicture: agent.profilePicture,
    //     agentType: agent.agentType,
    //     position: agent.position,
    //     specialization: agent.specialization,
    //     ratings: agent.ratings || { average: 0, totalCount: 0 },
    //     nationality: agent.nationality,
    //     languages: agent.languages || [],
    //     statistics: {
    //       totalSaleProperties: agent.statistics?.totalSaleProperties || 0,
    //       totalRentProperties: agent.statistics?.totalRentProperties || 0
    //     },
    //     agency: {
    //       _id: agency._id,
    //       name: agency.agencyName,
    //       logo: agency.profilePicture
    //     }
    //   })),
    //   pagination: {
    //     total: totalAgentsCount,
    //     totalPages: Math.ceil(totalAgentsCount / agentLimitNum),
    //     page: agentPageNum,
    //     limit: agentLimitNum
    //   }
    // },
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

  return success(res, 'Agency profile fetched successfully', profile);
});

module.exports = {
  searchAgencies,
  getAgencyProfile
};

