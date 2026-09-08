const express = require('express');

const router = express.Router();

const usersController = require('../controllers/users/usersController');
const savedPropertiesController = require('../controllers/users/savedPropertiesController');
const searchAlertsController = require('../controllers/users/searchAlertsController');
const userPushController = require('../controllers/users/userPushController');
const notificationController = require('../controllers/users/notificationController');
const { authenticateUser } = require('../middlewares/auth');
const { uploadSingleImage } = require('../config/multer');

// User profile management
router.get('/profile', authenticateUser, usersController.getProfile);
router.put('/profile', authenticateUser, usersController.updateProfile);
router.delete('/account', authenticateUser, usersController.deleteAccount);
router.post(
  '/upload-profile-picture',
  authenticateUser,
  uploadSingleImage('profilePicture'),
  usersController.uploadProfilePicture,
);

// Contacted properties/projects management
router.get(
  '/contacted-properties',
  authenticateUser,
  usersController.getContactedProperties,
);

// router.delete(
//   '/contacted-properties/:id',
//   authenticateUser,
//   usersController.deleteContactedProperty,
// );

router.delete(
  '/contacted-properties',
  authenticateUser,
  usersController.deleteMultipleContactedProperties,
);

router.delete(
  '/contacted-properties/delete-all',
  authenticateUser,
  usersController.deleteAllContactedProperties,
);

// Saved properties management
router.get(
  '/saved-properties',
  authenticateUser,
  savedPropertiesController.getSavedProperties,
);
router.post(
  '/saved-properties/add',
  authenticateUser,
  savedPropertiesController.saveProperty,
);
router.delete(
  '/saved-properties/remove/:propertyId',
  authenticateUser,
  savedPropertiesController.unsaveProperty,
);
router.delete(
  '/saved-properties/remove-all',
  authenticateUser,
  savedPropertiesController.removeAllSaved,
);

// Search alerts management
router.get(
  '/alerts',
  authenticateUser,
  searchAlertsController.getSearchAlerts,
);

router.post(
  '/alerts/create',
  authenticateUser,
  searchAlertsController.createSearchAlert,
);

router.delete(
  '/alerts/delete-all',
  authenticateUser,
  searchAlertsController.deleteAllAlerts,
);

router.put(
  '/alerts/:alertId',
  authenticateUser,
  searchAlertsController.updateSearchAlert,
);

router.delete(
  '/alerts/:alertId',
  authenticateUser,
  searchAlertsController.deleteSearchAlert,
);

// FCM push tokens (register / unregister — separate from login)
router.post(
  '/notifications/push/register',
  authenticateUser,
  userPushController.registerPushToken,
);
router.delete(
  '/notifications/push/unregister',
  authenticateUser,
  userPushController.unregisterPushToken,
);

// notification management
router.get('/notifications',authenticateUser,notificationController.listNotifications);
router.put('/notifications/:id/read',authenticateUser,notificationController.markAsRead);
router.put('/notifications/read-all',authenticateUser,notificationController.markAllAsRead);
router.delete('/notifications',authenticateUser,notificationController.deleteNotifications);



module.exports = router;