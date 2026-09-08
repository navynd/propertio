export interface SeoFields {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
}

export interface AboutUsSettings {
    heroEyebrow: string;
    heroHeadline: string;
    heroSubheadline: string;
    heroBannerImage: string;
    heroGalleryImages: string[];
    bannerText: string;
    businessSectionTitle: string;
    businessParagraph1: string;
    businessParagraph2: string;
    businessCtaPrimaryLabel: string;
    businessCtaPrimaryUrl: string;
    businessCtaSecondaryLabel: string;
    businessCtaSecondaryUrl: string;
    stat1Value: string;
    stat1Description: string;
    stat2Value: string;
    stat2Description: string;
    stat3Value: string;
    stat3Description: string;
    successSectionTitle: string;
    ctaBackgroundImage: string;
    ctaHeadline: string;
    ctaSubheadline: string;
    ctaButtonLabel: string;
    ctaButtonUrl: string;
    seo: SeoFields;
}

export interface SuccessTimelineEntry {
    id: string;
    month: string;
    day: string;
    year: string;
    title: string;
    description: string;
    displayOrder: number;
}

export interface TeamPageSettings {
    pageTitle: string;
    pageSubtitle: string;
    itemsPerPage: number;
    seo: SeoFields;
}

export interface TeamMember {
    id: string;
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    profileImage: string;
    displayOrder: number;
    isActive: boolean;
}

export interface TestimonialSectionSettings {
    sectionTitle: string;
    sectionSubtitle: string;
}

export interface TestimonialItem {
    id: string;
    name: string;
    title: string;
    content: string;
    image: string;
    rating: number | null;
    displayOrder: number;
    isActive: boolean;
}

export interface ContactPageSettings {
    heroTitle: string;
    heroSubtitle: string;
    heroBackgroundImage: string;
    sectionTitle: string;
    sectionSubtext: string;
    email: string;
    phone: string;
    officeAddress: string;
    mapUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    twitterUrl: string;
    linkedinUrl: string;
    seo: SeoFields;
}

export interface OfficeLocation {
    id: string;
    city: string;
    country: string;
    locationType: string;
    address: string;
    mapUrl: string;
    phone: string;
    email: string;
    displayOrder: number;
    isActive: boolean;
}

export interface ContactSubmission {
    id: string;
    name: string;
    email: string;
    phone: string;
    subject: string;
    comments: string;
    submittedAt: string;
}

export interface SitemapCategory {
    id: string;
    label: string;
}

export interface SitemapLink {
    id: number;
    label: string;
    url: string;
    column: 1 | 2 | 3;
    displayOrder: number;
}

export interface SitemapSection {
    id: number;
    title: string;
    categoryId: string;
    location: string;
    links: SitemapLink[];
    isActive: boolean;
}

export interface LegalDocument {
    id: string;
    tabLabel: string;
    documentTitle: string;
    content: string;
    country: string;
    language: string;
    isActive: boolean;
    displayOrder: number;
}

export interface BlogCategory {
    id: number;
    name: string;
    slug: string;
}

export interface BlogTag {
    id: number;
    name: string;
    slug: string;
}

export interface BlogPost {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string;
    categoryId: number;
    tagIds: number[];
    authorName: string;
    readTime: string;
    publishDate: string;
    isFeatured: boolean;
    isPublished: boolean;
    displayOrder: number;
    seo: SeoFields;
}

export interface BlogPageSettings {
    pageTitle: string;
    pageSubtitle: string;
    featuredSectionTitle: string;
    featuredSectionSubtitle: string;
    itemsPerPage: number;
    showSearch: boolean;
    showCategoryFilters: boolean;
    showRecentPostsSidebar: boolean;
    enableComments: boolean;
    seo: SeoFields;
}

export const SITEMAP_CATEGORIES: SitemapCategory[] = [
    { id: "buy", label: "Buy" },
    { id: "rent", label: "Rent" },
    { id: "commercial-buy", label: "Commercial Buy" },
    { id: "commercial-rent", label: "Commercial Rent" },
];

