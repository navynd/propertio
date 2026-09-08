const CmsPage = require('../models/cmsPageModel');
const LegalDocument = require('../models/legalDocumentModel');
const Countries = require('../models/countriesModel');

const LEGAL_SETTINGS_SLUG = 'legal-overview';

const DEFAULT_LEGAL_SETTINGS = {
  termsPageTitle: 'Terms and conditions',
  privacyPageTitle: 'Privacy policy',
  breadcrumbHomeLabel: 'Home',
  defaultCountryCode: 'AE',
  contactBlock: {
    supportEmail: 'support@estatehub.ae',
    sectionTitle: 'Contact us',
  },
};

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

const isPrivacyCategory = (doc) => {
  const slug = String(doc.slug || '').toLowerCase();
  const name = String(doc.categoryName || '').toLowerCase();
  return slug === 'privacy-policy' || slug === 'privacy' || name.includes('privacy');
};

const resolveDocumentPageType = (doc) => {
  const pageType = String(doc?.pageType || '').toLowerCase();
  if (pageType === 'terms' || pageType === 'privacy') return pageType;
  return isPrivacyCategory(doc) ? 'privacy' : 'terms';
};

const hasRenderableContent = (doc) => {
  const categoryName = String(doc.categoryName || '').trim();
  if (!categoryName) return false;
  return stripHtml(doc.content).length > 0;
};

const mapLegalDocument = (doc) => {
  if (!doc) return doc;
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: String(plain._id),
    countryCode: plain.countryCode,
    pageType: resolveDocumentPageType(plain),
    categoryName: plain.categoryName || '',
    slug: plain.slug || '',
    content: plain.content || '',
    isActive: plain.isActive !== false,
    displayOrder: plain.displayOrder || 0,
    updatedAt: plain.updatedAt,
    createdAt: plain.createdAt,
  };
};

const getLegalSettings = async () => {
  const page = await CmsPage.findOne({ slug: LEGAL_SETTINGS_SLUG }).lean();
  const custom = page?.customFields || {};
  return {
    ...DEFAULT_LEGAL_SETTINGS,
    ...custom,
    contactBlock: {
      ...DEFAULT_LEGAL_SETTINGS.contactBlock,
      ...(custom.contactBlock || {}),
    },
  };
};

const saveLegalSettings = async (settings, adminId) => {
  const payload = {
    ...DEFAULT_LEGAL_SETTINGS,
    ...settings,
    contactBlock: {
      ...DEFAULT_LEGAL_SETTINGS.contactBlock,
      ...(settings?.contactBlock || {}),
    },
  };

  await CmsPage.findOneAndUpdate(
    { slug: LEGAL_SETTINGS_SLUG },
    {
      title: 'Legal Overview',
      slug: LEGAL_SETTINGS_SLUG,
      content: 'Legal pages settings',
      pageType: 'other',
      isActive: true,
      isPublished: true,
      customFields: payload,
      lastModifiedBy: adminId || undefined,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return payload;
};

const resolveDefaultCountryCode = async () => {
  const settings = await getLegalSettings();
  return String(
    settings.defaultCountryCode || DEFAULT_LEGAL_SETTINGS.defaultCountryCode || 'AE'
  ).toUpperCase();
};

const listActiveCountries = async () =>
  Countries.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();

const filterDocumentsForPageType = (documents, pageType) =>
  documents.filter((doc) => resolveDocumentPageType(doc) === pageType);

const listCountriesWithLegalContent = async (pageType) => {
  const docs = await LegalDocument.find({ isActive: true }).lean();
  const countryCodes = new Set();

  filterDocumentsForPageType(
    docs.map(mapLegalDocument).filter(hasRenderableContent),
    pageType
  ).forEach((doc) => {
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

  const docs = await LegalDocument.find(filter)
    .sort({ displayOrder: 1, categoryName: 1, createdAt: 1 })
    .lean();

  let mapped = docs.map(mapLegalDocument);
  if (publicView) {
    mapped = mapped.filter(hasRenderableContent);
  }
  return mapped;
};

const getPublicLegalPage = async ({ pageType, countryCode }) => {
  const settings = await getLegalSettings();
  const defaultCode = await resolveDefaultCountryCode();
  const countries = await listCountriesWithLegalContent(pageType);
  const availableCodes = countries.map((c) => String(c.code || '').toUpperCase()).filter(Boolean);

  let normalizedCountry = String(countryCode || defaultCode).toUpperCase();
  if (availableCodes.length) {
    if (!availableCodes.includes(normalizedCountry)) {
      normalizedCountry = availableCodes.includes(defaultCode)
        ? defaultCode
        : availableCodes[0];
    }
  }

  let documents = await listDocuments({
    countryCode: normalizedCountry,
    activeOnly: true,
    publicView: true,
  });

  documents = filterDocumentsForPageType(documents, pageType);

  return { settings, documents, countryCode: normalizedCountry, countries };
};

module.exports = {
  LEGAL_SETTINGS_SLUG,
  DEFAULT_LEGAL_SETTINGS,
  stripHtml,
  isPrivacyCategory,
  resolveDocumentPageType,
  hasRenderableContent,
  mapLegalDocument,
  getLegalSettings,
  saveLegalSettings,
  resolveDefaultCountryCode,
  listActiveCountries,
  listCountriesWithLegalContent,
  filterDocumentsForPageType,
  listDocuments,
  getPublicLegalPage,
};
