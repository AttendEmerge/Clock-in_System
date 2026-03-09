const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getDashboard, getActiveLocations, getEmployeeHolidays,
  requestOvertime, getMyOvertimeRequests,
  requestLeave, getMyLeaveRequests, logMyEarlyReturn, requestExtension,
  requestToken, getMyTokenRequests,
} = require('../controllers/employeeController');

router.use(authenticate);
router.use(requireRole('employee', 'supervisor', 'hr'));

router.get('/dashboard',                              getDashboard);
router.get('/locations',                              getActiveLocations);
router.get('/holidays',                               getEmployeeHolidays);
router.post('/overtime-request',                      requestOvertime);
router.get('/overtime-requests',                      getMyOvertimeRequests);

// Token requests
router.post('/token-request',                         requestToken);
router.get('/token-requests',                         getMyTokenRequests);

// Leave
router.post('/leave-request',                         requestLeave);
router.get('/leave-requests',                         getMyLeaveRequests);
router.patch('/leave-requests/:id/early-return',      logMyEarlyReturn);
router.post('/leave-requests/:id/extend',             requestExtension);

module.exports = router;
