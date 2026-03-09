const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { login, refresh, logout, getMe, changePassword } = require('../controllers/authController');

router.post('/login',           login);
router.post('/refresh',         refresh);
router.post('/logout',          logout);
router.get('/me',               authenticate, getMe);
router.put('/change-password',  authenticate, changePassword);

module.exports = router;
