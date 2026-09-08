const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Notification = require('../../models/notificationModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { normalizeNotificationMetadata } = require('../../utils/notificationImage');

const { Types } = mongoose;

const getAuthUserId = (req = {}) => req?.user?.userId || req?.user?.id || req?.user?._id;

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TABS = ['all', 'today', 'yesterday', 'last-7-days', 'last-30-days'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build date filter based on tab selection
 * Matches UI tabs: All | Today | Yesterday | Last 7 days
 */
const buildDateFilter = (tab) => {
  const now = new Date();

  if (tab === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { createdAt: { $gte: startOfDay, $lte: now } };
  }

  if (tab === 'yesterday') {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
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

  // 'all' — no date filter
  return {};
};

// ─── 1. GET /user/notifications ───────────────────────────────────────────────

/**
 * List notifications for authenticated user
 *
 * Query params:
 *   tab        : 'all' | 'today' | 'yesterday' | 'last-7-days' | 'last-30-days'
 *   search     : string (searches title + message)
 *   page       : number (default 1)
 *   limit      : number (default 20, max 50)
 *
 * Response groups notifications by date for UI display.
 * Also returns unread count for badge.
 */

/**
 * @swagger
 * /users/notifications:
 *   get:
 *     summary: Get notifications for authenticated user
 *     tags: [Users]
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
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       notificationType:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       isRead:
 *                         type: boolean
 *                       readAt:
 *                         type: string
 *                         nullable: true
 *                       actionUrl:
 *                         type: string
 *                         nullable: true
 *                       actionText:
 *                         type: string
 *                         nullable: true
 *                       metadata:
 *                         type: object
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                 unreadCount:
 *                   type: number
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch notifications
 */
const listNotifications = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const {
    tab    = 'all',
    search,
    page   = 1,
    limit  = 20,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const activeTab = VALID_TABS.includes(tab) ? tab : 'all';

  try {
    // Base filter — this user only, not archived
    const filter = {
      'recipient.recipientId'  : new Types.ObjectId(userId),
      'recipient.recipientType': 'user',
      isArchived               : false,
    };

    // Tab date filter
    const dateFilter = buildDateFilter(activeTab);
    Object.assign(filter, dateFilter);

    // Search filter — title or message
    if (search && typeof search === 'string' && search.trim()) {
      const term  = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(term, 'i');
      filter.$or  = [
        { title  : regex },
        { message: regex },
      ];
    }

    // Run queries in parallel
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Notification.countDocuments(filter),

      // Unread count for bell badge (always all — no tab filter)
      Notification.countDocuments({
        'recipient.recipientId'  : new Types.ObjectId(userId),
        'recipient.recipientType': 'user',
        isRead                   : false,
        isArchived               : false,
      }),
    ]);

    // Format notifications
    const formatted = notifications.map((n) => ({
      id              : n._id,
      title           : n.title,
      message         : n.message,
      notificationType: n.notificationType,
      priority        : n.priority,
      isRead          : n.isRead,
      readAt          : n.readAt   || null,
      relatedItem     : n.relatedItem
        ? {
            itemType: n.relatedItem.itemType,
            itemId  : n.relatedItem.itemId,
          }
        : null,
      actionUrl  : n.actionUrl   || null,
      actionText : n.actionText  || null,
      metadata   : normalizeNotificationMetadata(n.metadata || {}, n.relatedItem),
      createdAt  : n.createdAt,
    }));

    return success(res, 'Notifications retrieved successfully', {
      notifications: formatted,
      unreadCount,
      pagination: {
        page : pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    logger.error('List notifications error', {
      error : err.message,
      userId,
    });
    return failure(res, 500, 'Failed to fetch notifications', 'SERVER_ERROR');
  }
});

// ─── 2. PUT /user/notifications/:id/read ──────────────────────────────────────

/**
 * Mark a single notification as read
 */

/**
 * @swagger
 * /users/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 isRead:
 *                   type: boolean
 *                 readAt:
 *                   type: string
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
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return failure(res, 400, 'Invalid notification ID', 'VALIDATION_ERROR');
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id                      : id,
        'recipient.recipientId'  : new Types.ObjectId(userId),
        'recipient.recipientType': 'user',
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
      id    : notification._id,
      isRead: notification.isRead,
      readAt: notification.readAt,
    });
  } catch (err) {
    logger.error('Mark as read error', {
      error         : err.message,
      notificationId: id,
      userId,
    });
    return failure(res, 500, 'Failed to mark notification as read', 'SERVER_ERROR');
  }
});

// ─── 3. PUT /user/notifications/read-all ──────────────────────────────────────

/**
 * Mark ALL unread notifications as read for this user
 */
/**
 * @swagger
 * /users/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedCount:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  try {
    const now    = new Date();
    const result = await Notification.updateMany(
      {
        'recipient.recipientId'  : new Types.ObjectId(userId),
        'recipient.recipientType': 'user',
        isRead                   : false,
        isArchived               : false,
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
    logger.error('Mark all as read error', {
      error: err.message,
      userId,
    });
    return failure(res, 500, 'Failed to mark all notifications as read', 'SERVER_ERROR');
  }
});

// ─── 4. DELETE /user/notifications ────────────────────────────────────────────

/**
 * Delete notifications — single or bulk
 *
 * Works for both:
 *   Single delete (swipe): body = { ids: ["notificationId"] }
 *   Bulk delete (selected): body = { ids: ["id1", "id2", "id3", ...] }
 *
 * Request body:
 *   ids : string[] — array of notification IDs to delete (required)
 *
 * Soft delete via isArchived = true
 * so TTL index on expiresAt handles actual removal
 * If you prefer hard delete, see comment below
 */
/**
 * @swagger
 * /users/notifications:
 *   delete:
 *     summary: Delete notifications (single or multiple)
 *     tags: [Users]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: number
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
  const userId = getAuthUserId(req);
  if (!userId) {
    return failure(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const { ids } = req.body || {};

  // Validate ids array
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return failure(
      res,
      400,
      'ids is required and must be a non-empty array',
      'VALIDATION_ERROR',
    );
  }

  // Validate each id
  const invalidIds = ids.filter((id) => !Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return failure(
      res,
      400,
      `Invalid notification IDs: ${invalidIds.join(', ')}`,
      'VALIDATION_ERROR',
    );
  }

  // Max 100 deletions at once
  if (ids.length > 100) {
    return failure(
      res,
      400,
      'Cannot delete more than 100 notifications at once',
      'VALIDATION_ERROR',
    );
  }

  try {
    const objectIds = ids.map((id) => new Types.ObjectId(id));

    // ── Option A: Hard delete (permanent) ──
    // Use this if you want immediate removal
    const result = await Notification.deleteMany({
      _id                      : { $in: objectIds },
      'recipient.recipientId'  : new Types.ObjectId(userId),
      'recipient.recipientType': 'user',
    });

    // ── Option B: Soft delete (archive) ──
    // Uncomment this and comment out Option A
    // if you prefer soft delete with TTL cleanup
    //
    // const result = await Notification.updateMany(
    //   {
    //     _id                      : { $in: objectIds },
    //     'recipient.recipientId'  : new Types.ObjectId(userId),
    //     'recipient.recipientType': 'user',
    //   },
    //   {
    //     $set: {
    //       isArchived : true,
    //       archivedAt : new Date(),
    //       // Auto expire after 30 days
    //       expiresAt  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    //     },
    //   },
    // );

    if (result.deletedCount === 0) {
      return failure(res, 404, 'No notifications found to delete', 'NOT_FOUND');
    }

    return success(res, 'Successfully deleted', {
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    logger.error('Delete notifications error', {
      error : err.message,
      userId,
      ids,
    });
    return failure(res, 500, 'Failed to delete notifications', 'SERVER_ERROR');
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
};