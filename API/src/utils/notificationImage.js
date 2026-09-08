const { buildMediaImageUrl } = require('./mediaUrl');

const DEFAULT_NOTIFICATION_IMAGE = 'notificationbell.png';

/**
 * Pick raw image reference from project/property images array.
 * @param {Array<{ url?: string, filename?: string, isPrimary?: boolean, order?: number }|string>} images
 * @returns {string|null}
 */
const pickPrimaryImageRaw = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;

  const sorted = [...images].sort((a, b) => {
    if (a?.isPrimary && !b?.isPrimary) return -1;
    if (!a?.isPrimary && b?.isPrimary) return 1;
    return Number(a?.order || 0) - Number(b?.order || 0);
  });

  for (const img of sorted) {
    if (typeof img === 'string' && img.trim()) return img.trim();
    if (img && typeof img === 'object') {
      if (typeof img.url === 'string' && img.url.trim()) return img.url.trim();
      if (typeof img.filename === 'string' && img.filename.trim()) return img.filename.trim();
    }
  }

  return null;
};

/**
 * Resolve notification image to a public URL (CloudFront or uploads).
 * @param {string|object|null|undefined} raw
 * @param {'property'|'project'|'agent'|'agency'} [mediaType]
 * @returns {string|null}
 */
const resolveNotificationImage = (raw, mediaType = 'project') => {
  if (raw == null) return null;

  let value = raw;
  if (typeof raw === 'object') {
    value = raw.url || raw.filename || null;
  }

  let trimmed = value == null ? '' : String(value).trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase() === DEFAULT_NOTIFICATION_IMAGE.toLowerCase()) {
    return buildMediaImageUrl(DEFAULT_NOTIFICATION_IMAGE, mediaType);
  }

  trimmed = trimmed.replace(/^\/+/, '').replace(/^uploads\//i, '');

  return buildMediaImageUrl(trimmed, mediaType);
};

/**
 * Store image as filename only (for notification metadata in DB).
 * @param {string|object|null|undefined} raw
 * @param {'property'|'project'|'agent'|'agency'} [mediaType]
 * @returns {string}
 */
const toNotificationImageFilename = (raw, mediaType = 'project') => {
  if (raw == null) return DEFAULT_NOTIFICATION_IMAGE;

  let value = raw;
  if (typeof raw === 'object') {
    value = raw.url || raw.filename || null;
  }

  let trimmed = value == null ? '' : String(value).trim();
  if (!trimmed) return DEFAULT_NOTIFICATION_IMAGE;

  if (trimmed.toLowerCase() === DEFAULT_NOTIFICATION_IMAGE.toLowerCase()) {
    return DEFAULT_NOTIFICATION_IMAGE;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const withoutHost = trimmed.replace(/^https?:\/\/[^/]+\//i, '');
    if (withoutHost.startsWith('img/')) {
      const parts = withoutHost.split('/').filter(Boolean);
      return parts[parts.length - 1] || DEFAULT_NOTIFICATION_IMAGE;
    }
    const parts = trimmed.split('/').filter(Boolean);
    return parts[parts.length - 1] || DEFAULT_NOTIFICATION_IMAGE;
  }

  trimmed = trimmed
    .replace(/^\/+/, '')
    .replace(/^uploads\//i, '')
    .replace(/^img\/(project|property|agents|agency|user)\//i, '');

  return trimmed || DEFAULT_NOTIFICATION_IMAGE;
};

/**
 * Filename for DB storage (not a full CDN URL).
 * @param {string|object|null|undefined} raw
 * @param {'property'|'project'|'agent'|'agency'} [mediaType]
 * @returns {string}
 */
const ensureNotificationImage = (raw, mediaType = 'project') =>
  toNotificationImageFilename(raw, mediaType);

/**
 * @param {object|null|undefined} metadata
 * @param {{ itemType?: string }|null|undefined} relatedItem
 * @returns {object|null|undefined}
 */
const normalizeNotificationMetadata = (metadata, relatedItem) => {
  if (!metadata || typeof metadata !== 'object') return metadata;

  let mediaType = 'project';
  if (relatedItem?.itemType === 'property') {
    mediaType = 'property';
  } else if (metadata.propertyId || metadata.propertyName) {
    mediaType = 'property';
  } else if (relatedItem?.itemType === 'project' || metadata.projectId || metadata.projectName) {
    mediaType = 'project';
  }

  const rawImage = metadata.image || DEFAULT_NOTIFICATION_IMAGE;
  const resolved = resolveNotificationImage(rawImage, mediaType);

  return {
    ...metadata,
    image: resolved || DEFAULT_NOTIFICATION_IMAGE,
  };
};

/**
 * Resolve image URL for property allocation notifications (project, listing, or agency logo).
 * @param {object} allocation
 * @returns {Promise<string>}
 */
const resolveAllocationNotificationImage = async (allocation) => {
  if (!allocation) return DEFAULT_NOTIFICATION_IMAGE;

  if (allocation.project) {
    const Newprojects = require('../models/newprojectsModel');
    const project = await Newprojects.findById(allocation.project).select('images').lean();
    const filename = ensureNotificationImage(pickPrimaryImageRaw(project?.images), 'project');
    if (filename !== DEFAULT_NOTIFICATION_IMAGE) return filename;
  }

  if (allocation.completedProperty) {
    const Properties = require('../models/propertiesModal');
    const property = await Properties.findById(allocation.completedProperty)
      .select('images')
      .lean();
    const filename = ensureNotificationImage(pickPrimaryImageRaw(property?.images), 'property');
    if (filename !== DEFAULT_NOTIFICATION_IMAGE) return filename;
  }

  const agencyId = allocation.agency?._id || allocation.agency;
  if (agencyId) {
    const Agencies = require('../models/agenciesModel');
    const agency = await Agencies.findById(agencyId).select('profilePicture').lean();
    const filename = ensureNotificationImage(agency?.profilePicture, 'agency');
    if (filename !== DEFAULT_NOTIFICATION_IMAGE) return filename;
  }

  return DEFAULT_NOTIFICATION_IMAGE;
};

module.exports = {
  DEFAULT_NOTIFICATION_IMAGE,
  pickPrimaryImageRaw,
  resolveNotificationImage,
  toNotificationImageFilename,
  ensureNotificationImage,
  normalizeNotificationMetadata,
  resolveAllocationNotificationImage,
};
