const crypto = require('crypto');
const asyncHandler = require('express-async-handler');

const Agency = require('../models/agenciesModel');
const Developer = require('../models/developersModel');
const Agent = require('../models/agentsModel');
const Countries = require('../models/countriesModel');
const Amenities = require('../models/amenitiesModel');
const PropertyType = require('../models/propertyTypeModel');
const ListingType = require('../models/listingTypeModel');
const Languages = require('../models/languagesModel');
const JobTitles = require('../models/jobTitlesModel');
const ListingSearchCity = require('../models/listingSearchCityModel');
const { sendInvitationEmail } = require('../services/emailService');
const { success, failure, isEmail } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const {
  SEARCH_ALERT_FREQUENCIES,
  SERVICES_NEEDED,
  FURNISHED_STATUS,
  SORT_BY_PROPERTY,
  SQFT_AREA_SIZES,
  VIRTUAL_VIEWING_TYPES,
  COMPLETION_STATUS,
  SORT_BY_PROJECT,
  DELIVERY_DATE,
  PRICE_RANGE,
  POSTED_BY,
  ALLOCATED_PROPERTY_STATUS,
  INQUIRY_TYPE,
  INQUIRY_DEAL_TYPES,
  INQUIRY_STATUS,
  AGENT_TYPES,
  LOAN_TYPE,
  RESIDENCY_STATUS,
  BUYING_PROCESS,
  EMPLOYMENT_STATUS,
  INQUIRY_CATEGORIES,
  INQUIRY_STATUS_ACTIONS,
  PROJECT_LEAD_TABS,
  PROJECT_LEAD_SUBTABS,
  PROJECT_LEAD_STATUSES,
  PROJECT_LEAD_STATUS_ACTIONS,
  PROJECT_LEAD_STATUS_EXPIRY_DAYS,
  PROJECT_LEAD_STATUSES_REQUIRING_UNIT,
  PROJECT_LEAD_STATUS_HELPER_TEXT,
  NOTIFICATION_STATUS,
  HELP_FAQ_CATEGORIES,
  PROJECT_TYPE_STATUS,
  PROJECT_PROGRESS_STATUS,
  AGENT_EXPERIENCE,
  PROPERTY_STATUS
} = require('../utils/constants');

const FRONTEND_URL = process.env.EXPERTS_UI_URL || '';
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const normalizeEmail = (email = '') => email.toString().toLowerCase().trim();

// Check email across PF expert roles to avoid duplicates during invitation
const findExistingExpertByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  const existingAgency = await Agency.findOne({ email: normalizedEmail });
  if (existingAgency) return { role: 'agency', entity: existingAgency };

  const existingDeveloper = await Developer.findOne({ email: normalizedEmail });
  if (existingDeveloper) return { role: 'developer', entity: existingDeveloper };

  const existingAgent = await Agent.findOne({ email: normalizedEmail });
  if (existingAgent) return { role: 'agent', entity: existingAgent };

  return null;
};

/**
 * @swagger
 * /admin/invite-agency:
 *   post:
 *     summary: Invite an agency partner
 *     description: |
 *       Creates a pending agency record and sends an invitation email with a signup link.
 *       The email must not already belong to an agency, developer, or agent.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Invitation recipient (normalized to lowercase).
 *               agencyName:
 *                 type: string
 *                 description: Optional display name used in the invitation email.
 *     responses:
 *       200:
 *         description: Agency invitation created; email send is best-effort.
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
 *                   example: Invitation sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     invitationToken:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing or invalid email.
 *       409:
 *         description: Email already registered as agency, developer, or agent.
 *       500:
 *         description: Failed to create invitation or persist agency.
 */
