const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/login',            login);
router.post('/refresh',          refresh);
router.post('/logout',           logout);
router.get('/me',                authenticate, getMe);
router.put('/change-password',   authenticate, changePassword);

// Public password reset flow
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);

module.exports = router;
