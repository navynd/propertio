const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Agent = require('../../models/agentsModel');
const Agency = require('../../models/agenciesModel');
const Properties = require('../../models/propertiesModal');
const JobTitles = require('../../models/jobTitlesModel');
const { success, failure, formatPhoneNumber, sanitizeAgent, isProfilelessProfilePicture } = require('../../utils/helpers');
const uploadService = require('../../services/uploadService');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const validateObjectId = (id) => id && Types.ObjectId.isValid(id);

const getAgencyId = (req) => req.user?.id || req.user?._id;

const ensureAgentBelongsToAgency = async (agentId, agencyId) => {
    const agent = await Agent.findOne({ _id: agentId, agency: agencyId });
    return agent;
};

/**
 * @swagger
 * /agency/agents:
 *   get:
 *     summary: Get agents for the authenticated agency
 *     description: >
 *       Returns a paginated list of agents belonging to the authenticated agency.
 *       Tabs: `all`, `approval-requests`, `agent`, `superagent`. Optional `isActive` narrows to verified agents only.
 *       Optional `sortBy`: `active`, `inactive`, `pending` (approval queue), `rejected` (declined invitation) — overrides tab invitation / `isActive` for the list.
 *       When `isDropdown=true`, returns only active agency-verified agents as `{ id, name }`; **all other query params are ignored**.
 *     tags: [Agency, Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isDropdown
 *         schema:
 *           type: boolean
 *         description: >
 *           If `true` (or `1`), dropdown mode: agents for this agency with `isVerified: true`, `isActive: true`,
 *           and not `invitationStatus: pending`. Optional query `agentType` narrows to `agent` or `superagent` only;
 *           omit it to include both. Response is `{ agents: [{ id, name, agentType }] }` only.
 *           Tab, isActive, search, page, and limit have **no effect** (except `agentType` as above).
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [all, approval-requests, agent, superagent]
 *           default: all
 *         description: >
 *           `all` — non–pending-invite agents (excludes `invitationStatus: pending`).
 *           `approval-requests` — accepted invitation, not yet agency-verified.
 *           `agent` / `superagent` — filter by that role (same as `agentType` in DB); non-pending only.
 *           Ignored when `isDropdown=true`.
 *       - in: query
 *         name: agentType
 *         schema:
 *           type: string
 *           enum: [agent, superagent]
 *         description: >
 *           Optional. Filters by `agentType` in the database. When set, this takes precedence over
 *           `tab=agent` / `tab=superagent` for role filtering (tab still controls approval vs normal lists).
 *           Ignored if the value is not `agent` or `superagent`. Ignored when `isDropdown=true`.
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: >
 *           Optional. When set, keeps only agents with **both** `isVerified: true` and this `isActive` value.
 *           Ignored when `tab=approval-requests` (those rows are never verified). Ignored when `isDropdown=true`.
 *           Ignored when `sortBy` is set (sortBy drives active/inactive/pending/rejected instead).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending, rejected]
 *         description: >
 *           Optional status bucket for the list. When set, overrides `tab` invitation / `isActive` narrowing
 *           (role filters from `tab` / `agentType` still apply). `active` — verified and active; `inactive` — verified and inactive;
 *           `pending` — accepted invitation, not yet agency-verified; `rejected` — invitation declined (stored as `declined`).
 *           Aliases: `pending-approval`, `approval-pending` → pending; `declined` → rejected.
 *           Ignored when `isDropdown=true`.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email. Ignored when `isDropdown=true`.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Ignored when `isDropdown=true`.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Ignored when `isDropdown=true`.
 *     responses:
 *       200:
 *         description: Agents fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agency not found
 */
const normalizeListTab = (raw) => {
    let t = String(raw || 'all')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-');
    if (t === 'approval-request') t = 'approval-requests';
    const allowed = new Set(['all', 'approval-requests', 'agent', 'superagent']);
    return allowed.has(t) ? t : 'all';
};

const normalizeAgentTypeQuery = (raw) => {
    const v = String(raw || '')
        .toLowerCase()
        .trim();
    if (v === 'agent' || v === 'superagent') return v;
    return null;
};