const sendAgencyInvitation = asyncHandler(async (req, res) => {
  try {
    const adminId = req.admin?.id || req.admin?._id || req.user?.id || req.user?._id;
    const { email, agencyName } = req.body || {};

    // if (!adminId) {
    //   return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    // }

    if (!email || !isEmail(email)) {
      return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
    }

    const existingExpert = await findExistingExpertByEmail(email);
    if (existingExpert) {
      return failure(
        res,
        409,
        `Email already used by ${existingExpert.role}`,
        'CONFLICT'
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
    const invitationLink = `${FRONTEND_URL}/agency/accept-invitation?token=${token}`;

    const agency = await Agency.create({
      email: normalizedEmail,
      agencyName: agencyName || undefined,
      invitationToken: token,
      invitationStatus: 'pending',
      invitationSentAt: new Date(),
      invitationExpiry: expiresAt,
      isActive: true,
      isVerified: false,
    });

    try {
      await sendInvitationEmail(
        normalizedEmail,
        agencyName || 'Agency',
        invitationLink,
        'Admin Team',
        'Agency Partner'
      );
    } catch (emailError) {
      logger.warn('Failed to send agency invitation email', { error: emailError.message });
    }

    return success(res, 'Invitation sent successfully', {
      email: agency.email,
      invitationToken: token,
      expiresAt,
    });
  } catch (error) {
    logger.error('Send agency invitation failed', { error: error.message });
    return failure(res, 500, 'Failed to send invitation', 'SERVER_ERROR');
  }
});
/**
 * @swagger
 * /admin/invite-developer:
 *   post:
 *     summary: Invite a developer partner
 *     description: |
 *       Creates a pending developer record and sends an invitation email with a signup link.
 *       The email must not already belong to an agency, developer, or agent.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Invitation recipient (normalized to lowercase).
 *               name:
 *                 type: string
 *                 description: Optional display name used in the invitation email.
 *     responses:
 *       200:
 *         description: Developer invitation created; email send is best-effort.
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
 *                   example: Invitation sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     invitationToken:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing or invalid email.
 *       409:
 *         description: Email already registered as agency, developer, or agent.
 *       500:
 *         description: Failed to create invitation or persist developer.
 */
const sendDeveloperInvitation = asyncHandler(async (req, res) => {
  try {
    const adminId = req.admin?.id || req.admin?._id || req.user?.id || req.user?._id;
    const { email, name } = req.body || {};

    // if (!adminId) {
    //   return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    // }

    if (!email || !isEmail(email)) {
      return failure(res, 400, 'Valid email is required', 'VALIDATION_ERROR');
    }

    const existingExpert = await findExistingExpertByEmail(email);
    if (existingExpert) {
      return failure(
        res,
        409,
        `Email already used by ${existingExpert.role}`,
        'CONFLICT'
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
    const invitationLink = `${FRONTEND_URL}/developer/accept-invitation?token=${token}`;

    const developer = await Developer.create({
      email: normalizedEmail,
      name: (name && String(name).trim()) || 'Developer',
      // Unique placeholder until profile completion sets a public slug (avoids duplicate null on slug_1)
      slug: `inv-${token}`,
      invitationToken: token,
      invitationStatus: 'pending',
      invitationSentAt: new Date(),
      invitationExpiry: expiresAt,
      isActive: true,
      isVerified: false,
    });

    try {
      await sendInvitationEmail(
        normalizedEmail,
        name || 'Developer',
        invitationLink,
        'Admin Team',
        'Developer Partner'
      );
    } catch (emailError) {
      logger.warn('Failed to send developer invitation email', { error: emailError.message });
    }

    return success(res, 'Invitation sent successfully', {
      email: developer.email,
      invitationToken: token,
      expiresAt,
    });
  } catch (error) {
    logger.error('Send developer invitation failed', { error: error.message });
    return failure(res, 500, 'Failed to send invitation', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /master-data:
 *   get:
 *     summary: Get master data lists
 *     description: |
 *       Returns one or more master-data collections used across the platform.
 *
 *       You can request:
 *       - a single type via the `type` query param, or
 *       - multiple types via the `types` (comma-separated) query param.
 *
 *       **Supported values:**
 *       - countries
 *       - amenities
 *       - propertytypes
 *       - listingtypes
 *       - alertfrequencies
 *       - postedby
 *       - services
 *       - languages
 *       - furnishedstatus
 *       - sortbyproperty
 *       - sortbyproject
 *       - sqftareasizes
 *       - virtualviewingtypes
 *       - completionstatus
 *       - deliverydates
 *       - pricerange
 *       - allocatedpropertystatus
 *       - inquirytypes
 *       - inquirydealtypes
 *       - inquirystatus
 *       - agenttypes
 *       - jobtitles
 *       - loantype
 *       - residencystatus
 *       - buyingprocess
 *       - employmentstatus
 *       - supportedurls
 *       - inquirycategories
 *       - inquirystatusactions
 *       - projectleadtabs
 *       - projectleadsubtabs
 *       - projectleadstatuses
 *       - projectleadstatusactions
 *       - projectleadstatusexpirydays
 *       - projectleadstatusesrequiringunit
 *       - projectleadstatushelpertext
 *       - notificationstatus
 *       - propertylocations (cities with at least one property listing — from `location.city` index)
 *       - projectlocations (cities with at least one published project — from `location.city` index)
 *       - helpfaqcategories
 *       - projecttypestatus
 *       - projectprogressstatus
 *       - agentexperience
 *       - propertystatus
 *     tags: [Master Data]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Single master-data type to fetch.
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of master-data types to fetch.
 *     responses:
 *       200:
 *         description: Master data fetched successfully.
 *       400:
 *         description: Validation error (missing or invalid type(s)).
 *       500:
 *         description: Server error while fetching master data.
 */

const getMasterData = asyncHandler(async (req, res) => {
  try {
    const { type, types } = req.query || {};

    let requestedTypes = [];

    if (types) {
      requestedTypes = String(types)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    } else if (type) {
      requestedTypes = [String(type).trim().toLowerCase()];
    }

    if (!requestedTypes.length) {
      return failure(res, 400, 'Query parameter "type" or "types" is required', 'VALIDATION_ERROR');
    }

    const supportedTypes = [
      'countries',
      'amenities',
      'propertytypes',
      'listingtypes',
      'alertfrequencies',
      'postedby',
      'services',
      'languages',
      'furnishedstatus',
      'sortbyproperty',
      'sortbyproject',
      'sqftareasizes',
      'virtualviewingtypes',
      'completionstatus',
      'deliverydates',
      'pricerange',
      'allocatedpropertystatus',
      'inquirytypes',
      'inquirydealtypes',
      'inquirystatus',
      'agenttypes',
      'jobtitles',
      'loantype',
      'residencystatus',
      'buyingprocess',
      'employmentstatus',
      'supportedurls',
      'inquirycategories',
      'inquirystatusactions',
      'projectleadtabs',
      'projectleadsubtabs',
      'projectleadstatuses',
      'projectleadstatusactions',
      'projectleadstatusexpirydays',
      'projectleadstatusesrequiringunit',
      'projectleadstatushelpertext',
      'notificationstatus',
      'propertylocations',
      'projectlocations',
      'helpfaqcategories',
      'projecttypestatus',
      'projectprogressstatus',
      'agentexperience',
      'propertystatus'
    ];
    const invalidTypes = requestedTypes.filter((t) => !supportedTypes.includes(t));

    if (invalidTypes.length) {
      return failure(
        res,
        400,
        `Invalid master data type(s): ${invalidTypes.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    const data = {};

    if (requestedTypes.includes('countries')) {
      const countries = await Countries.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.countries = countries;
    }

    if (requestedTypes.includes('amenities')) {
      const amenities = await Amenities.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.amenities = amenities;
    }

    if (requestedTypes.includes('propertytypes')) {
      const propertyTypes = await PropertyType.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.propertyTypes = propertyTypes;
    }

    if (requestedTypes.includes('listingtypes')) {
      const listingTypes = await ListingType.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.listingTypes = listingTypes;
    }

    if (requestedTypes.includes('alertfrequencies')) {
      data.alertFrequencies = SEARCH_ALERT_FREQUENCIES;
    }

    if (requestedTypes.includes('postedby')) {
      data.postedBy = POSTED_BY;
    }

    if (requestedTypes.includes('furnishedstatus')) {
      data.furnishedStatus = FURNISHED_STATUS;
    }

    if (requestedTypes.includes('sortbyproperty')) {
      data.sortByProperty = SORT_BY_PROPERTY;
    }

    if (requestedTypes.includes('sortbyproject')) {
      data.sortByProject = SORT_BY_PROJECT;
    }

    if (requestedTypes.includes('services')) {
      data.services = SERVICES_NEEDED;
    }

    if (requestedTypes.includes('languages')) {
      const languages = await Languages.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.languages = languages;
    }

    if (requestedTypes.includes('sqftareasizes')) {
      data.sqftAreaSizes = SQFT_AREA_SIZES;
    }

    if (requestedTypes.includes('virtualviewingtypes')) {
      data.virtualViewingTypes = VIRTUAL_VIEWING_TYPES;
    }

    if (requestedTypes.includes('completionstatus')) {
      data.completionStatus = COMPLETION_STATUS;
    }

    if (requestedTypes.includes('deliverydates')) {
      data.deliveryDates = DELIVERY_DATE;
    }

    if (requestedTypes.includes('pricerange')) {
      data.priceRange = PRICE_RANGE;
    }

    if (requestedTypes.includes('allocatedpropertystatus')) {
      data.allocatedPropertyStatus = ALLOCATED_PROPERTY_STATUS;
    }

    if (requestedTypes.includes('inquirytypes')) {
      data.inquiryTypes = INQUIRY_TYPE;
    }

    if (requestedTypes.includes('inquirydealtypes')) {
      data.inquiryDealTypes = INQUIRY_DEAL_TYPES;
    }

    if (requestedTypes.includes('inquirystatus')) {
      data.inquiryStatus = INQUIRY_STATUS;
    }

    if (requestedTypes.includes('agenttypes')) {
      data.agentTypes = AGENT_TYPES;
    }

    if (requestedTypes.includes('loantype')) {
      data.loanType = LOAN_TYPE;
    }

    if (requestedTypes.includes('residencystatus')) {
      data.residencyStatus = RESIDENCY_STATUS;
    }

    if (requestedTypes.includes('buyingprocess')) {
      data.buyingProcess = BUYING_PROCESS;
    }

    if (requestedTypes.includes('employmentstatus')) {
      data.employmentStatus = EMPLOYMENT_STATUS;
    }

    if (requestedTypes.includes('jobtitles')) {
      const jobTitles = await JobTitles.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
      data.jobTitles = jobTitles;
    }

    if (requestedTypes.includes('inquirycategories')) {
      data.inquiryCategories = INQUIRY_CATEGORIES;
    }

    if (requestedTypes.includes('inquirystatusactions')) {
      data.inquiryStatusActions = INQUIRY_STATUS_ACTIONS;
    }

    if (requestedTypes.includes('projectleadtabs')) {
      data.projectLeadTabs = PROJECT_LEAD_TABS;
    }

    if (requestedTypes.includes('projectleadsubtabs')) {
      data.projectLeadSubTabs = PROJECT_LEAD_SUBTABS;
    }

    if (requestedTypes.includes('projectleadstatuses')) {
      data.projectLeadStatuses = PROJECT_LEAD_STATUSES;
    }

    if (requestedTypes.includes('projectleadstatusactions')) {
      data.projectLeadStatusActions = PROJECT_LEAD_STATUS_ACTIONS;
    }

    if (requestedTypes.includes('projectleadstatusexpirydays')) {
      data.projectLeadStatusExpiryDays = PROJECT_LEAD_STATUS_EXPIRY_DAYS;
    }

    if (requestedTypes.includes('projectleadstatusesrequiringunit')) {
      data.projectLeadStatusesRequiringUnit = PROJECT_LEAD_STATUSES_REQUIRING_UNIT;
    }

    if (requestedTypes.includes('projectleadstatushelpertext')) {
      data.projectLeadStatusHelperText = PROJECT_LEAD_STATUS_HELPER_TEXT;
    }

    if (requestedTypes.includes('notificationstatus')) {
      data.notificationStatus = NOTIFICATION_STATUS;
    }

    if (requestedTypes.includes('propertylocations')) {
      data.propertyLocations = await ListingSearchCity.find({ propertyCount: { $gt: 0 } })
        .select('cityKey displayName propertyCount updatedAt')
        .sort({ displayName: 1 })
        .lean();
    }

    if (requestedTypes.includes('projectlocations')) {
      data.projectLocations = await ListingSearchCity.find({ projectCount: { $gt: 0 } })
        .select('cityKey displayName projectCount updatedAt')
        .sort({ displayName: 1 })
        .lean();
    }

    if (requestedTypes.includes('helpfaqcategories')) {
      data.helpFaqCategories = HELP_FAQ_CATEGORIES;
    }

    if (requestedTypes.includes('supportedurls')) {
      data.supportedUrls = {
        projectUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/project/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/project/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/project/"
        },
        propertyUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/property/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/property/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/property/"
        },
        agentUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/agents/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/agents/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/agents/"
        },
        agencyUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/agency/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/agency/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/agency/"
        },
        developerUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/developer/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/developer/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/developer/"
        },
        blogUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/blog/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/blog/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/blog/"
        },
        userUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/user/",
          "vid":"https://d1dp1oh0ra5b0z.cloudfront.net/vid/user/",
          "doc":"https://d1dp1oh0ra5b0z.cloudfront.net/doc/user/"
        },
        amenityUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/amenities/",
          "vid":"",
          "doc":""
        },
        awardUrl:{
          "img":"https://d1dp1oh0ra5b0z.cloudfront.net/img/award/",
          "vid":"",
          "doc":""
        }
      }
    }

    if (requestedTypes.includes('projecttypestatus')) {
      data.projectTypeStatus = PROJECT_TYPE_STATUS;
    }

    if (requestedTypes.includes('projectprogressstatus')) {
      data.projectProgressStatus = PROJECT_PROGRESS_STATUS;
    }

    if (requestedTypes.includes('agentexperience')) {
      data.agentExperience = AGENT_EXPERIENCE;
    }

    if (requestedTypes.includes('propertystatus')) {
      data.propertyStatus = PROPERTY_STATUS;
    }

    return success(res, 'Master data fetched successfully', data);
  } catch (error) {
    logger.error('Get master data failed', { error: error.message });
    return failure(res, 500, 'Failed to fetch master data', 'SERVER_ERROR');
  }
});

module.exports = {
  sendAgencyInvitation,
  sendDeveloperInvitation,
  getMasterData,
};

