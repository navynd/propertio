const mongoose = require('mongoose');
const { Types } = mongoose;

const Agencies = require('../models/agenciesModel');
const Agents = require('../models/agentsModel');
const Properties = require('../models/propertiesModal');
const Inquirys = require('../models/inquirysModel');
const DealClosure = require('../models/dealClosureModel');

const recalcAgencyStatistics = async (agencyId, session) => {
    if (!agencyId) return;

    const agencyObjectId = new Types.ObjectId(agencyId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
        listingsAgg,
        agentsAgg,
        inquiriesAgg,
        inquiriesThisMonthAgg,
        dealsAgg,
        dealsThisMonthAgg,
    ] = await Promise.all([
        Properties.aggregate([
            { $match: { agency: agencyObjectId, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalActiveListings: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
                        },
                    },
                    totalInactiveListings: {
                        $sum: {
                            $cond: [{ $ne: ['$status', 'active'] }, 1, 0],
                        },
                    },
                },
            },
        ]).session(session),
        Agents.aggregate([
            { $match: { agency: agencyObjectId, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalAgents: { $sum: 1 },
                    totalSuperAgents: {
                        $sum: {
                            $cond: [{ $eq: ['$agentType', 'superagent'] }, 1, 0],
                        },
                    },
                },
            },
        ]).session(session),
        Inquirys.aggregate([
            { $match: { agency: agencyObjectId } },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                },
            },
        ]).session(session),
        Inquirys.aggregate([
            {
                $match: {
                    agency: agencyObjectId,
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                },
            },
            {
                $group: {
                    _id: null,
                    thisMonthLeads: { $sum: 1 },
                },
            },
        ]).session(session),
        DealClosure.aggregate([
            {
                $match: {
                    agency: agencyObjectId,
                    'paymentDetails.paymentStatus': 'completed',
                },
            },
            {
                $group: {
                    _id: null,
                    totalDeals: { $sum: 1 },
                    totalRevenueSales: {
                        $sum: {
                            $cond: [{ $eq: ['$dealType', 'sale'] }, '$dealAmount', 0],
                        },
                    },
                    totalRevenueRent: {
                        $sum: {
                            $cond: [{ $eq: ['$dealType', 'rent'] }, '$dealAmount', 0],
                        },
                    },
                },
            },
        ]).session(session),
        DealClosure.aggregate([
            {
                $match: {
                    agency: agencyObjectId,
                    'paymentDetails.paymentStatus': 'completed',
                    closedDate: { $gte: monthStart, $lte: monthEnd },
                },
            },
            {
                $group: {
                    _id: null,
                    thisMonthDeals: { $sum: 1 },
                    thisMonthRevenueSales: {
                        $sum: {
                            $cond: [{ $eq: ['$dealType', 'sale'] }, '$dealAmount', 0],
                        },
                    },
                    thisMonthRevenueRent: {
                        $sum: {
                            $cond: [{ $eq: ['$dealType', 'rent'] }, '$dealAmount', 0],
                        },
                    },
                },
            },
        ]).session(session),
    ]);

    const listings = listingsAgg[0] || {};
    const agentStats = agentsAgg[0] || {};
    const inq = inquiriesAgg[0] || {};
    const inqMonth = inquiriesThisMonthAgg[0] || {};
    const deals = dealsAgg[0] || {};
    const dealsMonth = dealsThisMonthAgg[0] || {};

    await Agencies.findByIdAndUpdate(
        agencyObjectId,
        {
            $set: {
                'statistics.totalActiveListings':
                    listings.totalActiveListings || 0,
                'statistics.totalInactiveListings':
                    listings.totalInactiveListings || 0,
                'statistics.totalAgents': agentStats.totalAgents || 0,
                'statistics.totalSuperAgents':
                    agentStats.totalSuperAgents || 0,
                'statistics.totalRevenueSales':
                    deals.totalRevenueSales || 0,
                'statistics.totalRevenueRent': deals.totalRevenueRent || 0,
                'statistics.thisMonthRevenueSales':
                    dealsMonth.thisMonthRevenueSales || 0,
                'statistics.thisMonthRevenueRent':
                    dealsMonth.thisMonthRevenueRent || 0,
                'statistics.totalLeads': inq.totalLeads || 0,
                'statistics.thisMonthLeads':
                    inqMonth.thisMonthLeads || 0,
                'statistics.totalDeals': deals.totalDeals || 0,
                'statistics.thisMonthDeals':
                    dealsMonth.thisMonthDeals || 0,
            },
        },
        { session },
    );
};

module.exports = {
    recalcAgencyStatistics,
};

