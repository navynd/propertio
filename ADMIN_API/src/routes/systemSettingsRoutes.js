const { Router } = require('express');
const router = Router();
const systemSettingsController = require('../controllers/systemSettingsController');
const { uploadImageFields, multerErrorHandler } = require('../config/multer');
const { authenticateAdmin } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');

// Fetch current settings
router.get(
  '/',
  authenticateAdmin,
  systemSettingsController.getSystemSettings
);

// Update current settings (handles multipart/form-data for uploads)
router.put(
  '/',
  authenticateAdmin,
  uploadImageFields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
  ]),
  multerErrorHandler,
  [
    body('appName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('App Name cannot be empty'),
    body('siteTitle')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Site Title cannot be empty'),
    body('themeColor')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Theme Color must be a valid hex color code (e.g. #1F3D51)'),
    validateRequest
  ],
  systemSettingsController.updateSystemSettings
);

module.exports = router;
