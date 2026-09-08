const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Newprojects = require('../../models/newprojectsModel');
const Amenities = require('../../models/amenitiesModel');
const Developers = require('../../models/developersModel');
const PropertyType = require('../../models/propertyTypeModel');
const ProjectBuilding = require('../../models/projectBuildingModel');
const ProjectLayout = require('../../models/projectLayoutModel');
const ProjectUnit = require('../../models/projectUnitModel');
const LeadAssignment = require('../../models/leadAssignmentModel');
const ProjectAgencyAllocation = require('../../models/projectAgencyAllocationModel');
const ProjectAgentAllocation = require('../../models/projectAgentAllocationModel');
const ListingType = require('../../models/listingTypeModel');
const Agencies = require('../../models/agenciesModel');
const Agents = require('../../models/agentsModel');
const Notification = require('../../models/notificationModel');

const { success, failure, generateSlug } = require('../../utils/helpers');
const { escapeRegex } = require('../../utils/searchKeyword');
const { logger } = require('../../utils/logger');
const uploadService = require('../../services/uploadService');
const listingSearchCityService = require('../../services/listingSearchCityService');
const { sendEmail } = require('../../services/emailService');
const { sendPushNotificationToToken } = require('../../services/firebaseService');

const { Types } = mongoose;

// Storage folders
const PROJECT_IMAGES_FOLDER = 'project-images';
const PROJECT_VIDEOS_FOLDER = 'project-videos';
const PROJECT_MASTER_PLANS_FOLDER = 'project-master-plans';
const PROJECT_BROCHURES_FOLDER = 'project-brochures';

// Helper functions
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

const toBooleanEnv = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['true', '1', 'yes', 'on'].includes(normalized);
    }
    return false;
};

const isExpertsEmailNotificationEnabled = () =>
    toBooleanEnv(process.env.EXPERTS_MAIL_NOTIFICATION);

const isExpertsPushNotificationEnabled = () =>
    toBooleanEnv(process.env.EXPERTS_PUSH_NOTIFICATION);

const notifyAssignedAgency = async ({ agency, project, unitsAssigned }) => {
    const notificationSettings = agency?.preferences?.notificationSettings || {};
    const shouldEmail = isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
    const shouldPush = isExpertsPushNotificationEnabled() && notificationSettings.push !== false;

    const agencyName = agency?.agencyName || 'Agency';
    const projectName = project?.projectName || 'Project';
    const safeUnitsAssigned = Number(unitsAssigned || 0);
    const projectImage = Array.isArray(project?.images) && project.images.length
        ? [...project.images]
            .sort((a, b) => {
                if (a?.isPrimary && !b?.isPrimary) return -1;
                if (!a?.isPrimary && b?.isPrimary) return 1;
                return Number(a?.order || 0) - Number(b?.order || 0);
            })[0]?.url || null
        : null;

    const title = 'New Project Allocation';
    const body = `You have been assigned ${safeUnitsAssigned} unit(s) in ${projectName}.`;
    const notification = await Notification.create({
        recipient: {
            recipientType: 'agency',
            recipientId: agency?._id,
        },
        title,
        message: body,
        notificationType: 'alert',
        priority: 'high',
        relatedItem: {
            itemType: 'project',
            itemId: project?._id,
        },
        channels: {
            email: shouldEmail,
            sms: false,
            push: shouldPush,
            inApp: true,
        },
        actionText: 'View',
        metadata: {
            projectId: project?._id?.toString() || null,
            projectName,
            image: projectImage,
            unitsAssigned: safeUnitsAssigned,
        },
    });

    if (shouldEmail && agency?.email) {
        const subject = `New Project Allocation: ${projectName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
              <h2 style="margin: 0 0 12px;">New Project Allocation</h2>
              <p>Hi ${agencyName},</p>
              <p>You have been assigned <strong>${safeUnitsAssigned}</strong> unit(s) in project <strong>${projectName}</strong>.</p>
              ${projectImage ? `<p><img src="${projectImage}" alt="${projectName}" style="max-width: 220px; border-radius: 8px; display: block; margin: 12px 0;" /></p>` : ''}
              <p>Please log in to your dashboard to review the allocation details.</p>
            </div>
        `;
        await sendEmail(agency.email, subject, html);
        await Notification.findByIdAndUpdate(notification._id, {
            $set: {
                'deliveryStatus.email.sent': true,
                'deliveryStatus.email.sentAt': new Date(),
            },
        });
    }

    if (shouldPush) {
        const activeTokens = (agency?.fcmTokens || [])
            .filter((token) => token?.isActive && token?.token)
            .map((token) => token.token);

        let anyPushSent = false;
        for (const token of activeTokens) {
            // Send per token so one failed token does not block others.
            try {
                await sendPushNotificationToToken({
                    token,
                    title,
                    body,
                    data: {
                        notificationId: String(notification._id),
                        type: 'project-allocation',
                        projectId: project?._id?.toString() || '',
                        agencyId: agency?._id?.toString() || '',
                        unitsAssigned: String(safeUnitsAssigned),
                        image: projectImage || '',
                    },
                });
                anyPushSent = true;
            } catch (pushErr) {
                logger.error('Agency project allocation push failed', {
                    error: pushErr.message,
                    agencyId: agency?._id,
                    projectId: project?._id,
                });
            }
        }

        if (anyPushSent) {
            await Notification.findByIdAndUpdate(notification._id, {
                $set: {
                    'deliveryStatus.push.sent': true,
                    'deliveryStatus.push.sentAt': new Date(),
                },
            });
        }
    }
};

const notifyUpdatedAgencyAssignment = async ({
    agency,
    project,
    totalUnits,
    addedUnits,
    removedUnits,
}) => {
    const notificationSettings = agency?.preferences?.notificationSettings || {};
    const shouldEmail = isExpertsEmailNotificationEnabled() && notificationSettings.email !== false;
    const shouldPush = isExpertsPushNotificationEnabled() && notificationSettings.push !== false;

    const agencyName = agency?.agencyName || 'Agency';
    const projectName = project?.projectName || 'Project';
    const safeTotalUnits = Number(totalUnits || 0);
    const safeAddedUnits = Number(addedUnits || 0);
    const safeRemovedUnits = Number(removedUnits || 0);
    const projectImage = Array.isArray(project?.images) && project.images.length
        ? [...project.images]
            .sort((a, b) => {
                if (a?.isPrimary && !b?.isPrimary) return -1;
                if (!a?.isPrimary && b?.isPrimary) return 1;
                return Number(a?.order || 0) - Number(b?.order || 0);
            })[0]?.url || null
        : null;

    const title = 'Project Allocation Updated';
    const body = `Your allocation in ${projectName} was updated. Total units: ${safeTotalUnits} (added: ${safeAddedUnits}, removed: ${safeRemovedUnits}).`;

    const notification = await Notification.create({
        recipient: {
            recipientType: 'agency',
            recipientId: agency?._id,
        },
        title,
        message: body,
        notificationType: 'alert',
        priority: 'high',
        relatedItem: {
            itemType: 'project',
            itemId: project?._id,
        },
        channels: {
            email: shouldEmail,
            sms: false,
            push: shouldPush,
            inApp: true,
        },
        actionText: 'View',
        metadata: {
            projectId: project?._id?.toString() || null,
            projectName,
            image: projectImage,
            totalUnits: safeTotalUnits,
            addedUnits: safeAddedUnits,
            removedUnits: safeRemovedUnits,
        },
    });

    if (shouldEmail && agency?.email) {
        const subject = `Project Allocation Updated: ${projectName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
              <h2 style="margin: 0 0 12px;">Project Allocation Updated</h2>
              <p>Hi ${agencyName},</p>
              <p>Your allocation for project <strong>${projectName}</strong> has been updated.</p>
              <p><strong>Total units:</strong> ${safeTotalUnits} &nbsp; | &nbsp; <strong>Added:</strong> ${safeAddedUnits} &nbsp; | &nbsp; <strong>Removed:</strong> ${safeRemovedUnits}</p>
              ${projectImage ? `<p><img src="${projectImage}" alt="${projectName}" style="max-width: 220px; border-radius: 8px; display: block; margin: 12px 0;" /></p>` : ''}
              <p>Please log in to your dashboard to review the updated allocation.</p>
            </div>
        `;
        await sendEmail(agency.email, subject, html);
        await Notification.findByIdAndUpdate(notification._id, {
            $set: {
                'deliveryStatus.email.sent': true,
                'deliveryStatus.email.sentAt': new Date(),
            },
        });
    }

    if (shouldPush) {
        const activeTokens = (agency?.fcmTokens || [])
            .filter((token) => token?.isActive && token?.token)
            .map((token) => token.token);

        let anyPushSent = false;
        for (const token of activeTokens) {
            try {
                await sendPushNotificationToToken({
                    token,
                    title,
                    body,
                    data: {
                        notificationId: String(notification._id),
                        type: 'project-allocation-updated',
                        projectId: project?._id?.toString() || '',
                        agencyId: agency?._id?.toString() || '',
                        totalUnits: String(safeTotalUnits),
                        addedUnits: String(safeAddedUnits),
                        removedUnits: String(safeRemovedUnits),
                        image: projectImage || '',
                    },
                });
                anyPushSent = true;
            } catch (pushErr) {
                logger.error('Agency project allocation update push failed', {
                    error: pushErr.message,
                    agencyId: agency?._id,
                    projectId: project?._id,
                });
            }
        }

        if (anyPushSent) {
            await Notification.findByIdAndUpdate(notification._id, {
                $set: {
                    'deliveryStatus.push.sent': true,
                    'deliveryStatus.push.sentAt': new Date(),
                },
            });
        }
    }
};

const DRAFT_TOTAL_STEPS = 6;

const hasNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const calculateDraftProgress = (project = {}) => {
    const imageCount = Array.isArray(project.images) ? project.images.length : 0;
    const masterPlanCount = Array.isArray(project.masterPlan) ? project.masterPlan.length : 0;
    const paymentPlanCount = Array.isArray(project.paymentPlans) ? project.paymentPlans.length : 0;
    const startingPrice = toNumberOrNull(project.launchPrice?.startingFrom);
    const governmentFees = toNumberOrNull(project.governmentFees);
    const totalUnits = toNumberOrNull(project.totalUnits);

    const completedSteps = [
        // 1. Project status
        Boolean(project.projectType),
        // 2. Project details
        hasNonEmptyString(project.projectName) && hasNonEmptyString(project.description),
        // 3. Media upload
        imageCount > 0 || masterPlanCount > 0 || hasNonEmptyString(project.brochure)
            || hasNonEmptyString(project.videoTour) || hasNonEmptyString(project.virtualTour360),
        // 4. Price & payment plan
        (startingPrice != null && startingPrice > 0) && paymentPlanCount > 0 && (governmentFees != null && governmentFees >= 0),
        // 5. Location
        hasNonEmptyString(project.location?.address) && hasNonEmptyString(project.location?.city),
        // 6. Unit details
        totalUnits != null && totalUnits > 0,
    ].filter(Boolean).length;

    const remainingSteps = Math.max(0, DRAFT_TOTAL_STEPS - completedSteps);
    const progressPercentage = Math.round((completedSteps / DRAFT_TOTAL_STEPS) * 100);

    return {
        totalSteps: DRAFT_TOTAL_STEPS,
        completedSteps,
        remainingSteps,
        progressPercentage,
        message: `Remaining steps to complete : ${remainingSteps}/${DRAFT_TOTAL_STEPS}`,
    };
};

const recalcDeveloperProjectStats = async (developerId, session) => {
    if (!developerId) return;

    const developerObjectId = new Types.ObjectId(developerId);
    const baseMatch = {
        developer: developerObjectId,
        isActive: true,
    };

    const [totalProjectsCount, completedProjectsCount, offPlanProjectsCount, ongoingProjectsCount] =
        await Promise.all([
            Newprojects.countDocuments(baseMatch).session(session),
            Newprojects.countDocuments({
                ...baseMatch,
                completionStatus: 'ready',
            }).session(session),
            Newprojects.countDocuments({
                ...baseMatch,
                completionStatus: 'off-plan',
            }).session(session),
            Newprojects.countDocuments({
                ...baseMatch,
                completionStatus: { $in: ['off-plan', 'under-construction'] },
            }).session(session),
        ]);

    await Developers.findByIdAndUpdate(
        developerObjectId,
        {
            $set: {
                totalProjects: totalProjectsCount,
                completedProjects: completedProjectsCount,
                ongoingProjects: ongoingProjectsCount,
                offPlanProjects: offPlanProjectsCount,
            },
        },
        { session },
    );
};

const validateObjectId = (id) => Types.ObjectId.isValid(id);

/** Returns true if coord is a valid GeoJSON Point for 2dsphere (exactly 2 numbers, lng in [-180,180], lat in [-90,90]). */
const isValidGeoPoint = (coord) => {
    if (!coord || !coord.coordinates || !Array.isArray(coord.coordinates) || coord.coordinates.length !== 2) return false;
    const [lng, lat] = coord.coordinates;
    const lngN = Number(lng);
    const latN = Number(lat);
    if (!Number.isFinite(lngN) || !Number.isFinite(latN)) return false;
    return lngN >= -180 && lngN <= 180 && latN >= -90 && latN <= 90;
};

/**
 * @param {string} base - slug base (already slugified)
 * @param {import('mongoose').ClientSession|null} session
 * @param {string|import('mongoose').Types.ObjectId|null} excludeProjectId - current project when updating (so same slug is allowed)
 */
const ensureUniqueSlug = async (base, session = null, excludeProjectId = null) => {
    let slug = base || generateSlug();
    if (!slug) {
        slug = generateSlug(`${Date.now()}`);
    }

    const baseForSuffix = base || slug;
    let counter = 1;
    // eslint-disable-next-line no-await-in-loop
    while (true) {
        const q = { slug };
        if (excludeProjectId) {
            q._id = { $ne: excludeProjectId };
        }
        // eslint-disable-next-line no-await-in-loop
        const taken = await Newprojects.exists(q).session(session || null);
        if (!taken) break;
        slug = `${baseForSuffix}-${counter}`;
        counter += 1;
    }
    return slug;
};

/**
 * @swagger
 * /developers/projects/create:
 *   post:
 *     summary: Create a new project (Developer)
 *     description: |
 *       Two modes controlled by publishStatus:
 *
 *       **Draft** (publishStatus: 'draft'): Only projectType required. Save partial data; no units created. Returns projectId for subsequent steps.
 *
 *       **Unpublished** (publishStatus: 'unpublished' or omitted): Full validation required. Creates ProjectBuilding, ProjectLayout, ProjectUnit, LeadAssignment per layout. Returns assignAgenciesUrl.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publishStatus:
 *                 type: string
 *                 enum: [draft, unpublished]
 *                 description: "draft = minimal validation, no units; omitted or unpublished = full validation + units"
 *               projectType:
 *                 type: string
 *                 enum: [off-plan, ready]
 *                 description: Required in both modes
 *               projectName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Required for unpublished; optional for draft (defaults to 'Untitled Draft' if empty)
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               aboutProject:
 *                 type: string
 *                 maxLength: 5000
 *               images:
 *                 type: array
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 *                     isPrimary: { type: boolean }
 *                     order: { type: number }
 *                     caption: { type: string }
 *                 description: Min 1 required for unpublished; optional for draft
 *               masterPlan:
 *                 type: array
 *                 items: { type: string }
 *               brochure: { type: string }
 *               virtualTour360: { type: string }
 *               videoTour: { type: string }
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   zone: { type: string }
 *                   googlePlaceId: { type: string }
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       type: { type: string, enum: [Point] }
 *                       coordinates: { type: array, items: { type: number }, description: "[longitude, latitude]" }
 *               address: { type: string }
 *               city: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               launchPrice:
 *                 type: object
 *                 properties:
 *                   startingFrom: { type: number, minimum: 0.01 }
 *                   currency: { type: string, default: "AED" }
 *               price: { type: number }
 *               propertyPrice: { type: number }
 *               currency: { type: string }
 *               governmentFees:
 *                 type: number
 *                 minimum: 0
 *                 description: Required for unpublished; optional for draft (must be non-negative if provided)
 *               paymentPlans:
 *                 type: array
 *                 description: "Structure: downPayment + duringConstruction + onHandover (percentages sum to 100). Required for unpublished."
 *                 items:
 *                   type: object
 *                   properties:
 *                     planName: { type: string }
 *                     downPayment:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *                     duringConstruction:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *                         installments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               percentage: { type: number }
 *                               amount: { type: number }
 *                               date: { type: string, format: date }
 *                     onHandover:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *               hasPostHandoverPayment: { type: boolean, default: false }
 *               postHandoverDetails:
 *                 type: object
 *                 properties:
 *                   duration: { type: string }
 *                   percentage: { type: number }
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Optional. If provided, must be a valid future date.
 *               expectedCompletionDate: { type: string, format: date }
 *               projectAnnouncement: { type: string, format: date }
 *               bookingOpen: { type: string, format: date }
 *               constructionStarted: { type: string, format: date }
 *               launchDate: { type: string, format: date }
 *               amenities:
 *                 type: array
 *                 items: { type: string }
 *                 description: Amenity ObjectIds
 *               properties:
 *                 type: array
 *                 description: Required for unpublished only. Optional for draft (ignored).
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     buildingName:
 *                       type: string
 *                       description: Optional; if provided creates ProjectBuilding
 *                     propertyType: { type: string, description: "ObjectId (required for unpublished)" }
 *                     areaSqm: { type: number }
 *                     areaSqft: { type: number }
 *                     layouts:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: object
 *                         required: [layoutName, areaSqm, areaSqft, bedrooms, bathrooms, totalUnits, floorPlans]
 *                         properties:
 *                           layoutName: { type: string }
 *                           areaSqm: { type: number }
 *                           areaSqft: { type: number }
 *                           bedrooms: { type: number, minimum: 0 }
 *                           maidBedroom: { type: boolean }
 *                           bathrooms: { type: number, minimum: 0 }
 *                           totalUnits: { type: number, minimum: 1 }
 *                           startingPrice:
 *                             type: object
 *                             properties:
 *                               amount: { type: number }
 *                               currency: { type: string, default: "AED" }
 *                           floorPlans:
 *                             type: array
 *                             items: { type: string }
 *                             minItems: 1
 *               isDldRegistered: { type: boolean, default: false }
 *               dldRegistrationNumber: { type: string }
 *               registrationDetails:
 *                 type: object
 *                 properties:
 *                   permitNumber: { type: string }
 *                   permitUrl: { type: string }
 *                   issuedDate: { type: string, format: date }
 *                   expiryDate: { type: string, format: date }
 *               metaTitle: { type: string }
 *               metaDescription: { type: string }
 *               metaKeywords:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Created. Draft returns nextSteps.currentStatus 'draft'; unpublished returns nextSteps.assignAgenciesUrl and currentStatus 'unpublished'.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Developer not found (or PropertyType / Amenity not found when referenced)
 *       409:
 *         description: Project with this title or slug already exists (rare slug conflict)
 *       500:
 *         description: Server error
 */
