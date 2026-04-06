const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// WebAuthn Passkey Routes
router.get('/generate-registration-options', authController.getRegistrationOptions);
router.post('/verify-registration', authController.verifyRegistration);

router.get('/generate-authentication-options', authController.getAuthenticationOptions);
router.post('/verify-authentication', authController.verifyAuthentication);

router.post('/logout', authController.logout);

module.exports = router;
