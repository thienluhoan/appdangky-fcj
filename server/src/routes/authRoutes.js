const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// API endpoints
router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);
router.get('/check-initial-setup', authController.checkInitialSetup);

module.exports = router;