/** Optional list bucket: active / inactive / pending approval / rejected (declined). */
const normalizeListSortBy = (raw) => {
    let s = String(raw || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-');
    if (s === 'approval-pending' || s === 'pending-approval') s = 'pending';
    if (s === 'declined') s = 'rejected';
    const allowed = new Set(['active', 'inactive', 'pending', 'rejected']);
    return allowed.has(s) ? s : null;
};

const parseIsDropdown = (raw) => {
    if (raw === undefined || raw === '') return false;
    const s = String(raw).toLowerCase().trim();
    return s === 'true' || s === '1';
};

/** Safety cap for dropdown list length per agency. */
const AGENCY_AGENTS_DROPDOWN_MAX = 5000;

const listAgents = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const agency = await Agency.findById(agencyId);
    if (!agency) {
        return failure(res, 404, 'Agency not found', 'NOT_FOUND');
    }

    if (parseIsDropdown(req.query.isDropdown)) {
        const agencyOid = new Types.ObjectId(agencyId);
        const dropdownAgentType = normalizeAgentTypeQuery(req.query.agentType);
        const dropdownFilter = {
            agency: agencyOid,
            isVerified: true,
            isActive: true,
            invitationStatus: { $ne: 'pending' },
        };
        if (dropdownAgentType) {
            dropdownFilter.agentType = dropdownAgentType;
        }
        const rows = await Agent.find(dropdownFilter)
            .sort({ fullName: 1 })
            .limit(AGENCY_AGENTS_DROPDOWN_MAX)
            .select('fullName agentType profilePicture')
            .lean();

        const agents = rows.map((a) => ({
            id: a._id,
            name: a.fullName || '',
            agentType: a.agentType || 'agent',
            profilePicture: a.profilePicture || 'profileless.png',
        }));

        return success(res, 'Agents fetched successfully', { agents });
    }

    const { isActive, search, page = 1, limit = 20, sortBy: sortByRaw } = req.query;
    const tab = normalizeListTab(req.query.tab);
    const sortBy = normalizeListSortBy(sortByRaw);
    const queryAgentType = normalizeAgentTypeQuery(req.query.agentType);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const agencyOid = new Types.ObjectId(agencyId);
    const filter = { agency: agencyOid };

    if (queryAgentType) {
        filter.agentType = queryAgentType;
    } else if (tab === 'agent') {
        filter.agentType = 'agent';
    } else if (tab === 'superagent') {
        filter.agentType = 'superagent';
    }

    if (sortBy) {
        if (sortBy === 'active') {
            filter.invitationStatus = { $ne: 'pending' };
            filter.isVerified = true;
            filter.isActive = true;
        } else if (sortBy === 'inactive') {
            filter.invitationStatus = { $ne: 'pending' };
            filter.isVerified = true;
            filter.isActive = false;
        } else if (sortBy === 'pending') {
            filter.invitationStatus = 'accepted';
            filter.isVerified = false;
        } else if (sortBy === 'rejected') {
            filter.invitationStatus = 'declined';
        }
    } else if (tab === 'approval-requests') {
        filter.invitationStatus = 'accepted';
        filter.isVerified = false;
    } else {
        filter.invitationStatus = { $ne: 'pending' };
    }

    if (!sortBy && isActive !== undefined && isActive !== '' && tab !== 'approval-requests') {
        const active = String(isActive).toLowerCase() === 'true';
        filter.isVerified = true;
        filter.isActive = active;
    }
    if (search && String(search).trim()) {
        const searchStr = String(search).trim();
        filter.$or = [
            { fullName: { $regex: searchStr, $options: 'i' } },
            { email: { $regex: searchStr, $options: 'i' } },
        ];
    }

    const baseAgency = { agency: agencyOid };

    const [agents, total, countActive, countInactive, countApprovalPending, countRejected, countTotalAll, countRoleAgent, countRoleSuperagent] =
        await Promise.all([
            Agent.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select(
                    'fullName email phoneNumber profilePicture specialization agentType isActive invitationStatus isVerified createdAt',
                )
                .populate('specialization', 'title')
                .populate('languages', 'name code')
                .populate('nationality', 'name')
                .lean(),
            Agent.countDocuments(filter),
            Agent.countDocuments({
                ...baseAgency,
                invitationStatus: { $ne: 'pending' },
                isVerified: true,
                isActive: true,
            }),
            Agent.countDocuments({
                ...baseAgency,
                invitationStatus: { $ne: 'pending' },
                isVerified: true,
                isActive: false,
            }),
            Agent.countDocuments({
                ...baseAgency,
                invitationStatus: 'accepted',
                isVerified: false,
            }),
            Agent.countDocuments({ ...baseAgency, invitationStatus: 'declined' }),
            Agent.countDocuments({ ...baseAgency, invitationStatus: { $ne: 'pending' } }),
            Agent.countDocuments({ ...baseAgency, agentType: 'agent', invitationStatus: { $ne: 'pending' } }),
            Agent.countDocuments({ ...baseAgency, agentType: 'superagent', invitationStatus: { $ne: 'pending' } }),
        ]);

    const listingsCounts = await Properties.aggregate([
        { $match: { agency: new Types.ObjectId(agencyId) } },
        { $group: { _id: '$agent', count: { $sum: 1 } } },
    ]);
    const countByAgent = Object.fromEntries(listingsCounts.map((r) => [r._id.toString(), r.count]));

    const agentsWithCount = agents.map((a) => ({
        ...sanitizeAgent(a),
        listingsCount: countByAgent[a._id.toString()] ?? 0,
    }));

    return success(res, 'Agents fetched successfully', {
        agents: agentsWithCount,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1,
        },
        counts: {
            total,
            allAgents: countTotalAll,
            active: countActive,
            inactive: countInactive,
            approvalPending: countApprovalPending,
            rejected: countRejected,
            byAgentType: {
                agent: countRoleAgent,
                superagent: countRoleSuperagent,
            },
        },
        tab,
        sortBy: sortBy || null,
    });
});

