// Auth & Persona API routes
const express = require('express');
const router = express.Router();
const authController = require('../controller/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.put('/persona', authController.updatePersona);
router.get('/me', authController.getMe);

module.exports = router;