const createProject = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const developer = await Developers.findById(developerId).session(session);
        if (!developer) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Developer not found', 'NOT_FOUND');
        }

        const isDraft = req.body.publishStatus === 'draft';

        const {
            projectName,
            projectTitle,
            title,
            description,
            aboutProject,
            projectType,
            images,
            projectImages,
            masterPlan,
            brochure,
            virtualTour360,
            tour360,
            tour360Url,
            videoTour,
            projectVideo,
            location,
            address,
            projectAddress,
            city,
            fullAddress,
            zone,
            googlePlaceId,
            coordinates,
            latitude,
            longitude,
            launchPrice,
            price,
            propertyPrice,
            currency,
            governmentFees,
            paymentPlans,
            hasPostHandoverPayment,
            postHandoverDetails,
            deliveryDate,
            expectedCompletionDate,
            projectAnnouncement,
            bookingOpen,
            constructionStarted,
            launchDate,
            amenities,
            isDldRegistered,
            dldRegistrationNumber,
            registrationDetails,
            metaTitle,
            metaDescription,
            metaKeywords,
            properties,
        } = req.body || {};

        const finalProjectName = (projectName || projectTitle || title || '').trim() || null;
        const finalAddress = location?.address || address || projectAddress || fullAddress;
        const finalCity = (location?.city || city || '').trim();
        const finalPrice = toNumberOrNull(launchPrice?.startingFrom ?? price ?? propertyPrice);
        const finalGovernmentFees = toNumberOrNull(governmentFees);
        let amenityIds = [];

        // ─── Mode 1: Draft — minimal validation ─────────────────────────────
        if (isDraft) {
            if (!projectType) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectType is required', 'VALIDATION_ERROR');
            }
            const validProjectTypes = ['off-plan', 'ready'];
            if (!validProjectTypes.includes(projectType)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectType must be "off-plan" or "ready"', 'VALIDATION_ERROR');
            }
            if (finalProjectName != null && finalProjectName.length > 0 && (finalProjectName.length < 3 || finalProjectName.length > 200)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectName must be between 3 and 200 characters', 'VALIDATION_ERROR');
            }
            if (description && description.length > 5000) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'description must not exceed 5000 characters', 'VALIDATION_ERROR');
            }
            const normalizedImagesInput = normalizeArray(images || projectImages);
            if (normalizedImagesInput.length > 50) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'images cannot exceed 50', 'VALIDATION_ERROR');
            }
            if (normalizedImagesInput.length > 0) {
                const hasInvalidImage = normalizedImagesInput.some((img) => {
                    const url = typeof img === 'string' ? img : img?.url;
                    return !url || (typeof img === 'object' && !img.url);
                });
                if (hasInvalidImage) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each image must have a url', 'VALIDATION_ERROR');
                }
            }
            if (paymentPlans && Array.isArray(paymentPlans) && paymentPlans.length > 0) {
                for (const plan of paymentPlans) {
                    const dp = toNumberOrNull(plan.downPayment?.percentage) ?? 0;
                    const dc = toNumberOrNull(plan.duringConstruction?.percentage) ?? 0;
                    const oh = toNumberOrNull(plan.onHandover?.percentage) ?? 0;
                    const total = dp + dc + oh;
                    if (Math.abs(total - 100) > 0.01) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Payment plan '${plan.planName || 'Unnamed'}' percentages must sum to 100. Current sum: ${total}%`, 'VALIDATION_ERROR');
                    }
                }
            }
            if (governmentFees !== undefined) {
                const gf = toNumberOrNull(governmentFees);
                if (gf !== null && gf < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'governmentFees must be non-negative', 'VALIDATION_ERROR');
                }
            }
            if (deliveryDate) {
                const d = new Date(deliveryDate);
                if (Number.isNaN(d.getTime()) || d <= new Date()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'deliveryDate must be a future date', 'VALIDATION_ERROR');
                }
            }
        } else {
            // ─── Mode 2: Unpublished — full validation ──────────────────────
            const requiredFieldsMissing = [
                [finalProjectName, 'projectName'],
                [description, 'description'],
                [projectType, 'projectType'],
                [finalAddress, 'location.address'],
                [finalCity, 'location.city'],
                [finalPrice, 'launchPrice.startingFrom'],
                [paymentPlans, 'paymentPlans'],
                [properties, 'properties'],
            ].filter(([value]) => value === null || value === undefined || value === '');

            if (requiredFieldsMissing.length) {
                const missing = requiredFieldsMissing.map(([, key]) => key).join(', ');
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, `Missing required fields: ${missing}`, 'VALIDATION_ERROR');
            }

            if (finalProjectName.length < 3 || finalProjectName.length > 200) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectName must be between 3 and 200 characters', 'VALIDATION_ERROR');
            }
            if (description.length > 5000) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'description must not exceed 5000 characters', 'VALIDATION_ERROR');
            }
            const validProjectTypes = ['off-plan', 'ready'];
            if (!validProjectTypes.includes(projectType)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectType must be "off-plan" or "ready"', 'VALIDATION_ERROR');
            }

            const normalizedImagesInput = normalizeArray(images || projectImages);
            if (normalizedImagesInput.length < 1 || normalizedImagesInput.length > 50) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'images is required (min 1, max 50)', 'VALIDATION_ERROR');
            }
            const hasInvalidImage = normalizedImagesInput.some((img) => {
                const url = typeof img === 'string' ? img : img?.url;
                return !url || (typeof img === 'object' && !img.url);
            });
            if (hasInvalidImage) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Each image must have a url', 'VALIDATION_ERROR');
            }
            if (location?.coordinates && !isValidGeoPoint(location.coordinates)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'coordinates: must be a valid GeoJSON Point [longitude, latitude]', 'VALIDATION_ERROR');
            }
            if (finalPrice <= 0) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'launchPrice.startingFrom must be a positive number', 'VALIDATION_ERROR');
            }
            if (finalGovernmentFees == null || finalGovernmentFees < 0) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'governmentFees is required and must be non-negative', 'VALIDATION_ERROR');
            }
            if (!Array.isArray(paymentPlans) || paymentPlans.length < 1) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'paymentPlans is required (min 1 plan)', 'VALIDATION_ERROR');
            }
            for (const plan of paymentPlans) {
                if (!plan.planName) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each payment plan must have planName', 'VALIDATION_ERROR');
                }
                const dp = toNumberOrNull(plan.downPayment?.percentage) ?? 0;
                const dc = toNumberOrNull(plan.duringConstruction?.percentage) ?? 0;
                const oh = toNumberOrNull(plan.onHandover?.percentage) ?? 0;
                const total = dp + dc + oh;
                if (Math.abs(total - 100) > 0.01) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, `Payment plan '${plan.planName}' percentages must sum to 100. Current sum: ${total}%`, 'VALIDATION_ERROR');
                }
            }
            if (deliveryDate != null && deliveryDate !== '') {
                const deliveryDateObj = new Date(deliveryDate);
                if (Number.isNaN(deliveryDateObj.getTime()) || deliveryDateObj <= new Date()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'deliveryDate must be a valid future date when provided', 'VALIDATION_ERROR');
                }
            }
            if (hasPostHandoverPayment) {
                if (!postHandoverDetails?.duration || postHandoverDetails?.percentage == null) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'When hasPostHandoverPayment is true, postHandoverDetails.duration and percentage are required', 'VALIDATION_ERROR');
                }
            }
            if (isDldRegistered) {
                if (!dldRegistrationNumber || !String(dldRegistrationNumber).trim()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'dldRegistrationNumber is required when isDldRegistered is true', 'VALIDATION_ERROR');
                }
            }
            amenityIds = normalizeArray(amenities).filter(Boolean);
            if (amenityIds.length > 0) {
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
            if (!Array.isArray(properties) || properties.length < 1) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'properties is required (min 1 property)', 'VALIDATION_ERROR');
            }
            for (const prop of properties) {
                if (!prop.propertyType || !validateObjectId(prop.propertyType)) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have a valid propertyType ObjectId', 'VALIDATION_ERROR');
                }
                const ptDoc = await PropertyType.findById(prop.propertyType).session(session);
                if (!ptDoc) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 404, `Property type ${prop.propertyType} not found`, 'NOT_FOUND');
                }
                const areaSqm = toNumberOrNull(prop.areaSqm);
                const areaSqft = toNumberOrNull(prop.areaSqft);
                if (areaSqm == null || areaSqm <= 0 || areaSqft == null || areaSqft <= 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have positive areaSqm and areaSqft', 'VALIDATION_ERROR');
                }
                if (!Array.isArray(prop.layouts) || prop.layouts.length < 1) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have at least one layout', 'VALIDATION_ERROR');
                }
                for (const lay of prop.layouts) {
                    if (!lay.layoutName || !String(lay.layoutName).trim()) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, 'Each layout must have layoutName', 'VALIDATION_ERROR');
                    }
                    const layAreaSqm = toNumberOrNull(lay.areaSqm);
                    const layAreaSqft = toNumberOrNull(lay.areaSqft);
                    if (layAreaSqm == null || layAreaSqm <= 0 || layAreaSqft == null || layAreaSqft <= 0) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have positive areaSqm and areaSqft`, 'VALIDATION_ERROR');
                    }
                    const beds = toNumberOrNull(lay.bedrooms);
                    const baths = toNumberOrNull(lay.bathrooms);
                    if (beds == null || beds < 0 || baths == null || baths < 0) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have bedrooms and bathrooms (min 0)`, 'VALIDATION_ERROR');
                    }
                    const totalUnits = toNumberOrNull(lay.totalUnits);
                    if (totalUnits == null || totalUnits < 1) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have totalUnits >= 1`, 'VALIDATION_ERROR');
                    }
                    const floorPlans = normalizeArray(lay.floorPlans);
                    if (floorPlans.length < 1) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must include at least one floor plan`, 'VALIDATION_ERROR');
                    }
                } // end for (const lay of prop.layouts)
            } // end for (const prop of properties)
        } // end else (full validation)

        // ─── Slug (always set; drafts used slug=null → E11000 duplicate on unique slug_1) ───
        const nameForSlug = (finalProjectName && String(finalProjectName).trim()) || (isDraft ? 'draft' : '');
        const baseSlug = generateSlug(nameForSlug) || generateSlug(`project-${Date.now()}`);
        const slug = await ensureUniqueSlug(baseSlug, session);

        const completionStatus = projectType === 'off-plan' ? 'off-plan' : 'ready';

        // ─── Process images ─────────────────────────────────────────────────
        const normalizedImagesInput = normalizeArray(images || projectImages);
        const imagePayload = normalizedImagesInput
            .map((img, idx) => {
                if (typeof img === 'string') {
                    const filename = img.includes('/') ? img.split('/').pop() : img;
                    return { url: filename, isPrimary: idx === 0, order: idx, uploadedAt: new Date() };
                }
                const filename = img.url?.includes('/') ? img.url.split('/').pop() : img.url;
                return {
                    url: filename,
                    isPrimary: Boolean(img.isPrimary),
                    order: typeof img.order === 'number' ? img.order : idx,
                    caption: img.caption || undefined,
                    uploadedAt: new Date(),
                };
            })
            .filter(Boolean);
        if (imagePayload.length > 0 && !imagePayload.some((img) => img.isPrimary)) {
            imagePayload[0].isPrimary = true;
        }

        const virtualTourUrl = tour360Url || tour360 || virtualTour360 || null;
        const videoTourInput = projectVideo || videoTour || null;
        const videoTourUrl = videoTourInput
            ? (videoTourInput.includes('/') ? videoTourInput.split('/').pop() : videoTourInput)
            : null;
        const brochureUrl = brochure
            ? (brochure.includes('/') ? brochure.split('/').pop() : brochure)
            : null;
        const masterPlanArr = Array.isArray(masterPlan)
            ? masterPlan.map((u) => (typeof u === 'string' && u.includes('/') ? u.split('/').pop() : u))
            : [];

        // Location inline only (address, city, zone, googlePlaceId, coordinates) — no Location schema ref
        const locationData = {
            address: finalAddress || null,
            city: finalCity || null,
            zone: location?.zone || zone || null,
            googlePlaceId: location?.googlePlaceId || googlePlaceId || null,
        };
        if (location?.coordinates && isValidGeoPoint(location.coordinates)) {
            locationData.coordinates = location.coordinates;
        } else if (latitude != null || longitude != null || coordinates) {
            const lat = toNumberOrNull(latitude ?? coordinates?.lat ?? coordinates?.latitude);
            const lng = toNumberOrNull(longitude ?? coordinates?.lng ?? coordinates?.longitude);
            if (lat !== null && lng !== null && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                locationData.coordinates = { type: 'Point', coordinates: [lng, lat] };
            }
        }

        const processedPaymentPlans = (paymentPlans || []).map((plan) => ({
            planName: plan.planName || 'Plan',
            downPayment: {
                percentage: toNumberOrNull(plan.downPayment?.percentage) ?? 0,
                amount: toNumberOrNull(plan.downPayment?.amount) ?? null,
            },
            duringConstruction: {
                percentage: toNumberOrNull(plan.duringConstruction?.percentage) ?? 0,
                amount: toNumberOrNull(plan.duringConstruction?.amount) ?? null,
                installments: (plan.duringConstruction?.installments || []).map((inst) => ({
                    percentage: toNumberOrNull(inst.percentage) ?? 0,
                    amount: toNumberOrNull(inst.amount) ?? null,
                    date: inst.date ? new Date(inst.date) : null,
                })),
            },
            onHandover: {
                percentage: toNumberOrNull(plan.onHandover?.percentage) ?? 0,
                amount: toNumberOrNull(plan.onHandover?.amount) ?? null,
            },
        }));

        const deliveryDateVal = deliveryDate ? new Date(deliveryDate) : null;
        const projectData = {
            projectName: finalProjectName || 'Untitled Draft',
            slug,
            description: description ? String(description).trim() : null,
            aboutProject: aboutProject ? String(aboutProject).trim() : null,
            developer: developer._id,
            projectType,
            completionStatus,
            images: imagePayload,
            masterPlan: masterPlanArr.length ? masterPlanArr : [],
            brochure: brochureUrl || null,
            virtualTour360: virtualTourUrl || null,
            videoTour: videoTourUrl || null,
            location: locationData,
            launchPrice: finalPrice != null
                ? { startingFrom: finalPrice, currency: currency || launchPrice?.currency || 'AED' }
                : null,
            governmentFees: finalGovernmentFees ?? 0,
            paymentPlans: processedPaymentPlans,
            hasPostHandoverPayment: Boolean(hasPostHandoverPayment),
            postHandoverDetails: hasPostHandoverPayment && postHandoverDetails
                ? { duration: postHandoverDetails.duration, percentage: toNumberOrNull(postHandoverDetails.percentage) }
                : null,
            deliveryDate: deliveryDateVal && !Number.isNaN(deliveryDateVal.getTime()) ? deliveryDateVal : null,
            expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
            projectAnnouncement: projectAnnouncement ? new Date(projectAnnouncement) : null,
            bookingOpen: bookingOpen ? new Date(bookingOpen) : null,
            constructionStarted: constructionStarted ? new Date(constructionStarted) : null,
            launchDate: launchDate ? new Date(launchDate) : null,
            amenities: isDraft ? normalizeArray(amenities).filter(Boolean) : amenityIds,
            isDldRegistered: Boolean(isDldRegistered),
            dldRegistrationNumber: isDldRegistered && dldRegistrationNumber ? dldRegistrationNumber : null,
            registrationDetails: isDldRegistered && registrationDetails ? registrationDetails : null,
            metaTitle: metaTitle || null,
            metaDescription: metaDescription || null,
            metaKeywords: Array.isArray(metaKeywords) ? metaKeywords : [],
            publishStatus: isDraft ? 'draft' : 'unpublished',
            isActive: true,
            isVerified: false,
            isFeatured: false,
            propertyTypes: [],
            bedroomOptions: [],
            totalUnits: 0,
            availableUnits: 0,
            soldUnits: 0,
            reservedUnits: 0,
            authorizedAgencies: [],
            constructionProgress: 0,
            lastModifiedAt: new Date(),
            lastModifiedBy: developerId,
        };

        const created = await Newprojects.create([projectData], { session });
        const project = created[0];

        if (!isDraft && Array.isArray(properties) && properties.length > 0) {
            const propertyTypeIds = new Set();
            const bedroomSet = new Set();
            let totalUnitsCount = 0;
            let minStartingPrice = finalPrice;

            for (const prop of properties) {
                let buildingId = null;
                if (prop.buildingName && String(prop.buildingName).trim()) {
                    const buildingCreated = await ProjectBuilding.create([{
                        project: project._id,
                        buildingName: String(prop.buildingName).trim(),
                        isActive: true,
                    }], { session });
                    buildingId = buildingCreated[0]._id;
                }

                propertyTypeIds.add(prop.propertyType);

                for (const lay of prop.layouts) {
                    const layoutAmount = toNumberOrNull(lay.startingPrice?.amount) ?? null;
                    const layoutCurrency = lay.startingPrice?.currency || 'AED';
                    if (layoutAmount != null && (minStartingPrice == null || layoutAmount < minStartingPrice)) {
                        minStartingPrice = layoutAmount;
                    }
                    const layoutDoc = await ProjectLayout.create([{
                        project: project._id,
                        building: buildingId,
                        propertyType: prop.propertyType,
                        layoutName: String(lay.layoutName).trim(),
                        bedrooms: toNumberOrNull(lay.bedrooms) ?? 0,
                        maidBedroom: Boolean(lay.maidBedroom),
                        bathrooms: toNumberOrNull(lay.bathrooms) ?? 0,
                        areaSqm: toNumberOrNull(lay.areaSqm) ?? 0,
                        areaSqft: toNumberOrNull(lay.areaSqft) ?? 0,
                        startingPrice: layoutAmount != null ? { amount: layoutAmount, currency: layoutCurrency } : null,
                        floorPlans: normalizeArray(lay.floorPlans),
                        totalUnits: toNumberOrNull(lay.totalUnits) ?? 0,
                        availableUnits: toNumberOrNull(lay.totalUnits) ?? 0,
                        reservedUnits: 0,
                        soldUnits: 0,
                        isActive: true,
                    }], { session });
                    const layout = layoutDoc[0];
                    const totalUnits = toNumberOrNull(lay.totalUnits) ?? 0;
                    bedroomSet.add(toNumberOrNull(lay.bedrooms) ?? 0);
                    totalUnitsCount += totalUnits;

                    const unitDocs = [];
                    for (let i = 1; i <= totalUnits; i++) {
                        const unitNumber = String(i).padStart(3, '0');
                        const unitId = `${project._id}-${layout._id}-${unitNumber}`;
                        unitDocs.push({
                            project: project._id,
                            building: buildingId,
                            layout: layout._id,
                            propertyType: prop.propertyType,
                            unitId,
                            unitNumber,
                            status: 'available',
                            isActive: true,
                        });
                    }
                    if (unitDocs.length > 0) {
                        await ProjectUnit.insertMany(unitDocs, { session });
                    }

                    await LeadAssignment.create([{
                        project: project._id,
                        layout: layout._id,
                        method: 'round-robin',
                        agencyQueue: [],
                        agencyPointer: 0,
                        totalInquiries: 0,
                    }], { session });
                }
            }

            const sortedBedrooms = [...bedroomSet].sort((a, b) => a - b);
            await Newprojects.findByIdAndUpdate(
                project._id,
                {
                    $set: {
                        propertyTypes: [...propertyTypeIds],
                        bedroomOptions: sortedBedrooms,
                        totalUnits: totalUnitsCount,
                        availableUnits: totalUnitsCount,
                        launchPrice: {
                            startingFrom: minStartingPrice != null ? minStartingPrice : finalPrice,
                            currency: currency || launchPrice?.currency || 'AED',
                        },
                    },
                },
                { session }
            );
            project.propertyTypes = [...propertyTypeIds];
            project.bedroomOptions = sortedBedrooms;
            project.totalUnits = totalUnitsCount;
            project.availableUnits = totalUnitsCount;
            project.launchPrice = {
                startingFrom: minStartingPrice != null ? minStartingPrice : finalPrice,
                currency: currency || launchPrice?.currency || 'AED',
            };
        }

        await project.populate([
            { path: 'developer', select: 'name email' },
            { path: 'amenities', select: 'name slug category icon' },
        ]);

        await recalcDeveloperProjectStats(developerId, session);

        await session.commitTransaction();
        session.endSession();

        if (isDraft) {
            const draftProgress = calculateDraftProgress(project);
            if (draftProgress.completedSteps === DRAFT_TOTAL_STEPS) {
                const finalizedProject = await Newprojects.findByIdAndUpdate(
                    project._id,
                    { $set: { publishStatus: 'unpublished' } },
                    { new: true }
                );
                return success(res, 'Project created successfully', {
                    project: finalizedProject,
                    nextSteps: {
                        message: 'Draft is complete. Project moved to unpublished.',
                        projectId: project._id,
                        currentStatus: 'unpublished',
                        draftProgress,
                        assignAgenciesUrl: `/api/developer/projects/${project._id}/assign-agencies`,
                    },
                }, 201);
            }
            return success(res, 'Project saved as draft', {
                project,
                nextSteps: {
                    message: draftProgress.message,
                    projectId: project._id,
                    currentStatus: 'draft',
                    draftProgress,
                },
            }, 201);
        }

        return success(res, 'Project created successfully', {
            project,
            nextSteps: {
                message: 'Project created. Assign agencies to publish.',
                projectId: project._id,
                currentStatus: 'unpublished',
                assignAgenciesUrl: `/api/developer/projects/${project._id}/assign-agencies`,
            },
        }, 201);

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        logger.error('Create project failed', { error: error.message, stack: error.stack });

        return failure(res, 500, 'Failed to create project', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/upload-media:
 *   post:
 *     summary: Upload or remove project media (Developer)
 *     description: >
 *       Unified endpoint to upload images, master plan, brochure, video, and/or floor plan images, and optionally remove existing media by key (filename, URL, or media id).
 *       If `projectId` is provided, uploaded media is saved directly to the project (DB stores filenames). If `projectId` is omitted,
 *       this endpoint works as a "pre-upload" and returns URLs that can be passed into `/developers/projects/create`.
 *       Floor plan images are returned under `uploads.floorPlans` using the same standardized object format as other media.
 *       For consistency with project media storage, the floor plan `url` value is returned as filename (not full URL).
 *       Use that filename value in layout `floorPlans`.
 *       via updateLayout or create.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: "Optional project ObjectId. If provided, developer must own the project."
 *               removeKeys:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: >
 *                   Keys to remove. Supports image filename, image URL, image _id, master plan filename/URL, brochure filename/URL, or video filename/URL. When removing,
 *                   `projectId` is required.
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Up to 50 image files (JPG, PNG, WebP)."
 *               masterPlan:
 *                 type: string
 *                 format: binary
 *                 description: "One master plan image file (JPG, PNG, WebP, max 10MB)."
 *               brochure:
 *                 type: string
 *                 format: binary
 *                 description: "One brochure PDF file (max 10MB)."
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: "One video file (MP4, WebM, max 1GB)."
 *               floorPlans:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Up to 20 floor plan image files (JPG, PNG, WebP). Returned in uploads.floorPlans; use each item's filename/url (filename) in layout floorPlans (updateLayout or create)."
 *     responses:
 *       200:
 *         description: Media processed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (developer does not own project)
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
const uploadProjectMedia = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { projectId, removeKeys } = req.body;
        const removeKeyArray = Array.isArray(removeKeys) ? removeKeys : removeKeys ? [removeKeys] : [];

        let project = null;

        // If projectId is provided, validate and fetch project
        if (projectId) {
            if (!validateObjectId(projectId)) {
                return failure(res, 400, 'Invalid project ID', 'VALIDATION_ERROR');
            }

            project = await Newprojects.findById(projectId);
            if (!project) {
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            // Verify developer owns this project
            if (project.developer.toString() !== developerId.toString()) {
                return failure(res, 403, 'You do not have permission to modify this project', 'FORBIDDEN');
            }
        }

        // Handle removal of media by keys
        const removedImages = [];
        const removedImageUrls = [];
        let removedMasterPlan = null;
        let removedMasterPlanUrl = null;
        let removedBrochure = null;
        let removedBrochureUrl = null;
        let removedVideo = null;
        let removedVideoUrl = null;

        if (removeKeyArray.length > 0) {
            if (!project) {
                return failure(res, 400, 'Project ID is required to remove media', 'VALIDATION_ERROR');
            }

            for (const removeKey of removeKeyArray) {
                const removeFilename = removeKey.includes('/') ? removeKey.split('/').pop() : removeKey;

                // Try to find and remove image
                const imageIndex = project.images?.findIndex((img) => {
                    const imgFilename = img.url.includes('/') ? img.url.split('/').pop() : img.url;
                    return (
                        img.url === removeKey ||
                        img.url === removeFilename ||
                        imgFilename === removeFilename ||
                        img._id?.toString() === removeKey
                    );
                });

                if (imageIndex !== -1 && imageIndex !== undefined) {
                    const imageToRemove = project.images[imageIndex];
                    let imageUrl = imageToRemove.url;
                    if (!imageUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                imageUrl = `${baseUrl}/img/project/${imageToRemove.url}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/img/project/${imageToRemove.url}`;
                            }
                        } else {
                            imageUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/img/project/${imageToRemove.url}`;
                        }
                    }

                    await uploadService.delete(imageUrl).catch((err) => {
                        logger.warn('Failed to delete image file', { error: err.message, url: imageUrl });
                    });
                    project.images.splice(imageIndex, 1);
                    removedImages.push(imageToRemove.url);
                    removedImageUrls.push(imageUrl);
                } else {
                    // Check if it's master plan
                    const masterPlanFilename = project.masterPlan?.[0]?.includes('/')
                        ? project.masterPlan[0].split('/').pop()
                        : project.masterPlan?.[0];

                    if (project.masterPlan?.[0] && (project.masterPlan[0] === removeKey || masterPlanFilename === removeFilename)) {
                        let masterPlanUrl = project.masterPlan[0];
                        if (!masterPlanUrl.startsWith('http')) {
                            const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                            if (storage === 's3') {
                                const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                                if (cloudfrontUrl) {
                                    const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                    masterPlanUrl = `${baseUrl}/img/project/${project.masterPlan[0]}`;
                                } else {
                                    const bucket = process.env.AWS_S3_BUCKET;
                                    const region = process.env.AWS_REGION;
                                    masterPlanUrl = `https://${bucket}.s3.${region}.amazonaws.com/img/project/${project.masterPlan[0]}`;
                                }
                            } else {
                                masterPlanUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/img/project/${project.masterPlan[0]}`;
                            }
                        }

                        await uploadService.delete(masterPlanUrl).catch((err) => {
                            logger.warn('Failed to delete master plan file', { error: err.message });
                        });
                        removedMasterPlan = project.masterPlan[0];
                        removedMasterPlanUrl = masterPlanUrl;
                        project.masterPlan = [];
                    } else if (project.brochure && (project.brochure === removeKey || project.brochure.includes(removeFilename))) {
                        // Check if it's brochure
                        let brochureUrl = project.brochure;
                        if (!brochureUrl.startsWith('http')) {
                            const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                            if (storage === 's3') {
                                const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                                if (cloudfrontUrl) {
                                    const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                    brochureUrl = `${baseUrl}/doc/project/${project.brochure}`;
                                } else {
                                    const bucket = process.env.AWS_S3_BUCKET;
                                    const region = process.env.AWS_REGION;
                                    brochureUrl = `https://${bucket}.s3.${region}.amazonaws.com/doc/project/${project.brochure}`;
                                }
                            } else {
                                brochureUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/doc/project/${project.brochure}`;
                            }
                        }

                        await uploadService.delete(brochureUrl).catch((err) => {
                            logger.warn('Failed to delete brochure file', { error: err.message });
                        });
                        removedBrochure = project.brochure;
                        removedBrochureUrl = brochureUrl;
                        project.brochure = null;
                    } else {
                        // Check if it's the video
                        const videoFilename = project.videoTour?.includes('/')
                            ? project.videoTour.split('/').pop()
                            : project.videoTour;

                        if (project.videoTour && (project.videoTour === removeKey || videoFilename === removeFilename)) {
                            let videoUrl = project.videoTour;
                            if (!videoUrl.startsWith('http')) {
                                const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                                if (storage === 's3') {
                                    const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                                    if (cloudfrontUrl) {
                                        const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                        videoUrl = `${baseUrl}/vid/project/${project.videoTour}`;
                                    } else {
                                        const bucket = process.env.AWS_S3_BUCKET;
                                        const region = process.env.AWS_REGION;
                                        videoUrl = `https://${bucket}.s3.${region}.amazonaws.com/vid/project/${project.videoTour}`;
                                    }
                                } else {
                                    videoUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/vid/project/${project.videoTour}`;
                                }
                            }

                            await uploadService.delete(videoUrl).catch((err) => {
                                logger.warn('Failed to delete video file', { error: err.message });
                            });
                            removedVideo = project.videoTour;
                            removedVideoUrl = videoUrl;
                            project.videoTour = null;
                        }
                    }
                }
            }
        }

        const uploadedImages = [];
        let uploadedMasterPlan = null;
        let uploadedBrochure = null;
        let uploadedVideo = null;
        const uploadedFloorPlans = [];

        // Handle image uploads
        if (req.files?.images && Array.isArray(req.files.images)) {
            if (req.files.images.length > 50) {
                return failure(res, 400, 'You can upload up to 50 images', 'VALIDATION_ERROR');
            }

            if (project) {
                const currentImagesCount = project.images?.length || 0;
                if (currentImagesCount + req.files.images.length > 50) {
                    return failure(
                        res,
                        400,
                        `Total images cannot exceed 50. You have ${currentImagesCount} existing images.`,
                        'VALIDATION_ERROR'
                    );
                }
            }

            const baseOrder = project ? (project.images?.length || 0) : 0;
            for (const [idx, imageFile] of req.files.images.entries()) {
                const uploaded = await uploadService.upload(imageFile, 'project', {
                    generateThumbnail: false,
                });

                const filename = uploaded.path.split('/').pop() || uploaded.filename;

                const imageData = {
                    url: uploaded.url,
                    path: uploaded.path,
                    filename,
                    size: uploaded.size,
                    mimetype: uploaded.mimetype,
                    isPrimary: false,
                    order: baseOrder + idx,
                    uploadedAt: new Date(),
                };
                uploadedImages.push(imageData);

                if (project) {
                    project.images = [
                        ...(project.images || []),
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

        // Handle master plan upload
        if (req.files?.masterPlan && Array.isArray(req.files.masterPlan) && req.files.masterPlan.length > 0) {
            if (req.files.masterPlan.length > 1) {
                return failure(res, 400, 'You can upload only one master plan', 'VALIDATION_ERROR');
            }

            const masterPlanFile = req.files.masterPlan[0];
            const uploaded = await uploadService.upload(masterPlanFile, 'project', {
                generateThumbnail: false,
            });
            uploadedMasterPlan = uploaded.url;
            const masterPlanFilename = uploaded.path.split('/').pop() || uploaded.filename;

            if (project) {
                // Delete old master plan if exists
                if (project.masterPlan?.[0]) {
                    let oldMasterPlanUrl = project.masterPlan[0];
                    if (!oldMasterPlanUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                oldMasterPlanUrl = `${baseUrl}/img/project/${project.masterPlan[0]}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                oldMasterPlanUrl = `https://${bucket}.s3.${region}.amazonaws.com/img/project/${project.masterPlan[0]}`;
                            }
                        } else {
                            oldMasterPlanUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/img/project/${project.masterPlan[0]}`;
                        }
                    }
                    await uploadService.delete(oldMasterPlanUrl).catch((err) => {
                        logger.warn('Failed to delete old master plan', { error: err.message });
                    });
                }
                project.masterPlan = [masterPlanFilename];
            }
        }

        // Handle brochure upload
        if (req.files?.brochure && Array.isArray(req.files.brochure) && req.files.brochure.length > 0) {
            if (req.files.brochure.length > 1) {
                return failure(res, 400, 'You can upload only one brochure', 'VALIDATION_ERROR');
            }

            const brochureFile = req.files.brochure[0];
            const uploaded = await uploadService.uploadDocument(brochureFile, 'project');
            uploadedBrochure = uploaded.url;
            const brochureFilename = uploaded.path.split('/').pop() || uploaded.filename;

            if (project) {
                // Delete old brochure if exists
                if (project.brochure) {
                    let oldBrochureUrl = project.brochure;
                    if (!oldBrochureUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                oldBrochureUrl = `${baseUrl}/doc/project/${project.brochure}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                oldBrochureUrl = `https://${bucket}.s3.${region}.amazonaws.com/doc/project/${project.brochure}`;
                            }
                        } else {
                            oldBrochureUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/doc/project/${project.brochure}`;
                        }
                    }
                    await uploadService.delete(oldBrochureUrl).catch((err) => {
                        logger.warn('Failed to delete old brochure', { error: err.message });
                    });
                }
                project.brochure = brochureFilename;
            }
        }

        // Handle video upload
        if (req.files?.video && Array.isArray(req.files.video) && req.files.video.length > 0) {
            if (req.files.video.length > 1) {
                return failure(res, 400, 'You can upload only one video', 'VALIDATION_ERROR');
            }

            const videoFile = req.files.video[0];
            const uploaded = await uploadService.uploadVideo(videoFile, 'project');
            uploadedVideo = uploaded.url;
            const videoFilename = uploaded.path.split('/').pop() || uploaded.filename;

            if (project) {
                // Delete old video if exists
                if (project.videoTour) {
                    let oldVideoUrl = project.videoTour;
                    if (!oldVideoUrl.startsWith('http')) {
                        const storage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
                        if (storage === 's3') {
                            const cloudfrontUrl = process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
                            if (cloudfrontUrl) {
                                const baseUrl = cloudfrontUrl.replace(/\/$/, '');
                                oldVideoUrl = `${baseUrl}/vid/project/${project.videoTour}`;
                            } else {
                                const bucket = process.env.AWS_S3_BUCKET;
                                const region = process.env.AWS_REGION;
                                oldVideoUrl = `https://${bucket}.s3.${region}.amazonaws.com/vid/project/${project.videoTour}`;
                            }
                        } else {
                            oldVideoUrl = `${uploadService.uploadsBaseUrl || 'http://localhost:5000/uploads'}/vid/project/${project.videoTour}`;
                        }
                    }
                    await uploadService.delete(oldVideoUrl).catch((err) => {
                        logger.warn('Failed to delete old video', { error: err.message });
                    });
                }
                project.videoTour = videoFilename;
            }
        }

        // Handle floor plan uploads (images only; return filename values for use in layout.floorPlans)
        if (req.files?.floorPlans && Array.isArray(req.files.floorPlans)) {
            if (req.files.floorPlans.length > 20) {
                return failure(res, 400, 'You can upload up to 20 floor plan images', 'VALIDATION_ERROR');
            }
            for (const file of req.files.floorPlans) {
                const uploaded = await uploadService.upload(file, 'project', {
                    generateThumbnail: false,
                });
                if (uploaded?.url) {
                    const floorPlanFilename = uploaded.path.split('/').pop() || uploaded.filename;
                    uploadedFloorPlans.push({
                        ...uploaded,
                        url: floorPlanFilename,
                        filename: floorPlanFilename,
                        mimetype: uploaded.mimetype || file.mimetype || 'image/webp',
                    });
                }
            }
        }

        // Save project if it exists
        if (project) {
            await project.save();
        }

        // Combine all uploads for standardized response
        const allUploads = [...uploadedImages];

        // Add master plan as image
        if (uploadedMasterPlan) {
            allUploads.push({
                url: uploadedMasterPlan,
                path: `img/project/${uploadedMasterPlan.split('/').pop()}`,
                filename: uploadedMasterPlan.split('/').pop(),
                size: 0,
                mimetype: 'image/webp',
                type: 'masterPlan'
            });
        }

        // Add brochure as document
        if (uploadedBrochure) {
            allUploads.push({
                url: uploadedBrochure,
                path: `doc/project/${uploadedBrochure.split('/').pop()}`,
                filename: uploadedBrochure.split('/').pop(),
                size: 0,
                mimetype: 'application/pdf',
                type: 'brochure'
            });
        }

        // Add video
        if (uploadedVideo) {
            allUploads.push({
                url: uploadedVideo,
                path: `vid/project/${uploadedVideo.split('/').pop()}`,
                filename: uploadedVideo.split('/').pop(),
                size: 0,
                mimetype: 'video/mp4'
            });
        }

        // Build standardized response
        const responseData = uploadService.buildStandardResponse(
            allUploads,
            {
                images: 'project',
                videos: 'project',
                documents: 'project'
            },
            project ? {
                project: {
                    id: project._id,
                    totalImages: project.images?.length || 0,
                    masterPlan: project.masterPlan?.[0] || null,
                    brochure: project.brochure || null,
                    videoTour: project.videoTour || null,
                    ...(removedImages.length > 0 && {
                        removedImages: removedImages.map((value) =>
                            value.includes('/') ? value.split('/').pop() : value
                        ),
                        removedImageUrls: removedImageUrls
                    }),
                    ...(removedMasterPlan && {
                        removedMasterPlan: removedMasterPlan.includes('/') ? removedMasterPlan.split('/').pop() : removedMasterPlan,
                        removedMasterPlanUrl: removedMasterPlanUrl
                    }),
                    ...(removedBrochure && {
                        removedBrochure: removedBrochure.includes('/') ? removedBrochure.split('/').pop() : removedBrochure,
                        removedBrochureUrl: removedBrochureUrl
                    }),
                    ...(removedVideo && {
                        removedVideo: removedVideo.includes('/') ? removedVideo.split('/').pop() : removedVideo,
                        removedVideoUrl: removedVideoUrl
                    })
                }
            } : {}
        );

        if (uploadedFloorPlans.length > 0) {
            responseData.uploads.floorPlans = uploadService
                .buildStandardResponse(uploadedFloorPlans, { images: 'project' })
                .uploads.images;
        }

        return success(res, 'Media processed successfully', responseData);
    } catch (error) {
        logger.error('Upload project media failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to process media', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects:
 *   get:
 *     summary: Get developer projects
 *     description: >
 *       Get all projects for the authenticated developer, or a single project if projectId is provided in query.
 *       Supports filtering, sorting, pagination, and returns count metrics by publishStatus.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Optional project ID to get a single project details
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Alternative parameter name for projectId
 *       - in: query
 *         name: publishStatus
 *         schema:
 *           type: string
 *           enum: [draft, unpublished, published, soldout]
 *         description: Filter projects by publish status
 *       - in: query
 *         name: projectType
 *         schema:
 *           type: string
 *           enum: [off-plan, ready]
 *         description: Filter projects by project type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by project name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [featured, newest, price_asc, price_desc]
 *           default: newest
 *         description: Sort field
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 *       400:
 *         description: Validation error or invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found (when projectId provided)
 *       500:
 *         description: Server error
 */
const getDeveloperProjects = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;
        
        const developer = await Developers.findById(developerId);
        if (!developer) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            publishStatus,
            projectType,
            search,
            page = 1,
            limit = 10,
            sortBy
        } = req.query;

        // If a specific project id is provided, return only that project
        if (projectId) {
            if (!validateObjectId(projectId)) {
                return failure(res, 400, 'Invalid projectId', 'VALIDATION_ERROR');
            }

            const project = await Newprojects.findOne({
                _id: projectId,
                developer: developerId,
                isActive: true
            })
            .populate('amenities', 'name slug category icon image')
            .populate('developer', 'name email logo')
            .populate('authorizedAgencies', 'agencyName profilePicture')
            .lean();

            if (!project) {
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            const layoutsForUnits = await ProjectLayout.find({
                project: projectId,
                isActive: true,
            })
                .sort({ createdAt: 1 })
                .lean();

            const buildingsForUnits = await ProjectBuilding.find({
                project: projectId,
                isActive: true,
            }).lean();

            const buildingMap = new Map(
                buildingsForUnits.map((b) => [String(b._id), b])
            );

            const unitPropertyGroups = new Map();
            for (const layout of layoutsForUnits) {
                const buildingKey = layout.building ? String(layout.building) : 'none';
                const typeKey = String(layout.propertyType);
                const groupKey = `${buildingKey}|${typeKey}`;

                if (!unitPropertyGroups.has(groupKey)) {
                    const buildingDoc = layout.building ? buildingMap.get(String(layout.building)) : null;
                    unitPropertyGroups.set(groupKey, {
                        _id: buildingDoc?._id,
                        buildingName: buildingDoc?.buildingName || '',
                        propertyType: typeKey,
                        areaSqm: layout.areaSqm,
                        areaSqft: layout.areaSqft,
                        layouts: [],
                    });
                }

                const group = unitPropertyGroups.get(groupKey);
                group.layouts.push({
                    _id: layout._id,
                    layoutName: layout.layoutName,
                    bedrooms: layout.bedrooms,
                    maidBedroom: Boolean(layout.maidBedroom),
                    bathrooms: layout.bathrooms,
                    areaSqm: layout.areaSqm,
                    areaSqft: layout.areaSqft,
                    startingPrice: layout.startingPrice || null,
                    floorPlans: Array.isArray(layout.floorPlans) ? layout.floorPlans : [],
                    totalUnits: layout.totalUnits,
                });
            }

            const unitProperties = Array.from(unitPropertyGroups.values());

            const agencyCount = await ProjectAgencyAllocation.countDocuments({
                project: projectId,
                status: 'active'
            });

            return success(res, 'Project fetched successfully', {
                project,
                unitProperties,
                agencyCount,
                unitSummary: {
                    total: project.totalUnits || 0,
                    available: project.availableUnits || 0,
                    sold: project.soldUnits || 0,
                    reserved: project.reservedUnits || 0
                },
                ...(project.publishStatus === 'draft' && {
                    draftProgress: calculateDraftProgress(project),
                }),
                canPublish: agencyCount > 0 && project.publishStatus === 'unpublished'
            }, 200);
        }

        const query = {
            developer: developerId,
            isActive: true
        };

        if (publishStatus) {
            const validStatuses = ['draft', 'unpublished', 'published', 'soldout'];
            if (!validStatuses.includes(publishStatus)) {
                return failure(res, 400, 'Invalid publishStatus', 'VALIDATION_ERROR');
            }
            query.publishStatus = publishStatus;
        }

        if (projectType) {
            const validTypes = ['off-plan', 'ready'];
            if (!validTypes.includes(projectType)) {
                return failure(res, 400, 'Invalid projectType', 'VALIDATION_ERROR');
            }
            query.projectType = projectType;
        }

        if (search && search.trim()) {
            const searchRegex = {
                $regex: escapeRegex(search.trim()),
                $options: 'i',
            };
            query.$or = [
                { projectName: searchRegex },
                { 'location.city': searchRegex },
                { 'location.zone': searchRegex },
                { 'location.address': searchRegex },
            ];
        }

        const sortMap = {
            featured: { isFeatured: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            price_asc: { 'launchPrice.startingFrom': 1 },
            price_desc: { 'launchPrice.startingFrom': -1 }
        };
        const sort = sortMap[sortBy] || sortMap.newest;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const [projects, total, counts] = await Promise.all([
            Newprojects.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .select(`
                    projectName description slug projectType completionStatus
                    publishStatus isFeatured isVerified
                    images masterPlan brochure videoTour virtualTour360
                    location launchPrice governmentFees paymentPlans
                    totalUnits availableUnits soldUnits reservedUnits
                    progressStatus projectAnnouncement expectedCompletionDate
                    bookingOpen constructionStarted launchDate deliveryDate
                    constructionProgress
                    createdAt lastModifiedAt
                `)
                .lean(),
            Newprojects.countDocuments(query),
            Newprojects.aggregate([
                {
                    $match: {
                        developer: developer._id,
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: '$publishStatus',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const countMap = {
            draft: 0,
            unpublished: 0,
            published: 0,
            soldout: 0
        };
        
        counts.forEach(c => {
            if (countMap[c._id] !== undefined) {
                countMap[c._id] = c.count;
            }
        });

        const projectsWithDraftProgress = projects.map((project) => {
            if (project.publishStatus !== 'draft') return project;
            return {
                ...project,
                draftProgress: calculateDraftProgress(project),
            };
        });

        return success(res, 'Projects fetched successfully', {
            projects: projectsWithDraftProgress,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            },
            counts: countMap
        }, 200);
    } catch (error) {
        logger.error('Get developer projects failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to fetch projects', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/{id}:
 *   put:
 *     summary: Update project (Developer)
 *     description: |
 *       Three modes controlled by `publishStatus`:
 *
 *       - **Normal edit** (publishStatus omitted or not `draft`/`unpublished`):
 *         Partial update of provided fields only; minimal validation; `publishStatus` unchanged.
 *
 *       - **Save as draft** (publishStatus = `draft`):
 *         Partial update; minimal validation; `publishStatus` stays `draft`; `properties` (units) are ignored.
 *
 *       - **Finalize draft** (publishStatus = `unpublished` and current project is `draft`):
 *         Full validation (same as create unpublished); processes `properties` to create/update/delete layouts & units;
 *         sets `publishStatus` to `unpublished`.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publishStatus:
 *                 type: string
 *                 enum: [draft, unpublished]
 *                 description: |
 *                   - Omit or other → normal edit
 *                   - draft       → save as draft (no units processing)
 *                   - unpublished → finalize draft (only allowed from draft)
 *               projectType:
 *                 type: string
 *                 enum: [off-plan, ready]
 *               projectName:
 *                 type: string
 *                 description: Min 3, max 200 chars (required for finalize)
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               aboutProject:
 *                 type: string
 *                 maxLength: 5000
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Amenity ObjectIds
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 *                     isPrimary: { type: boolean }
 *                     order: { type: number }
 *                     caption: { type: string }
 *                 description: Max 50; finalize requires at least 1
 *               masterPlan:
 *                 type: array
 *                 items: { type: string }
 *               brochure:
 *                 type: string
 *               videoTour:
 *                 type: string
 *               virtualTour360:
 *                 type: string
 *               tour360:
 *                 type: string
 *               tour360Url:
 *                 type: string
 *               launchPrice:
 *                 type: object
 *                 properties:
 *                   startingFrom: { type: number, minimum: 0.01 }
 *                   currency: { type: string, default: "AED" }
 *               price:
 *                 type: number
 *               propertyPrice:
 *                 type: number
 *               currency:
 *                 type: string
 *               governmentFees:
 *                 type: number
 *                 description: Percentage; must be non-negative (required for finalize)
 *               paymentPlans:
 *                 type: array
 *                 description: New structured plans; sum of downPayment + duringConstruction + onHandover percentages must be 100
 *                 items:
 *                   type: object
 *                   properties:
 *                     planName: { type: string }
 *                     downPayment:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *                     duringConstruction:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *                         installments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               percentage: { type: number }
 *                               amount: { type: number }
 *                               date: { type: string, format: date }
 *                     onHandover:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         amount: { type: number }
 *               hasPostHandoverPayment:
 *                 type: boolean
 *               postHandoverDetails:
 *                 type: object
 *                 properties:
 *                   duration: { type: string }
 *                   percentage: { type: number }
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Optional; if provided, must be a future date
 *               expectedCompletionDate:
 *                 type: string
 *                 format: date
 *               projectAnnouncement:
 *                 type: string
 *                 format: date
 *               bookingOpen:
 *                 type: string
 *                 format: date
 *               constructionStarted:
 *                 type: string
 *                 format: date
 *               launchDate:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   zone: { type: string }
 *                   googlePlaceId: { type: string }
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       type: { type: string, enum: [Point] }
 *                       coordinates: { type: array, items: { type: number }, description: "[longitude, latitude]" }
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               zone:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat: { type: number }
 *                   lng: { type: number }
 *               googlePlaceId:
 *                 type: string
 *               location (inline only — no Location ref):
 *                 type: string
 *               isDldRegistered:
 *                 type: boolean
 *               dldRegistrationNumber:
 *                 type: string
 *               registrationDetails:
 *                 type: object
 *                 properties:
 *                   permitNumber: { type: string }
 *                   permitUrl: { type: string }
 *                   issuedDate: { type: string, format: date }
 *                   expiryDate: { type: string, format: date }
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               metaKeywords:
 *                 type: array
 *                 items: { type: string }
 *               properties:
 *                 type: array
 *                 description: >
 *                   Full units structure:
 *                   - Ignored when publishStatus='draft' (Mode 2).
 *                   - In normal edit (Mode 1), if provided, used to diff and update layouts/units.
 *                   - In finalize (Mode 3), required and fully processed (create/update/delete layouts & units).
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Existing building ID; omit/null for new
 *                     buildingName:
 *                       type: string
 *                     propertyType:
 *                       type: string
 *                       description: ObjectId of PropertyType
 *                     areaSqm:
 *                       type: number
 *                     areaSqft:
 *                       type: number
 *                     layouts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Existing layout ID; omit/null for new
 *                           layoutName: { type: string }
 *                           areaSqm: { type: number }
 *                           areaSqft: { type: number }
 *                           bedrooms: { type: number }
 *                           maidBedroom: { type: boolean }
 *                           bathrooms: { type: number }
 *                           totalUnits:
 *                             type: number
 *                             description: Used only for new layouts; ignored for existing
 *                           startingPrice:
 *                             type: object
 *                             properties:
 *                               amount: { type: number }
 *                               currency: { type: string, default: "AED" }
 *                           floorPlans:
 *                             type: array
 *                             items: { type: string }
 *     responses:
 *       200:
 *         description: |
 *           - Normal edit: project updated successfully
 *           - Save as draft: project saved as draft (returns nextSteps.currentStatus='draft')
 *           - Finalize draft: project created successfully with units (returns nextSteps.assignAgenciesUrl & currentStatus='unpublished')
 *       400:
 *         description: Validation error (invalid data or forbidden layout deletions)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (developer does not own project)
 *       404:
 *         description: Project not found (or referenced PropertyType/Amenities not found)
 *       409:
 *         description: Conflict (another project with same name+city when finalizing)
 */
const updateProject = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const projectId = req.params.id;
        if (!validateObjectId(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid project ID', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true,
        }).session(session);

        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        const prevProjectCityForSearchIndex = project.location?.city;
        const wasProjectPublishedForSearchIndex = project.publishStatus === 'published';

        if (project.publishStatus === 'soldout') {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Cannot edit a sold out project', 'VALIDATION_ERROR');
        }

        const bodyStatus = req.body.publishStatus;
        const isFinalizeDraft = bodyStatus === 'unpublished';
        const isSaveAsDraft = bodyStatus === 'draft';
        const isNormalEdit = !isFinalizeDraft && !isSaveAsDraft;

        if (isFinalizeDraft && project.publishStatus !== 'draft') {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Only draft projects can be finalized. Use normal edit for published/unpublished projects', 'VALIDATION_ERROR');
        }

        const {
            publishStatus, // ignored directly; we use bodyStatus above
            projectName,
            projectTitle,
            title,
            description,
            aboutProject,
            projectType,
            amenities,
            images,
            projectImages,
            masterPlan,
            brochure,
            videoTour,
            projectVideo,
            virtualTour360,
            tour360,
            tour360Url,
            launchPrice,
            price,
            propertyPrice,
            currency,
            governmentFees,
            paymentPlans,
            hasPostHandoverPayment,
            postHandoverDetails,
            deliveryDate,
            expectedCompletionDate,
            projectAnnouncement,
            bookingOpen,
            constructionStarted,
            launchDate,
            location,
            address,
            projectAddress,
            city,
            fullAddress,
            zone,
            googlePlaceId,
            coordinates,
            latitude,
            longitude,
            isDldRegistered,
            dldRegistrationNumber,
            registrationDetails,
            metaTitle,
            metaDescription,
            metaKeywords,
            properties,
        } = req.body || {};

        const finalProjectName = (projectName || projectTitle || title || '').trim() || null;
        const finalAddress = location?.address || address || projectAddress || fullAddress || project.location?.address || null;
        const finalCity = (location?.city || city || project.location?.city || '').trim();
        const finalPrice = toNumberOrNull(launchPrice?.startingFrom ?? price ?? propertyPrice);
        const finalGovernmentFees = governmentFees !== undefined ? toNumberOrNull(governmentFees) : null;
        const normalizedPaymentPlans = (() => {
            if (paymentPlans === undefined) return undefined;

            let parsedPlans = paymentPlans;
            if (typeof parsedPlans === 'string') {
                try {
                    parsedPlans = JSON.parse(parsedPlans);
                } catch (_err) {
                    return parsedPlans;
                }
            }

            if (Array.isArray(parsedPlans)) return parsedPlans;

            if (parsedPlans && typeof parsedPlans === 'object') {
                const numericKeyValues = Object.keys(parsedPlans)
                    .filter((key) => /^\d+$/.test(key))
                    .sort((a, b) => Number(a) - Number(b))
                    .map((key) => parsedPlans[key]);

                if (numericKeyValues.length > 0) return numericKeyValues;

                return [parsedPlans];
            }

            return parsedPlans;
        })();

        const validProjectTypes = ['off-plan', 'ready'];

        // ─── Validation ─────────────────────────────────────────────────────
        const minimalValidate = !isFinalizeDraft;

        // Mode 2 & 1: validate only provided fields
        if (minimalValidate) {
            if (projectType !== undefined && !validProjectTypes.includes(projectType)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectType must be "off-plan" or "ready"', 'VALIDATION_ERROR');
            }
            if (projectName !== undefined || projectTitle !== undefined || title !== undefined) {
                if (finalProjectName && (finalProjectName.length < 3 || finalProjectName.length > 200)) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'projectName must be between 3 and 200 characters', 'VALIDATION_ERROR');
                }
            }
            if (description !== undefined && description && description.length > 5000) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'description must not exceed 5000 characters', 'VALIDATION_ERROR');
            }
            if (aboutProject !== undefined && aboutProject && aboutProject.length > 5000) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'aboutProject must not exceed 5000 characters', 'VALIDATION_ERROR');
            }
            const imgInput = normalizeArray(images || projectImages);
            if (imgInput.length > 50) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'images cannot exceed 50', 'VALIDATION_ERROR');
            }
            if (imgInput.length > 0) {
                const hasInvalidImage = imgInput.some((img) => {
                    const url = typeof img === 'string' ? img : img?.url;
                    return !url || (typeof img === 'object' && !img.url);
                });
                if (hasInvalidImage) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each image must have a url', 'VALIDATION_ERROR');
                }
            }
            if (launchPrice !== undefined || price !== undefined || propertyPrice !== undefined) {
                if (finalPrice != null && finalPrice <= 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'launchPrice.startingFrom must be a positive number', 'VALIDATION_ERROR');
                }
            }
            if (governmentFees !== undefined) {
                if (finalGovernmentFees !== null && finalGovernmentFees < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'governmentFees must be non-negative', 'VALIDATION_ERROR');
                }
            }
            if (normalizedPaymentPlans !== undefined) {
                if (!Array.isArray(normalizedPaymentPlans) || normalizedPaymentPlans.length < 1) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'paymentPlans is required (min 1 plan)', 'VALIDATION_ERROR');
                }
                for (const plan of normalizedPaymentPlans) {
                    if (!plan.planName) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, 'Each payment plan must have planName', 'VALIDATION_ERROR');
                    }
                    const dp = toNumberOrNull(plan.downPayment?.percentage) ?? 0;
                    const dc = toNumberOrNull(plan.duringConstruction?.percentage) ?? 0;
                    const oh = toNumberOrNull(plan.onHandover?.percentage) ?? 0;
                    const total = dp + dc + oh;
                    if (Math.abs(total - 100) > 0.01) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Payment plan '${plan.planName}' percentages must sum to 100. Current sum: ${total}%`, 'VALIDATION_ERROR');
                    }
                }
            }
            if (deliveryDate !== undefined && deliveryDate) {
                const d = new Date(deliveryDate);
                if (Number.isNaN(d.getTime()) || d <= new Date()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'deliveryDate must be a future date', 'VALIDATION_ERROR');
                }
            }
            if (hasPostHandoverPayment) {
                if (!postHandoverDetails?.duration || postHandoverDetails?.percentage == null) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'When hasPostHandoverPayment is true, postHandoverDetails.duration and percentage are required', 'VALIDATION_ERROR');
                }
            }
            if (isDldRegistered) {
                if (!dldRegistrationNumber || !String(dldRegistrationNumber).trim()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'dldRegistrationNumber is required when isDldRegistered is true', 'VALIDATION_ERROR');
                }
            }
        } else {
            // Mode 3: finalize draft — full validation
            const requiredMissing = [
                [finalProjectName, 'projectName'],
                [description, 'description'],
                [projectType, 'projectType'],
                [finalAddress, 'location.address'],
                [finalCity, 'location.city'],
                [finalPrice, 'launchPrice.startingFrom'],
                [normalizedPaymentPlans, 'paymentPlans'],
                [properties, 'properties'],
            ].filter(([value]) => value === null || value === undefined || value === '');

            if (requiredMissing.length) {
                const missing = requiredMissing.map(([, key]) => key).join(', ');
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, `Missing required fields: ${missing}`, 'VALIDATION_ERROR');
            }
            if (!validProjectTypes.includes(projectType)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectType must be "off-plan" or "ready"', 'VALIDATION_ERROR');
            }
            if (finalProjectName.length < 3 || finalProjectName.length > 200) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'projectName must be between 3 and 200 characters', 'VALIDATION_ERROR');
            }
            if (description.length > 5000) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'description must not exceed 5000 characters', 'VALIDATION_ERROR');
            }
            if (finalPrice == null || finalPrice <= 0) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'launchPrice.startingFrom must be a positive number', 'VALIDATION_ERROR');
            }
            if (finalGovernmentFees == null || finalGovernmentFees < 0) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'governmentFees is required and must be non-negative', 'VALIDATION_ERROR');
            }
            if (!Array.isArray(normalizedPaymentPlans) || normalizedPaymentPlans.length < 1) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'paymentPlans is required (min 1 plan)', 'VALIDATION_ERROR');
            }
            for (const plan of normalizedPaymentPlans) {
                if (!plan.planName) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each payment plan must have planName', 'VALIDATION_ERROR');
                }
                const dp = toNumberOrNull(plan.downPayment?.percentage) ?? 0;
                const dc = toNumberOrNull(plan.duringConstruction?.percentage) ?? 0;
                const oh = toNumberOrNull(plan.onHandover?.percentage) ?? 0;
                const total = dp + dc + oh;
                if (Math.abs(total - 100) > 0.01) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, `Payment plan '${plan.planName}' percentages must sum to 100. Current sum: ${total}%`, 'VALIDATION_ERROR');
                }
            }
            if (!Array.isArray(properties) || properties.length < 1) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'properties is required (min 1 property)', 'VALIDATION_ERROR');
            }
            if (deliveryDate != null && deliveryDate !== '') {
                const deliveryDateObj = new Date(deliveryDate);
                if (Number.isNaN(deliveryDateObj.getTime()) || deliveryDateObj <= new Date()) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'deliveryDate must be a valid future date when provided', 'VALIDATION_ERROR');
                }
            }
        }

        // Duplicate name+city (exclude current project)
        if (finalProjectName) {
            const dupCity = finalCity || project.location?.city || '';
            const escapedName = finalProjectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedCity = dupCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const duplicate = await Newprojects.findOne({
                _id: { $ne: projectId },
                projectName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                'location.city': { $regex: new RegExp(`^${escapedCity}$`, 'i') },
                isActive: true,
            }).session(session);
            if (duplicate) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 409, 'Project with this name and city already exists', 'CONFLICT');
            }
        }

        // Validate amenities (shared)
        let amenityIds = [];
        if (amenities !== undefined) {
            amenityIds = normalizeArray(amenities).filter(Boolean);
            if (amenityIds.length > 0) {
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
        }

        if (location?.coordinates && !isValidGeoPoint(location.coordinates)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'coordinates: must be a valid GeoJSON Point with coordinates [longitude, latitude] (longitude -180 to 180, latitude -90 to 90)', 'VALIDATION_ERROR');
        }

        // ─── Build updateData ────────────────────────────────────────────────
        const updateData = {};

        if (projectType !== undefined) {
            if (validProjectTypes.includes(projectType)) {
                updateData.projectType = projectType;
                updateData.completionStatus = projectType === 'off-plan' ? 'off-plan' : 'ready';
            }
        }

        // projectName + slug (exclude this project in uniqueness check so unchanged slugify does not get "-1")
        if (finalProjectName) {
            updateData.projectName = finalProjectName;
            if (finalProjectName !== project.projectName) {
                const baseSlug = generateSlug(finalProjectName) || generateSlug(`project-${Date.now()}`);
                updateData.slug = await ensureUniqueSlug(baseSlug, session, projectId);
            }
        } else if (isFinalizeDraft && !project.slug) {
            const nameForSlug = project.projectName || 'Untitled Draft';
            const baseSlug = generateSlug(nameForSlug) || generateSlug(`project-${Date.now()}`);
            updateData.slug = await ensureUniqueSlug(baseSlug, session, projectId);
        }

        // Legacy rows with slug=null: backfill on any edit so unique index / public URLs are safe
        if (!updateData.slug && !project.slug) {
            const nameForSlug =
                (finalProjectName && String(finalProjectName).trim()) || project.projectName || 'draft';
            const baseSlug = generateSlug(nameForSlug) || generateSlug(`project-${Date.now()}`);
            updateData.slug = await ensureUniqueSlug(baseSlug, session, projectId);
        }

        if (description !== undefined) {
            updateData.description = description ? description.trim() : null;
        }
        if (aboutProject !== undefined) {
            updateData.aboutProject = aboutProject ? aboutProject.trim() : null;
        }

        if (amenities !== undefined) {
            updateData.amenities = amenityIds;
        }

        // Images
        const normalizedImagesInput = normalizeArray(images || projectImages);
        if (images !== undefined || projectImages !== undefined) {
            const imagePayload = normalizedImagesInput
                .map((img, idx) => {
                    if (typeof img === 'string') {
                        const filename = img.includes('/') ? img.split('/').pop() : img;
                        return { url: filename, isPrimary: idx === 0, order: idx, uploadedAt: new Date() };
                    }
                    const filename = img.url?.includes('/') ? img.url.split('/').pop() : img.url;
                    return {
                        url: filename,
                        isPrimary: Boolean(img.isPrimary),
                        order: typeof img.order === 'number' ? img.order : idx,
                        caption: img.caption || undefined,
                        uploadedAt: new Date(),
                    };
                })
                .filter(Boolean);
            if (imagePayload.length > 0 && !imagePayload.some((img) => img.isPrimary)) {
                imagePayload[0].isPrimary = true;
            }
            updateData.images = imagePayload;
        }

        // Media
        const virtualTourUrl = tour360Url || tour360 || virtualTour360;
        if (virtualTour360 !== undefined || tour360 !== undefined || tour360Url !== undefined) {
            updateData.virtualTour360 = virtualTourUrl || null;
        }

        const videoTourInput = projectVideo || videoTour;
        if (projectVideo !== undefined || videoTour !== undefined) {
            const videoTourUrl = videoTourInput
                ? (videoTourInput.includes('/') ? videoTourInput.split('/').pop() : videoTourInput)
                : null;
            updateData.videoTour = videoTourUrl;
        }

        if (brochure !== undefined) {
            const brochureUrl = brochure
                ? (brochure.includes('/') ? brochure.split('/').pop() : brochure)
                : null;
            updateData.brochure = brochureUrl;
        }

        if (masterPlan !== undefined) {
            const masterPlanArr = Array.isArray(masterPlan)
                ? masterPlan.map((u) => (typeof u === 'string' && u.includes('/') ? u.split('/').pop() : u))
                : [];
            updateData.masterPlan = masterPlanArr.length ? masterPlanArr : [];
        }

        // Location (inline only — no Location schema ref)
        if (location !== undefined || address !== undefined || projectAddress !== undefined || city !== undefined || latitude !== undefined || longitude !== undefined || coordinates !== undefined || zone !== undefined || googlePlaceId !== undefined) {
            const loc = {
                address: finalAddress || project.location?.address || null,
                city: finalCity || project.location?.city || null,
                zone: location?.zone || zone || project.location?.zone || null,
                googlePlaceId: location?.googlePlaceId || googlePlaceId || project.location?.googlePlaceId || null,
            };
            if (location?.coordinates && isValidGeoPoint(location.coordinates)) {
                loc.coordinates = location.coordinates;
            } else if (latitude != null || longitude != null || coordinates) {
                const lat = toNumberOrNull(latitude ?? coordinates?.lat ?? coordinates?.latitude);
                const lng = toNumberOrNull(longitude ?? coordinates?.lng ?? coordinates?.longitude);
                if (lat !== null && lng !== null && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                    loc.coordinates = { type: 'Point', coordinates: [lng, lat] };
                }
            }
            updateData.location = loc;
        }

        // Pricing / payment
        if (launchPrice !== undefined || price !== undefined || propertyPrice !== undefined) {
            if (finalPrice != null) {
                updateData.launchPrice = {
                    startingFrom: finalPrice,
                    currency: currency || launchPrice?.currency || project.launchPrice?.currency || 'AED',
                };
            }
        }
        if (finalGovernmentFees !== null) {
            updateData.governmentFees = finalGovernmentFees;
        }

        if (normalizedPaymentPlans !== undefined) {
            const processedPaymentPlans = (normalizedPaymentPlans || []).map((plan) => ({
                planName: plan.planName || 'Plan',
                downPayment: {
                    percentage: toNumberOrNull(plan.downPayment?.percentage) ?? 0,
                    amount: toNumberOrNull(plan.downPayment?.amount) ?? null,
                },
                duringConstruction: {
                    percentage: toNumberOrNull(plan.duringConstruction?.percentage) ?? 0,
                    amount: toNumberOrNull(plan.duringConstruction?.amount) ?? null,
                    installments: (plan.duringConstruction?.installments || []).map((inst) => ({
                        percentage: toNumberOrNull(inst.percentage) ?? 0,
                        amount: toNumberOrNull(inst.amount) ?? null,
                        date: inst.date ? new Date(inst.date) : null,
                    })),
                },
                onHandover: {
                    percentage: toNumberOrNull(plan.onHandover?.percentage) ?? 0,
                    amount: toNumberOrNull(plan.onHandover?.amount) ?? null,
                },
            }));
            updateData.paymentPlans = processedPaymentPlans;
        }

        if (hasPostHandoverPayment !== undefined) {
            updateData.hasPostHandoverPayment = Boolean(hasPostHandoverPayment);
            updateData.postHandoverDetails = hasPostHandoverPayment && postHandoverDetails
                ? { duration: postHandoverDetails.duration, percentage: toNumberOrNull(postHandoverDetails.percentage) }
                : null;
        }

        // Timeline
        if (deliveryDate !== undefined) {
            updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        }
        if (expectedCompletionDate !== undefined) {
            updateData.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : null;
        }
        if (projectAnnouncement !== undefined) {
            updateData.projectAnnouncement = projectAnnouncement ? new Date(projectAnnouncement) : null;
        }
        if (bookingOpen !== undefined) {
            updateData.bookingOpen = bookingOpen ? new Date(bookingOpen) : null;
        }
        if (constructionStarted !== undefined) {
            updateData.constructionStarted = constructionStarted ? new Date(constructionStarted) : null;
        }
        if (launchDate !== undefined) {
            updateData.launchDate = launchDate ? new Date(launchDate) : null;
        }

        // DLD
        if (isDldRegistered !== undefined) {
            updateData.isDldRegistered = Boolean(isDldRegistered);
            updateData.dldRegistrationNumber = isDldRegistered ? dldRegistrationNumber || null : null;
            updateData.registrationDetails = isDldRegistered ? registrationDetails || null : null;
        }

        // SEO
        if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
        if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
        if (metaKeywords !== undefined) {
            updateData.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : [];
        }

        // publishStatus
        if (isFinalizeDraft) {
            updateData.publishStatus = 'unpublished';
        }

        updateData.lastModifiedAt = new Date();
        updateData.lastModifiedBy = developerId;

        // ─── Units / properties processing ───────────────────────────────────
        const shouldProcessUnits = !isSaveAsDraft && properties !== undefined;

        if (shouldProcessUnits) {
            // Load existing layouts and units
            const existingLayouts = await ProjectLayout.find({ project: projectId, isActive: true }).session(session);
            const existingLayoutIds = existingLayouts.map((l) => l._id.toString());

            const incomingLayoutIds = new Set();
            for (const prop of properties || []) {
                for (const lay of prop.layouts || []) {
                    if (lay._id && validateObjectId(lay._id)) {
                        incomingLayoutIds.add(String(lay._id));
                    }
                }
            }

            const deletedLayouts = existingLayouts.filter((l) => !incomingLayoutIds.has(l._id.toString()));

            // Prevent deletion if allocated to agencies
            for (const layout of deletedLayouts) {
                const unitIds = await ProjectUnit.find({ layout: layout._id, isActive: true }).distinct('_id').session(session);
                if (unitIds.length > 0) {
                    const hasAllocation = await ProjectAgencyAllocation.findOne({
                        project: projectId,
                        status: 'active',
                        units: { $in: unitIds },
                    }).session(session);

                    if (hasAllocation) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${layout.layoutName}" cannot be deleted because its units have been allocated to agencies`, 'VALIDATION_ERROR');
                    }
                }

                await ProjectUnit.updateMany(
                    { layout: layout._id },
                    { $set: { isActive: false } },
                    { session }
                );
                await ProjectLayout.findByIdAndUpdate(
                    layout._id,
                    { $set: { isActive: false } },
                    { session }
                );
                await LeadAssignment.deleteOne({ layout: layout._id }).session(session);
            }

            // Process incoming properties / layouts
            const propertyTypeIds = new Set();
            const bedroomSet = new Set();

            for (const prop of properties || []) {
                let buildingId = null;

                if (prop._id && validateObjectId(prop._id)) {
                    // Existing building
                    if (prop.buildingName && String(prop.buildingName).trim()) {
                        await ProjectBuilding.findByIdAndUpdate(
                            prop._id,
                            { $set: { buildingName: String(prop.buildingName).trim() } },
                            { session }
                        );
                    }
                    buildingId = prop._id;
                } else if (prop.buildingName && String(prop.buildingName).trim()) {
                    const buildingCreated = await ProjectBuilding.create([{
                        project: projectId,
                        buildingName: String(prop.buildingName).trim(),
                        isActive: true,
                    }], { session });
                    buildingId = buildingCreated[0]._id;
                }

                if (!validateObjectId(prop.propertyType)) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have a valid propertyType ObjectId', 'VALIDATION_ERROR');
                }

                const ptDoc = await PropertyType.findById(prop.propertyType).session(session);
                if (!ptDoc) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 404, `Property type ${prop.propertyType} not found`, 'NOT_FOUND');
                }

                const areaSqm = toNumberOrNull(prop.areaSqm);
                const areaSqft = toNumberOrNull(prop.areaSqft);
                if (areaSqm == null || areaSqm <= 0 || areaSqft == null || areaSqft <= 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have positive areaSqm and areaSqft', 'VALIDATION_ERROR');
                }

                if (!Array.isArray(prop.layouts) || prop.layouts.length < 1) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each property must have at least one layout', 'VALIDATION_ERROR');
                }

                propertyTypeIds.add(String(prop.propertyType));

                for (const lay of prop.layouts) {
                    const layAreaSqm = toNumberOrNull(lay.areaSqm);
                    const layAreaSqft = toNumberOrNull(lay.areaSqft);
                    if (!lay.layoutName || !String(lay.layoutName).trim()) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, 'Each layout must have layoutName', 'VALIDATION_ERROR');
                    }
                    if (layAreaSqm == null || layAreaSqm <= 0 || layAreaSqft == null || layAreaSqft <= 0) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have positive areaSqm and areaSqft`, 'VALIDATION_ERROR');
                    }
                    const beds = toNumberOrNull(lay.bedrooms);
                    const baths = toNumberOrNull(lay.bathrooms);
                    if (beds == null || beds < 0 || baths == null || baths < 0) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have bedrooms and bathrooms (min 0)`, 'VALIDATION_ERROR');
                    }
                    const floorPlans = normalizeArray(lay.floorPlans);
                    if (floorPlans.length < 1) {
                        await session.abortTransaction();
                        session.endSession();
                        return failure(res, 400, `Layout "${lay.layoutName}" must have at least one floorPlan URL`, 'VALIDATION_ERROR');
                    }

                    bedroomSet.add(beds ?? 0);

                    if (lay._id && validateObjectId(lay._id)) {
                        // Existing layout: update only fields, not totalUnits
                        await ProjectLayout.findByIdAndUpdate(
                            lay._id,
                            {
                                $set: {
                                    layoutName: String(lay.layoutName).trim(),
                                    bedrooms: beds ?? 0,
                                    maidBedroom: Boolean(lay.maidBedroom),
                                    bathrooms: baths ?? 0,
                                    areaSqm: layAreaSqm ?? 0,
                                    areaSqft: layAreaSqft ?? 0,
                                    startingPrice: lay.startingPrice || null,
                                    floorPlans,
                                    building: buildingId,
                                    propertyType: prop.propertyType,
                                },
                            },
                            { session }
                        );
                    } else {
                        // New layout: create layout, units, and lead assignment config
                        const totalUnits = toNumberOrNull(lay.totalUnits);
                        if (totalUnits == null || totalUnits < 1) {
                            await session.abortTransaction();
                            session.endSession();
                            return failure(res, 400, `Layout "${lay.layoutName}" must have totalUnits >= 1`, 'VALIDATION_ERROR');
                        }

                        const layoutAmount = toNumberOrNull(lay.startingPrice?.amount) ?? null;
                        const layoutCurrency = lay.startingPrice?.currency || 'AED';

                        const layoutDoc = await ProjectLayout.create([{
                            project: projectId,
                            building: buildingId,
                            propertyType: prop.propertyType,
                            layoutName: String(lay.layoutName).trim(),
                            bedrooms: beds ?? 0,
                            maidBedroom: Boolean(lay.maidBedroom),
                            bathrooms: baths ?? 0,
                            areaSqm: layAreaSqm ?? 0,
                            areaSqft: layAreaSqft ?? 0,
                            startingPrice: layoutAmount != null ? { amount: layoutAmount, currency: layoutCurrency } : null,
                            floorPlans,
                            totalUnits,
                            availableUnits: totalUnits,
                            reservedUnits: 0,
                            soldUnits: 0,
                            isActive: true,
                        }], { session });

                        const newLayout = layoutDoc[0];

                        const unitDocs = [];
                        for (let i = 1; i <= totalUnits; i++) {
                            const unitNumber = String(i).padStart(3, '0');
                            const unitId = `${projectId}-${newLayout._id}-${unitNumber}`;
                            unitDocs.push({
                                project: projectId,
                                building: buildingId,
                                layout: newLayout._id,
                                propertyType: prop.propertyType,
                                unitId,
                                unitNumber,
                                status: 'available',
                                isActive: true,
                            });
                        }
                        if (unitDocs.length > 0) {
                            await ProjectUnit.insertMany(unitDocs, { session });
                        }

                        await LeadAssignment.create([{
                            project: projectId,
                            layout: newLayout._id,
                            method: 'round-robin',
                            agencyQueue: [],
                            agencyPointer: 0,
                            totalInquiries: 0,
                        }], { session });
                    }
                }
            }

            // Recompute cached fields from DB
            const allLayouts = await ProjectLayout.find({ project: projectId, isActive: true }).session(session);
            const allUnitsCount = await ProjectUnit.countDocuments({ project: projectId, isActive: true }).session(session);
            const availableUnitsCount = await ProjectUnit.countDocuments({
                project: projectId,
                isActive: true,
                status: 'available',
            }).session(session);

            const uniquePropertyTypes = [...new Set(allLayouts.map((l) => String(l.propertyType)))];
            const uniqueBedrooms = [...new Set(allLayouts.map((l) => l.bedrooms))].sort((a, b) => a - b);

            const prices = allLayouts
                .map((l) => l.startingPrice?.amount)
                .filter((p) => p != null);
            const minPrice = prices.length > 0
                ? Math.min(...prices)
                : (finalPrice || project.launchPrice?.startingFrom || null);

            updateData.propertyTypes = uniquePropertyTypes;
            updateData.bedroomOptions = uniqueBedrooms;
            updateData.totalUnits = allUnitsCount;
            updateData.availableUnits = availableUnitsCount;
            updateData.launchPrice = minPrice != null
                ? {
                    startingFrom: minPrice,
                    currency: currency || project.launchPrice?.currency || 'AED',
                }
                : updateData.launchPrice || project.launchPrice;
        }

        const updatedProject = await Newprojects.findByIdAndUpdate(
            projectId,
            { $set: updateData },
            { new: true, session }
        );

        await updatedProject.populate([
            { path: 'developer', select: 'name email' },
            { path: 'amenities', select: 'name slug category icon image' },
        ]);

        await recalcDeveloperProjectStats(developerId, session);

        await session.commitTransaction();
        session.endSession();

        void listingSearchCityService
            .reconcilePublishedProjectCity({
                prevCityRaw: prevProjectCityForSearchIndex,
                nextCityRaw: updatedProject.location?.city,
                wasPublished: wasProjectPublishedForSearchIndex,
                isPublished: updatedProject.publishStatus === 'published',
            })
            .catch((err) => {
                logger.error('ListingSearchCity reconcile (project update) failed', { error: err.message });
            });

        if (isSaveAsDraft || updatedProject.publishStatus === 'draft') {
            const draftProgress = calculateDraftProgress(updatedProject);
            if (draftProgress.completedSteps === DRAFT_TOTAL_STEPS) {
                const finalizedProject = await Newprojects.findByIdAndUpdate(
                    updatedProject._id,
                    { $set: { publishStatus: 'unpublished' } },
                    { new: true }
                );
                return success(res, 'Project created successfully', {
                    project: finalizedProject,
                    nextSteps: {
                        message: 'Draft is complete. Project moved to unpublished.',
                        projectId: updatedProject._id,
                        currentStatus: 'unpublished',
                        draftProgress,
                        assignAgenciesUrl: `/api/developer/projects/${updatedProject._id}/assign-agencies`,
                    },
                });
            }
            return success(res, 'Project saved as draft', {
                project: updatedProject,
                nextSteps: {
                    message: draftProgress.message,
                    projectId: updatedProject._id,
                    currentStatus: 'draft',
                    draftProgress,
                },
            });
        }

        if (isFinalizeDraft) {
            return success(res, 'Project created successfully', {
                project: updatedProject,
                nextSteps: {
                    message: 'Project created. Assign agencies to publish.',
                    projectId: updatedProject._id,
                    currentStatus: 'unpublished',
                    assignAgenciesUrl: `/api/developer/projects/${updatedProject._id}/assign-agencies`,
                },
            });
        }

        return success(res, 'Project updated successfully', { project: updatedProject });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        logger.error('Update project failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update project', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/{id}/faqs:
 *   post:
 *     summary: Add FAQ to project (Developer)
 *     description: >
 *       Adds a new FAQ (question/answer pair) to a specific project.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *                 example: "What is the payment plan?"
 *               answer:
 *                 type: string
 *                 example: "The payment plan is 20% down payment, 70% during construction, and 10% on handover."
 *               order:
 *                 type: number
 *                 description: Display order (optional)
 *                 example: 0
 *     responses:
 *       201:
 *         description: FAQ added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (developer does not own project)
 *       404:
 *         description: Project not found
 */
const addFAQ = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const projectId = req.params.id;
        if (!validateObjectId(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid project ID', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findById(projectId).session(session);
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        if (project.developer.toString() !== developerId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to modify this project', 'FORBIDDEN');
        }

        const { question, answer, order } = req.body || {};

        if (!question || !question.trim()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Question is required', 'VALIDATION_ERROR');
        }

        if (!answer || !answer.trim()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Answer is required', 'VALIDATION_ERROR');
        }

        // Initialize FAQs array if it doesn't exist
        if (!project.faqs) {
            project.faqs = [];
        }

        // Determine order (default to end of array)
        const faqOrder = order !== undefined ? toNumberOrNull(order) : project.faqs.length;

        const newFAQ = {
            question: question.trim(),
            answer: answer.trim(),
            order: faqOrder !== null ? faqOrder : project.faqs.length,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        project.faqs.push(newFAQ);
        project.lastModifiedAt = new Date();
        await project.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Return the newly added FAQ
        const addedFAQ = project.faqs[project.faqs.length - 1];

        return success(res, 'FAQ added successfully', addedFAQ, 201);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Add FAQ failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to add FAQ', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/{id}/faqs/{faqId}:
 *   put:
 *     summary: Update FAQ in project (Developer)
 *     description: >
 *       Updates an existing FAQ (question/answer pair) in a specific project.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ObjectId
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "What is the payment plan?"
 *               answer:
 *                 type: string
 *                 example: "The payment plan is 20% down payment, 70% during construction, and 10% on handover."
 *               order:
 *                 type: number
 *                 description: Display order
 *                 example: 0
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (developer does not own project)
 *       404:
 *         description: Project or FAQ not found
 */
const updateFAQ = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const projectId = req.params.id;
        const faqId = req.params.faqId;

        if (!validateObjectId(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid project ID', 'VALIDATION_ERROR');
        }

        if (!validateObjectId(faqId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid FAQ ID', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findById(projectId).session(session);
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        if (project.developer.toString() !== developerId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to modify this project', 'FORBIDDEN');
        }

        if (!project.faqs || project.faqs.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'FAQ not found', 'NOT_FOUND');
        }

        const faqIndex = project.faqs.findIndex((faq) => faq._id.toString() === faqId);
        if (faqIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'FAQ not found', 'NOT_FOUND');
        }

        const { question, answer, order } = req.body || {};

        // Update FAQ fields
        if (question !== undefined) {
            if (!question.trim()) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Question cannot be empty', 'VALIDATION_ERROR');
            }
            project.faqs[faqIndex].question = question.trim();
        }

        if (answer !== undefined) {
            if (!answer.trim()) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Answer cannot be empty', 'VALIDATION_ERROR');
            }
            project.faqs[faqIndex].answer = answer.trim();
        }

        if (order !== undefined) {
            const faqOrder = toNumberOrNull(order);
            if (faqOrder !== null) {
                project.faqs[faqIndex].order = faqOrder;
            }
        }

        project.faqs[faqIndex].updatedAt = new Date();
        project.lastModifiedAt = new Date();
        await project.save({ session });

        await session.commitTransaction();
        session.endSession();

        return success(res, 'FAQ updated successfully', project.faqs[faqIndex]);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Update FAQ failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update FAQ', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/{id}/faqs/{faqId}:
 *   delete:
 *     summary: Delete FAQ from project (Developer)
 *     description: >
 *       Deletes an existing FAQ from a specific project.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ObjectId
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ObjectId
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (developer does not own project)
 *       404:
 *         description: Project or FAQ not found
 */
const deleteFAQ = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;
        if (!developerId) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const projectId = req.params.id;
        const faqId = req.params.faqId;

        if (!validateObjectId(projectId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid project ID', 'VALIDATION_ERROR');
        }

        if (!validateObjectId(faqId)) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 400, 'Invalid FAQ ID', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findById(projectId).session(session);
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        if (project.developer.toString() !== developerId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 403, 'You do not have permission to modify this project', 'FORBIDDEN');
        }

        if (!project.faqs || project.faqs.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'FAQ not found', 'NOT_FOUND');
        }

        const faqIndex = project.faqs.findIndex((faq) => faq._id.toString() === faqId);
        if (faqIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return failure(res, 404, 'FAQ not found', 'NOT_FOUND');
        }

        const deletedFAQ = project.faqs[faqIndex];
        project.faqs.splice(faqIndex, 1);
        project.lastModifiedAt = new Date();
        await project.save({ session });

        await session.commitTransaction();
        session.endSession();

        return success(res, 'FAQ deleted successfully', { deletedFAQ, totalFAQs: project.faqs.length });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Delete FAQ failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to delete FAQ', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/units:
 *   get:
 *     summary: Get project units (Developer)
 *     description: >
 *       Depending on provided query parameters, fetches units data for different screens:
 *       - `layoutId` present: Unit Detail Page
 *       - `allocationId` present: Edit Assignment Screen
 *       - `bulk=true`: Bulk Assign Screen
 *       - None of above: Units List Page
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *       - in: query
 *         name: layoutId
 *         schema:
 *           type: string
 *         description: Detail page - fetches details for this specific layout
 *       - in: query
 *         name: allocationId
 *         schema:
 *           type: string
 *         description: Edit Assignment screen - fetches data scoped to this specific agency allocation
 *       - in: query
 *         name: bulk
 *         schema:
 *           type: string
 *           enum: ['true']
 *         description: Bulk Assign screen - fetches all layouts and units
 *       - in: query
 *         name: assigned
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter layouts by assigned/unassigned units (only for Units List Page)
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Filter layouts by property type ObjectId (only for Units List Page)
 *       - in: query
 *         name: unitStatus
 *         schema:
 *           type: string
 *           enum: [available, reserved, in-progress, follow-up, pre-close, closed]
 *         description: Filter units by status (only for Unit Detail Page)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search layouts by layoutName (only for Units List Page)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Units fetched successfully
 *       400:
 *         description: Validation Error (e.g., missing projectId)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project, Layout, or Allocation not found
 *       500:
 *         description: Server Error
 */
const getProjectUnits = asyncHandler(async (req, res) => {
    try {
        const developerId = req.user?.id || req.user?._id;

        const developer = await Developers.findById(developerId);
        if (!developer) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            layoutId,
            allocationId,
            bulk,
            unitStatus,
            propertyType,
            assigned,
            search,
            page = 1,
            limit = 10
        } = req.query;

        if (!projectId) {
            return failure(res, 400, 'projectId is required', 'VALIDATION_ERROR');
        }
        if (!validateObjectId(projectId)) {
            return failure(res, 400, 'Invalid projectId', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true
        }).lean();

        if (!project) {
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        // Get all active allocations once (used in all cases):
        const allocations = await ProjectAgencyAllocation.find({
            project: projectId,
            status: 'active'
        })
        .populate('agency', 'agencyName profilePicture')
        .lean();

        // Build global assigned unit ID set
        // (unit assigned if ANY agency has it):
        const assignedUnitIdSet = new Set();
        allocations.forEach(alloc => {
            if (alloc.units && Array.isArray(alloc.units)) {
                alloc.units.forEach(uid => {
                    assignedUnitIdSet.add(uid.toString());
                });
            }
        });

        // ─────────────────────────────────────────
        // CASE 1: layoutId present → Unit Detail Page
        // ─────────────────────────────────────────
        if (layoutId) {
            if (!validateObjectId(layoutId)) {
                return failure(res, 400, 'Invalid layoutId', 'VALIDATION_ERROR');
            }

            const layout = await ProjectLayout.findOne({
                _id: layoutId,
                project: projectId,
                isActive: true
            })
            .populate('building', 'buildingName')
            .populate('propertyType', 'name slug')
            .lean();

            if (!layout) {
                return failure(res, 404, 'Layout not found', 'NOT_FOUND');
            }

            // Get ALL units for this layout:
            const allUnits = await ProjectUnit.find({
                layout: layoutId,
                isActive: true
            })
            .select('_id unitId unitNumber status')
            .lean();

            const assignedCount = allUnits.filter(
                u => assignedUnitIdSet.has(u._id.toString())
            ).length;
            const unassignedCount = allUnits.length - assignedCount;

            // ── Assigned Agencies tab ────────────────────────────
            const layoutUnitIdSet = new Set(allUnits.map(u => u._id.toString()));

            const agenciesData = allocations.map(alloc => {
                const agencyUnitsInLayout = (alloc.units || []).filter(
                    uid => layoutUnitIdSet.has(uid.toString())
                );
                
                const agencyUnitDetails = allUnits
                    .filter(u => agencyUnitsInLayout.some(uid => uid.toString() === u._id.toString()))
                    .map(u => ({
                        _id: u._id,
                        unitId: u.unitId,
                        unitNumber: u.unitNumber
                    }));

                return {
                    allocationId: alloc._id,
                    agency: alloc.agency,
                    status: alloc.status,
                    totalUnitsInProject: (alloc.units || []).length,
                    unitsInThisLayout: agencyUnitDetails.length,
                    units: agencyUnitDetails,
                    allocatedAt: alloc.allocatedAt
                };
            }).filter(a => a.unitsInThisLayout > 0);

            // ── Unit status tab ──────────────────────────────────
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
            const skip = (pageNum - 1) * limitNum;

            const statusQuery = { layout: layoutId, isActive: true };
            const validStatuses = ['available', 'reserved', 'in-progress', 'follow-up', 'pre-close', 'closed'];
            
            if (unitStatus && validStatuses.includes(unitStatus)) {
                statusQuery.status = unitStatus;
            }

            const [statusUnits, statusTotal, statusCounts] = await Promise.all([
                ProjectUnit.find(statusQuery)
                    .sort({ unitNumber: 1 })
                    .skip(skip)
                    .limit(limitNum)
                    .select('unitId unitNumber status statusUpdatedAt statusUpdatedBy statusUpdatedByAgency')
                    .lean(),
                ProjectUnit.countDocuments(statusQuery),
                ProjectUnit.aggregate([
                    { $match: { layout: layout._id, isActive: true } },
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ])
            ]);

            const handlingAgentIds = [
                ...new Set(
                    statusUnits
                        .filter((unit) => unit.status !== 'available' && unit.statusUpdatedBy)
                        .map((unit) => unit.statusUpdatedBy.toString())
                )
            ];

            const handlingAgents = handlingAgentIds.length
                ? await Agents.find({ _id: { $in: handlingAgentIds } })
                    .select('_id fullName profilePicture')
                    .lean()
                : [];

            const handlingAgentMap = new Map(
                handlingAgents.map((agent) => [agent._id.toString(), agent])
            );

            // Add isAssigned + assignedAgencies to each status unit:
            const statusUnitsEnriched = statusUnits.map(unit => ({
                _id: unit._id,
                unitId: unit.unitId,
                unitNumber: unit.unitNumber,
                status: unit.status,
                statusUpdatedAt: unit.statusUpdatedAt,
                isAssigned: assignedUnitIdSet.has(unit._id.toString()),
                assignedAgencies: allocations
                    .filter(alloc => alloc.units && alloc.units.some(uid => uid.toString() === unit._id.toString()))
                    .map(alloc => alloc.agency ? {
                        id: alloc.agency._id,
                        agencyName: alloc.agency.agencyName,
                        profilePicture: alloc.agency.profilePicture
                    } : null)
                    .filter(agency => agency !== null),
                handlingAgent: unit.status !== 'available' && unit.statusUpdatedBy
                    ? (() => {
                        const handlingAgent = handlingAgentMap.get(unit.statusUpdatedBy.toString());
                        return handlingAgent
                            ? {
                                id: handlingAgent._id,
                                fullName: handlingAgent.fullName,
                                profilePicture: handlingAgent.profilePicture
                            }
                            : {};
                    })()
                    : {}
            }));

            const statusCountMap = {
                available: 0,
                reserved: 0,
                'in-progress': 0,
                'follow-up': 0,
                'pre-close': 0,
                closed: 0
            };
            
            statusCounts.forEach(s => {
                if (statusCountMap[s._id] !== undefined) {
                    statusCountMap[s._id] = s.count;
                }
            });

            return success(res, 'Unit detail fetched successfully', {
                layout: {
                    _id: layout._id,
                    layoutName: layout.layoutName,
                    building: layout.building ? {
                        id: layout.building._id,
                        name: layout.building.buildingName
                    } : null,
                    propertyType: layout.propertyType,
                    bedrooms: layout.bedrooms,
                    maidBedroom: layout.maidBedroom,
                    bathrooms: layout.bathrooms,
                    areaSqft: layout.areaSqft,
                    areaSqm: layout.areaSqm,
                    startingPrice: layout.startingPrice,
                    floorPlans: layout.floorPlans || [],
                    totalUnits: layout.totalUnits,
                    availableUnits: layout.availableUnits,
                    assignedUnits: assignedCount,
                    unassignedUnits: unassignedCount
                },
                agencies: agenciesData,
                unitStatus: {
                    units: statusUnitsEnriched,
                    counts: statusCountMap,
                    pagination: {
                        total: statusTotal,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(statusTotal / limitNum) || 1
                    }
                }
            }, 200);
        }

        // ─────────────────────────────────────────
        // CASE 2: allocationId present (no layoutId)
        // → Edit Assignment Screen (all layouts)
        // ─────────────────────────────────────────
        if (allocationId) {
            if (!validateObjectId(allocationId)) {
                return failure(res, 400, 'Invalid allocationId', 'VALIDATION_ERROR');
            }

            const allocation = await ProjectAgencyAllocation.findOne({
                _id: allocationId,
                project: projectId,
                status: 'active'
            })
            .populate('agency', 'agencyName profilePicture')
            .lean();

            if (!allocation) {
                return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
            }

            // Scope isAssigned to THIS agency only:
            const scopedAssignedSet = new Set(
                (allocation.units || []).map(u => u.toString())
            );

            // Get all layouts:
            const layouts = await ProjectLayout.find({
                project: projectId,
                isActive: true
            })
            .populate('building', 'buildingName')
            .populate('propertyType', 'name slug')
            .lean();

            const grouped = await Promise.all(
                layouts.map(async (layout) => {
                    const units = await ProjectUnit.find({
                        layout: layout._id,
                        isActive: true
                    })
                    .select('_id unitId unitNumber status')
                    .lean();

                    return {
                        layoutId: layout._id,
                        layoutName: layout.layoutName,
                        building: layout.building ? {
                            id: layout.building._id,
                            name: layout.building.buildingName
                        } : null,
                        propertyType: layout.propertyType,
                        bedrooms: layout.bedrooms,
                        areaSqft: layout.areaSqft,
                        totalUnits: layout.totalUnits,
                        units: units.map(unit => ({
                            _id: unit._id,
                            unitId: unit.unitId,
                            unitNumber: unit.unitNumber,
                            status: unit.status,
                            isAssigned: scopedAssignedSet.has(unit._id.toString())
                        })),
                        floorPlans: layout.floorPlans || [],
                    };
                })
            );

            return success(res, 'Assignment data fetched successfully', {
                agency: allocation.agency,
                allocation: {
                    id: allocation._id,
                    totalUnits: (allocation.units || []).length,
                    allocatedAt: allocation.allocatedAt
                },
                layouts: grouped
            }, 200);
        }

        // ─────────────────────────────────────────
        // CASE 3: bulk=true (no layoutId, no allocationId)
        // → Bulk Assign Screen
        // ALL layouts + units array with isAssigned
        // ─────────────────────────────────────────
        if (bulk === 'true') {
            const layouts = await ProjectLayout.find({
                project: projectId,
                isActive: true
            })
            .populate('building', 'buildingName')
            .populate('propertyType', 'name slug')
            .lean();

            const grouped = await Promise.all(
                layouts.map(async (layout) => {
                    const units = await ProjectUnit.find({
                        layout: layout._id,
                        isActive: true
                    })
                    .select('_id unitId unitNumber status')
                    .lean();

                    const assignedCount = units.filter(
                        u => assignedUnitIdSet.has(u._id.toString())
                    ).length;
                    const unassignedCount = units.length - assignedCount;

                    return {
                        layoutId: layout._id,
                        layoutName: layout.layoutName,
                        building: layout.building ? {
                            id: layout.building._id,
                            name: layout.building.buildingName
                        } : null,
                        propertyType: layout.propertyType,
                        bedrooms: layout.bedrooms,
                        areaSqft: layout.areaSqft,
                        totalUnits: layout.totalUnits,
                        assignedUnits: assignedCount,
                        unassignedUnits: unassignedCount,
                        floorPlans: layout.floorPlans || [],
                        units: units.map(unit => ({
                            _id: unit._id,
                            unitId: unit.unitId,
                            unitNumber: unit.unitNumber,
                            status: unit.status,
                            isAssigned: assignedUnitIdSet.has(unit._id.toString())
                        }))
                    };
                })
            );

            return success(res, 'Bulk assign data fetched successfully', {
                summary: {
                    totalUnits: project.totalUnits || 0,
                    sold: project.soldUnits || 0,
                    remaining: (project.totalUnits || 0) - (project.soldUnits || 0)
                },
                layouts: grouped
            }, 200);
        }

        // ─────────────────────────────────────────
        // CASE 4: no layoutId, no allocationId, no bulk
        // → Units List Page (layout rows with counts only)
        // ─────────────────────────────────────────
        const layoutQuery = {
            project: projectId,
            isActive: true
        };
        
        if (propertyType && validateObjectId(propertyType)) {
            layoutQuery.propertyType = propertyType;
        }
        
        if (search && search.trim()) {
            layoutQuery.layoutName = {
                $regex: search.trim(),
                $options: 'i'
            };
        }

        const allLayouts = await ProjectLayout.find(layoutQuery)
            .populate('building', 'buildingName')
            .populate('propertyType', 'name slug')
            .lean();

        const layoutRows = await Promise.all(
            allLayouts.map(async (layout) => {
                const unitIds = await ProjectUnit.find({
                    layout: layout._id,
                    isActive: true
                }).distinct('_id');

                const assignedCount = unitIds.filter(
                    uid => assignedUnitIdSet.has(uid.toString())
                ).length;

                const unassignedCount = unitIds.length - assignedCount;

                return {
                    layoutId: layout._id,
                    layoutName: layout.layoutName,
                    building: layout.building ? {
                        id: layout.building._id,
                        name: layout.building.buildingName
                    } : null,
                    propertyType: layout.propertyType,
                    bedrooms: layout.bedrooms,
                    areaSqft: layout.areaSqft,
                    totalUnits: layout.totalUnits,
                    floorPlans: layout.floorPlans || [],
                    availableUnits: layout.availableUnits,
                    assignedUnits: assignedCount,
                    unassignedUnits: unassignedCount
                };
            })
        );

        let filteredRows = layoutRows;
        if (assigned === 'true') {
            filteredRows = layoutRows.filter(r => r.assignedUnits > 0);
        }
        if (assigned === 'false') {
            filteredRows = layoutRows.filter(r => r.unassignedUnits > 0);
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;
        const total = filteredRows.length;
        const paginated = filteredRows.slice(skip, skip + limitNum);

        const propertyTypeMap = {};
        layoutRows.forEach(r => {
            const ptId = r.propertyType?._id?.toString();
            const ptName = r.propertyType?.name;
            if (ptId) {
                if (!propertyTypeMap[ptId]) {
                    propertyTypeMap[ptId] = {
                        id: ptId,
                        name: ptName,
                        count: 0
                    };
                }
                propertyTypeMap[ptId].count++;
            }
        });

        return success(res, 'Units fetched successfully', {
            summary: {
                totalUnits: project.totalUnits || 0,
                sold: project.soldUnits || 0,
                remaining: (project.totalUnits || 0) - (project.soldUnits || 0)
            },
            propertyTypeFilters: Object.values(propertyTypeMap),
            layouts: paginated,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        }, 200);

    } catch (error) {
        logger.error('Get project units failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to fetch units', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/assign-agencies:
 *   post:
 *     summary: Bulk assign agencies to a project (Developer)
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - assignments
 *             properties:
 *               projectId:
 *                 type: string
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - agencyId
 *                     - unitIds
 *                   properties:
 *                     agencyId:
 *                       type: string
 *                     unitIds:
 *                       type: array
 *                       items:
 *                         type: string
 *               publish:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agencies assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
const assignAgencies = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

        try {
            const developerId = req.user?.id || req.user?._id;

            const developer = await Developers.findById(developerId).session(session);
            if (!developer) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
            }

            const { projectId, assignments, publish } = req.body;

            // Validate:
            if (!projectId || !validateObjectId(projectId)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
            }
            if (!Array.isArray(assignments) || assignments.length < 1) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'assignments is required (min 1)', 'VALIDATION_ERROR');
            }

            // Normalize duplicate agency entries + dedupe unit ids per agency from payload
            const assignmentMap = {};
            for (const assignment of assignments) {
                if (!assignment.agencyId || !validateObjectId(assignment.agencyId)) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each assignment must have valid agencyId', 'VALIDATION_ERROR');
                }
                if (!Array.isArray(assignment.unitIds) || assignment.unitIds.length < 1) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Each assignment must have unitIds (min 1)', 'VALIDATION_ERROR');
                }
                const invalidUnit = assignment.unitIds.find(id => !validateObjectId(id));
                if (invalidUnit) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, `Invalid unit id: ${invalidUnit}`, 'VALIDATION_ERROR');
                }

                const agencyKey = assignment.agencyId.toString();
                if (!assignmentMap[agencyKey]) {
                    assignmentMap[agencyKey] = new Set();
                }
                assignment.unitIds.forEach((id) => assignmentMap[agencyKey].add(id.toString()));
            }

            const normalizedAssignments = Object.entries(assignmentMap).map(([agencyId, unitSet]) => ({
                agencyId,
                unitIds: Array.from(unitSet)
            }));

            // Verify project belongs to developer:
            const project = await Newprojects.findOne({
                _id: projectId,
                developer: developerId,
                isActive: true
            }).session(session);
            if (!project) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            // Only unpublished or published projects can be assigned:
            if (!['unpublished', 'published'].includes(project.publishStatus)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Project must be unpublished or published to assign agencies', 'VALIDATION_ERROR');
            }

            // Collect all unique agencyIds and unitIds upfront:
            const allAgencyIds = normalizedAssignments.map(a => a.agencyId);
            const requestedUnitIds = [...new Set(normalizedAssignments.flatMap(a => a.unitIds))];

            // Verify all agencies exist:
            const agencies = await Agencies.find({
                _id: { $in: allAgencyIds },
                isActive: true
            }).session(session);
            if (agencies.length !== allAgencyIds.length) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'One or more agencies not found', 'NOT_FOUND');
            }

            // Load existing active allocations for these agencies (upsert behavior)
            const existingAllocations = await ProjectAgencyAllocation.find({
                project: projectId,
                agency: { $in: allAgencyIds },
                status: 'active'
            }).session(session);

            const existingUnitIds = [
                ...new Set(
                    existingAllocations.flatMap((alloc) => (alloc.units || []).map((id) => id.toString()))
                )
            ];

            // Verify all involved units belong to this project:
            const allUnitIds = [...new Set([...requestedUnitIds, ...existingUnitIds])];
            const allUnits = await ProjectUnit.find({
                _id: { $in: allUnitIds },
                project: projectId,
                isActive: true
            }).session(session);
            if (requestedUnitIds.some((id) => !allUnits.find((u) => u._id.toString() === id.toString()))) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'One or more units not found in this project', 'NOT_FOUND');
            }

            // Build unit lookup map for quick access:
            const unitMap = {};
            allUnits.forEach(u => {
                unitMap[u._id.toString()] = u;
            });

            const assignmentSummary = [];

            // For each assignment → upsert allocation + update configs:
            for (const assignment of normalizedAssignments) {
                const agency = agencies.find(a => a._id.toString() === assignment.agencyId.toString());
                const existingAllocation = existingAllocations.find(
                    (alloc) => alloc.agency.toString() === assignment.agencyId.toString()
                );

                const mergedUnitIds = existingAllocation
                    ? [...new Set([...(existingAllocation.units || []).map((id) => id.toString()), ...assignment.unitIds.map((id) => id.toString())])]
                    : [...new Set(assignment.unitIds.map((id) => id.toString()))];

                // Get units for THIS agency only:
                const units = mergedUnitIds.map(id => unitMap[id.toString()]).filter(Boolean);

                // Build layoutSummary for THIS agency's units:
                const layoutMap = {};
                for (const unit of units) {
                    const key = unit.layout.toString();
                    if (!layoutMap[key]) {
                        layoutMap[key] = {
                            layout: unit.layout,
                            building: unit.building || null,
                            propertyType: unit.propertyType,
                            unitsCount: 0
                        };
                    }
                    layoutMap[key].unitsCount++;
                }

                if (existingAllocation) {
                    await ProjectAgencyAllocation.updateOne(
                        { _id: existingAllocation._id },
                        {
                            $set: {
                                units: units.map((u) => u._id),
                                layoutSummary: Object.values(layoutMap),
                                allocatedBy: developerId
                            }
                        },
                        { session }
                    );
                } else {
                    // Create allocation for THIS agency with ITS units:
                    await ProjectAgencyAllocation.create([{
                        project: projectId,
                        agency: agency._id,
                        allocatedBy: developerId,
                        units: units.map((u) => u._id),
                        layoutSummary: Object.values(layoutMap),
                        status: 'active',
                        allocatedAt: new Date()
                    }], { session });
                }

                // Update LeadAssignment per layout:
                const uniqueLayoutIds = [...new Set(units.map(u => u.layout.toString()))];
                for (const layoutId of uniqueLayoutIds) {
                    await LeadAssignment.updateOne(
                        {
                            project: projectId,
                            layout: layoutId,
                            'agencyQueue.agency': { $ne: agency._id }
                        },
                        {
                            $push: {
                                agencyQueue: {
                                    agency: agency._id,
                                    agentQueue: [],
                                    agentPointer: 0,
                                    addedAt: new Date()
                                }
                            }
                        },
                        { session }
                    );
                }

                // Add agency to project authorizedAgencies if not present:
                await Newprojects.updateOne(
                    {
                        _id: projectId,
                        authorizedAgencies: { $ne: agency._id }
                    },
                    { $push: { authorizedAgencies: agency._id } },
                    { session }
                );

                assignmentSummary.push({
                    agencyId: assignment.agencyId,
                    unitsAssigned: units.length
                });
            }

            // Handle publish flag:
            if (publish === true || publish === 'true') {
                const allocationCount = await ProjectAgencyAllocation.countDocuments({
                    project: projectId,
                    status: 'active'
                }).session(session);

                if (allocationCount < 1) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 400, 'Cannot publish: no agency allocations found', 'VALIDATION_ERROR');
                }

                await Newprojects.findByIdAndUpdate(
                    projectId,
                    {
                        $set: {
                            publishStatus: 'published',
                            lastModifiedAt: new Date(),
                            lastModifiedBy: developerId
                        }
                    },
                    { session }
                );
            }

            const didPublish = publish === true || publish === 'true';

            await session.commitTransaction();
            session.endSession();

            if (didPublish && project.location?.city) {
                void listingSearchCityService.bumpProjectCity(project.location.city).catch((err) => {
                    logger.error('ListingSearchCity bump (project publish) failed', { error: err.message });
                });
            }

            // Notify assigned agencies based on their notification preferences.
            const summaryByAgency = assignmentSummary.reduce((acc, item) => {
                acc[item.agencyId.toString()] = item.unitsAssigned;
                return acc;
            }, {});

            void Promise.all(
                normalizedAssignments.map(async (assignment) => {
                    const agency = agencies.find((a) => a._id.toString() === assignment.agencyId.toString());
                    if (!agency) return;
                    try {
                        await notifyAssignedAgency({
                            agency,
                            project,
                            unitsAssigned: summaryByAgency[assignment.agencyId.toString()] || 0,
                        });
                    } catch (notifyError) {
                        logger.error('Failed to notify agency for project assignment', {
                            error: notifyError.message,
                            agencyId: assignment.agencyId,
                            projectId,
                        });
                    }
                }),
            );

            return success(res, 'Agencies assigned successfully', {
                projectId,
                agenciesAssigned: normalizedAssignments.length,
                published: didPublish,
                summary: assignmentSummary
            }, 201);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Assign agencies failed (POST)', { error: error.message, stack: error.stack });
            return failure(res, 500, 'Failed to assign agencies', 'SERVER_ERROR');
        }
});

