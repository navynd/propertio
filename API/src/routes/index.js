const { Router } = require('express');
const router = Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./usersRoutes');
const agenciesRoutes = require('./agenciesRoutes');
const agentsRoutes = require('./agentsRoutes');
const developerRoutes = require('./developerRoutes');
const publicRoutes = require('./publicRoutes');


// Auth routes 
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Agency routes
router.use('/agency', agenciesRoutes);

// Agent routes
router.use('/agents', agentsRoutes);

// Developer routes
router.use('/developers', developerRoutes);

/* Public routes starts here */
router.use('/', publicRoutes);

// inquiry routes
// router.use('/inquiries', publicRoutes);

// property search routes
// router.use('/properties', publicRoutes);

// master-data 
router.use('/master-data', adminRoutes);

/* Public routes ends here */

module.exports = router;


