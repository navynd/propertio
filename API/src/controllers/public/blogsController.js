const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const BlogPost = require('../../models/blogPostModel');
const BlogComment = require('../../models/blogCommentModel');
const Properties = require('../../models/propertiesModal');
const { success, failure } = require('../../utils/helpers');
const {
  getBlogSettings,
  listActiveCategories,
  buildPublishedFilter,
  buildSort,
  mapBlogCard,
  mapBlogDetail,
  mapComment,
  normalizeImageFilename,
} = require('../../services/blogService');

const { Types } = mongoose;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const mapRelatedProperty = (property, imgBase = '') => {
  const image = property?.images?.[0];
  const imageFilename =
    typeof image === 'string' ? image : image?.url || image?.filename || '';
  const price = property?.price || {};
  const amount = price.amount ?? price.total ?? price.monthlyRent;
  const currency = price.currency || 'AED';
  const location = property?.location || {};

  return {
    id: String(property._id),
    image: imageFilename
      ? `${imgBase}${encodeURIComponent(normalizeImageFilename(imageFilename))}`
      : '',
    title: property.title || '',
    location: [location.city, location.zone].filter(Boolean).join(', '),
    beds: property.bedrooms != null ? `${property.bedrooms} Bed` : '',
    baths: property.bathrooms != null ? `${property.bathrooms} Bath` : '',
    area: property.area?.sqft
      ? `${property.area.sqft.toLocaleString('en-US')} sqft`
      : property.area?.sqm
        ? `${property.area.sqm.toLocaleString('en-US')} sqm`
        : '',
    price: amount != null ? `${Number(amount).toLocaleString('en-US')} ${currency}` : '',
    ribbons: {
      verified: Boolean(property.isVerified),
      superAgent: Boolean(property.isSuperagentListing),
      label: property.propertyType?.name || property.propertyType || '',
    },
  };
};

const buildCommentsTree = (rows) => {
  const mapped = rows.map((row) => ({ ...mapComment(row), parentId: row.parent ? String(row.parent) : null }));
  const byId = new Map(mapped.map((item) => [item.id, item]));
  const roots = [];

  mapped.forEach((item) => {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId).replies.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots.map(({ parentId, ...rest }) => rest);
};

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: Get blog list or detail bundle
 *     description: >
 *       Consolidated read endpoint. Without `slug`, returns the blog listing bundle
 *       (settings, categories, featured, top stories, posts, pagination).
 *       With `slug`, returns the detail bundle (post, related posts, recent posts,
 *       related properties, comments).
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *         description: Blog post slug. When provided, response mode is `detail`.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter (list mode only).
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Subcategory slug filter (list mode only).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, excerpt, content, and tags (list mode only).
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular]
 *           default: newest
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Blogs fetched successfully
 *       404:
 *         description: Blog post not found (detail mode)
 *       500:
 *         description: Server error
 */