/**
 * @swagger
 * /agency/agents/{id}:
 *   get:
 *     summary: Get single agent with statistics and listings
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *       - in: query
 *         name: listPage
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for listings under this agent.
 *       - in: query
 *         name: listLimit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Page size for listings.
 *     responses:
 *       200:
 *         description: Agent detail fetched successfully
 *       400:
 *         description: Invalid agent ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found (includes invite-not-accepted `invitationStatus: pending`)
 */
const getAgentById = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { id } = req.params;
    if (!validateObjectId(id)) {
        return failure(res, 400, 'Invalid agent ID', 'VALIDATION_ERROR');
    }

    const agent = await Agent.findOne({ _id: id, agency: agencyId })
        .populate('specialization', 'title')
        .populate('languages', 'name code')
        .populate('nationality', 'name');
    if (!agent) {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }
    if (String(agent.invitationStatus || '').toLowerCase() === 'pending') {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const listPage = Math.max(parseInt(req.query.listPage, 10) || 1, 1);
    const listLimit = Math.min(Math.max(parseInt(req.query.listLimit, 10) || 10, 1), 50);
    const listSkip = (listPage - 1) * listLimit;

    const propFilter = { agent: id, agency: agencyId };
    const [listings, listTotal, stats] = await Promise.all([
        Properties.find(propFilter)
            .sort({ isFeatured: -1, publishedAt: -1 })
            .skip(listSkip)
            .limit(listLimit)
            .populate('listingType', 'name slug transaction category')
            .populate('propertyType', 'name slug')
            .select('title price currency status featured location bedrooms bathrooms listingType propertyType images')
            .lean(),
        Properties.countDocuments(propFilter),
        Properties.aggregate([
            { $match: { agent: new Types.ObjectId(id), agency: new Types.ObjectId(agencyId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    const statusCounts = Object.fromEntries(stats.map((s) => [s._id, s.count]));
    const statistics = {
        totalListings: listTotal,
        activeListings: statusCounts.active ?? 0,
        inactiveListings: statusCounts.inactive ?? 0,
        soldListings: statusCounts.sold ?? 0,
        rentedListings: statusCounts.rented ?? 0,
        pendingListings: statusCounts.pending ?? 0,
    };

    const listingItems = listings.map((p) => {
        const primaryImage = (p.images && p.images.find((i) => i.isPrimary)) || (p.images && p.images[0]);
        return {
            _id: p._id,
            title: p.title,
            propertyFor: p.listingType ? (p.listingType.transaction && p.listingType.category
                ? `${p.listingType.transaction}${p.listingType.category === 'commercial' ? ' (Commercial)' : ''}`.trim()
                : p.listingType.name) : null,
            beds: p.bedrooms,
            baths: p.bathrooms,
            price: p.price,
            currency: p.currency || 'AED',
            status: p.status,
            featured: p.featured?.isFeatured || p.isFeatured || false,
            location: p.location ? [p.location.city, p.location.zone].filter(Boolean).join(', ') : null,
            thumbnail: primaryImage?.url || null,
        };
    });

    const safeAgent = sanitizeAgent(agent);

    return success(res, 'Agent fetched successfully', {
        agent: safeAgent,
        statistics,
        listings: {
            items: listingItems,
            pagination: {
                page: listPage,
                limit: listLimit,
                total: listTotal,
                pages: Math.ceil(listTotal / listLimit) || 1,
            },
        },
    });
});

/**
 * @swagger
 * /agency/agents/{id}:
 *   put:
 *     summary: Update agent profile or approve agent
 *     description: >
 *       Updates general agent details (name, contact, job title, languages, etc.)
 *       and can also approve/verify the agent when `approve` or `isVerified` is true.
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               specialization:
 *                 type: string
 *                 description: Job title ObjectId (ref JobTitles).
 *               agentJobRole:
 *                 type: string
 *                 description: Alias for specialization (job title ObjectId).
 *               agentType:
 *                 type: string
 *                 enum: [agent, superagent]
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               experience:
 *                 type: number
 *               brokerLicenseNumber:
 *                 type: string
 *               nationality:
 *                 type: string
 *                 description: Country ObjectId.
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Language ObjectIds.
 *               description:
 *                 type: string
 *               aboutMe:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               approve:
 *                 type: boolean
 *                 description: Set true to approve/verify the agent.
 *               isVerified:
 *                 type: boolean
 *                 description: Alternative flag to approve/verify the agent.
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent or related resource not found
 */
const updateAgent = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { id } = req.params;
    if (!validateObjectId(id)) {
        return failure(res, 400, 'Invalid agent ID', 'VALIDATION_ERROR');
    }

    const agent = await ensureAgentBelongsToAgency(id, agencyId);
    if (!agent) {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const {
        fullName,
        specialization,
        agentJobRole,
        agentType,
        phoneNumber,
        email,
        experience,
        brokerLicenseNumber,
        nationality,
        languages,
        description,
        aboutMe,
        linkedinUrl,
        isActive,
        approve,
        isVerified,
    } = req.body || {};

    if (fullName !== undefined) agent.fullName = fullName;

    const specializationId = specialization !== undefined ? specialization : agentJobRole;
    if (specializationId !== undefined) {
        if (!validateObjectId(specializationId)) {
            return failure(res, 400, 'Invalid specialization (job title) id', 'VALIDATION_ERROR');
        }
        const jobExists = await JobTitles.exists({ _id: specializationId, isActive: true });
        if (!jobExists) {
            return failure(res, 404, 'Job title not found', 'NOT_FOUND');
        }
        agent.specialization = specializationId;
    }
    if (agentType !== undefined) {
        if (!['agent', 'superagent'].includes(String(agentType).toLowerCase())) {
            return failure(res, 400, 'Invalid agentType', 'VALIDATION_ERROR');
        }
        agent.agentType = String(agentType).toLowerCase().replace('-', '');
    }
    if (phoneNumber !== undefined) agent.phoneNumber = formatPhoneNumber(phoneNumber) || agent.phoneNumber;
    if (email !== undefined) agent.email = String(email).trim().toLowerCase();
    if (experience !== undefined) {
        const exp = Number(experience);
        agent.experience = Number.isFinite(exp) ? exp : agent.experience;
    }
    if (brokerLicenseNumber !== undefined) agent.brokerLicenseNumber = brokerLicenseNumber;
    if (nationality !== undefined) {
        if (!validateObjectId(nationality)) {
            return failure(res, 400, 'Invalid nationality id', 'VALIDATION_ERROR');
        }
        agent.nationality = nationality;
    }
    if (languages !== undefined) {
        const arr = Array.isArray(languages) ? languages : [languages];
        const ids = arr.filter(Boolean).filter((l) => validateObjectId(l)).map((l) => new Types.ObjectId(l));
        agent.languages = ids;
    }
    if (description !== undefined) agent.description = description;
    if (aboutMe !== undefined) agent.aboutMe = aboutMe;
    if (linkedinUrl !== undefined) {
        agent.socialLinks = { ...(agent.socialLinks || {}), linkedin: linkedinUrl };
    }
    if (typeof isActive === 'boolean') agent.isActive = isActive;

    const approveRequested =
        approve === true ||
        String(approve).toLowerCase() === 'true' ||
        (typeof isVerified === 'boolean' && isVerified);

    if (approveRequested) {
        if (agent.invitationStatus !== 'accepted') {
            return failure(res, 400, 'Agent has not accepted invitation yet', 'VALIDATION_ERROR');
        }
        agent.isVerified = true;
        agent.verifiedAt = new Date();
        agent.verifiedBy = agencyId;
        agent.verifiedByModel = 'Agencies';
    }

    await agent.save();

    const updated = await Agent.findById(agent._id)
        .populate('specialization', 'title')
        .populate('languages', 'name code')
        .populate('nationality', 'name');
    const out = updated.toObject ? updated.toObject() : updated;
    const { password, invitationToken, ...rest } = out;
    return success(res, 'Agent updated successfully', { agent: rest });
});

/**
 * @swagger
 * /agency/agents/{id}/verify:
 *   post:
 *     summary: Approve or decline agent verification after invitation
 *     description: >
 *       Single endpoint: `action=approve` sets `isVerified` for an accepted, unverified agent (requires specializationId + agentType).
 *       `action=decline` sets `invitationStatus` to declined, deactivates, clears invitation token; optional `reason`.
 *     tags: [Agency, Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, decline]
 *               specializationId:
 *                 type: string
 *                 description: Required when action=approve — JobTitles ObjectId (job role).
 *               agentType:
 *                 type: string
 *                 enum: [agent, superagent]
 *                 description: Required when action=approve.
 *               isActive:
 *                 type: boolean
 *                 description: When action=approve, defaults to true if omitted.
 *               reason:
 *                 type: string
 *                 description: Optional when action=decline — stored as deactivationReason.
 *     responses:
 *       200:
 *         description: Agent verified or declined successfully
 *       400:
 *         description: Validation error or wrong invitation state
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent or job title not found
 */
const verifyAgentInvitation = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { id } = req.params;
    if (!validateObjectId(id)) {
        return failure(res, 400, 'Invalid agent ID', 'VALIDATION_ERROR');
    }

    const { action } = req.body || {};
    const normalizedAction = action != null ? String(action).toLowerCase() : '';
    if (!['approve', 'decline'].includes(normalizedAction)) {
        return failure(res, 400, 'action is required and must be approve or decline', 'VALIDATION_ERROR');
    }

    const agent = await ensureAgentBelongsToAgency(id, agencyId);
    if (!agent) {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    if (normalizedAction === 'approve') {
        if (agent.isVerified) {
            return failure(res, 400, 'Agent is already verified', 'VALIDATION_ERROR');
        }

        if (agent.invitationStatus !== 'accepted') {
            return failure(
                res,
                400,
                'Agent must have accepted the invitation before agency approval',
                'VALIDATION_ERROR',
            );
        }

        const { specializationId, agentType, isActive } = req.body || {};
        if (!specializationId || !validateObjectId(specializationId)) {
            return failure(res, 400, 'Valid specializationId (job role id) is required', 'VALIDATION_ERROR');
        }
        const jobExists = await JobTitles.exists({ _id: specializationId, isActive: true });
        if (!jobExists) {
            return failure(res, 404, 'Job title not found', 'NOT_FOUND');
        }

        if (!agentType || !['agent', 'superagent'].includes(String(agentType).toLowerCase())) {
            return failure(res, 400, 'Valid agentType (agent or superagent) is required', 'VALIDATION_ERROR');
        }

        agent.specialization = specializationId;
        agent.agentType = String(agentType).toLowerCase();
        if (typeof isActive === 'boolean') {
            agent.isActive = isActive;
        } else {
            agent.isActive = true;
        }

        agent.isVerified = true;
        agent.verifiedAt = new Date();
        agent.verifiedBy = agencyId;
        agent.verifiedByModel = 'Agencies';

        await agent.save();

        const updated = await Agent.findById(agent._id)
            .populate('specialization', 'title')
            .populate('languages', 'name code')
            .populate('nationality', 'name');
        const out = updated.toObject ? updated.toObject() : updated;
        const { password, invitationToken: _t, ...rest } = out;
        return success(res, 'Agent verified successfully', { agent: rest });
    }

    if (agent.isVerified) {
        return failure(res, 400, 'Cannot decline a verified agent', 'VALIDATION_ERROR');
    }

    if (agent.invitationStatus === 'declined') {
        return failure(res, 400, 'Agent invitation is already declined', 'VALIDATION_ERROR');
    }

    if (agent.invitationStatus !== 'accepted') {
        return failure(
            res,
            400,
            'Only agents who have accepted the invitation can be declined at this step',
            'VALIDATION_ERROR',
        );
    }

    const { reason } = req.body || {};
    agent.invitationStatus = 'declined';
    agent.invitationToken = undefined;
    agent.isActive = false;
    if (reason && String(reason).trim()) {
        agent.deactivationReason = String(reason).trim().slice(0, 500);
    }
    agent.deactivatedAt = new Date();

    await agent.save();

    const out = agent.toObject ? agent.toObject() : agent;
    const { password, invitationToken: _t2, ...rest } = out;
    return success(res, 'Agent verification declined', { agent: rest });
});

/**
 * @swagger
 * /agency/agents:
 *   delete:
 *     summary: Delete one or multiple agents for the authenticated agency
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of agent ObjectIds to delete.
 *     responses:
 *       200:
 *         description: Agents deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
const bulkDeleteAgents = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
        return failure(res, 400, 'ids array is required', 'VALIDATION_ERROR');
    }

    const validIds = ids.filter((id) => validateObjectId(id));
    if (validIds.length === 0) {
        return failure(res, 400, 'No valid agent ids provided', 'VALIDATION_ERROR');
    }

    const deleted = await Agent.deleteMany({
        _id: { $in: validIds },
        agency: agencyId,
    });
    return success(res, 'Agents deleted successfully', {
        deletedCount: deleted.deletedCount,
        requestedCount: validIds.length,
    });
});

/**
 * @swagger
 * /agency/agents/{agentId}/upload-profile-picture:
 *   post:
 *     summary: Upload or remove agent profile picture (agency)
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: New profile picture to upload.
 *               removeProfilePicture:
 *                 type: boolean
 *                 description: Set true (without file) to remove the current profile picture.
 *     responses:
 *       200:
 *         description: Profile picture uploaded or removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 */
const uploadAgentProfilePicture = asyncHandler(async (req, res) => {
    const agencyId = getAgencyId(req);
    if (!agencyId) {
        return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const agentId = req.params.agentId;
    if (!validateObjectId(agentId)) {
        return failure(res, 400, 'Invalid agent ID', 'VALIDATION_ERROR');
    }

    const agent = await ensureAgentBelongsToAgency(agentId, agencyId);
    if (!agent) {
        return failure(res, 404, 'Agent not found', 'NOT_FOUND');
    }

    const rawRemove = req.body?.removeProfilePicture;
    const removeRequested =
        rawRemove === true ||
        String(rawRemove).trim().toLowerCase() === 'true' ||
        String(rawRemove).trim().toLowerCase() === '1';

    const previousPicture = agent.profilePicture;

    // Handle remove without new upload
    if (removeRequested && !req.file) {
        if (isProfilelessProfilePicture(previousPicture)) {
            const profile = sanitizeAgent(agent);
            const responseData = uploadService.buildStandardResponse
                ? uploadService.buildStandardResponse(null, { images: 'agents' }, { agent: profile })
                : { agent: profile };
            return success(res, 'Profile picture removed', responseData);
        }
        if (previousPicture) {
            const previousPath = previousPicture.includes('/') ? previousPicture : `img/agents/${previousPicture}`;
            await uploadService.delete(previousPath).catch((err) =>
                logger.warn('Failed to delete previous agent picture', { error: err.message })
            );
        }

        agent.profilePicture = undefined;
        await agent.save();

        const profile = sanitizeAgent(agent);
        const responseData = uploadService.buildStandardResponse
            ? uploadService.buildStandardResponse(null, { images: 'agents' }, { agent: profile })
            : { agent: profile };

        return success(res, 'Profile picture removed', responseData);
    }

    if (!req.file) {
        return failure(res, 400, 'No profile picture uploaded', 'VALIDATION_ERROR');
    }

    const uploaded = await uploadService.upload(req.file, 'agents', { generateThumbnail: false });
    agent.profilePicture = uploaded.filename;
    await agent.save();

    if (previousPicture && previousPicture !== uploaded.filename && !isProfilelessProfilePicture(previousPicture)) {
        const previousPath = previousPicture.includes('/') ? previousPicture : `img/agents/${previousPicture}`;
        await uploadService.delete(previousPath).catch((err) =>
            logger.warn('Failed to delete previous agent picture', { error: err.message })
        );
    }

    const profile = sanitizeAgent(agent);
    const responseData = uploadService.buildStandardResponse
        ? uploadService.buildStandardResponse(uploaded, { images: 'agents' }, { agent: profile })
        : { agent: profile };
    return success(res, 'Profile picture uploaded successfully', responseData);
});

module.exports = {
    listAgents,
    getAgentById,
    updateAgent,
    verifyAgentInvitation,
    bulkDeleteAgents,
    uploadAgentProfilePicture,
};