/**
 * @swagger
 * /developers/projects/assign-agencies:
 *   put:
 *     summary: Edit existing assignment for a single agency
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - allocationId
 *               - unitIds
 *             properties:
 *               projectId:
 *                 type: string
 *               allocationId:
 *                 type: string
 *               unitIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
const updateAgencyAssignment = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

        try {
            const developerId = req.user?.id || req.user?._id;

            const developer = await Developers.findById(developerId).session(session);
            if (!developer) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
            }

            const { projectId, allocationId, unitIds } = req.body;

            // Validate:
            if (!projectId || !validateObjectId(projectId)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
            }
            if (!allocationId || !validateObjectId(allocationId)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Valid allocationId is required', 'VALIDATION_ERROR');
            }
            if (!Array.isArray(unitIds)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'unitIds must be an array', 'VALIDATION_ERROR');
            }

            const invalidUnit = unitIds.find(id => !validateObjectId(id));
            if (invalidUnit) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, `Invalid unit id: ${invalidUnit}`, 'VALIDATION_ERROR');
            }

            // Verify project:
            const project = await Newprojects.findOne({
                _id: projectId,
                developer: developerId,
                isActive: true
            }).session(session);
            if (!project) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            // Get existing allocation:
            const allocation = await ProjectAgencyAllocation.findOne({
                _id: allocationId,
                project: projectId,
                status: 'active'
            }).session(session);
            if (!allocation) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
            }

            // Diff old vs new unit list:
            const oldUnitIds = allocation.units.map(u => u.toString());
            const newUnitIds = unitIds.map(u => u.toString());

            const addedUnitIds = newUnitIds.filter(id => !oldUnitIds.includes(id));
            const removedUnitIds = oldUnitIds.filter(id => !newUnitIds.includes(id));

            // Validate added units belong to this project:
            if (addedUnitIds.length > 0) {
                const addedUnits = await ProjectUnit.find({
                    _id: { $in: addedUnitIds },
                    project: projectId,
                    isActive: true
                }).session(session);
                if (addedUnits.length !== addedUnitIds.length) {
                    await session.abortTransaction();
                    session.endSession();
                    return failure(res, 404, 'One or more new units not found in this project', 'NOT_FOUND');
                }
            }

            // Get old units to find their layouts:
            const oldUnits = await ProjectUnit.find({
                _id: { $in: oldUnitIds },
                isActive: true
            }).session(session);

            // Get new units to rebuild layoutSummary:
            const newUnits = await ProjectUnit.find({
                _id: { $in: newUnitIds },
                isActive: true
            }).session(session);

            // Rebuild layoutSummary from new unit list:
            const layoutMap = {};
            for (const unit of newUnits) {
                const key = unit.layout.toString();
                if (!layoutMap[key]) {
                    layoutMap[key] = {
                        layout: unit.layout,
                        building: unit.building || null,
                        propertyType: unit.propertyType,
                        unitsCount: 0
                    };
                }
                layoutMap[key].unitsCount++;
            }

            // Update allocation record:
            await ProjectAgencyAllocation.findByIdAndUpdate(
                allocationId,
                {
                    $set: {
                        units: newUnitIds,
                        layoutSummary: Object.values(layoutMap)
                    }
                },
                { session }
            );

            // Update LeadAssignment:
            const oldLayoutIds = [...new Set(oldUnits.map(u => u.layout.toString()))];
            const newLayoutIds = [...new Set(newUnits.map(u => u.layout.toString()))];

            const removedLayouts = oldLayoutIds.filter(id => !newLayoutIds.includes(id));
            const addedLayouts = newLayoutIds.filter(id => !oldLayoutIds.includes(id));

            for (const layoutId of removedLayouts) {
                await LeadAssignment.updateOne(
                    { project: projectId, layout: layoutId },
                    {
                        $pull: {
                            agencyQueue: { agency: allocation.agency }
                        }
                    },
                    { session }
                );
            }

            for (const layoutId of addedLayouts) {
                await LeadAssignment.updateOne(
                    {
                        project: projectId,
                        layout: layoutId,
                        'agencyQueue.agency': { $ne: allocation.agency }
                    },
                    {
                        $push: {
                            agencyQueue: {
                                agency: allocation.agency,
                                agentQueue: [],
                                agentPointer: 0,
                                addedAt: new Date()
                            }
                        }
                    },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            const agencyForNotification = await Agencies.findById(allocation.agency)
                .select('agencyName email preferences.notificationSettings fcmTokens')
                .lean();

            if (agencyForNotification) {
                void notifyUpdatedAgencyAssignment({
                    agency: agencyForNotification,
                    project,
                    totalUnits: newUnitIds.length,
                    addedUnits: addedUnitIds.length,
                    removedUnits: removedUnitIds.length,
                }).catch((notifyError) => {
                    logger.error('Failed to notify agency for updated project assignment', {
                        error: notifyError.message,
                        agencyId: allocation.agency,
                        projectId,
                        allocationId,
                    });
                });
            }

            return success(res, 'Assignment updated successfully', {
                allocationId,
                added: addedUnitIds.length,
                removed: removedUnitIds.length,
                total: newUnitIds.length
            }, 200);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Assign agencies failed (PUT)', { error: error.message, stack: error.stack });
            return failure(res, 500, 'Failed to update assignment', 'SERVER_ERROR');
        }
});

/**
 * @swagger
 * /developers/projects/assign-agencies:
 *   delete:
 *     summary: Cancel allocation for a single agency
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - allocationId
 *             properties:
 *               projectId:
 *                 type: string
 *               allocationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Allocation cancelled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
const cancelAgencyAssignment = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

        try {
            const developerId = req.user?.id || req.user?._id;

            const developer = await Developers.findById(developerId).session(session);
            if (!developer) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
            }

            const { projectId, allocationId } = req.body;

            // Validate:
            if (!projectId || !validateObjectId(projectId)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
            }
            if (!allocationId || !validateObjectId(allocationId)) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Valid allocationId is required', 'VALIDATION_ERROR');
            }

            // Verify project:
            const project = await Newprojects.findOne({
                _id: projectId,
                developer: developerId,
                isActive: true
            }).session(session);
            if (!project) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Project not found', 'NOT_FOUND');
            }

            // Get allocation:
            const allocation = await ProjectAgencyAllocation.findOne({
                _id: allocationId,
                project: projectId,
                status: 'active'
            }).session(session);
            if (!allocation) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 404, 'Allocation not found', 'NOT_FOUND');
            }

            // Check no active agent sub-allocation exists:
            const hasAgentAllocation = await ProjectAgentAllocation.findOne({
                project: projectId,
                agency: allocation.agency,
                status: 'active'
            }).session(session);

            if (hasAgentAllocation) {
                await session.abortTransaction();
                session.endSession();
                return failure(res, 400, 'Cannot cancel: this agency has active agent allocations. Remove agent allocations first.', 'VALIDATION_ERROR');
            }

            // Cancel allocation:
            await ProjectAgencyAllocation.findByIdAndUpdate(
                allocationId,
                {
                    $set: {
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancelledReason: 'Cancelled by developer'
                    }
                },
                { session }
            );

            // Remove agency from LeadAssignment agencyQueue for all layouts in this allocation:
            const layoutIds = allocation.layoutSummary.map(ls => ls.layout);
            for (const layoutId of layoutIds) {
                await LeadAssignment.updateOne(
                    { project: projectId, layout: layoutId },
                    {
                        $pull: {
                            agencyQueue: { agency: allocation.agency }
                        }
                    },
                    { session }
                );
            }

            // Remove agency from project.authorizedAgencies ONLY if no other active allocation exists
            const otherActiveAllocation = await ProjectAgencyAllocation.findOne({
                project: projectId,
                agency: allocation.agency,
                status: 'active',
                _id: { $ne: allocationId }
            }).session(session);

            if (!otherActiveAllocation) {
                await Newprojects.updateOne(
                    { _id: projectId },
                    { $pull: { authorizedAgencies: allocation.agency } },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            return success(res, 'Allocation cancelled successfully', {
                allocationId,
                cancelledAt: new Date()
            }, 200);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Assign agencies failed (DELETE)', { error: error.message, stack: error.stack });
            return failure(res, 500, 'Failed to cancel allocation', 'SERVER_ERROR');
        }
});

/**
 * @swagger
 * /developers/projects:
 *   delete:
 *     summary: Permanently delete a draft or unpublished project
 *     description: >
 *       Hard-deletes the project and related layouts, units, buildings, lead assignments,
 *       and agency/agent allocations. Only `draft` and `unpublished` projects are allowed.
 *       Published (active) and sold-out projects are rejected with specific errors.
 *       Blocked if any agency allocation is still `active`.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Project ID to delete
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       400:
 *         description: Validation error (invalid projectId, wrong publish status, or active allocations)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
const deleteProject = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const developerId = req.user?.id || req.user?._id;

        const developer = await Developers.findById(developerId).session(session);
        if (!developer) {
            await session.abortTransaction();
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { projectId } = req.body;

        if (!projectId || !validateObjectId(projectId)) {
            await session.abortTransaction();
            return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true,
        }).session(session);

        if (!project) {
            await session.abortTransaction();
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        const { publishStatus } = project;

        if (publishStatus === 'published') {
            await session.abortTransaction();
            return failure(
                res,
                400,
                'Cannot delete an active (published) project',
                'VALIDATION_ERROR',
            );
        }

        if (publishStatus === 'soldout') {
            await session.abortTransaction();
            return failure(res, 400, 'Cannot delete a sold-out project', 'VALIDATION_ERROR');
        }

        if (!['draft', 'unpublished'].includes(publishStatus)) {
            await session.abortTransaction();
            return failure(
                res,
                400,
                `Only draft or unpublished projects can be deleted (current status: ${publishStatus})`,
                'VALIDATION_ERROR',
            );
        }

        const deleteProjectCityRaw = project.location?.city;

        const hasAllocation = await ProjectAgencyAllocation.findOne({
            project: projectId,
            status: 'active',
        }).session(session);

        if (hasAllocation) {
            await session.abortTransaction();
            return failure(res, 400, 'Cannot delete: project has active agency allocations', 'VALIDATION_ERROR');
        }

        await LeadAssignment.deleteMany({ project: projectId }, { session });
        await ProjectAgentAllocation.deleteMany({ project: projectId }, { session });
        await ProjectAgencyAllocation.deleteMany({ project: projectId }, { session });
        await ProjectUnit.deleteMany({ project: projectId }, { session });
        await ProjectLayout.deleteMany({ project: projectId }, { session });
        await ProjectBuilding.deleteMany({ project: projectId }, { session });
        await Newprojects.findByIdAndDelete(projectId, { session });

        await recalcDeveloperProjectStats(developerId, session);

        await session.commitTransaction();

        void listingSearchCityService
            .onProjectRemovedFromSearch(deleteProjectCityRaw, false)
            .catch((err) => {
                logger.error('ListingSearchCity decrement (project delete) failed', { error: err.message });
            });

        return success(res, 'Project deleted successfully', { projectId }, 200);
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error('Delete project failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to delete project', 'SERVER_ERROR');
    } finally {
        session.endSession();
    }
});

/**
 * @swagger
 * /developers/projects/layout:
 *   put:
 *     summary: Update a project layout
 *     description: Update layout fields (name, areas, bedrooms, bathrooms, starting price, floor plans). totalUnits is immutable.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - layoutId
 *             properties:
 *               projectId:
 *                 type: string
 *               layoutId:
 *                 type: string
 *               layoutName:
 *                 type: string
 *               areaSqm:
 *                 type: number
 *               areaSqft:
 *                 type: number
 *               bedrooms:
 *                 type: number
 *               maidBedroom:
 *                 type: boolean
 *               bathrooms:
 *                 type: number
 *               startingPrice:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   currency:
 *                     type: string
 *                     default: AED
 *               floorPlans:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Layout updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project or layout not found
 *       500:
 *         description: Server error
 */