export const teamMembersSeed: TeamMember[] = [
    { id: "1", fullName: "William James", jobTitle: "Senior Property Consultant", email: "william@molumulk.ae", phone: "+971 4 558 0001", profileImage: "", displayOrder: 1, isActive: true },
    { id: "2", fullName: "Sarah Ahmed", jobTitle: "Property Advisor", email: "sarah@molumulk.ae", phone: "+971 4 558 0002", profileImage: "", displayOrder: 2, isActive: true },
    { id: "3", fullName: "Mohamed Ali", jobTitle: "Sales Manager", email: "mohamed@molumulk.ae", phone: "+971 4 558 0003", profileImage: "", displayOrder: 3, isActive: true },
];

export const officeLocationsSeed: OfficeLocation[] = [
    {
        id: "istanbul-tech",
        city: "Istanbul",
        country: "Turkey",
        locationType: "Tech hub",
        address: "Maslak, Maslak Mah., Ahi Evran Cd. No:6 D:3, 42, D:D Blok, 34398 Sarıyer/İstanbul",
        mapUrl: "https://maps.google.com",
        phone: "+90 212 924 10 24",
        email: "info@molumulk.com.tr",
        displayOrder: 1,
        isActive: true,
    },
];

export const contactSubmissionsSeed: ContactSubmission[] = [
    {
        id: "seed-1",
        name: "John Doe",
        email: "john@example.com",
        phone: "+971 50 123 4567",
        subject: "General Inquiry",
        comments: "I would like to know more about your services.",
        submittedAt: "2025-05-20",
    },
];

export const legalDocumentsSeed: LegalDocument[] = [
    { id: "terms", tabLabel: "Terms of use", documentTitle: "Terms & Conditions for Users", content: "", country: "UAE", language: "EN", isActive: true, displayOrder: 1 },
    { id: "community", tabLabel: "Community guidelines", documentTitle: "Community Guidelines", content: "", country: "UAE", language: "EN", isActive: true, displayOrder: 2 },
    { id: "api", tabLabel: "API Terms of use", documentTitle: "API Terms of Use", content: "", country: "UAE", language: "EN", isActive: true, displayOrder: 3 },
    { id: "privacy", tabLabel: "Privacy Policy", documentTitle: "Privacy Policy", content: "", country: "UAE", language: "EN", isActive: true, displayOrder: 4 },
    { id: "cookie", tabLabel: "Cookie Policy", documentTitle: "Cookie Policy", content: "", country: "UAE", language: "EN", isActive: true, displayOrder: 5 },
];

export const blogCategoriesSeed: BlogCategory[] = [
    { id: 1, name: "Real Estate News", slug: "real-estate-news" },
    { id: 2, name: "Interior Design", slug: "interior-design" },
    { id: 3, name: "Community Guides", slug: "community-guides" },
];

export const blogTagsSeed: BlogTag[] = [
    { id: 1, name: "Dubai", slug: "dubai" },
    { id: 2, name: "Investment", slug: "investment" },
    { id: 3, name: "Tips", slug: "tips" },
    { id: 4, name: "Lifestyle", slug: "lifestyle" },
];

export const blogPostsSeed: BlogPost[] = [
    {
        id: 1,
        title: "It All Starts Here",
        slug: "it-all-starts-here",
        excerpt: "Everything you need to know before buying your next home.",
        content: "",
        coverImage: "",
        categoryId: 1,
        tagIds: [1, 2, 3],
        authorName: "Admin",
        readTime: "5 min read",
        publishDate: "2026-05-27",
        isFeatured: true,
        isPublished: true,
        displayOrder: 1,
        seo: {
            metaTitle: "It All Starts Here | Blog",
            metaDescription: "A complete guide for new property buyers.",
            metaKeywords: "property, blog, buy home",
        },
    },
];

export const sitemapSectionsSeed: SitemapSection[] = [
    {
        id: 1,
        title: "Terms & Conditions For Users",
        categoryId: "buy",
        location: "Umm Al Quwain",
        links: [
            { id: 1, label: "Apartments for sale", url: "/buy/apartments", column: 1, displayOrder: 1 },
            { id: 2, label: "Villas for sale", url: "/buy/villas", column: 1, displayOrder: 2 },
            { id: 3, label: "Townhouses for sale", url: "/buy/townhouses", column: 2, displayOrder: 1 },
        ],
        isActive: true,
    },
];

