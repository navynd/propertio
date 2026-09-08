const { Router } = require('express');
const router = Router();

const userAuthController = require('../controllers/auth/userAuthController');
const agencyAuthController = require('../controllers/auth/agencyAuthController');
const { uploadMultipleDocuments, uploadSingleImage, multerErrorHandler } = require('../config/multer');
const developerAuthController = require('../controllers/auth/developerAuthController');
const agentAuthController = require('../controllers/auth/agentAuthController');

// Users
router.post('/users/register', userAuthController.requestSignup);
router.post('/users/login', userAuthController.login);
router.post('/users/social-login', userAuthController.socialLogin);
router.post('/users/send-otp', userAuthController.sendOTP);
router.post('/users/verify-otp', userAuthController.verifyOtp);
router.post('/users/reset-password', userAuthController.resetPassword);
router.post('/users/logout', userAuthController.logout);
router.post('/users/refresh', userAuthController.refreshTokens);

// Agencies
router.post('/agency/accept-invitation', agencyAuthController.acceptInvitation);
router.post('/agency/send-email-otp', agencyAuthController.sendEmailOTP);
router.post('/agency/verify-email-otp', agencyAuthController.verifyEmailOTP);
router.post('/agency/send-phone-otp', agencyAuthController.sendPhoneOTP);
router.post('/agency/verify-phone-otp', agencyAuthController.verifyPhoneOTP);
router.post('/agency/upload-registration-documents', uploadMultipleDocuments('documents', 5), multerErrorHandler, agencyAuthController.uploadRegistrationDocuments);
router.post('/agency/upload-profile-picture', uploadSingleImage('profilePicture'), multerErrorHandler, agencyAuthController.uploadProfilePicture);

// PFExperts login (Agency, Developer, Agent login);
router.post('/pfexperts/login', agencyAuthController.login);
router.post('/pfexperts/send-otp', agencyAuthController.sendPasswordResetOtp);
router.post('/pfexperts/verify-otp', agencyAuthController.verifyPasswordResetOtp);
router.post('/pfexperts/reset-password', agencyAuthController.resetExpertPassword);
router.post('/pfexperts/refresh', agencyAuthController.refreshTokens);
router.post('/pfexperts/logout', agencyAuthController.logout);


// Developers
router.post('/developers/accept-invitation', developerAuthController.acceptInvitation);
router.post('/developers/send-email-otp', developerAuthController.sendEmailOTP);
router.post('/developers/verify-email-otp', developerAuthController.verifyEmailOTP);
router.post('/developers/send-phone-otp', developerAuthController.sendPhoneOTP);
router.post('/developers/verify-phone-otp', developerAuthController.verifyPhoneOTP);
router.post('/developers/upload-registration-documents', uploadMultipleDocuments('documents', 5), multerErrorHandler, developerAuthController.uploadRegistrationDocuments);
router.post('/developers/upload-profile-picture', uploadSingleImage('profilePicture'), multerErrorHandler, developerAuthController.uploadProfilePicture);

// Agents
router.post('/agents/accept-invitation', agentAuthController.acceptInvitation);
router.post('/agents/send-email-otp', agentAuthController.sendEmailOTP);
router.post('/agents/verify-email-otp', agentAuthController.verifyEmailOTP);
router.post('/agents/send-phone-otp', agentAuthController.sendPhoneOTP);
router.post('/agents/verify-phone-otp', agentAuthController.verifyPhoneOTP);
router.post('/agents/upload-profile-picture', uploadSingleImage('profilePicture'), multerErrorHandler, agentAuthController.uploadProfilePicture);



module.exports = router;
