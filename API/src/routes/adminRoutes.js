const { Router } = require('express');
const router = Router();

const {
  sendAgencyInvitation,
  sendDeveloperInvitation,
  getMasterData,
} = require('../controllers/adminController');
// const { authenticateAdmin } = require('../middlewares/auth');

// router.post('/invite-agency', authenticateAdmin, sendAgencyInvitation);
// router.post('/invite-developer', authenticateAdmin, sendDeveloperInvitation);
router.post('/invite-agency', sendAgencyInvitation);
router.post('/invite-developer', sendDeveloperInvitation);

// Master data route
// Example:
//   GET /master-data?type=countries
//   GET /master-data?type=amenities
//   GET /master-data?types=countries,amenities
router.get('/', getMasterData);

module.exports = router;

