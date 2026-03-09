const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getDashboard, getOvertimeRequests, actionOvertimeRequest, getTeam } = require('../controllers/supervisorController');

router.use(authenticate);
router.use(requireRole('supervisor', 'hr'));

router.get('/dashboard', getDashboard);
router.get('/team', getTeam);
router.get('/overtime-requests', getOvertimeRequests);
router.patch('/overtime-requests/:id', actionOvertimeRequest);

module.exports = router;
