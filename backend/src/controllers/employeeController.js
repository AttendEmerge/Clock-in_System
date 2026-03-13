const pool = require('../db/pool');
const { getHolidayDatesForYear } = require('./hrController');

/**
 * Returns true if the date is an off day (weekend or holiday).
 * Used to classify overtime: off day = double, workday = regular.
 */
function isDateOffDay(dateStr, holidaySet) {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return true; // Saturday or Sunday
  if (holidaySet && holidaySet.has(dateStr.slice(0, 10))) return true;
  return false;
}

function countWorkingDays(startDate, endDate, holidaySet) {
  let count = 0;
  const start = new Date(startDate);
  const end   = new Date(endDate);
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

async function getDashboard(req, res) {
  const userId = req.user.id;
  const year   = new Date().getFullYear();

  try {
    // Auto-seed missing leave balances from current policies
    const [userRow] = await pool.query('SELECT gender FROM users WHERE id = ?', [userId]);
    const gender = userRow.length ? userRow[0].gender : 'other';
    const [policies] = await pool.query('SELECT leave_type, default_days, gender_applicable FROM leave_policies');
    const [existingBalances] = await pool.query(
      'SELECT leave_type FROM leave_balances WHERE user_id = ? AND year = ?',
      [userId, year]
    );
    const existingTypes = new Set(existingBalances.map(b => b.leave_type));
    for (const p of policies) {
      if (existingTypes.has(p.leave_type)) continue;
      const applicable =
        p.gender_applicable === 'all' ||
        (p.gender_applicable === 'female' && gender === 'female') ||
        (p.gender_applicable === 'male' && gender === 'male');
      if (!applicable) continue;
      const days = parseFloat(p.default_days);
      await pool.query(
        `INSERT IGNORE INTO leave_balances (user_id, leave_type, days_remaining, days_allocated, days_used, year)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [userId, p.leave_type, days, days, year]
      );
    }

    const [leaves] = await pool.query(
      `SELECT lb.* FROM leave_balances lb
       JOIN leave_policies lp ON lp.leave_type = lb.leave_type
       WHERE lb.user_id = ? AND lb.year = ?
         AND (lp.gender_applicable = 'all'
           OR (lp.gender_applicable = 'female' AND ? = 'female')
           OR (lp.gender_applicable = 'male' AND ? = 'male'))`,
      [userId, year, gender, gender]
    );

    const [monthEvents] = await pool.query(
      `SELECT DATE(event_timestamp) as day, event_type
       FROM clock_events
       WHERE user_id = ? AND MONTH(event_timestamp) = MONTH(CURDATE()) AND YEAR(event_timestamp) = YEAR(CURDATE())
       ORDER BY event_timestamp ASC`,
      [userId]
    );

    const dayMap = {};
    for (const ev of monthEvents) {
      const d = ev.day instanceof Date ? ev.day.toISOString().slice(0, 10) : ev.day;
      if (!dayMap[d]) dayMap[d] = { clock_in: null, clock_out: null };
      if (ev.event_type === 'clock_in'  && !dayMap[d].clock_in)  dayMap[d].clock_in  = true;
      if (ev.event_type === 'clock_out')                          dayMap[d].clock_out = true;
    }
    const daysPresent = Object.values(dayMap).filter(d => d.clock_in).length;

    const today = new Date();
    const holidaySet = await getHolidayDatesForYear(today.getFullYear());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const workingDays = countWorkingDays(monthStart, today, holidaySet);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const totalWorkingDaysInMonth = countWorkingDays(monthStart, lastDay, holidaySet);
    const daysAbsent = Math.max(0, workingDays - daysPresent);
    const workingDaysRemaining = totalWorkingDaysInMonth - workingDays;

    const [recentEvents] = await pool.query(
      `SELECT * FROM clock_events WHERE user_id = ? ORDER BY event_timestamp DESC LIMIT 10`,
      [userId]
    );

    const [overtimeRequests] = await pool.query(
      `SELECT ot.*, u.name as supervisor_name
       FROM overtime_requests ot
       LEFT JOIN users u ON ot.supervisor_id = u.id
       WHERE ot.employee_id = ? ORDER BY ot.created_at DESC LIMIT 5`,
      [userId]
    );

    const [tokens] = await pool.query(
      `SELECT id, token_type, plain_token, expires_at, created_at
       FROM one_time_tokens
       WHERE for_user_id = ? AND used_at IS NULL AND expires_at > NOW()`,
      [userId]
    );

    // Active/pending leave requests
    const [leaveRequests] = await pool.query(
      `SELECT id, leave_type, status, start_date, end_date
       FROM leave_requests
       WHERE user_id = ? AND status IN ('pending','approved','active')
       ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );

    return res.json({
      leave_balances: leaves,
      attendance: {
        days_present:              daysPresent,
        days_absent:               daysAbsent,
        working_days_this_month:   workingDays,
        working_days_remaining:    workingDaysRemaining,
        attendance_rate:           workingDays > 0 ? Math.round((daysPresent / workingDays) * 100) : 0,
      },
      recent_events:    recentEvents,
      overtime_requests: overtimeRequests,
      pending_tokens:   tokens,
      active_leave_requests: leaveRequests,
    });
  } catch (err) {
    console.error('Employee dashboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Overtime ────────────────────────────────────────────────────────────────

async function requestOvertime(req, res) {
  const { reason, requested_date } = req.body;
  if (!reason || !requested_date) {
    return res.status(400).json({ error: 'Reason and requested date are required' });
  }
  try {
    const year = new Date(requested_date.slice(0, 10)).getFullYear();
    const holidaySet = await getHolidayDatesForYear(year);
    const overtimeType = isDateOffDay(requested_date, holidaySet) ? 'double' : 'regular';

    const [deptRows] = await pool.query(
      'SELECT department_id FROM users WHERE id = ?', [req.user.id]
    );
    if (deptRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const deptId = deptRows[0].department_id;
    let supervisorId = null;
    if (deptId) {
      const [supRows] = await pool.query(
        `SELECT id FROM users WHERE department_id = ? AND role = 'supervisor' AND is_active = 1 LIMIT 1`,
        [deptId]
      );
      if (supRows.length > 0) supervisorId = supRows[0].id;
    }

    const [result] = await pool.query(
      `INSERT INTO overtime_requests (employee_id, supervisor_id, reason, requested_date, overtime_type, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, supervisorId, reason, requested_date, overtimeType]
    );

    return res.status(201).json({
      message:      'Overtime request submitted',
      id:           result.insertId,
      supervisor_id: supervisorId,
    });
  } catch (err) {
    console.error('Overtime request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyOvertimeRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ot.*, u.name as supervisor_name
       FROM overtime_requests ot
       LEFT JOIN users u ON ot.supervisor_id = u.id
       WHERE ot.employee_id = ? ORDER BY ot.created_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Leave Requests ──────────────────────────────────────────────────────────

async function requestLeave(req, res) {
  const { leave_type, description, start_date, end_date } = req.body;
  if (!leave_type || !description?.trim() || !start_date || !end_date) {
    return res.status(400).json({ error: 'leave_type, description, start_date, and end_date are required' });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'start_date must be on or before end_date' });
  }

  try {
    const year = new Date(start_date).getFullYear();

    // Validate leave type is applicable to user's gender
    const [userRows] = await pool.query('SELECT gender FROM users WHERE id = ?', [req.user.id]);
    const gender = userRows[0]?.gender || 'other';
    const [policyRows] = await pool.query(
      'SELECT gender_applicable FROM leave_policies WHERE leave_type = ?',
      [leave_type]
    );
    if (policyRows.length > 0) {
      const policyRow = policyRows[0];
      const ga = policyRow.gender_applicable;
      const applicable =
        ga === 'all' || (ga === 'female' && gender === 'female') || (ga === 'male' && gender === 'male');
      if (!applicable) {
        return res.status(400).json({
          error: `This leave type is not available for your gender.`,
        });
      }
    }

    // Validate employee has this leave type in their balance
    const [balRows] = await pool.query(
      'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
      [req.user.id, leave_type, year]
    );
    if (balRows.length === 0) {
      return res.status(400).json({ error: `You do not have a ${leave_type} leave balance for ${year}` });
    }

    const bal = balRows[0];
    const days_requested = countWorkingDays(start_date, end_date);
    if (days_requested === 0) {
      return res.status(400).json({ error: 'The selected date range contains no working days' });
    }
    if (days_requested > parseFloat(bal.days_remaining)) {
      return res.status(400).json({
        error: `Insufficient leave balance. You have ${bal.days_remaining} days remaining but requested ${days_requested}`,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO leave_requests (user_id, leave_type, description, start_date, end_date, days_requested)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, leave_type, description.trim(), start_date, end_date, days_requested]
    );

    return res.status(201).json({ message: 'Leave request submitted', id: result.insertId, days_requested });
  } catch (err) {
    console.error('Request leave error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyLeaveRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT lr.*, h.name as hr_name, rb.name as logged_by_name
       FROM leave_requests lr
       LEFT JOIN users h ON lr.hr_id = h.id
       LEFT JOIN users rb ON lr.early_return_logged_by = rb.id
       WHERE lr.user_id = ?
       ORDER BY lr.created_at DESC`,
      [req.user.id]
    );

    const ids = rows.map(r => r.id);
    let extensions = [];
    if (ids.length > 0) {
      const [ext] = await pool.query(
        `SELECT ler.*, h.name as hr_name
         FROM leave_extension_requests ler
         LEFT JOIN users h ON ler.hr_id = h.id
         WHERE ler.leave_request_id IN (${ids.map(() => '?').join(',')})
         ORDER BY ler.created_at ASC`,
        ids
      );
      extensions = ext;
    }

    const extMap = {};
    for (const e of extensions) {
      if (!extMap[e.leave_request_id]) extMap[e.leave_request_id] = [];
      extMap[e.leave_request_id].push(e);
    }
    const result = rows.map(r => ({ ...r, extensions: extMap[r.id] || [] }));

    return res.json(result);
  } catch (err) {
    console.error('Get my leave requests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function logMyEarlyReturn(req, res) {
  const { id } = req.params;
  const { actual_return_date, reason } = req.body;
  if (!actual_return_date || !reason?.trim()) {
    return res.status(400).json({ error: 'actual_return_date and reason are required' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leave_requests WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Leave request not found' });
    const lr = rows[0];
    if (!['active', 'approved'].includes(lr.status)) {
      return res.status(400).json({ error: 'Early return can only be logged for active or approved leaves' });
    }

    await pool.query(
      `UPDATE leave_requests SET
         status = 'early_return',
         actual_return_date = ?,
         early_return_reason = ?,
         early_return_logged_by = ?
       WHERE id = ?`,
      [actual_return_date, reason.trim(), req.user.id, id]
    );

    // Refund unused days
    if (actual_return_date < lr.end_date) {
      const dayAfterReturn = new Date(actual_return_date);
      dayAfterReturn.setDate(dayAfterReturn.getDate() + 1);
      const unused = countWorkingDays(dayAfterReturn.toISOString().slice(0, 10), lr.end_date);
      if (unused > 0) {
        const year = new Date(lr.start_date).getFullYear();
        const [balRows] = await pool.query(
          'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
          [lr.user_id, lr.leave_type, year]
        );
        if (balRows.length > 0) {
          const bal = balRows[0];
          const newUsed      = Math.max(0, parseFloat(bal.days_used) - unused);
          const newRemaining = Math.max(0, parseFloat(bal.days_allocated) - newUsed);
          await pool.query(
            `UPDATE leave_balances SET days_used = ?, days_remaining = ? WHERE id = ?`,
            [newUsed, newRemaining, bal.id]
          );
        }
      }
    }

    return res.json({ message: 'Early return logged successfully' });
  } catch (err) {
    console.error('Log early return error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function requestExtension(req, res) {
  const { id } = req.params;
  const { extra_days, reason } = req.body;
  if (!extra_days || extra_days <= 0 || !reason?.trim()) {
    return res.status(400).json({ error: 'extra_days (> 0) and reason are required' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leave_requests WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Leave request not found' });
    const lr = rows[0];
    if (!['active', 'approved'].includes(lr.status)) {
      return res.status(400).json({ error: 'Extensions can only be requested for active or approved leaves' });
    }

    // Check no pending extension already exists
    const [pending] = await pool.query(
      `SELECT id FROM leave_extension_requests WHERE leave_request_id = ? AND status = 'pending'`,
      [id]
    );
    if (pending.length > 0) {
      return res.status(400).json({ error: 'A pending extension request already exists for this leave' });
    }

    const [result] = await pool.query(
      `INSERT INTO leave_extension_requests (leave_request_id, user_id, extra_days, reason)
       VALUES (?, ?, ?, ?)`,
      [id, req.user.id, extra_days, reason.trim()]
    );

    return res.status(201).json({ message: 'Extension request submitted', id: result.insertId });
  } catch (err) {
    console.error('Request extension error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Locations (read-only, for token request dropdown) ──────────────────────

async function getActiveLocations(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM acceptable_locations WHERE is_active = 1 ORDER BY name ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get active locations error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Token Requests ─────────────────────────────────────────────────────────

async function requestToken(req, res) {
  const { location_id, reason } = req.body;
  if (!location_id || !reason?.trim()) {
    return res.status(400).json({ error: 'location_id and reason are required' });
  }
  try {
    const [locRows] = await pool.query(
      'SELECT * FROM acceptable_locations WHERE id = ? AND is_active = 1',
      [location_id]
    );
    if (locRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive location' });
    }

    const [pending] = await pool.query(
      `SELECT id FROM token_requests WHERE user_id = ? AND status = 'pending'`,
      [req.user.id]
    );
    if (pending.length > 0) {
      return res.status(400).json({ error: 'You already have a pending token request' });
    }

    const [result] = await pool.query(
      `INSERT INTO token_requests (user_id, location_id, reason) VALUES (?, ?, ?)`,
      [req.user.id, location_id, reason.trim()]
    );

    return res.status(201).json({ message: 'Token request submitted', id: result.insertId });
  } catch (err) {
    console.error('Request token error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyTokenRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT tr.*, al.name as location_name
       FROM token_requests tr
       LEFT JOIN acceptable_locations al ON tr.location_id = al.id
       WHERE tr.user_id = ?
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Holidays (read-only) ────────────────────────────────────────────────────

async function getEmployeeHolidays(req, res) {
  try {
    const year = new Date().getFullYear();
    const [rows] = await pool.query(
      'SELECT id, date, name, description FROM holidays WHERE YEAR(date) = ? ORDER BY date ASC',
      [year]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get employee holidays error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getDashboard,
  getActiveLocations,
  getEmployeeHolidays,
  requestOvertime, getMyOvertimeRequests,
  requestLeave, getMyLeaveRequests, logMyEarlyReturn, requestExtension,
  requestToken, getMyTokenRequests,
};
