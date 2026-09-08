const CmsPage = require('../models/cmsPageModel');
const Testimonial = require('../models/testimonialsModel');

const TESTIMONIAL_SETTINGS_SLUG = 'home-testimonials-overview';

const DEFAULT_TESTIMONIAL_SETTINGS = {
  sectionTitle: "Don't take our word for it!",
  sectionSubtitle: 'Hear it from our customers',
};

const TESTIMONIAL_IMAGE_BASE =
  process.env.TESTIMONIAL_IMAGE_BASE_URL ||
  'https://d1dp1oh0ra5b0z.cloudfront.net/img/testimonial/';

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

const mapPublicTestimonial = (doc) => ({
  id: String(doc._id),
  name: doc.name || '',
  role: doc.title || 'Customer',
  quote: doc.content || '',
  avatar: normalizeImageFilename(doc.image),
  rating: doc.rating != null ? Number(doc.rating) : null,
  displayOrder: Number(doc.displayOrder) || 0,
});

const splitSettings = (custom = {}) => ({
  ...DEFAULT_TESTIMONIAL_SETTINGS,
  ...custom,
});

const getTestimonialSettings = async () => {
  const page = await CmsPage.findOne({ slug: TESTIMONIAL_SETTINGS_SLUG, isActive: true }).lean();
  return splitSettings(page?.customFields || {});
};

const buildFilter = (search = '', activeOnly = true) => {
  const filter = activeOnly ? { isActive: true } : {};
  const term = String(search || '').trim();
  if (!term) return filter;

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    ...filter,
    $or: [{ name: regex }, { title: regex }, { content: regex }],
  };
};

const getPublicTestimonials = async ({ search = '', limit } = {}) => {
  const settings = await getTestimonialSettings();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  const filter = buildFilter(search, true);

  const docs = await Testimonial.find(filter)
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return {
    settings,
    testimonials: docs.map(mapPublicTestimonial),
    mediaBaseUrl: { img: TESTIMONIAL_IMAGE_BASE },
  };
};

module.exports = {
  TESTIMONIAL_SETTINGS_SLUG,
  DEFAULT_TESTIMONIAL_SETTINGS,
  TESTIMONIAL_IMAGE_BASE,
  getPublicTestimonials,
};
