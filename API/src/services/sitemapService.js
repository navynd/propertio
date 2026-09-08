const CmsPage = require('../models/cmsPageModel');
const SitemapDocument = require('../models/sitemapDocumentModel');
const Countries = require('../models/countriesModel');

const SITEMAP_SETTINGS_SLUG = 'sitemap-overview';

const DEFAULT_SITEMAP_SETTINGS = {
  breadcrumbHomeLabel: 'Home',
  breadcrumbLabel: 'Site map',
  pageTitle: 'Sitemap',
  defaultCountryCode: 'AE',
  locationNames: {
    AE: 'Umm Al Quwain',
  },
};

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

const mapSitemapDocument = (doc) => {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: String(plain._id),
    countryCode: plain.countryCode,
    categoryName: plain.categoryName || '',
    slug: plain.slug || '',
    content: plain.content || '',
    isActive: plain.isActive !== false,
    displayOrder: plain.displayOrder || 0,
    updatedAt: plain.updatedAt,
    createdAt: plain.createdAt,
  };
};

const hasRenderableContent = (doc) => {
  const categoryName = String(doc.categoryName || '').trim();
  if (!categoryName) return false;
  return stripHtml(doc.content).length > 0;
};

const getSitemapSettings = async () => {
  const page = await CmsPage.findOne({ slug: SITEMAP_SETTINGS_SLUG }).lean();
  const custom = page?.customFields || {};
  return {
    ...DEFAULT_SITEMAP_SETTINGS,
    ...custom,
    locationNames: {
      ...DEFAULT_SITEMAP_SETTINGS.locationNames,
      ...(custom.locationNames || {}),
    },
  };
};

const listCountriesWithSitemapContent = async () => {
  const docs = await SitemapDocument.find({ isActive: true }).lean();
  const countryCodes = new Set();

  docs
    .map(mapSitemapDocument)
    .filter(hasRenderableContent)
    .forEach((doc) => {
      if (doc.countryCode) countryCodes.add(String(doc.countryCode).toUpperCase());
    });

  if (!countryCodes.size) return [];

  return Countries.find({
    isActive: true,
    code: { $in: Array.from(countryCodes) },
  })
    .sort({ displayOrder: 1, name: 1 })
    .lean();
};

const listDocuments = async ({ countryCode, activeOnly = false, publicView = false } = {}) => {
  const filter = {};
  if (countryCode) filter.countryCode = String(countryCode).toUpperCase();
  if (activeOnly) filter.isActive = true;

  const docs = await SitemapDocument.find(filter)
    .sort({ displayOrder: 1, categoryName: 1, createdAt: 1 })
    .lean();

  let mapped = docs.map(mapSitemapDocument);
  if (publicView) {
    mapped = mapped.filter(hasRenderableContent);
  }
  return mapped;
};

const getPublicSitemapPage = async ({ countryCode }) => {
  const settings = await getSitemapSettings();
  const defaultCode = String(settings.defaultCountryCode || 'AE').toUpperCase();
  const countries = await listCountriesWithSitemapContent();
  const availableCodes = countries.map((c) => String(c.code || '').toUpperCase()).filter(Boolean);

  let normalizedCountry = String(countryCode || defaultCode).toUpperCase();
  if (availableCodes.length) {
    if (!availableCodes.includes(normalizedCountry)) {
      normalizedCountry = availableCodes.includes(defaultCode)
        ? defaultCode
        : availableCodes[0];
    }
  }

  const documents = await listDocuments({
    countryCode: normalizedCountry,
    activeOnly: true,
    publicView: true,
  });

  const locationName =
    settings.locationNames?.[normalizedCountry] ||
    settings.locationNames?.[defaultCode] ||
    '';

  return {
    settings,
    countryCode: normalizedCountry,
    locationName,
    documents,
    countries,
  };
};

module.exports = {
  SITEMAP_SETTINGS_SLUG,
  DEFAULT_SITEMAP_SETTINGS,
  stripHtml,
  hasRenderableContent,
  mapSitemapDocument,
  getSitemapSettings,
  listCountriesWithSitemapContent,
  listDocuments,
  getPublicSitemapPage,
};