const getBlogs = asyncHandler(async (req, res) => {
  const {
    slug,
    category,
    subcategory,
    search,
    sortBy = 'newest',
    page = 1,
    limit,
  } = req.query;

  const settings = await getBlogSettings();
  const categories = await listActiveCategories();

  if (slug && String(slug).trim()) {
    const postDoc = await BlogPost.findOne(buildPublishedFilter({ slug: String(slug).trim().toLowerCase() })).lean();
    if (!postDoc) {
      return failure(res, 404, 'Blog post not found', 'NOT_FOUND');
    }

    await BlogPost.updateOne({ _id: postDoc._id }, { $inc: { views: 1 } });

    const [relatedPosts, recentPosts, relatedPropertyDocs, commentRows] = await Promise.all([
      BlogPost.find(
        buildPublishedFilter({
          _id: { $ne: postDoc._id },
          categorySlug: postDoc.categorySlug || undefined,
        })
      )
        .sort({ publishedAt: -1 })
        .limit(4)
        .lean(),
      BlogPost.find(buildPublishedFilter({ _id: { $ne: postDoc._id } }))
        .sort({ publishedAt: -1 })
        .limit(4)
        .lean(),
      postDoc.relatedProperties?.length
        ? Properties.find({ _id: { $in: postDoc.relatedProperties }, status: 'active' })
            .select('title price currency bedrooms bathrooms area location images isVerified isSuperagentListing propertyType')
            .limit(8)
            .lean()
        : [],
      settings.enableComments !== false && postDoc.allowComments !== false
        ? BlogComment.find({ post: postDoc._id, isActive: true })
            .sort({ createdAt: -1 })
            .lean()
        : [],
    ]);

    return success(res, 'Blog detail fetched successfully', {
      mode: 'detail',
      settings,
      post: mapBlogDetail(postDoc),
      relatedPosts: relatedPosts.map(mapBlogCard),
      recentPosts: recentPosts.map(mapBlogCard),
      relatedProperties: relatedPropertyDocs.map((p) => mapRelatedProperty(p)),
      comments: buildCommentsTree(commentRows),
    });
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || settings.itemsPerPage || 9, 1), 50);
  const skip = (pageNum - 1) * limitNum;

  const filter = buildPublishedFilter();
  if (category && String(category).trim()) {
    filter.categorySlug = String(category).trim().toLowerCase();
  }
  if (subcategory && String(subcategory).trim()) {
    filter.subcategorySlug = String(subcategory).trim().toLowerCase();
  }
  if (search && String(search).trim()) {
    const term = escapeRegex(search.trim());
    filter.$or = [
      { title: { $regex: term, $options: 'i' } },
      { excerpt: { $regex: term, $options: 'i' } },
      { content: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } },
    ];
  }

  const sort = buildSort(sortBy);

  const [posts, total, featured, topStories] = await Promise.all([
    BlogPost.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    BlogPost.countDocuments(filter),
    BlogPost.findOne(buildPublishedFilter({ isFeatured: true })).sort({ publishedAt: -1 }).lean(),
    BlogPost.find(buildPublishedFilter())
      .sort({ views: -1, publishedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return success(res, 'Blogs fetched successfully', {
    mode: 'list',
    settings,
    categories,
    featured: featured ? mapBlogCard(featured) : null,
    topStories: topStories.map(mapBlogCard),
    posts: posts.map(mapBlogCard),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  });
});

const resolveReactionKey = (req, guestKey) => {
  if (req.user?._id) return `user:${req.user._id}`;
  const key = String(guestKey || '').trim();
  return key ? `guest:${key}` : '';
};

/**
 * @swagger
 * /blogs:
 *   post:
 *     summary: Blog interactions (comments, replies, reactions)
 *     description: >
 *       Consolidated write endpoint for blog engagement.
 *       Supported actions: `comment`, `reply`, `react`.
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, slug]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [comment, reply, react]
 *               slug:
 *                 type: string
 *               text:
 *                 type: string
 *                 description: Required for comment and reply.
 *               parentId:
 *                 type: string
 *                 description: Required for reply.
 *               commentId:
 *                 type: string
 *                 description: Required for react.
 *               reaction:
 *                 type: string
 *                 enum: [like, dislike, clear]
 *               guestKey:
 *                 type: string
 *                 description: Required for guest users when reacting.
 *               authorName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment or reply posted successfully
 *       200:
 *         description: Reaction updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Comments disabled for this post
 *       404:
 *         description: Blog post or comment not found
 *       500:
 *         description: Server error
 */
const mutateBlogs = asyncHandler(async (req, res) => {
  const {
    action,
    slug,
    text,
    parentId,
    commentId,
    reaction,
    guestKey,
    authorName,
  } = req.body || {};

  const normalizedAction = String(action || '').trim().toLowerCase();
  if (!normalizedAction) {
    return failure(res, 400, 'action is required', 'VALIDATION_ERROR');
  }

  if (!slug || !String(slug).trim()) {
    return failure(res, 400, 'slug is required', 'VALIDATION_ERROR');
  }

  const post = await BlogPost.findOne(
    buildPublishedFilter({ slug: String(slug).trim().toLowerCase() })
  );
  if (!post) {
    return failure(res, 404, 'Blog post not found', 'NOT_FOUND');
  }

  const settings = await getBlogSettings();
  if (settings.enableComments === false || post.allowComments === false) {
    return failure(res, 403, 'Comments are disabled for this post', 'FORBIDDEN');
  }

  if (normalizedAction === 'comment' || normalizedAction === 'reply') {
    const bodyText = String(text || '').trim();
    if (!bodyText) {
      return failure(res, 400, 'text is required', 'VALIDATION_ERROR');
    }

    let parent = null;
    if (normalizedAction === 'reply') {
      if (!parentId || !Types.ObjectId.isValid(parentId)) {
        return failure(res, 400, 'parentId is required for reply', 'VALIDATION_ERROR');
      }
      parent = await BlogComment.findOne({
        _id: parentId,
        post: post._id,
        isActive: true,
      });
      if (!parent) {
        return failure(res, 404, 'Parent comment not found', 'NOT_FOUND');
      }
    }

    const displayName =
      String(authorName || '').trim() ||
      req.user?.fullName ||
      req.user?.name ||
      'Guest';

    const comment = await BlogComment.create({
      post: post._id,
      parent: parent?._id || null,
      authorName: displayName,
      user: req.user?._id || null,
      text: bodyText,
    });

    await BlogPost.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });

    return success(
      res,
      normalizedAction === 'reply' ? 'Reply posted successfully' : 'Comment posted successfully',
      { comment: mapComment(comment.toObject()) },
      201
    );
  }

  if (normalizedAction === 'react') {
    if (!commentId || !Types.ObjectId.isValid(commentId)) {
      return failure(res, 400, 'commentId is required', 'VALIDATION_ERROR');
    }

    const reactionKey = resolveReactionKey(req, guestKey);
    if (!reactionKey) {
      return failure(res, 400, 'guestKey is required for guests', 'VALIDATION_ERROR');
    }

    const comment = await BlogComment.findOne({
      _id: commentId,
      post: post._id,
      isActive: true,
    });
    if (!comment) {
      return failure(res, 404, 'Comment not found', 'NOT_FOUND');
    }

    const normalizedReaction = String(reaction || '').trim().toLowerCase();
    const existingIndex = (comment.reactions || []).findIndex((row) => {
      const userMatch = req.user?._id && row.user && String(row.user) === String(req.user._id);
      const guestMatch = row.guestKey && `guest:${row.guestKey}` === reactionKey;
      return userMatch || guestMatch;
    });

    let likesDelta = 0;
    let dislikesDelta = 0;

    if (existingIndex >= 0) {
      const existing = comment.reactions[existingIndex];
      if (!normalizedReaction || normalizedReaction === 'clear') {
        if (existing.reaction === 'like') likesDelta -= 1;
        if (existing.reaction === 'dislike') dislikesDelta -= 1;
        comment.reactions.splice(existingIndex, 1);
      } else if (existing.reaction !== normalizedReaction) {
        if (existing.reaction === 'like') likesDelta -= 1;
        if (existing.reaction === 'dislike') dislikesDelta -= 1;
        if (normalizedReaction === 'like') likesDelta += 1;
        if (normalizedReaction === 'dislike') dislikesDelta += 1;
        comment.reactions[existingIndex].reaction = normalizedReaction;
      }
    } else if (normalizedReaction === 'like' || normalizedReaction === 'dislike') {
      comment.reactions.push({
        guestKey: req.user?._id ? '' : String(guestKey || '').trim(),
        user: req.user?._id || null,
        reaction: normalizedReaction,
      });
      if (normalizedReaction === 'like') likesDelta += 1;
      if (normalizedReaction === 'dislike') dislikesDelta += 1;
    }

    comment.likes = Math.max(0, (comment.likes || 0) + likesDelta);
    comment.dislikes = Math.max(0, (comment.dislikes || 0) + dislikesDelta);
    await comment.save();

    return success(res, 'Reaction updated successfully', {
      comment: mapComment(comment.toObject()),
    });
  }

  return failure(res, 400, 'Invalid action', 'VALIDATION_ERROR');
});

module.exports = {
  getBlogs,
  mutateBlogs,
};
