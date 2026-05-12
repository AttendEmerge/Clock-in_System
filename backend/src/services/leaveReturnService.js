/**
 * Shared validation and balance adjustments when logging a leave return
 * (early, on time, or late vs scheduled end_date).
 */

function countWorkingDays(startDate, endDate, holidaySet) {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      if (holidaySet && holidaySet.has(d.toISOString().slice(0, 10))) continue;
      count++;
    }
  }
  return count;
}

function toYmd(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function todayYmd() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @returns {{ error?: string }}
 */
function validateLeaveReturnDates(lr, actual_return_date) {
  const start = toYmd(lr.start_date);
  const end = toYmd(lr.end_date);
  const actual = toYmd(actual_return_date);
  if (!actual || actual.length < 10) {
    return { error: 'Invalid return date.' };
  }
  if (actual < start) {
    return { error: 'Return date cannot be before the leave start date.' };
  }
  if (actual > todayYmd()) {
    return { error: 'Return date cannot be in the future.' };
  }
  return {};
}

/**
 * Adjust leave_balances after a return is recorded (refund if early, charge if late).
 * @param {object} lr - leave_requests row (before or after update; end_date must be current)
 * @param {string} actual_return_date - YYYY-MM-DD
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} exec - pool or connection
 * @returns {Promise<{ error?: string }>}
 */
async function applyLeaveReturnBalanceAdjustment(lr, actual_return_date, exec) {
  const end = toYmd(lr.end_date);
  const actual = toYmd(actual_return_date);
  const year = new Date(toYmd(lr.start_date)).getFullYear();

  if (actual < end) {
    const dayAfterReturn = new Date(actual + 'T12:00:00');
    dayAfterReturn.setDate(dayAfterReturn.getDate() + 1);
    const from = dayAfterReturn.toISOString().slice(0, 10);
    const unused = countWorkingDays(from, end);
    if (unused > 0) {
      const [balRows] = await exec.query(
        'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
        [lr.user_id, lr.leave_type, year]
      );
      if (balRows.length > 0) {
        const bal = balRows[0];
        const newUsed = Math.max(0, parseFloat(bal.days_used) - unused);
        const newRemaining = Math.max(0, parseFloat(bal.days_allocated) - newUsed);
        await exec.query(
          `UPDATE leave_balances SET days_used = ?, days_remaining = ? WHERE id = ?`,
          [newUsed, newRemaining, bal.id]
        );
      }
    }
  } else if (actual > end) {
    const dayAfterEnd = new Date(end + 'T12:00:00');
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    const from = dayAfterEnd.toISOString().slice(0, 10);
    const extra = countWorkingDays(from, actual);
    if (extra > 0) {
      const [balRows] = await exec.query(
        'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
        [lr.user_id, lr.leave_type, year]
      );
      if (balRows.length > 0) {
        const bal = balRows[0];
        const newUsed = parseFloat(bal.days_used) + extra;
        const newRemaining = Math.max(0, parseFloat(bal.days_allocated) - newUsed);
        await exec.query(
          `UPDATE leave_balances SET days_used = ?, days_remaining = ? WHERE id = ?`,
          [newUsed, newRemaining, bal.id]
        );
      }
    }
  }

  return {};
}

module.exports = {
  countWorkingDays,
  toYmd,
  validateLeaveReturnDates,
  applyLeaveReturnBalanceAdjustment,
};
