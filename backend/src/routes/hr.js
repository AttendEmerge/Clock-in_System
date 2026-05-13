const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const hr = require('../controllers/hrController');

router.use(authenticate);
router.use(requireRole('hr'));

// Dashboard
router.get('/dashboard', hr.getDashboard);

// Users
router.get('/users',                    hr.getUsers);
router.post('/users',                   hr.createUser);
router.put('/users/:id',                hr.updateUser);
router.delete('/users/:id',             hr.deleteUser);
router.put('/users/:id/reset-password', hr.resetUserPassword);
router.put('/users/:id/leave',          hr.updateLeaveBalance);

// Departments
router.get('/departments',       hr.getDepartments);
router.post('/departments',      hr.createDepartment);
router.put('/departments/:id',   hr.updateDepartment);
router.delete('/departments/:id', hr.deleteDepartment);

// Tokens
router.post('/tokens', hr.generateToken);
router.get('/tokens',  hr.getTokens);

// Token requests (employee-initiated)
router.get('/token-requests',         hr.getTokenRequests);
router.patch('/token-requests/:id',   hr.actionTokenRequest);

// Flagged events
router.get('/flags',              hr.getFlaggedEvents);
router.patch('/flags/:id/unflag', hr.unflagEvent);

// Acceptable locations
router.get('/locations',        hr.getAcceptableLocations);
router.post('/locations',       hr.addAcceptableLocation);
router.put('/locations/:id',    hr.updateAcceptableLocation);
router.delete('/locations/:id', hr.deleteAcceptableLocation);

// Work schedule
router.get('/schedule', hr.getWorkSchedule);
router.put('/schedule', hr.updateWorkSchedule);

// Overtime requests
router.get('/overtime-requests', hr.getOvertimeRequests);
router.patch('/overtime-requests/:id', hr.rejectOvertimeRequest);

// Clock history
router.get('/clock-history', hr.getEmployeeClockHistory);

// Leave management
router.get('/leave-requests',                           hr.getLeaveRequests);
router.patch('/leave-requests/:id/review',              hr.reviewLeaveRequest);
router.patch('/leave-requests/:id/early-return',        hr.hrLogEarlyReturn);
router.get('/leave-requests/:id/extensions',            hr.getExtensionRequests);
router.patch('/leave-extensions/:id/review',            hr.reviewExtensionRequest);

// Leave report (CSV)
router.get('/leave-report', hr.exportLeaveReport);

// Leave policy
router.get('/leave-policy',            hr.getLeavePolicy);
router.post('/leave-policy',           hr.createLeavePolicy);
router.put('/leave-policy/:type',      hr.updateLeavePolicy);
router.delete('/leave-policy/:type',   hr.deleteLeavePolicy);

// Holidays
router.get('/holidays',        hr.getHolidays);
router.post('/holidays',       hr.createHoliday);
router.put('/holidays/:id',    hr.updateHoliday);
router.delete('/holidays/:id', hr.deleteHoliday);

// Attendance report
router.get('/report/attendance',         hr.getAttendanceReportPreview);
router.get('/report/attendance/export',  hr.exportAttendanceReport);

// Overtime report
router.get('/report/overtime',           hr.getOvertimeReportPreview);
router.get('/report/overtime/export',    hr.exportOvertimeReport);

module.exports = router;
