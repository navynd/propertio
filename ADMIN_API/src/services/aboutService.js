const CmsPage = require('../models/cmsPageModel');

const ABOUT_SETTINGS_SLUG = 'about-overview';

const DEFAULT_ABOUT_SETTINGS = {
  heroEyebrow: 'THE ESTATEHUB DISTINCTION',
  heroHeadline: "Redefining Luxury Real Estate Across The World's Prime Markets.",
  heroSubheadline:
    "From penthouses in Manhattan and private estates in Mayfair to waterfront sanctuaries in Dubai and Lake Como, Estatehub curates the world's most distinguished properties for discerning buyers and institutional investors.",
  heroBannerImage: '',
  heroGalleryImages: ['', '', ''],
  bannerText: 'PRIME GLOBAL REAL ESTATE • VERIFIED BROKERAGE NETWORK • BESPOKE ADVISORY • INSTITUTIONAL OFF-PLAN',
  businessSectionTitle: 'Architecting the Future of Prime Property Discovery',
  businessParagraph1:
    'Estatehub stands as the premier international destination for verified luxury residential portfolios, off-plan developer developments, and private brokerage networks.',
  businessParagraph2:
    'Combining proprietary market intelligence with an invitation-only network of top-tier brokers and developers, we provide high-net-worth investors and buyers with seamless cross-border property acquisition and advisory.',
  businessCtaPrimaryLabel: 'Meet our team',
  businessCtaPrimaryUrl: '/teams',
  businessCtaSecondaryLabel: 'Explore prime listings',
  businessCtaSecondaryUrl: '/searchlisting',
  stat1Value: '$14B+',
  stat1Description:
    'Prime property transaction and advisory volume facilitated across international markets',
  stat2Value: '50+',
  stat2Description:
    'Tier-one global capital cities and ultra-luxury resort destinations represented worldwide',
  stat3Value: '100%',
  stat3Description:
    'Verified agency representation with rigorous title and developer due diligence standards',
  successSectionTitle: 'Global Milestones',
  ctaBackgroundImage: '',
  ctaHeadline: 'Elevate Your Property Portfolio',
  ctaSubheadline:
    "Access vetted off-market residences, iconic penthouses, and global developments with Estatehub's trusted advisory network.",
  ctaButtonLabel: 'Discover Prime Properties',
  ctaButtonUrl: '/searchlisting',
  seo: {
    metaTitle: 'About Us | Estatehub - Global Luxury Real Estate',
    metaDescription:
      "Learn about Estatehub, the world's premier destination for verified luxury residences, penthouses, and prime real estate investments.",
    metaKeywords: 'about estatehub, luxury real estate, prime residences, global property investments',
  },
};

const DEFAULT_TIMELINE = [
  {
    id: '1',
    month: 'NOV',
    day: '15',
    year: '2024',
    title: 'Global Intelligence & Valuation Engine Launch',
    description: 'Rolled out proprietary cross-border real estate valuation and yield analytics across 50+ tier-1 capital markets.',
    displayOrder: 1,
  },
  {
    id: '2',
    month: 'AUG',
    day: '10',
    year: '2024',
    title: 'Private Client Advisory Network Established',
    description: 'Inaugurated dedicated bespoke representation for ultra-high-net-worth acquisitions in London, New York, and Dubai.',
    displayOrder: 2,
  },
  {
    id: '3',
    month: 'APR',
    day: '28',
    year: '2024',
    title: 'Expansion into Prime European & US Metros',
    description: 'Integrated over 3,000 verified luxury residences across Manhattan, Paris, Mayfair, and Zurich.',
    displayOrder: 3,
  },
  {
    id: '4',
    month: 'JAN',
    day: '14',
    year: '2024',
    title: 'Institutional Developer Partnership Tier',
    description: 'Partnered with premier global developers to provide direct off-plan VIP allocations and digital masterplans.',
    displayOrder: 4,
  },
  {
    id: '5',
    month: 'OCT',
    day: '01',
    year: '2023',
    title: 'Founding of the Estatehub Global Marketplace',
    description: 'Pioneered the transparent, verified luxury property discovery platform connecting elite brokerages worldwide.',
    displayOrder: 5,
  },
];

const normalizeGalleryImages = (value) => {
  const list = Array.isArray(value) ? value : [];
  const normalized = list.map((item) => String(item || '').trim()).slice(0, 6);
  while (normalized.length < 3) normalized.push('');
  return normalized;
};

const normalizeTimeline = (entries) => {
  if (!Array.isArray(entries) || !entries.length) return DEFAULT_TIMELINE;

  return entries
    .map((entry, index) => ({
      id: String(entry.id || entry._id || index + 1),
      month: String(entry.month || '').trim().toUpperCase(),
      day: String(entry.day || '').trim(),
      year: String(entry.year || '').trim(),
      title: String(entry.title || '').trim(),
      description: String(entry.description || entry.desc || '').trim(),
      displayOrder:
        entry.displayOrder !== undefined && entry.displayOrder !== ''
          ? Number(entry.displayOrder)
          : index + 1,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const splitCustomFields = (custom = {}) => {
  const { timeline, ...settings } = custom;
  return {
    settings: {
      ...DEFAULT_ABOUT_SETTINGS,
      ...settings,
      heroGalleryImages: normalizeGalleryImages(
        settings.heroGalleryImages ?? DEFAULT_ABOUT_SETTINGS.heroGalleryImages
      ),
      seo: {
        ...DEFAULT_ABOUT_SETTINGS.seo,
        ...(settings.seo || {}),
      },
    },
    timeline: normalizeTimeline(timeline),
  };
};

const getAboutPage = async () => {
  const page = await CmsPage.findOne({ slug: ABOUT_SETTINGS_SLUG }).lean();
  return splitCustomFields(page?.customFields || {});
};

const saveAboutPage = async ({ settings = {}, timeline = [] }, adminId) => {
  const payload = {
    ...DEFAULT_ABOUT_SETTINGS,
    ...settings,
    heroGalleryImages: normalizeGalleryImages(
      settings.heroGalleryImages ?? DEFAULT_ABOUT_SETTINGS.heroGalleryImages
    ),
    seo: {
      ...DEFAULT_ABOUT_SETTINGS.seo,
      ...(settings.seo || {}),
    },
    timeline: normalizeTimeline(timeline),
  };

  await CmsPage.findOneAndUpdate(
    { slug: ABOUT_SETTINGS_SLUG },
    {
      title: 'About Us',
      slug: ABOUT_SETTINGS_SLUG,
      content: 'About us page settings',
      pageType: 'about',
      isActive: true,
      isPublished: true,
      customFields: payload,
      lastModifiedBy: adminId || undefined,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return splitCustomFields(payload);
};

module.exports = {
  ABOUT_SETTINGS_SLUG,
  DEFAULT_ABOUT_SETTINGS,
  DEFAULT_TIMELINE,
  normalizeGalleryImages,
  normalizeTimeline,
  getAboutPage,
  saveAboutPage,
};
