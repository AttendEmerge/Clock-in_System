const cron = require('node-cron');
const pool = require('../db/pool');
const { createNewQRSession } = require('./qrService');

function startCronJobs() {
  // ── Auto clock-out: check every minute against work schedule ──────────────
  cron.schedule('* * * * *', async () => {
    try {
      const [schedRows] = await pool.query('SELECT * FROM work_schedule LIMIT 1');
      if (schedRows.length === 0) return;
      const sched = schedRows[0];
      const now = new Date();
      const dow = now.getDay();
      if (dow === 0 || dow === 6) return;

      const [endH, endM] = sched.expected_end.split(':').map(Number);
      const bufferMs  = (sched.overtime_buffer_minutes || 5) * 60 * 1000;
      const endTime   = new Date(now);
      endTime.setHours(endH, endM, 0, 0);
      const checkoutTime = new Date(endTime.getTime() + bufferMs);

      const diffMs = now - checkoutTime;
      if (diffMs < 0) return;

      const [usersIn] = await pool.query(
        `SELECT DISTINCT user_id FROM clock_events ce1
         WHERE DATE(event_timestamp) = CURDATE()
           AND event_type = 'clock_in'
           AND is_overtime = 0
           AND NOT EXISTS (
             SELECT 1 FROM clock_events ce2
             WHERE ce2.user_id = ce1.user_id
               AND ce2.event_type = 'clock_out'
               AND ce2.event_timestamp > ce1.event_timestamp
               AND DATE(ce2.event_timestamp) = CURDATE()
           )`
      );
      if (usersIn.length > 0) {
        await pool.query(
          `INSERT INTO clock_events (user_id, event_timestamp, method, event_type) VALUES ?`,
          [usersIn.map(u => [u.user_id, checkoutTime, 'auto_checkout', 'clock_out'])]
        );
        console.log(`[CRON] Auto-checked out ${usersIn.length} user(s)`);
      }
    } catch (err) {
      console.error('[CRON] Auto-checkout error:', err.message);
    }
  });

  // ── Rotate QR session every N minutes ─────────────────────────────────────
  const qrMinutes = parseInt(process.env.QR_ROTATION_MINUTES) || 5;
  cron.schedule(`*/${qrMinutes} * * * *`, async () => {
    try {
      await createNewQRSession();
      console.log('[CRON] QR session rotated');
    } catch (err) {
      console.error('[CRON] QR rotation error:', err.message);
    }
  });

  // ── Daily leave status transitions (runs at 00:05 every day) ──────────────
  cron.schedule('5 0 * * *', async () => {
    try {
      // approved → active  (start_date is today or in the past)
      const [r1] = await pool.query(
        `UPDATE leave_requests
         SET status = 'active'
         WHERE status = 'approved' AND start_date <= CURDATE()`
      );

      // active → completed  (end_date was yesterday or earlier)
      const [r2] = await pool.query(
        `UPDATE leave_requests
         SET status = 'completed'
         WHERE status = 'active' AND end_date < CURDATE()`
      );

      // early_return → completed  (they already came back, just mark done)
      const [r3] = await pool.query(
        `UPDATE leave_requests
         SET status = 'completed'
         WHERE status = 'early_return' AND actual_return_date < CURDATE()`
      );

      if (r1.affectedRows + r2.affectedRows + r3.affectedRows > 0) {
        console.log(`[CRON] Leave transitions: ${r1.affectedRows} activated, ${r2.affectedRows + r3.affectedRows} completed`);
      }

      // Clean up expired refresh tokens
      await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    } catch (err) {
      console.error('[CRON] Daily leave/cleanup error:', err.message);
    }
  });

  console.log('✅ Cron jobs started (auto-checkout + QR rotation + daily leave transitions)');
}

module.exports = { startCronJobs };
