const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getQRSession, clockInQR, clockInToken, clockOut, getClockStatus, getMyHistory,
} = require('../controllers/clockController');

// All clock routes require authentication
router.use(authenticate);

router.get('/qr-session', getQRSession);
router.post('/qr', clockInQR);
router.post('/token', clockInToken);
router.post('/out', clockOut);
router.get('/status', getClockStatus);
router.get('/history', getMyHistory);

module.exports = router;
