const { Router } = require('express');
const router = Router();

const agenciesController = require('../controllers/agency/agenciesController');
const agencyAgentsController = require('../controllers/agency/agentsController');
const agencyPropertyController = require('../controllers/agency/propertyController');
const allocationController = require('../controllers/agency/allocationController');
const agencyInquirysController = require('../controllers/agency/inquirysController');
const agencySearchController = require('../controllers/public/agencySearchController');
const agencyDashboardController = require('../controllers/agency/dashboardController');
const agencyPushController = require('../controllers/agency/agencyPushController');
const agencyNotificationController = require('../controllers/agency/notificationController');
const { authenticateAgency } = require('../middlewares/auth');
const { uploadSingleDocument, uploadSingleImage, uploadPropertyMedia, multerErrorHandler } = require('../config/multer');
const agencyProjectController = require('../controllers/agency/projectController');
const agencyProjectInquirysController = require('../controllers/agency/projectInquirysController');
// Agency agent invitation management
router.post('/invite', authenticateAgency, agenciesController.sendAgentInvitation);

// Agency dashboard management
router.get('/dashboard', authenticateAgency, agencyDashboardController.getDashboard);

// Agency profile management
router.get('/profile', authenticateAgency, agenciesController.getProfile);
router.put('/profile', authenticateAgency, agenciesController.updateProfile);

// Agency agents management
router.get('/agents', authenticateAgency, agencyAgentsController.listAgents);
router.post('/agents/:id/verify', authenticateAgency, agencyAgentsController.verifyAgentInvitation);
router.get('/agents/:id', authenticateAgency, agencyAgentsController.getAgentById);
router.put('/agents/:id', authenticateAgency, agencyAgentsController.updateAgent);
router.post('/agents/:agentId/upload-profile-picture', authenticateAgency, uploadSingleImage('profilePicture'), multerErrorHandler, agencyAgentsController.uploadAgentProfilePicture);
router.delete('/agents', authenticateAgency, agencyAgentsController.bulkDeleteAgents);

// Agency property management
router.get('/properties', authenticateAgency, agencyPropertyController.getAgencyProperties);
router.post(
  '/properties/upload-media',
  authenticateAgency,
  uploadPropertyMedia(),
  multerErrorHandler,
  agencyPropertyController.uploadAgencyPropertyMedia
);
router.put('/properties/:id', authenticateAgency, agencyPropertyController.updateProperty);
router.delete('/properties/:id', authenticateAgency, agencyPropertyController.deleteProperty);

// Agency property allocation management
router.post('/allocation/send', authenticateAgency, uploadSingleDocument('document'), multerErrorHandler, allocationController.sendPropertyToAgent);
router.get('/allocation/list', authenticateAgency, allocationController.getAllocatedProperties);
router.get('/allocation/:id', authenticateAgency, allocationController.getPropertyAllocation);
router.put('/allocation/:id', authenticateAgency, allocationController.updatePropertyAllocation);
router.put('/allocation/:id/cancel', authenticateAgency, allocationController.cancelPropertyAllocation);

// Agency inquiries management
router.get('/inquiries', authenticateAgency, agencyInquirysController.listInquiries);
router.get('/inquiries/:id', authenticateAgency, agencyInquirysController.getInquiryById);
router.post('/inquiries/:id/status', authenticateAgency, agencyInquirysController.updateInquiryStatus);
router.post('/inquiries/:id/notes', authenticateAgency, agencyInquirysController.addNote);
router.post('/inquiries/:id/close-deal', authenticateAgency, agencyInquirysController.closeDeal);
router.delete('/inquiries/:id', authenticateAgency, agencyInquirysController.deleteInquiry);

// Agency project leads management (project-only inquiries)
router.get('/project-leads', authenticateAgency, agencyProjectInquirysController.listProjectLeads);
router.get('/project-leads/:id', authenticateAgency, agencyProjectInquirysController.getProjectLeadById);
router.get('/project-leads/:id/available-units', authenticateAgency, agencyProjectInquirysController.getAvailableUnits);
router.post('/project-leads/:id/status', authenticateAgency, agencyProjectInquirysController.updateProjectLeadStatus);
router.post('/project-leads/:id/submit-deal', authenticateAgency, agencyProjectInquirysController.submitDeal);
router.post('/project-leads/:id/approve-deal', authenticateAgency, agencyProjectInquirysController.approveDeal);
router.post('/project-leads/close-deal-document',authenticateAgency,uploadSingleDocument('document'),multerErrorHandler,agencyProjectInquirysController.uploadCloseDealDocument);
router.delete('/project-leads/:id', authenticateAgency, agencyProjectInquirysController.deleteProjectLead);

// Agency projects management
router.get('/projects', authenticateAgency, agencyProjectController.getAgencyProjects);
router.get('/projects/units', authenticateAgency, agencyProjectController.getAgencyProjectUnits);
router.post('/projects/assign-agents', authenticateAgency, agencyProjectController.assignAgents);
router.put('/projects/assign-agents', authenticateAgency, agencyProjectController.updateAgentAllocation);
router.delete('/projects/assign-agents', authenticateAgency, agencyProjectController.deleteAgentAllocation);

// Agency notification push token management
router.post('/notifications/push/register', authenticateAgency, agencyPushController.registerPushToken);
router.delete('/notifications/push/unregister', authenticateAgency, agencyPushController.unregisterPushToken);
router.get('/notifications', authenticateAgency, agencyNotificationController.listNotifications);
router.put('/notifications/read-all', authenticateAgency, agencyNotificationController.markAllAsRead);
router.put('/notifications/:id/read', authenticateAgency, agencyNotificationController.markAsRead);
router.delete('/notifications', authenticateAgency, agencyNotificationController.deleteNotifications);

// Agency public routes
router.get('/search', agencySearchController.searchAgencies);

/**
 * @swagger
 * /agency/{id}:
 *   get:
 *     summary: Get public agency profile
 *     description: Get detailed public profile of an active and verified agency
 *     tags: [Agency, Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agency ObjectId
 *     responses:
 *       200:
 *         description: Agency profile fetched successfully
 *       400:
 *         description: Invalid agency ID
 *       404:
 *         description: Agency not found
 */
router.get('/:id', agencySearchController.getAgencyProfile);

module.exports = router;