const updateLayout = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;

        const developer = await Developers.findById(developerId).session(session);
        if (!developer) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            layoutId,
            layoutName,
            areaSqm,
            areaSqft,
            bedrooms,
            maidBedroom,
            bathrooms,
            startingPrice,
            floorPlans
        } = req.body;

        if (!projectId || !validateObjectId(projectId)) {
            return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
        }
        if (!layoutId || !validateObjectId(layoutId)) {
            return failure(res, 400, 'Valid layoutId is required', 'VALIDATION_ERROR');
        }

        // Verify project belongs to developer:
        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true
        }).session(session);

        if (!project) {
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        // Get layout:
        const layout = await ProjectLayout.findOne({
            _id: layoutId,
            project: projectId,
            isActive: true
        }).session(session);

        if (!layout) {
            return failure(res, 404, 'Layout not found', 'NOT_FOUND');
        }

        // Validate provided fields:
        if (layoutName !== undefined) {
            if (!String(layoutName).trim()) {
                return failure(res, 400, 'layoutName cannot be empty', 'VALIDATION_ERROR');
            }
        }
        if (areaSqm !== undefined) {
            const val = toNumberOrNull(areaSqm);
            if (val === null || val <= 0) {
                return failure(res, 400, 'areaSqm must be a positive number', 'VALIDATION_ERROR');
            }
        }
        if (areaSqft !== undefined) {
            const val = toNumberOrNull(areaSqft);
            if (val === null || val <= 0) {
                return failure(res, 400, 'areaSqft must be a positive number', 'VALIDATION_ERROR');
            }
        }
        if (bedrooms !== undefined) {
            const val = toNumberOrNull(bedrooms);
            if (val === null || val < 0) {
                return failure(res, 400, 'bedrooms must be >= 0', 'VALIDATION_ERROR');
            }
        }
        if (bathrooms !== undefined) {
            const val = toNumberOrNull(bathrooms);
            if (val === null || val < 0) {
                return failure(res, 400, 'bathrooms must be >= 0', 'VALIDATION_ERROR');
            }
        }
        if (startingPrice !== undefined) {
            const amt = toNumberOrNull(startingPrice?.amount);
            if (amt === null || amt <= 0) {
                return failure(res, 400, 'startingPrice.amount must be positive', 'VALIDATION_ERROR');
            }
        }

        // Build update object — only provided fields:
        const updateData = {};
        if (layoutName !== undefined) updateData.layoutName = String(layoutName).trim();
        if (areaSqm !== undefined) updateData.areaSqm = toNumberOrNull(areaSqm);
        if (areaSqft !== undefined) updateData.areaSqft = toNumberOrNull(areaSqft);
        if (bedrooms !== undefined) updateData.bedrooms = toNumberOrNull(bedrooms);
        if (maidBedroom !== undefined) updateData.maidBedroom = Boolean(maidBedroom);
        if (bathrooms !== undefined) updateData.bathrooms = toNumberOrNull(bathrooms);
        if (startingPrice !== undefined) {
            updateData.startingPrice = {
                amount: toNumberOrNull(startingPrice.amount),
                currency: startingPrice.currency || 'AED'
            };
        }
        if (floorPlans !== undefined) updateData.floorPlans = normalizeArray(floorPlans);

        await ProjectLayout.findByIdAndUpdate(
            layoutId,
            { $set: updateData },
            { session }
        );

        // Recalculate NewProject cached fields:
        const allActiveLayouts = await ProjectLayout.find({
            project: projectId,
            isActive: true
        }).session(session);

        const uniquePropertyTypes = [
            ...new Set(allActiveLayouts.map(l => l.propertyType.toString()))
        ];
        const uniqueBedrooms = [
            ...new Set(allActiveLayouts.map(l => l.bedrooms))
        ].sort((a, b) => a - b);

        const prices = allActiveLayouts
            .map(l => l.startingPrice?.amount)
            .filter(p => p != null);
        const minPrice = prices.length > 0
            ? Math.min(...prices)
            : project.launchPrice?.startingFrom;

        await Newprojects.findByIdAndUpdate(
            projectId,
            {
                $set: {
                    propertyTypes: uniquePropertyTypes,
                    bedroomOptions: uniqueBedrooms,
                    'launchPrice.startingFrom': minPrice,
                    lastModifiedAt: new Date(),
                    lastModifiedBy: developerId
                }
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return success(res, 'Layout updated successfully', { layoutId, projectId }, 200);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Update layout failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update layout', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/layout:
 *   delete:
 *     summary: Delete a project layout (soft delete)
 *     description: >
 *       Soft-deletes a layout and its units. Not allowed if it is the only layout
 *       or if any of its units are allocated to agencies.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - layoutId
 *             properties:
 *               projectId:
 *                 type: string
 *               layoutId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Layout deleted successfully
 *       400:
 *         description: Validation error (only layout, or units allocated)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project or layout not found
 *       500:
 *         description: Server error
 */
const deleteLayout = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;

        const developer = await Developers.findById(developerId).session(session);
        if (!developer) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { projectId, layoutId } = req.body;

        if (!projectId || !validateObjectId(projectId)) {
            return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
        }
        if (!layoutId || !validateObjectId(layoutId)) {
            return failure(res, 400, 'Valid layoutId is required', 'VALIDATION_ERROR');
        }

        // Verify project belongs to developer:
        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true
        }).session(session);

        if (!project) {
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        // Get layout:
        const layout = await ProjectLayout.findOne({
            _id: layoutId,
            project: projectId,
            isActive: true
        }).session(session);

        if (!layout) {
            return failure(res, 404, 'Layout not found', 'NOT_FOUND');
        }

        // Cannot delete if last layout in project:
        const layoutCount = await ProjectLayout.countDocuments({
            project: projectId,
            isActive: true
        }).session(session);

        if (layoutCount <= 1) {
            return failure(res, 400, 'Cannot delete the only layout in a project', 'VALIDATION_ERROR');
        }

        // Check if any unit of this layout is allocated:
        const unitIds = await ProjectUnit.find({
            layout: layoutId,
            isActive: true
        }).distinct('_id').session(session);

        const hasAllocation = await ProjectAgencyAllocation.findOne({
            project: projectId,
            units: { $in: unitIds },
            status: 'active'
        }).session(session);

        if (hasAllocation) {
            return failure(res, 400, `Layout "${layout.layoutName}" cannot be deleted because its units have been allocated to agencies`, 'VALIDATION_ERROR');
        }

        // Soft delete layout:
        await ProjectLayout.findByIdAndUpdate(
            layoutId,
            { $set: { isActive: false } },
            { session }
        );

        // Soft delete all units of this layout:
        await ProjectUnit.updateMany(
            { layout: layoutId },
            { $set: { isActive: false } },
            { session }
        );

        // Delete LeadAssignmentConfig for this layout:
        await LeadAssignment.deleteOne(
            { layout: layoutId },
            { session }
        );

        // Recalculate NewProject cached fields:
        const allActiveLayouts = await ProjectLayout.find({
            project: projectId,
            isActive: true
        }).session(session);

        const allActiveUnitsCount = await ProjectUnit.countDocuments({
            project: projectId,
            isActive: true
        }).session(session);

        const availableUnitsCount = await ProjectUnit.countDocuments({
            project: projectId,
            isActive: true,
            status: 'available'
        }).session(session);

        const uniquePropertyTypes = [
            ...new Set(allActiveLayouts.map(l => l.propertyType.toString()))
        ];
        const uniqueBedrooms = [
            ...new Set(allActiveLayouts.map(l => l.bedrooms))
        ].sort((a, b) => a - b);

        const prices = allActiveLayouts
            .map(l => l.startingPrice?.amount)
            .filter(p => p != null);
        const minPrice = prices.length > 0
            ? Math.min(...prices)
            : project.launchPrice?.startingFrom;

        await Newprojects.findByIdAndUpdate(
            projectId,
            {
                $set: {
                    propertyTypes: uniquePropertyTypes,
                    bedroomOptions: uniqueBedrooms,
                    totalUnits: allActiveUnitsCount,
                    availableUnits: availableUnitsCount,
                    'launchPrice.startingFrom': minPrice,
                    lastModifiedAt: new Date(),
                    lastModifiedBy: developerId
                }
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return success(res, 'Layout deleted successfully', { layoutId, projectId }, 200);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Delete layout failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to delete layout', 'SERVER_ERROR');
    }
});

/**
 * @swagger
 * /developers/projects/progress:
 *   put:
 *     summary: Update project progress or mark as sold out
 *     description: >
 *       For published projects only. Set markAsSoldOut true to set publishStatus to soldout (irreversible).
 *       Otherwise provide progressStatus and projectAnnouncement; expectedCompletionDate is optional.
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *               progressStatus:
 *                 type: string
 *                 enum: [project-announced, booking-open, construction-started, finished]
 *                 description: Required when updating progress (omit for timeline-only update)
 *               projectAnnouncement:
 *                 type: string
 *                 format: date-time
 *                 description: Required when progressStatus is provided
 *               expectedCompletionDate:
 *                 type: string
 *                 format: date-time
 *               expectedCompletion:
 *                 type: string
 *                 format: date-time
 *                 description: Alias for expectedCompletionDate
 *               bookingOpen:
 *                 type: string
 *                 format: date-time
 *               constructionStarted:
 *                 type: string
 *                 format: date-time
 *               launchDate:
 *                 type: string
 *                 format: date-time
 *               deliveryDate:
 *                 type: string
 *                 format: date-time
 *               constructionProgress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               completionStatus:
 *                 type: string
 *                 enum: [off-plan, under-construction, ready]
 *               markAsSoldOut:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Progress updated or project marked as sold out
 *       400:
 *         description: Validation error or project not published
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
const updateProjectProgress = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const developerId = req.user?.id || req.user?._id;

        const developer = await Developers.findById(developerId).session(session);
        if (!developer) {
            return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
        }

        const {
            projectId,
            progressStatus,
            projectAnnouncement,
            expectedCompletionDate,
            expectedCompletion,
            bookingOpen,
            constructionStarted,
            launchDate,
            deliveryDate,
            constructionProgress,
            completionStatus,
            markAsSoldOut
        } = req.body || {};

        if (!projectId || !validateObjectId(projectId)) {
            return failure(res, 400, 'Valid projectId is required', 'VALIDATION_ERROR');
        }

        const project = await Newprojects.findOne({
            _id: projectId,
            developer: developerId,
            isActive: true
        }).session(session);

        if (!project) {
            return failure(res, 404, 'Project not found', 'NOT_FOUND');
        }

        if (project.publishStatus !== 'published') {
            return failure(res, 400, 'Only active (published) projects can be updated', 'VALIDATION_ERROR');
        }

        const updateData = {
            lastModifiedAt: new Date(),
            lastModifiedBy: developerId
        };

        if (markAsSoldOut === true || markAsSoldOut === 'true') {
            updateData.publishStatus = 'soldout';

            await Newprojects.findByIdAndUpdate(
                projectId,
                { $set: updateData },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            return success(res, 'Project marked as sold out', {
                projectId,
                publishStatus: 'soldout'
            }, 200);
        }

        const hasProgressFields = progressStatus != null && progressStatus !== '';
        const hasTimelineFields = bookingOpen !== undefined || constructionStarted !== undefined ||
            launchDate !== undefined || deliveryDate !== undefined ||
            constructionProgress !== undefined || completionStatus !== undefined ||
            projectAnnouncement !== undefined || expectedCompletionDate !== undefined || expectedCompletion !== undefined;

        if (!hasProgressFields && !hasTimelineFields) {
            return failure(res, 400, 'Provide progressStatus and projectAnnouncement, or at least one timeline field (bookingOpen, constructionStarted, launchDate, deliveryDate, expectedCompletionDate, constructionProgress, completionStatus)', 'VALIDATION_ERROR');
        }

        if (hasProgressFields) {
            const validProgressStatuses = [
                'project-announced',
                'booking-open',
                'construction-started',
                'finished'
            ];
            if (!validProgressStatuses.includes(progressStatus)) {
                return failure(res, 400, `progressStatus must be one of: ${validProgressStatuses.join(', ')}`, 'VALIDATION_ERROR');
            }
            if (!projectAnnouncement) {
                return failure(res, 400, 'projectAnnouncement date is required when progressStatus is provided', 'VALIDATION_ERROR');
            }
            const announcementDate = new Date(projectAnnouncement);
            if (Number.isNaN(announcementDate.getTime())) {
                return failure(res, 400, 'projectAnnouncement must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.progressStatus = progressStatus;
            updateData.projectAnnouncement = announcementDate;
        }

        const finalExpectedCompletion = expectedCompletion ?? expectedCompletionDate;
        if (finalExpectedCompletion !== undefined && finalExpectedCompletion !== null && finalExpectedCompletion !== '') {
            const completionDate = new Date(finalExpectedCompletion);
            if (Number.isNaN(completionDate.getTime())) {
                return failure(res, 400, 'expectedCompletionDate must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.expectedCompletionDate = completionDate;
        } else if (finalExpectedCompletion === null || finalExpectedCompletion === '') {
            updateData.expectedCompletionDate = null;
        }

        if (bookingOpen !== undefined) {
            const d = bookingOpen ? new Date(bookingOpen) : null;
            if (d && Number.isNaN(d.getTime())) {
                return failure(res, 400, 'bookingOpen must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.bookingOpen = d;
        }
        if (constructionStarted !== undefined) {
            const d = constructionStarted ? new Date(constructionStarted) : null;
            if (d && Number.isNaN(d.getTime())) {
                return failure(res, 400, 'constructionStarted must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.constructionStarted = d;
        }
        if (launchDate !== undefined) {
            const d = launchDate ? new Date(launchDate) : null;
            if (d && Number.isNaN(d.getTime())) {
                return failure(res, 400, 'launchDate must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.launchDate = d;
        }
        if (deliveryDate !== undefined) {
            const d = deliveryDate ? new Date(deliveryDate) : null;
            if (d && Number.isNaN(d.getTime())) {
                return failure(res, 400, 'deliveryDate must be a valid date', 'VALIDATION_ERROR');
            }
            updateData.deliveryDate = d;
        }
        if (constructionProgress !== undefined) {
            const progress = toNumberOrNull(constructionProgress);
            if (progress !== null) {
                if (progress < 0 || progress > 100) {
                    return failure(res, 400, 'Construction progress must be between 0 and 100', 'VALIDATION_ERROR');
                }
                updateData.constructionProgress = progress;
                if (progress === 0) updateData.completionStatus = 'off-plan';
                else if (progress > 0 && progress < 100) updateData.completionStatus = 'under-construction';
                else if (progress === 100) updateData.completionStatus = 'ready';
            } else {
                return failure(res, 400, 'Invalid construction progress value', 'VALIDATION_ERROR');
            }
        }
        if (completionStatus !== undefined) {
            const validStatuses = ['off-plan', 'ready', 'under-construction'];
            if (validStatuses.includes(completionStatus)) {
                updateData.completionStatus = completionStatus;
            } else {
                return failure(res, 400, `completionStatus must be one of: ${validStatuses.join(', ')}`, 'VALIDATION_ERROR');
            }
        }

        await Newprojects.findByIdAndUpdate(
            projectId,
            { $set: updateData },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        const responsePayload = {
            projectId,
            publishStatus: project.publishStatus,
            ...(updateData.progressStatus !== undefined && { progressStatus: updateData.progressStatus }),
            ...(updateData.projectAnnouncement !== undefined && { projectAnnouncement: updateData.projectAnnouncement }),
            ...(updateData.expectedCompletionDate !== undefined && { expectedCompletionDate: updateData.expectedCompletionDate }),
            ...(updateData.bookingOpen !== undefined && { bookingOpen: updateData.bookingOpen }),
            ...(updateData.constructionStarted !== undefined && { constructionStarted: updateData.constructionStarted }),
            ...(updateData.launchDate !== undefined && { launchDate: updateData.launchDate }),
            ...(updateData.deliveryDate !== undefined && { deliveryDate: updateData.deliveryDate }),
            ...(updateData.constructionProgress !== undefined && { constructionProgress: updateData.constructionProgress }),
            ...(updateData.completionStatus !== undefined && { completionStatus: updateData.completionStatus })
        };
        return success(res, 'Project progress updated successfully', responsePayload, 200);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        logger.error('Update project progress failed', { error: error.message, stack: error.stack });
        return failure(res, 500, 'Failed to update project progress', 'SERVER_ERROR');
    }
});

module.exports = {
    createProject,
    uploadProjectMedia,
    getDeveloperProjects,
    getProjectUnits,
    updateProject,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    assignAgencies,
    updateAgencyAssignment,
    cancelAgencyAssignment,
    deleteProject,
    updateLayout,
    deleteLayout,
    updateProjectProgress
};

