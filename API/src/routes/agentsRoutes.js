const { Router } = require('express');
const router = Router();

const agentsController = require('../controllers/agents/agentsController');
const propertyController = require('../controllers/agents/propertyController');
const allocationController = require('../controllers/agents/allocationController');
const inquirysController = require('../controllers/agents/inquirysController');
const agentSearchController = require('../controllers/public/agentSearchController');
const projectInquirysController = require('../controllers/agents/projectInquirysController');
const projectController = require('../controllers/agents/projectController');
const dashboardController = require('../controllers/agents/dashboardController');
const agentPushController = require('../controllers/agents/agentPushController');
const agentNotificationController = require('../controllers/agents/notificationController');
const { authenticateAgent } = require('../middlewares/auth');
const { uploadPropertyMedia, uploadSingleDocument, multerErrorHandler } = require('../config/multer');


// Agent dashboard (must be before /:id)
router.get('/dashboard', authenticateAgent, dashboardController.getDashboard);

// Agent profile management
router.get('/profile', authenticateAgent, agentsController.getProfile);
router.put('/profile', authenticateAgent, agentsController.updateProfile);

// Agent property management
router.post('/properties/create', authenticateAgent, propertyController.createProperty);
router.get('/properties', authenticateAgent, propertyController.getAgentProperties);
router.put('/properties/:id', authenticateAgent, propertyController.updateProperty);
router.put('/properties/:id/status', authenticateAgent, propertyController.changePropertyStatus);
router.delete('/properties/:id', authenticateAgent, propertyController.deleteProperty);

// Unified media upload/remove API (works with or without propertyId)
router.post(
    '/properties/upload-media',
    authenticateAgent,
    uploadPropertyMedia(),
    multerErrorHandler,
    propertyController.uploadPropertyMedia
);

// Agent allocated properties (from agency)
router.get('/allocated-properties', authenticateAgent, allocationController.listAllocatedProperties);
router.get('/allocated-properties/:id', authenticateAgent, allocationController.getAllocatedPropertyById);
router.post('/allocated-properties/:id/complete', authenticateAgent, allocationController.completeAllocation);

// Agent inquiries (property + project leads)
router.get('/inquiries', authenticateAgent, inquirysController.listInquiries);
router.get('/inquiries/:id', authenticateAgent, inquirysController.getInquiryById);
router.post('/inquiries/:id/status', authenticateAgent, inquirysController.updateInquiryStatus);
router.post('/inquiries/:id/close-deal', authenticateAgent, inquirysController.closeDeal);
router.delete('/inquiries/:id', authenticateAgent, inquirysController.deleteInquiry);

// Agent project leads
router.get('/project-leads', authenticateAgent, projectInquirysController.listProjectLeads);
router.get('/project-leads/:id', authenticateAgent, projectInquirysController.getProjectLeadById);
router.post(
  '/project-leads/close-deal-document',
  authenticateAgent,
  uploadSingleDocument('document'),
  multerErrorHandler,
  projectInquirysController.uploadCloseDealDocument,
);
router.get('/project-leads/:id/available-units',authenticateAgent,projectInquirysController.getAvailableUnits);
router.post('/project-leads/:id/status',authenticateAgent,projectInquirysController.updateProjectLeadStatus);
router.post('/project-leads/:id/submit-deal',authenticateAgent,projectInquirysController.submitDeal);
router.post('/project-leads/:id/notes', authenticateAgent, projectInquirysController.addNote);
router.delete('/project-leads/:id',authenticateAgent,projectInquirysController.deleteProjectLead);

// Agent allocated projects (list + detail via ?projectId)
router.get('/projects', authenticateAgent, projectController.getAgentProjects);
// Agent project units (list + layout detail via ?layoutId)
router.get('/projects/units', authenticateAgent, projectController.getAgentProjectUnits);

// Agent notification push token management
router.post('/notifications/push/register', authenticateAgent, agentPushController.registerPushToken);
router.delete('/notifications/push/unregister', authenticateAgent, agentPushController.unregisterPushToken);
router.get('/notifications', authenticateAgent, agentNotificationController.listNotifications);
router.put('/notifications/read-all', authenticateAgent, agentNotificationController.markAllAsRead);
router.put('/notifications/:id/read', authenticateAgent, agentNotificationController.markAsRead);
router.delete('/notifications', authenticateAgent, agentNotificationController.deleteNotifications);

// Agent public routes
router.get('/search', agentSearchController.searchAgents);
/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     summary: Get public agent profile
 *     description: Get detailed public profile of an active agent
 *     tags: [Agents, Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ObjectId
 *     responses:
 *       200:
 *         description: Agent profile fetched successfully
 *       400:
 *         description: Invalid agent ID
 *       404:
 *         description: Agent not found
 */
router.get('/:id', agentSearchController.getAgentProfile);

module.exports = router;