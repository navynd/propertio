const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Notification = require('../../models/notificationModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { Types } = mongoose;

const getAuthAgencyId = (req = {}) => req?.user?.agencyId || req?.user?.id || req?.user?._id;
const VALID_TABS = ['all', 'today', 'yesterday', 'last-7-days', 'last-30-days'];

const buildDateFilter = (tab) => {
  const now = new Date();

  if (tab === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { createdAt: { $gte: startOfDay, $lte: now } };
  }

  if (tab === 'yesterday') {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
    return { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } };
  }

  if (tab === 'last-7-days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { createdAt: { $gte: sevenDaysAgo, $lte: now } };
  }

  if (tab === 'last-30-days') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { createdAt: { $gte: thirtyDaysAgo, $lte: now } };
  }

  return {};
};

/**
 * @swagger
 * /agency/notifications:
 *   get:
 *     summary: Get notifications for authenticated agency
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [all, today, yesterday, last-7-days, last-30-days]
 *         description: Filter notifications by date range
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and message
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "6824af9fb641f2d8b6fc1123"
 *                           title:
 *                             type: string
 *                             example: New Project Allocation
 *                           message:
 *                             type: string
 *                             example: You have been assigned 3 unit(s) in Marina Heights.
 *                           notificationType:
 *                             type: string
 *                             example: alert
 *                           priority:
 *                             type: string
 *                             example: high
 *                           isRead:
 *                             type: boolean
 *                             example: false
 *                           readAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           relatedItem:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               itemType:
 *                                 type: string
 *                                 example: project
 *                               itemId:
 *                                 type: string
 *                                 example: "6824af9fb641f2d8b6fc1001"
 *                           actionUrl:
 *                             type: string
 *                             nullable: true
 *                             example: "/agency/projects"
 *                           actionText:
 *                             type: string
 *                             nullable: true
 *                             example: View
 *                           metadata:
 *                             type: object
 *                             nullable: true
 *                             additionalProperties: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 58
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch notifications
 */
const listNotifications = asyncHandler(async (req, res) => {
  const agencyId = getAuthAgencyId(req);
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    tab = 'all',
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const activeTab = VALID_TABS.includes(tab) ? tab : 'all';

  try {
    const filter = {
      'recipient.recipientId': new Types.ObjectId(agencyId),
      'recipient.recipientType': 'agency',
      isArchived: false,
      ...buildDateFilter(activeTab),
    };

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(term, 'i');
      filter.$or = [{ title: regex }, { message: regex }];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        'recipient.recipientId': new Types.ObjectId(agencyId),
        'recipient.recipientType': 'agency',
        isRead: false,
        isArchived: false,
      }),
    ]);

    const formatted = notifications.map((n) => ({
      id: n._id,
      title: n.title,
      message: n.message,
      notificationType: n.notificationType,
      priority: n.priority,
      isRead: n.isRead,
      readAt: n.readAt || null,
      relatedItem: n.relatedItem
        ? { itemType: n.relatedItem.itemType, itemId: n.relatedItem.itemId }
        : null,
      actionUrl: n.actionUrl || null,
      actionText: n.actionText || null,
      metadata: n.metadata || null,
      createdAt: n.createdAt,
    }));

    return success(res, 'Notifications retrieved successfully', {
      notifications: formatted,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    logger.error('Agency list notifications error', {
      error: err.message,
      agencyId,
    });
    return failure(res, 500, 'Failed to fetch notifications', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/notifications/{id}/read:
 *   put:
 *     summary: Mark an agency notification as read
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Failed to mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const agencyId = getAuthAgencyId(req);
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid notification ID', 'VALIDATION_ERROR');
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        'recipient.recipientId': new Types.ObjectId(agencyId),
        'recipient.recipientType': 'agency',
        isArchived: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true },
    );

    if (!notification) {
      return failure(res, 404, 'Notification not found', 'NOT_FOUND');
    }

    return success(res, 'Notification marked as read', {
      id: notification._id,
      isRead: notification.isRead,
      readAt: notification.readAt,
    });
  } catch (err) {
    logger.error('Agency mark notification as read error', {
      error: err.message,
      notificationId: id,
      agencyId,
    });
    return failure(res, 500, 'Failed to mark notification as read', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/notifications/read-all:
 *   put:
 *     summary: Mark all agency notifications as read
 *     tags: [Agency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const agencyId = getAuthAgencyId(req);
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  try {
    const now = new Date();
    const result = await Notification.updateMany(
      {
        'recipient.recipientId': new Types.ObjectId(agencyId),
        'recipient.recipientType': 'agency',
        isRead: false,
        isArchived: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      },
    );

    return success(res, 'All notifications marked as read', {
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error('Agency mark all notifications as read error', {
      error: err.message,
      agencyId,
    });
    return failure(res, 500, 'Failed to mark all notifications as read', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /agency/notifications:
 *   delete:
 *     summary: Delete agency notifications (single or multiple)
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
 *                 description: Array of notification IDs to delete
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No notifications found
 *       500:
 *         description: Failed to delete notifications
 */
const deleteNotifications = asyncHandler(async (req, res) => {
  const agencyId = getAuthAgencyId(req);
  if (!agencyId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { ids } = req.body || {};
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return failure(res, 400, 'ids is required and must be a non-empty array', 'VALIDATION_ERROR');
  }

  const invalidIds = ids.filter((id) => !Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return failure(
      res,
      400,
      `Invalid notification IDs: ${invalidIds.join(', ')}`,
      'VALIDATION_ERROR',
    );
  }

  if (ids.length > 100) {
    return failure(res, 400, 'Cannot delete more than 100 notifications at once', 'VALIDATION_ERROR');
  }

  try {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const result = await Notification.deleteMany({
      _id: { $in: objectIds },
      'recipient.recipientId': new Types.ObjectId(agencyId),
      'recipient.recipientType': 'agency',
    });

    if (result.deletedCount === 0) {
      return failure(res, 404, 'No notifications found to delete', 'NOT_FOUND');
    }

    return success(res, 'Successfully deleted', { deletedCount: result.deletedCount });
  } catch (err) {
    logger.error('Agency delete notifications error', {
      error: err.message,
      agencyId,
      ids,
    });
    return failure(res, 500, 'Failed to delete notifications', 'SERVER_ERROR');
  }
});

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
};

