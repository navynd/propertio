const { Router } = require('express');
const router = Router();

const inquiryController = require('../controllers/public/inquiryController');
const propertySearchController = require('../controllers/public/propertySearchController');
const projectSearchController = require('../controllers/public/projectSearchController');
const mortgageController = require('../controllers/public/mortgageController');
const rentVsBuyController = require('../controllers/public/rentVsBuyController');
const reportController = require('../controllers/public/reportController');
const cmsController = require('../controllers/public/cmsController');
const blogsController = require('../controllers/public/blogsController');
const legalController = require('../controllers/public/legalController');
const aboutController = require('../controllers/public/aboutController');
const contactController = require('../controllers/public/contactController');
const teamController = require('../controllers/public/teamController');
const testimonialController = require('../controllers/public/testimonialController');
const bannerController = require('../controllers/public/bannerController');
const sitemapController = require('../controllers/public/sitemapController');
const historicalTransactionsController = require('../controllers/public/historicalTransactionsController');
// const pushTestController = require('../controllers/public/pushTestController');
const { optionalAuthenticate } = require('../middlewares/auth');
const { reportAttachmentsUpload, multerErrorHandler } = require('../config/multer');

/* Inquiry routes starts */
// Optional authentication - works for both logged-in users and guests
router.post('/inquiries/create', optionalAuthenticate, inquiryController.createInquiry);
/* Inquiry routes ends */

/* Reports routes starts */
// Optional authentication - works for both logged-in users and guests
router.post('/reports/create', optionalAuthenticate, reportController.createReport);
router.post(
  '/reports/upload-attachments',
  optionalAuthenticate,
  reportAttachmentsUpload(),
  multerErrorHandler,
  reportController.uploadReportAttachments,
);
/* Reports routes ends */

/* Historical transactions (Area Insights) */
router.get(
  '/transactions/historical',
  optionalAuthenticate,
  historicalTransactionsController.getHistoricalTransactionsHandler,
);

/* Property search routes starts */
router.post('/properties/search', optionalAuthenticate, propertySearchController.searchProperties);
router.get('/properties/price-insights/:id',optionalAuthenticate, propertySearchController.getPropertyPriceInsightsById);
router.get('/properties/:id', optionalAuthenticate, propertySearchController.getPropertyById);
/* Property search routes ends */

/* Project search routes starts */
router.post('/projects/search', optionalAuthenticate, projectSearchController.searchProjects);
router.get('/projects/:id', optionalAuthenticate, projectSearchController.getProjectById);
/* Project search routes ends */

/* Mortgage routes starts */
router.post('/mortgages/calculate', optionalAuthenticate, mortgageController.calculateMortgage);
router.post('/mortgages/upfront-costs', optionalAuthenticate, mortgageController.calculateUpfrontCosts);
router.post('/mortgages/get-quote', optionalAuthenticate, mortgageController.getQuote);
router.post('/rent-vs-buy/calculate', optionalAuthenticate, rentVsBuyController.calculateRentVsBuy);
router.post('/rent-vs-buy/payment-breakdown', optionalAuthenticate, rentVsBuyController.calculateRentVsBuyPaymentBreakdown);
/* Mortgage routes ends */

/* Help / FAQ routes starts */
router.get('/help/faqs', optionalAuthenticate, cmsController.getHelpFaqs);
/* Help / FAQ routes ends */

/* Blog routes — consolidated read + interactions */
router.get('/blogs', optionalAuthenticate, blogsController.getBlogs);
router.post('/blogs', optionalAuthenticate, blogsController.mutateBlogs);

/* Legal pages */
router.get('/legal', optionalAuthenticate, legalController.getLegal);

/* About page */
router.get('/about', optionalAuthenticate, aboutController.getAbout);

/* Contact page */
router.get('/contact', optionalAuthenticate, contactController.getContact);
router.post('/contact', optionalAuthenticate, contactController.submitContact);

/* Team page */
router.get('/teams', optionalAuthenticate, teamController.getTeams);

/* Home testimonials */
router.get('/testimonials', optionalAuthenticate, testimonialController.getTestimonials);

/* Page banners */
router.get('/banners', optionalAuthenticate, bannerController.getBanners);

/* Sitemap page */
router.get('/sitemap', optionalAuthenticate, sitemapController.getSitemap);

/* Public settings bootstrap */
const systemSettingsController = require('../controllers/public/systemSettingsController');
router.get('/settings', systemSettingsController.getSettings);

/* Temporary push test route (remove after verification) */
// router.post('/notifications/push/test', pushTestController.sendWebPushTest);


module.exports = router;