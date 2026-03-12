const QRCode = require('qrcode');
const pool = require('../db/pool');
const { getCurrentQRSession, validateQRToken } = require('../services/qrService');
const { validateAndConsumeToken } = require('../services/tokenService');
const { evaluateClockInFlags } = require('../services/flagService');
const { getHolidayDatesForYear } = require('./hrController');

/**
 * GET /clock/qr-session  — returns base64 QR image for the current session
 */
async function getQRSession(req, res) {
  try {
    const session = await getCurrentQRSession();
    // Derive the origin the browser actually used so the QR URL is reachable
    // from phones on the same network. The Vite proxy rewrites the Host header,
    // so we prefer Origin / Referer which preserve the real address.
    let origin = process.env.FRONTEND_URL;
    if (!origin && req.headers.origin) {
      origin = req.headers.origin.replace(/\/$/, '');
    }
    if (!origin && req.headers.referer) {
      try { const u = new URL(req.headers.referer); origin = u.origin; } catch {}
    }
    if (!origin) {
      origin = `${req.protocol}://${req.hostname}:5173`;
    }
    const mobileUrl = `${origin}/mobile?t=${session.token}`;
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, { width: 300, margin: 2 });
    return res.json({
      qr_image: qrDataUrl,
      expires_at: session.expires_at,
      session_id: session.id,
    });
  } catch (err) {
    console.error('QR session error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Helper — check if user is currently clocked in (no matching clock_out after last clock_in)
 */
async function isUserClockedIn(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [rows] = await pool.query(
    `SELECT * FROM clock_events 
     WHERE user_id = ? AND DATE(event_timestamp) = CURDATE()
     ORDER BY event_timestamp DESC LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) return false;
  return rows[0].event_type === 'clock_in';
}

/**
 * Check if user already has an overtime session today
 */
async function hasOvertimeSessionToday(userId) {
  const [rows] = await pool.query(
    `SELECT id FROM clock_events 
     WHERE user_id = ? AND DATE(event_timestamp) = CURDATE() AND is_overtime = 1 AND event_type = 'clock_in'`,
    [userId]
  );
  return rows.length > 0;
}

async function getTodayHoliday() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const [rows] = await pool.query('SELECT name FROM holidays WHERE date = ?', [dateStr]);
  return rows.length > 0 ? rows[0].name : null;
}

/**
 * POST /clock/qr  — clock in via scanned QR token
 */
async function clockInQR(req, res) {
  const { qr_token, latitude, longitude, accuracy } = req.body;
  if (!qr_token) {
    return res.status(400).json({ error: 'QR token is required' });
  }
  try {
    const holidayName = await getTodayHoliday();
    if (holidayName) {
      return res.status(403).json({
        error: `Today is a holiday (${holidayName}). Regular clock-in is disabled. Use the overtime request flow to clock in.`,
        is_holiday: true,
      });
    }

    const session = await validateQRToken(qr_token);
    if (!session) {
      return res.status(400).json({ error: 'QR code has expired. Please scan the latest code.' });
    }

    const now = new Date();
    const { is_flagged, flag_reason } = await evaluateClockInFlags(latitude, longitude, now, accuracy);

    await pool.query(
      `INSERT INTO clock_events 
        (user_id, event_type, event_timestamp, latitude, longitude, gps_accuracy, method, is_overtime, is_flagged, flag_reason, qr_session_id)
       VALUES (?, 'clock_in', ?, ?, ?, ?, 'qr', 0, ?, ?, ?)`,
      [req.user.id, now, latitude || null, longitude || null, accuracy || null, is_flagged ? 1 : 0, flag_reason, session.id]
    );

    return res.json({
      message: 'Clocked in successfully',
      timestamp: now,
      is_flagged,
      flag_reason,
    });
  } catch (err) {
    console.error('Clock-in QR error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /clock/token  — clock in via one-time HR token
 */
async function clockInToken(req, res) {
  const { token, latitude, longitude, accuracy } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const { valid, tokenRow, error } = await validateAndConsumeToken(token, req.user.id);
    if (!valid) {
      return res.status(400).json({ error });
    }

    const isOvertime = tokenRow.token_type === 'overtime' ? 1 : 0;

    if (!isOvertime) {
      const holidayName = await getTodayHoliday();
      if (holidayName) {
        return res.status(403).json({
          error: `Today is a holiday (${holidayName}). Regular clock-in is disabled. Use the overtime request flow to clock in.`,
          is_holiday: true,
        });
      }
    }
    const now = new Date();
    const { is_flagged, flag_reason } = await evaluateClockInFlags(latitude, longitude, now, accuracy);

    // For overtime tokens, skip the late-arrival flag (overtime is expected to be late)
    let finalFlagged = is_flagged;
    let finalReason = flag_reason;
    if (isOvertime && flag_reason) {
      const reasons = flag_reason.split(',').filter(r => r !== 'LATE_ARRIVAL');
      finalFlagged = reasons.length > 0;
      finalReason = reasons.length > 0 ? reasons.join(',') : null;
    }

    await pool.query(
      `INSERT INTO clock_events 
        (user_id, event_type, event_timestamp, latitude, longitude, gps_accuracy, method, is_overtime, is_flagged, flag_reason, token_id)
       VALUES (?, 'clock_in', ?, ?, ?, ?, 'token', ?, ?, ?, ?)`,
      [req.user.id, now, latitude || null, longitude || null, accuracy || null, isOvertime, finalFlagged ? 1 : 0, finalReason, tokenRow.id]
    );

    return res.json({
      message: isOvertime ? 'Overtime session started' : 'Clocked in successfully',
      timestamp: now,
      is_overtime: !!isOvertime,
      is_flagged: finalFlagged,
      flag_reason: finalReason,
    });
  } catch (err) {
    console.error('Clock-in token error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Helper — determine if a manual clock-out should be treated as an early departure.
 * We consider it early if the employee clocks out significantly before expected_end.
 */
async function isEarlyDeparture(clockOutTime) {
  try {
    const [schedRows] = await pool.query('SELECT * FROM work_schedule LIMIT 1');
    if (schedRows.length === 0) return false;
    const sched = schedRows[0];

    const [endH, endM] = String(sched.expected_end).split(':').map(Number);
    const thresholdMinutes = 60; // treat departures more than 60 minutes before end as early
    const thresholdMs = thresholdMinutes * 60 * 1000;

    const expectedEnd = new Date(clockOutTime);
    expectedEnd.setHours(endH, endM, 0, 0);

    const diffMs = expectedEnd.getTime() - clockOutTime.getTime();
    return diffMs > thresholdMs;
  } catch (err) {
    console.error('Early departure check error:', err);
    return false;
  }
}

/**
 * POST /clock/out  — manual clock out
 * Accepts optional early_departure_reason when user leaves well before expected end of day.
 */
async function clockOut(req, res) {
  try {
    const now = new Date();
    const { early_departure_reason } = req.body || {};

    const early = await isEarlyDeparture(now);
    let reasonToStore = null;
    let isFlagged = 0;
    let flagReason = null;

    if (early) {
      const trimmed = typeof early_departure_reason === 'string' ? early_departure_reason.trim() : '';
      if (!trimmed) {
        return res.status(400).json({ error: 'Reason is required when leaving early' });
      }
      if (trimmed.length > 1000) {
        return res.status(400).json({ error: 'Reason is too long (max 1000 characters)' });
      }
      reasonToStore = trimmed;
      isFlagged = 1;
      flagReason = 'EARLY_DEPARTURE';
    }

    await pool.query(
      `INSERT INTO clock_events (user_id, event_type, event_timestamp, method, is_flagged, flag_reason, early_departure_reason)
       VALUES (?, 'clock_out', ?, 'token', ?, ?, ?)`,
      [req.user.id, now, isFlagged, flagReason, reasonToStore]
    );

    return res.json({
      message: 'Clocked out successfully',
      timestamp: now,
      is_early_departure: !!early && !!reasonToStore,
      flag_reason: flagReason,
    });
  } catch (err) {
    console.error('Clock-out error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /clock/status  — current clock-in status for logged-in user
 */
async function getClockStatus(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM clock_events 
       WHERE user_id = ? AND DATE(event_timestamp) = CURDATE()
       ORDER BY event_timestamp DESC LIMIT 1`,
      [req.user.id]
    );
    const isClockedIn = rows.length > 0 && rows[0].event_type === 'clock_in';
    const lastEvent = rows.length > 0 ? rows[0] : null;

    // Fetch today's full events
    const [todayEvents] = await pool.query(
      `SELECT * FROM clock_events 
       WHERE user_id = ? AND DATE(event_timestamp) = CURDATE()
       ORDER BY event_timestamp ASC`,
      [req.user.id]
    );

    // Calculate total hours worked today
    let totalMinutes = 0;
    let openIn = null;
    for (const ev of todayEvents) {
      if (ev.event_type === 'clock_in') {
        openIn = new Date(ev.event_timestamp);
      } else if (ev.event_type === 'clock_out' && openIn) {
        totalMinutes += (new Date(ev.event_timestamp) - openIn) / 60000;
        openIn = null;
      }
    }
    if (openIn) {
      totalMinutes += (Date.now() - openIn.getTime()) / 60000;
    }

    return res.json({
      is_clocked_in: isClockedIn,
      last_event: lastEvent,
      today_events: todayEvents,
      total_minutes_today: Math.floor(totalMinutes),
    });
  } catch (err) {
    console.error('Clock status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /clock/my-history  — paginated clock events for logged-in user
 */
async function getMyHistory(req, res) {
  const { page = 1, limit = 30, from, to } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE user_id = ?';
    const params = [req.user.id];
    if (from) { where += ' AND DATE(event_timestamp) >= ?'; params.push(from); }
    if (to) { where += ' AND DATE(event_timestamp) <= ?'; params.push(to); }
    const [rows] = await pool.query(
      `SELECT * FROM clock_events ${where} ORDER BY event_timestamp DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM clock_events ${where}`,
      params
    );
    return res.json({ events: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getQRSession, clockInQR, clockInToken, clockOut, getClockStatus, getMyHistory };