export const defaultAboutUsSettings: AboutUsSettings = {
    heroEyebrow: "ABOUT US",
    heroHeadline: "To motivate and inspire people to get living the life they deserve.",
    heroSubheadline: "When you look for a property, it's not just a better home you seek, it's a better future.",
    heroBannerImage: "",
    heroGalleryImages: ["", "", ""],
    bannerText: "Unlock your potential",
    businessSectionTitle: "How can we help for your business?",
    businessParagraph1: "We help businesses connect with the right audience through property listings and insights.",
    businessParagraph2: "Our platform supports agents, developers, and agencies to grow their reach.",
    businessCtaPrimaryLabel: "Meet our team",
    businessCtaPrimaryUrl: "/teams",
    businessCtaSecondaryLabel: "Find properties",
    businessCtaSecondaryUrl: "/searchlisting",
    stat1Value: "100%",
    stat1Description: "Trust worthy for real estate business growth and individual property selling",
    stat2Value: "90%",
    stat2Description: "Dubai properties listed here are verified and ready for you to own and use.",
    stat3Value: "10k+",
    stat3Description: "Real estate companies and Agents are registered here for there growth",
    successSectionTitle: "Our Success",
    ctaBackgroundImage: "",
    ctaHeadline: "Ready to Invest or Move?",
    ctaSubheadline: "Verified listings, trusted agents, and real opportunities — all in one place.",
    ctaButtonLabel: "Discover Properties",
    ctaButtonUrl: "/searchlisting",
    seo: { metaTitle: "About Us | Molumulk", metaDescription: "Learn about Molumulk", metaKeywords: "about, molumulk" },
};

export const defaultTeamPageSettings: TeamPageSettings = {
    pageTitle: "Our Team",
    pageSubtitle: "Meet the people behind Molumulk",
    itemsPerPage: 24,
    seo: { metaTitle: "Our Team | Molumulk", metaDescription: "Meet our team", metaKeywords: "team, molumulk" },
};

export const defaultTestimonialSettings: TestimonialSectionSettings = {
    sectionTitle: "Don't take our word for it!",
    sectionSubtitle: "Hear it from our customers",
};

export const BANNER_PLACEMENT_OPTIONS = [
    { value: "listing-page", label: "Property Listing Page" },
    { value: "project-page", label: "Project Listing Page" },
    { value: "search-page", label: "Search Page" },
    { value: "home-page", label: "Home Page" },
    { value: "agent-page", label: "Agent Page" },
    { value: "agency-page", label: "Agency Page" },
];

export const defaultBannerSettings = {
    defaultButtonText: "Explore more",
    autoSlideInterval: 5000,
};

export const defaultContactPageSettings: ContactPageSettings = {
    heroTitle: "We want to hear from you",
    heroSubtitle: "Send us a message, give us a call, or better still visit us.",
    heroBackgroundImage: "",
    sectionTitle: "Let's get in touch",
    sectionSubtext: "Contact if you have any queries",
    email: "info@molumulk.ae",
    phone: "+971 4 558 0000",
    officeAddress: "Media City, Shatha Tower, 1505, Dubai, UAE",
    mapUrl: "https://maps.google.com",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    twitterUrl: "https://twitter.com",
    linkedinUrl: "https://linkedin.com",
    seo: { metaTitle: "Contact Us | Molumulk", metaDescription: "Get in touch with Molumulk", metaKeywords: "contact, molumulk" },
};

export const defaultBlogPageSettings: BlogPageSettings = {
    pageTitle: "Browse our blogs",
    pageSubtitle: "Insights and updates from the Molumulk team",
    featuredSectionTitle: "Featured Article",
    featuredSectionSubtitle: "Top picks from our editors",
    itemsPerPage: 15,
    showSearch: true,
    showCategoryFilters: true,
    showRecentPostsSidebar: true,
    enableComments: true,
    seo: {
        metaTitle: "Blogs | Molumulk",
        metaDescription: "Read the latest property insights and updates.",
        metaKeywords: "blog, property, insights",
    },
};
