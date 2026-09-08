const CmsPage = require('../models/cmsPageModel');
const TeamMember = require('../models/teamMemberModel');

const TEAM_SETTINGS_SLUG = 'team-overview';

const DEFAULT_TEAM_SETTINGS = {
  pageTitle: 'Our Team',
  pageSubtitle: 'Meet the people behind Molumulk',
  itemsPerPage: 24,
  seo: {
    metaTitle: 'Our Team | Molumulk',
    metaDescription: 'Meet our team',
    metaKeywords: 'team, property finder',
  },
};

const TEAM_IMAGE_BASE =
  process.env.TEAM_IMAGE_BASE_URL ||
  'https://d1dp1oh0ra5b0z.cloudfront.net/img/team/';

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

const mapMember = (doc) => ({
  id: String(doc._id),
  fullName: doc.fullName || '',
  jobTitle: doc.jobTitle || '',
  email: doc.email || '',
  phone: doc.phone || '',
  profileImage: normalizeImageFilename(doc.profileImage),
  displayOrder: Number(doc.displayOrder) || 0,
});

const splitSettings = (custom = {}) => ({
  ...DEFAULT_TEAM_SETTINGS,
  ...custom,
  seo: {
    ...DEFAULT_TEAM_SETTINGS.seo,
    ...(custom.seo || {}),
  },
});

const getTeamSettings = async () => {
  const page = await CmsPage.findOne({ slug: TEAM_SETTINGS_SLUG, isActive: true }).lean();
  return splitSettings(page?.customFields || {});
};

const buildMemberFilter = (search = '', activeOnly = true) => {
  const filter = activeOnly ? { isActive: true } : {};
  const term = String(search || '').trim();
  if (!term) return filter;

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    ...filter,
    $or: [{ fullName: regex }, { jobTitle: regex }, { email: regex }, { phone: regex }],
  };
};

const getPublicTeamPage = async ({ search = '', page = 1, limit } = {}) => {
  const settings = await getTeamSettings();
  const safeLimit = Math.min(
    Math.max(Number(limit) || Number(settings.itemsPerPage) || 24, 1),
    50
  );
  const safePage = Math.max(Number(page) || 1, 1);
  const filter = buildMemberFilter(search, true);
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    TeamMember.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    TeamMember.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    settings,
    members: docs.map(mapMember),
    pagination: { page: safePage, limit: safeLimit, total, pages },
    mediaBaseUrl: { img: TEAM_IMAGE_BASE },
  };
};

module.exports = {
  TEAM_SETTINGS_SLUG,
  DEFAULT_TEAM_SETTINGS,
  TEAM_IMAGE_BASE,
  getPublicTeamPage,
};
