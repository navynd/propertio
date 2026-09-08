const { Router } = require('express');
const router = Router();

const developerController = require('../controllers/developer/developerController');
const projectController = require('../controllers/developer/projectController');
const developerSearchController = require('../controllers/public/developerSearchController');
const revenueController = require('../controllers/developer/revenueController');
const dashboardController = require('../controllers/developer/dashboardController');
const developerPushController = require('../controllers/developer/developerPushController');
const developerNotificationController = require('../controllers/developer/notificationController');
const { authenticateDeveloper } = require('../middlewares/auth');
const { uploadProjectMedia, multerErrorHandler } = require('../config/multer');

// Dashboard routes
router.get('/dashboard', authenticateDeveloper, dashboardController.getDashboard);
// Developer profile management
router.get('/profile', authenticateDeveloper, developerController.getProfile);
router.put('/profile', authenticateDeveloper, developerController.updateProfile);

// Developer project management (literal paths before /:id to avoid "layout" matching :id)
router.post('/projects/create', authenticateDeveloper, projectController.createProject);
router.get('/projects', authenticateDeveloper, projectController.getDeveloperProjects);
router.get('/projects/units', authenticateDeveloper, projectController.getProjectUnits);
router.put('/projects/layout', authenticateDeveloper, projectController.updateLayout);
router.delete('/projects/layout', authenticateDeveloper, projectController.deleteLayout);
router.put('/projects/progress', authenticateDeveloper, projectController.updateProjectProgress);
router.delete('/projects', authenticateDeveloper, projectController.deleteProject);

// Project FAQs management
router.post('/projects/:id/faqs', authenticateDeveloper, projectController.addFAQ);
router.put('/projects/:id/faqs/:faqId', authenticateDeveloper, projectController.updateFAQ);
router.delete('/projects/:id/faqs/:faqId', authenticateDeveloper, projectController.deleteFAQ);

// Assign Agencies to Projects
router.post('/projects/assign-agencies', authenticateDeveloper, projectController.assignAgencies);
router.put('/projects/assign-agencies', authenticateDeveloper, projectController.updateAgencyAssignment);
router.delete('/projects/assign-agencies', authenticateDeveloper, projectController.cancelAgencyAssignment);
router.put('/projects/:id', authenticateDeveloper, projectController.updateProject);

// Developer notification push token management
router.post('/notifications/push/register', authenticateDeveloper, developerPushController.registerPushToken);
router.delete('/notifications/push/unregister', authenticateDeveloper, developerPushController.unregisterPushToken);
router.get('/notifications', authenticateDeveloper, developerNotificationController.listNotifications);
router.put('/notifications/read-all', authenticateDeveloper, developerNotificationController.markAllAsRead);
router.put('/notifications/:id/read', authenticateDeveloper, developerNotificationController.markAsRead);
router.delete('/notifications', authenticateDeveloper, developerNotificationController.deleteNotifications);

//Developer dropdown
router.get('/agency', authenticateDeveloper, developerController.getDropdown);

// Revenue routes (developer)
// Static routes before dynamic `/:id` routes
router.get('/revenue/dropdown', authenticateDeveloper, revenueController.getDropdown);
router.get('/revenue', authenticateDeveloper, revenueController.getRevenue);
router.post('/revenue', authenticateDeveloper, revenueController.addDeal);
router.put('/revenue/:dealId', authenticateDeveloper, revenueController.editDeal);
router.delete('/revenue/:dealId', authenticateDeveloper, revenueController.deleteDeal);

// Unified media upload/remove API (works with or without projectId)
router.post(
    '/projects/upload-media',
    authenticateDeveloper,
    uploadProjectMedia(),
    multerErrorHandler,
    projectController.uploadProjectMedia
);

// Public developer search
router.get('/search', developerSearchController.searchDevelopers);
/**
 * @swagger
 * /developers/{id}:
 *   get:
 *     summary: Get public developer profile
 *     tags: [Developers, Public]
 */
router.get('/:id', developerSearchController.getDeveloperProfile);


module.exports = router;

