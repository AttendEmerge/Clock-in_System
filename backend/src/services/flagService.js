const pool = require('../db/pool');
const { isLocationAcceptable } = require('./locationService');

/**
 * Evaluate whether a clock-in event should be flagged.
 * Returns { is_flagged: bool, flag_reason: string|null }
 */
async function evaluateClockInFlags(latitude, longitude, clockInTime, accuracy) {
  const flags = [];

  // 1. Location check (pass GPS accuracy for tolerance)
  if (latitude != null && longitude != null) {
    const { acceptable } = await isLocationAcceptable(latitude, longitude, accuracy);
    if (!acceptable) {
      flags.push('UNEXPECTED_LOCATION');
    }
  }

  // 2. Late arrival check (Mon–Fri only)
  const day = clockInTime.getDay(); // 0=Sun,6=Sat
  if (day >= 1 && day <= 5) {
    const [schedRows] = await pool.query('SELECT * FROM work_schedule LIMIT 1');
    if (schedRows.length > 0) {
      const sched = schedRows[0];
      const [startH, startM] = sched.expected_start.split(':').map(Number);
      const graceMs = sched.late_grace_minutes * 60 * 1000;

      const expectedStart = new Date(clockInTime);
      expectedStart.setHours(startH, startM, 0, 0);
      const deadline = new Date(expectedStart.getTime() + graceMs);

      if (clockInTime > deadline) {
        flags.push('LATE_ARRIVAL');
      }
    }
  }

  return {
    is_flagged: flags.length > 0,
    flag_reason: flags.length > 0 ? flags.join(',') : null,
  };
}

module.exports = { evaluateClockInFlags };
