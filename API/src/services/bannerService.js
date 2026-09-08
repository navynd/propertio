const CmsPage = require('../models/cmsPageModel');
const Banner = require('../models/bannersModel');
const { PLACEMENTS } = require('../models/bannersModel');

const BANNER_SETTINGS_SLUG = 'banner-overview';

const DEFAULT_BANNER_SETTINGS = {
  defaultButtonText: 'Explore more',
  autoSlideInterval: 5000,
};

const BANNER_IMAGE_BASE =
  process.env.BANNER_IMAGE_BASE_URL ||
  'https://d1dp1oh0ra5b0z.cloudfront.net/img/banner/';

const normalizeImageFilename = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    const parts = trimmed.split('/');
    return parts[parts.length - 1] || '';
  }
  return trimmed.replace(/^\/+/, '');
};

const normalizePlacement = (value) => {
  const normalized = String(value || 'listing-page').trim().toLowerCase();
  return PLACEMENTS.includes(normalized) ? normalized : 'listing-page';
};

const isWithinSchedule = (doc, now = new Date()) => {
  if (doc.startDate && new Date(doc.startDate) > now) return false;
  if (doc.endDate && new Date(doc.endDate) < now) return false;
  return true;
};

const mapPublicBanner = (doc, settings) => ({
  id: String(doc._id),
  title: doc.title || '',
  description: doc.description || '',
  image: normalizeImageFilename(doc.image),
  mobileImage: normalizeImageFilename(doc.mobileImage),
  link: doc.link || '',
  linkText: doc.linkText || settings.defaultButtonText || DEFAULT_BANNER_SETTINGS.defaultButtonText,
  displayOrder: Number(doc.displayOrder) || 0,
});

const splitSettings = (custom = {}) => ({
  ...DEFAULT_BANNER_SETTINGS,
  ...custom,
  autoSlideInterval: Math.max(
    Number(custom.autoSlideInterval) || DEFAULT_BANNER_SETTINGS.autoSlideInterval,
    1000
  ),
});

const getBannerSettings = async () => {
  const page = await CmsPage.findOne({ slug: BANNER_SETTINGS_SLUG, isActive: true }).lean();
  return splitSettings(page?.customFields || {});
};

const getPublicBanners = async ({ placement = 'listing-page' } = {}) => {
  const settings = await getBannerSettings();
  const normalizedPlacement = normalizePlacement(placement);
  const now = new Date();

  const docs = await Banner.find({
    placement: normalizedPlacement,
    isActive: true,
  })
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();

  const banners = docs.filter((doc) => isWithinSchedule(doc, now)).map((doc) => mapPublicBanner(doc, settings));

  return {
    settings,
    placement: normalizedPlacement,
    banners,
    mediaBaseUrl: { img: BANNER_IMAGE_BASE },
  };
};

module.exports = {
  BANNER_SETTINGS_SLUG,
  DEFAULT_BANNER_SETTINGS,
  BANNER_IMAGE_BASE,
  PLACEMENTS,
  getPublicBanners,
};
