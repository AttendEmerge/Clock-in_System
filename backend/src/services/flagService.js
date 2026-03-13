const pool = require('../db/pool');
const { isLocationAcceptable } = require('./locationService');
const { getPartsInTz, APP_TIMEZONE } = require('../utils/timezone');

/**
 * Evaluate whether a clock-in event should be flagged.
 * Returns { is_flagged: bool, flag_reason: string|null }
 * Uses APP_TIMEZONE so expected_start is compared in organization local time.
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

  // 2. Late arrival check (Mon–Fri only, in org timezone)
  const parts = getPartsInTz(clockInTime, APP_TIMEZONE);
  const dow = parts.weekday;
  if (dow !== 'Sat' && dow !== 'Sun') {
    const [schedRows] = await pool.query('SELECT * FROM work_schedule LIMIT 1');
    if (schedRows.length > 0) {
      const sched = schedRows[0];
      const [startH, startM] = String(sched.expected_start).split(':').map(Number);
      const graceM = sched.late_grace_minutes || 0;
      const deadlineMinutes = startH * 60 + startM + graceM;

      const clockInMinutes = parts.hour * 60 + parts.minute + parts.second / 60;

      if (clockInMinutes > deadlineMinutes) {
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
