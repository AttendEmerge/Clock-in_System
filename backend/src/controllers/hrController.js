const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { generateOneTimeToken } = require('../services/tokenService');
const {
  validateLeaveReturnDates,
  applyLeaveReturnBalanceAdjustment,
} = require('../services/leaveReturnService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function addWorkingDays(dateStr, days) {
  const result = new Date(dateStr);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow >= 1 && dow <= 5) added++;
  }
  return result.toISOString().slice(0, 10);
}

// Leave types to seed per gender — reads all policies from the DB
// Strict matching: female-only for female, male-only for male, all for everyone. 'other' gets only 'all'.
async function leaveTypesForGender(gender) {
  try {
    const [rows] = await pool.query('SELECT leave_type, default_days, gender_applicable FROM leave_policies');
    return rows
      .filter(r => {
        if (r.gender_applicable === 'all') return true;
        if (r.gender_applicable === 'female' && gender === 'female') return true;
        if (r.gender_applicable === 'male' && gender === 'male') return true;
        return false;
      })
      .map(r => ({ type: r.leave_type, days: parseFloat(r.default_days) }));
  } catch {
    return [
      { type: 'paid', days: 15 },
      { type: 'sick', days: 10 },
    ];
  }
}

// ===================== DASHBOARD =====================

async function getDashboard(req, res) {
  try {
    const [[{ total_employees }]] = await pool.query(
      `SELECT COUNT(*) as total_employees FROM users WHERE role != 'hr' AND is_active = 1`
    );
    const [[{ present_today }]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as present_today FROM clock_events
       WHERE event_type = 'clock_in' AND DATE(event_timestamp) = CURDATE()`
    );
    const [[{ late_today }]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as late_today FROM clock_events
       WHERE event_type = 'clock_in' AND DATE(event_timestamp) = CURDATE()
       AND is_flagged = 1 AND flag_reason LIKE '%LATE_ARRIVAL%'`
    );
    const [[{ flagged_count }]] = await pool.query(
      `SELECT COUNT(*) as flagged_count FROM clock_events WHERE is_flagged = 1 AND is_unflagged = 0`
    );
    const [[{ pending_ot }]] = await pool.query(
      `SELECT COUNT(*) as pending_ot FROM overtime_requests WHERE status = 'supervisor_approved'`
    );
    const [[{ pending_leave }]] = await pool.query(
      `SELECT COUNT(*) as pending_leave FROM leave_requests WHERE status = 'pending'`
    );
    const [[{ pending_token_requests }]] = await pool.query(
      `SELECT COUNT(*) as pending_token_requests FROM token_requests WHERE status = 'pending'`
    );
    const [deptStats] = await pool.query(
      `SELECT d.name as department, COUNT(DISTINCT u.id) as total,
              COUNT(DISTINCT ce.user_id) as present
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1 AND u.role != 'hr'
       LEFT JOIN clock_events ce ON ce.user_id = u.id AND DATE(ce.event_timestamp) = CURDATE() AND ce.event_type = 'clock_in'
       GROUP BY d.id, d.name`
    );
    const [weeklyStats] = await pool.query(
      `SELECT DATE(event_timestamp) as day, COUNT(DISTINCT user_id) as count
       FROM clock_events
       WHERE event_type = 'clock_in' AND event_timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(event_timestamp)
       ORDER BY day ASC`
    );
    return res.json({
      total_employees,
      present_today,
      absent_today: total_employees - present_today,
      late_today,
      flagged_count,
      pending_overtime: pending_ot,
      pending_leave,
      pending_token_requests,
      department_stats: deptStats,
      weekly_attendance: weeklyStats,
    });
  } catch (err) {
    console.error('HR dashboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== USERS =====================

async function getUsers(req, res) {
  const { department_id, role, search } = req.query;
  try {
    let where = 'WHERE u.is_active = 1';
    const params = [];
    if (department_id) { where += ' AND u.department_id = ?'; params.push(department_id); }
    if (role)          { where += ' AND u.role = ?';          params.push(role); }
    if (search)        { where += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.gender, u.department_id, u.created_at,
              d.name as department_name
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       ${where} ORDER BY u.name ASC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createUser(req, res) {
  const { name, email, password, role, department_id, gender } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  if (!['employee', 'supervisor', 'hr'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const resolvedGender = ['male', 'female', 'other'].includes(gender) ? gender : 'other';
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department_id, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hash, role, department_id || null, resolvedGender]
    );

    if (role !== 'hr') {
      const year = new Date().getFullYear();
      for (const lt of await leaveTypesForGender(resolvedGender)) {
        await pool.query(
          `INSERT IGNORE INTO leave_balances (user_id, leave_type, days_remaining, days_allocated, days_used, year)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [result.insertId, lt.type, lt.days, lt.days, year]
        );
      }
    }
    return res.status(201).json({ message: 'User created', id: result.insertId });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, department_id, is_active, gender } = req.body;
  try {
    const fields = [];
    const params = [];
    if (name          !== undefined) { fields.push('name = ?');          params.push(name); }
    if (email         !== undefined) { fields.push('email = ?');         params.push(email.toLowerCase()); }
    if (role          !== undefined) { fields.push('role = ?');          params.push(role); }
    if (department_id !== undefined) { fields.push('department_id = ?'); params.push(department_id); }
    if (is_active     !== undefined) { fields.push('is_active = ?');     params.push(is_active ? 1 : 0); }
    if (gender        !== undefined) { fields.push('gender = ?');        params.push(gender); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return res.json({ message: 'User updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function resetUserPassword(req, res) {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateLeaveBalance(req, res) {
  const { id } = req.params;
  const { leave_type, days_allocated, days_used, year } = req.body;
  if (!leave_type) return res.status(400).json({ error: 'leave_type is required' });
  if (days_allocated === undefined && days_used === undefined) {
    return res.status(400).json({ error: 'At least one of days_allocated or days_used is required' });
  }
  try {
    const y = year || new Date().getFullYear();

    // Validate leave type is applicable to user's gender
    const [userRows] = await pool.query('SELECT gender FROM users WHERE id = ?', [id]);
    const gender = userRows[0]?.gender || 'other';
    const [policyRows] = await pool.query(
      'SELECT gender_applicable FROM leave_policies WHERE leave_type = ?',
      [leave_type]
    );
    if (policyRows.length > 0) {
      const ga = policyRows[0].gender_applicable;
      const applicable =
        ga === 'all' || (ga === 'female' && gender === 'female') || (ga === 'male' && gender === 'male');
      if (!applicable) {
        const typeLabel = leave_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return res.status(400).json({
          error: `${typeLabel} leave is only applicable to ${ga === 'female' ? 'female' : 'male'} employees.`,
        });
      }
    }

    // Fetch existing row
    const [rows] = await pool.query(
      'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
      [id, leave_type, y]
    );

    if (rows.length === 0) {
      // Create new row
      const alloc = days_allocated !== undefined ? days_allocated : 0;
      const used  = days_used      !== undefined ? days_used      : 0;
      const remaining = Math.max(0, alloc - used);
      await pool.query(
        `INSERT INTO leave_balances (user_id, leave_type, days_remaining, days_allocated, days_used, year)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, leave_type, remaining, alloc, used, y]
      );
    } else {
      const current = rows[0];
      const newAlloc = days_allocated !== undefined ? days_allocated : current.days_allocated;
      const newUsed  = days_used      !== undefined ? days_used      : current.days_used;
      const remaining = Math.max(0, newAlloc - newUsed);
      await pool.query(
        `UPDATE leave_balances SET days_allocated = ?, days_used = ?, days_remaining = ?
         WHERE user_id = ? AND leave_type = ? AND year = ?`,
        [newAlloc, newUsed, remaining, id, leave_type, y]
      );
    }
    return res.json({ message: 'Leave balance updated' });
  } catch (err) {
    console.error('Update leave balance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== DEPARTMENTS =====================

async function getDepartments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, COUNT(u.id) as member_count
       FROM departments d LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
       GROUP BY d.id ORDER BY d.name`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createDepartment(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return res.status(201).json({ message: 'Department created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Department name already exists' });
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await pool.query('UPDATE departments SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    return res.json({ message: 'Department updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteDepartment(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET department_id = NULL WHERE department_id = ?', [id]);
    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    return res.json({ message: 'Department deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== TOKENS =====================

async function generateToken(req, res) {
  const { for_user_id, token_type, overtime_request_id } = req.body;
  if (!for_user_id || !token_type) {
    return res.status(400).json({ error: 'for_user_id and token_type are required' });
  }
  if (!['regular', 'overtime'].includes(token_type)) {
    return res.status(400).json({ error: 'token_type must be regular or overtime' });
  }
  try {
    if (token_type === 'overtime' && overtime_request_id) {
      const [otRows] = await pool.query(
        `SELECT * FROM overtime_requests WHERE id = ? AND status = 'supervisor_approved'`,
        [overtime_request_id]
      );
      if (otRows.length === 0) {
        return res.status(400).json({ error: 'Overtime request not found or not supervisor-approved' });
      }
      await pool.query(
        `UPDATE overtime_requests SET status = 'hr_approved', hr_id = ?, hr_action_at = NOW() WHERE id = ?`,
        [req.user.id, overtime_request_id]
      );
    }
    const { id: tokenId, token, expires_at } = await generateOneTimeToken(
      req.user.id, for_user_id, token_type, overtime_request_id || null
    );
    if (overtime_request_id) {
      await pool.query('UPDATE overtime_requests SET token_id = ? WHERE id = ?', [tokenId, overtime_request_id]);
    }

    // Auto-clock the employee in so they don't need to manually enter the token
    const now = new Date();
    const isOvertime = token_type === 'overtime' ? 1 : 0;
    await pool.query(
      `INSERT INTO clock_events
        (user_id, event_type, event_timestamp, method, is_overtime, is_flagged, flag_reason, token_id)
       VALUES (?, 'clock_in', ?, 'token', ?, 0, NULL, ?)`,
      [for_user_id, now, isOvertime, tokenId]
    );
    await pool.query('UPDATE one_time_tokens SET used_at = NOW() WHERE id = ?', [tokenId]);

    return res.status(201).json({
      token,
      expires_at,
      token_id: tokenId,
      auto_clocked_in: true,
      message: `Token generated and employee has been clocked in${isOvertime ? ' for overtime' : ''}`,
    });
  } catch (err) {
    console.error('Generate token error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getTokens(req, res) {
  const { for_user_id, used } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (for_user_id)    { where += ' AND ott.for_user_id = ?'; params.push(for_user_id); }
    if (used === 'false') { where += ' AND ott.used_at IS NULL AND ott.expires_at > NOW()'; }
    else if (used === 'true') { where += ' AND ott.used_at IS NOT NULL'; }
    const [rows] = await pool.query(
      `SELECT ott.*, u.name as for_user_name, h.name as generated_by_name
       FROM one_time_tokens ott
       JOIN users u ON ott.for_user_id = u.id
       JOIN users h ON ott.generated_by = h.id
       ${where} ORDER BY ott.created_at DESC LIMIT 100`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== FLAGS & LOCATIONS =====================

async function getFlaggedEvents(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [rows] = await pool.query(
      `SELECT ce.*, u.name as user_name, u.email, d.name as department_name
       FROM clock_events ce
       JOIN users u ON ce.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ce.is_flagged = 1 AND ce.is_unflagged = 0
       ORDER BY ce.event_timestamp DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM clock_events WHERE is_flagged = 1 AND is_unflagged = 0`
    );
    return res.json({ events: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function unflagEvent(req, res) {
  const { id } = req.params;
  const { add_to_acceptable_locations, location_name, radius_meters } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM clock_events WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = rows[0];
    await pool.query(
      `UPDATE clock_events SET is_unflagged = 1, unflagged_by = ?, unflagged_at = NOW() WHERE id = ?`,
      [req.user.id, id]
    );
    if (add_to_acceptable_locations && event.latitude != null && event.longitude != null) {
      await pool.query(
        `INSERT INTO acceptable_locations (name, latitude, longitude, radius_meters, added_by)
         VALUES (?, ?, ?, ?, ?)`,
        [location_name || `Location from event #${id}`, event.latitude, event.longitude, radius_meters || 200, req.user.id]
      );
    }
    return res.json({ message: 'Event unflagged successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAcceptableLocations(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT al.*, u.name as added_by_name
       FROM acceptable_locations al
       LEFT JOIN users u ON al.added_by = u.id
       ORDER BY al.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function addAcceptableLocation(req, res) {
  const { name, latitude, longitude, radius_meters } = req.body;
  if (!name || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'name, latitude, and longitude are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO acceptable_locations (name, latitude, longitude, radius_meters, added_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, latitude, longitude, radius_meters || 200, req.user.id]
    );
    return res.status(201).json({ message: 'Location added', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAcceptableLocation(req, res) {
  const { id } = req.params;
  const { name, latitude, longitude, radius_meters, is_active } = req.body;
  try {
    const fields = [], params = [];
    if (name          !== undefined) { fields.push('name = ?');          params.push(name); }
    if (latitude      !== undefined) { fields.push('latitude = ?');      params.push(latitude); }
    if (longitude     !== undefined) { fields.push('longitude = ?');     params.push(longitude); }
    if (radius_meters !== undefined) { fields.push('radius_meters = ?'); params.push(radius_meters); }
    if (is_active     !== undefined) { fields.push('is_active = ?');     params.push(is_active ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await pool.query(`UPDATE acceptable_locations SET ${fields.join(', ')} WHERE id = ?`, params);
    return res.json({ message: 'Location updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAcceptableLocation(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM acceptable_locations WHERE id = ?', [id]);
    return res.json({ message: 'Location removed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== WORK SCHEDULE =====================

async function getWorkSchedule(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM work_schedule LIMIT 1');
    return res.json(rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateWorkSchedule(req, res) {
  const { expected_start, expected_end, late_grace_minutes, overtime_buffer_minutes } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM work_schedule LIMIT 1');
    if (existing.length > 0) {
      await pool.query(
        `UPDATE work_schedule SET expected_start = ?, expected_end = ?,
         late_grace_minutes = ?, overtime_buffer_minutes = ?, updated_by = ? WHERE id = ?`,
        [expected_start, expected_end, late_grace_minutes, overtime_buffer_minutes, req.user.id, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO work_schedule (expected_start, expected_end, late_grace_minutes, overtime_buffer_minutes, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [expected_start, expected_end, late_grace_minutes, overtime_buffer_minutes, req.user.id]
      );
    }
    return res.json({ message: 'Work schedule updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== OVERTIME REQUESTS =====================

async function getOvertimeRequests(req, res) {
  const { status } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND ot.status = ?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT ot.*, e.name as employee_name, e.email as employee_email,
              s.name as supervisor_name
       FROM overtime_requests ot
       JOIN users e ON ot.employee_id = e.id
       LEFT JOIN users s ON ot.supervisor_id = s.id
       ${where} ORDER BY ot.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * PATCH /hr/overtime-requests/:id — reject a supervisor-approved request (no token / no clock-in)
 */
async function rejectOvertimeRequest(req, res) {
  const { id } = req.params;
  const rejection_reason = req.body?.rejection_reason?.trim();
  if (!rejection_reason) {
    return res.status(400).json({ error: 'rejection_reason is required' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM overtime_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }
    if (rows[0].status !== 'supervisor_approved') {
      return res.status(400).json({ error: 'Only supervisor-approved requests can be rejected by HR' });
    }
    await pool.query(
      `UPDATE overtime_requests SET status = 'rejected', hr_id = ?, hr_action_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [req.user.id, rejection_reason, id]
    );
    return res.json({ message: 'Overtime request rejected' });
  } catch (err) {
    console.error('Reject overtime request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== CLOCK HISTORY =====================

async function getEmployeeClockHistory(req, res) {
  const { user_id, from, to, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (user_id) { where += ' AND ce.user_id = ?'; params.push(user_id); }
    if (from)    { where += ' AND DATE(ce.event_timestamp) >= ?'; params.push(from); }
    if (to)      { where += ' AND DATE(ce.event_timestamp) <= ?'; params.push(to); }
    const [rows] = await pool.query(
      `SELECT ce.*, u.name as user_name, u.email, d.name as department_name
       FROM clock_events ce
       JOIN users u ON ce.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${where} ORDER BY ce.event_timestamp DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM clock_events ce ${where}`,
      params
    );
    return res.json({ events: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== LEAVE REQUESTS =====================

async function getLeaveRequests(req, res) {
  const { status, user_id, from_date, to_date } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status)    { where += ' AND lr.status = ?';                   params.push(status); }
    if (user_id)   { where += ' AND lr.user_id = ?';                  params.push(user_id); }
    if (from_date) { where += ' AND lr.start_date >= ?';              params.push(from_date); }
    if (to_date)   { where += ' AND lr.end_date <= ?';                params.push(to_date); }

    const [rows] = await pool.query(
      `SELECT lr.*,
              u.name as employee_name, u.email as employee_email, u.gender,
              d.name as department_name,
              h.name as hr_name
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users h ON lr.hr_id = h.id
       ${where}
       ORDER BY lr.created_at DESC`,
      params
    );

    // Attach extension requests for each leave
    const ids = rows.map(r => r.id);
    let extensions = [];
    if (ids.length > 0) {
      const [ext] = await pool.query(
        `SELECT ler.*, u.name as requester_name, h.name as hr_name
         FROM leave_extension_requests ler
         JOIN users u ON ler.user_id = u.id
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
    console.error('Get leave requests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function reviewLeaveRequest(req, res) {
  const { id } = req.params;
  const { action, hr_note } = req.body;
  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or deny' });
  }
  if (action === 'deny' && !hr_note?.trim()) {
    return res.status(400).json({ error: 'A note is required when denying a request' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM leave_requests WHERE id = ?', [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Leave request not found' });
    const lr = rows[0];
    if (lr.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be reviewed' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    await pool.query(
      `UPDATE leave_requests SET status = ?, hr_id = ?, hr_note = ? WHERE id = ?`,
      [newStatus, req.user.id, hr_note || null, id]
    );

    if (action === 'approve') {
      // Deduct days from leave balance
      const year = new Date(lr.start_date).getFullYear();
      const [balRows] = await pool.query(
        'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
        [lr.user_id, lr.leave_type, year]
      );
      if (balRows.length > 0) {
        const bal = balRows[0];
        const newUsed      = parseFloat(bal.days_used) + parseFloat(lr.days_requested);
        const newRemaining = Math.max(0, parseFloat(bal.days_allocated) - newUsed);
        await pool.query(
          `UPDATE leave_balances SET days_used = ?, days_remaining = ? WHERE id = ?`,
          [newUsed, newRemaining, bal.id]
        );
      }
    }

    return res.json({ message: `Leave request ${newStatus}` });
  } catch (err) {
    console.error('Review leave request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function hrLogEarlyReturn(req, res) {
  const { id } = req.params;
  const { actual_return_date, reason } = req.body;
  if (!actual_return_date || !reason?.trim()) {
    return res.status(400).json({ error: 'actual_return_date and reason are required' });
  }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    const lr = rows[0];
    if (!['active', 'approved'].includes(lr.status)) {
      return res.status(400).json({ error: 'A return can only be logged for active or approved leave' });
    }

    const dateErr = validateLeaveReturnDates(lr, actual_return_date);
    if (dateErr.error) {
      return res.status(400).json({ error: dateErr.error });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE leave_requests SET
         status = 'early_return',
         actual_return_date = ?,
         early_return_reason = ?,
         early_return_logged_by = ?
       WHERE id = ?`,
      [actual_return_date, reason.trim(), req.user.id, id]
    );

    const adj = await applyLeaveReturnBalanceAdjustment(lr, actual_return_date, conn);
    if (adj.error) {
      await conn.rollback();
      return res.status(400).json({ error: adj.error });
    }
    await conn.commit();
    return res.json({ message: 'Return logged successfully' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('HR log leave return error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
}

async function getExtensionRequests(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT ler.*, u.name as requester_name, h.name as hr_name
       FROM leave_extension_requests ler
       JOIN users u ON ler.user_id = u.id
       LEFT JOIN users h ON ler.hr_id = h.id
       WHERE ler.leave_request_id = ?
       ORDER BY ler.created_at ASC`,
      [id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function reviewExtensionRequest(req, res) {
  const { id } = req.params;
  const { action, hr_note } = req.body;
  if (!['approve', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or deny' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT ler.*, lr.user_id, lr.leave_type, lr.start_date, lr.end_date
       FROM leave_extension_requests ler
       JOIN leave_requests lr ON ler.leave_request_id = lr.id
       WHERE ler.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Extension request not found' });
    const ext = rows[0];
    if (ext.status !== 'pending') {
      return res.status(400).json({ error: 'Extension already reviewed' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied';
    await pool.query(
      `UPDATE leave_extension_requests SET status = ?, hr_id = ?, hr_note = ? WHERE id = ?`,
      [newStatus, req.user.id, hr_note || null, id]
    );

    if (action === 'approve') {
      // Extend the leave end_date by extra_days working days
      const newEndDate = addWorkingDays(ext.end_date, parseFloat(ext.extra_days));
      await pool.query(
        'UPDATE leave_requests SET end_date = ? WHERE id = ?',
        [newEndDate, ext.leave_request_id]
      );

      // Add extra_days to leave balance allocation
      const year = new Date(ext.start_date).getFullYear();
      const [balRows] = await pool.query(
        'SELECT * FROM leave_balances WHERE user_id = ? AND leave_type = ? AND year = ?',
        [ext.user_id, ext.leave_type, year]
      );
      if (balRows.length > 0) {
        const bal = balRows[0];
        const newAlloc     = parseFloat(bal.days_allocated) + parseFloat(ext.extra_days);
        const newRemaining = Math.max(0, newAlloc - parseFloat(bal.days_used));
        await pool.query(
          `UPDATE leave_balances SET days_allocated = ?, days_remaining = ? WHERE id = ?`,
          [newAlloc, newRemaining, bal.id]
        );
      }
    }

    return res.json({ message: `Extension ${newStatus}` });
  } catch (err) {
    console.error('Review extension error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== LEAVE POLICY =====================

async function getLeavePolicy(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_policies ORDER BY leave_type');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createLeavePolicy(req, res) {
  const { leave_type, default_days, gender_applicable } = req.body;
  if (!leave_type?.trim()) {
    return res.status(400).json({ error: 'leave_type is required' });
  }
  if (default_days === undefined || default_days < 0 || !Number.isInteger(default_days)) {
    return res.status(400).json({ error: 'default_days must be a whole number 0 or greater' });
  }
  const gender = ['all', 'male', 'female'].includes(gender_applicable) ? gender_applicable : 'all';
  const typeKey = leave_type.trim().toLowerCase().replace(/\s+/g, '_');
  try {
    const [existing] = await pool.query('SELECT leave_type FROM leave_policies WHERE leave_type = ?', [typeKey]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A leave policy with that name already exists' });
    }
    await pool.query(
      `INSERT INTO leave_policies (leave_type, default_days, gender_applicable, updated_by) VALUES (?, ?, ?, ?)`,
      [typeKey, default_days, gender, req.user.id]
    );
    return res.status(201).json({ message: 'Leave type created', leave_type: typeKey });
  } catch (err) {
    console.error('Create leave policy error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateLeavePolicy(req, res) {
  const { type: leave_type } = req.params;
  const { default_days, gender_applicable } = req.body;
  if (default_days === undefined || default_days < 0 || !Number.isInteger(default_days)) {
    return res.status(400).json({ error: 'default_days must be a whole number 0 or greater' });
  }
  try {
    const fields = ['default_days = ?', 'updated_by = ?'];
    const params = [default_days, req.user.id];
    if (gender_applicable && ['all', 'male', 'female'].includes(gender_applicable)) {
      fields.push('gender_applicable = ?');
      params.push(gender_applicable);
    }
    params.push(leave_type);
    await pool.query(`UPDATE leave_policies SET ${fields.join(', ')} WHERE leave_type = ?`, params);
    return res.json({ message: 'Leave policy updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteLeavePolicy(req, res) {
  const { type: leave_type } = req.params;
  try {
    const [active] = await pool.query(
      `SELECT id FROM leave_requests WHERE leave_type = ? AND status IN ('pending','approved','active') LIMIT 1`,
      [leave_type]
    );
    if (active.length > 0) {
      return res.status(400).json({ error: 'Cannot delete: employees have active leave requests of this type' });
    }
    await pool.query('DELETE FROM leave_policies WHERE leave_type = ?', [leave_type]);
    return res.json({ message: 'Leave policy deleted' });
  } catch (err) {
    console.error('Delete leave policy error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== ATTENDANCE REPORT =====================

async function exportAttendanceReport(req, res) {
  const { year, month, department_id } = req.query;
  try {
    let dateWhere = 'WHERE 1=1';
    const params = [];
    if (year)  { dateWhere += ' AND YEAR(ce.event_timestamp) = ?';  params.push(year); }
    if (month) { dateWhere += ' AND MONTH(ce.event_timestamp) = ?'; params.push(month); }

    let userWhere = "WHERE u.is_active = 1 AND u.role != 'hr'";
    const userParams = [];
    if (department_id) { userWhere += ' AND u.department_id = ?'; userParams.push(department_id); }

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.gender, d.name as department
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       ${userWhere} ORDER BY u.name ASC`,
      userParams
    );

    if (users.length === 0) {
      const csv = '"Employee","Department","Days Present","Days Absent","Late Arrivals","Attendance %"\r\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
      return res.send(csv);
    }

    const userIds = users.map(u => u.id);

    const [clockRows] = await pool.query(
      `SELECT ce.user_id,
              COUNT(DISTINCT CASE WHEN ce.event_type = 'clock_in' THEN DATE(ce.event_timestamp) END) as days_present,
              SUM(CASE WHEN ce.event_type = 'clock_in' AND ce.is_flagged = 1 AND ce.flag_reason LIKE '%LATE_ARRIVAL%' THEN 1 ELSE 0 END) as late_arrivals,
              SEC_TO_TIME(SUM(CASE WHEN ce.event_type = 'clock_out' THEN 0 ELSE 0 END)) as placeholder
       FROM clock_events ce
       ${dateWhere} AND ce.user_id IN (${userIds.map(() => '?').join(',')})
       GROUP BY ce.user_id`,
      [...params, ...userIds]
    );

    const startDate = year && month
      ? new Date(parseInt(year), parseInt(month) - 1, 1)
      : year
        ? new Date(parseInt(year), 0, 1)
        : new Date(new Date().getFullYear(), 0, 1);
    let endDate = year && month
      ? new Date(parseInt(year), parseInt(month), 0)
      : year
        ? new Date(parseInt(year), 11, 31)
        : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (endDate > today) endDate = today;

    const reportYear = startDate.getFullYear();
    const holidaySet = await getHolidayDatesForYear(reportYear);
    const totalWorkingDays = countWorkingDays(startDate, endDate, holidaySet);

    const clockMap = {};
    for (const r of clockRows) clockMap[r.user_id] = r;

    function csvCell(val) {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    }

    const cols = ['Employee', 'Department', 'Gender', 'Days Present', 'Days Absent', 'Late Arrivals', 'Attendance %'];
    const csvLines = [
      cols.map(csvCell).join(','),
      ...users.map(u => {
        const row = clockMap[u.id] || {};
        const present  = parseInt(row.days_present) || 0;
        const absent   = Math.max(0, totalWorkingDays - present);
        const late     = parseInt(row.late_arrivals) || 0;
        const rate     = totalWorkingDays > 0 ? ((present / totalWorkingDays) * 100).toFixed(1) : '0.0';
        return [u.name, u.department || '', u.gender, present, absent, late, `${rate}%`].map(csvCell).join(',');
      }),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
    return res.send(csvLines.join('\r\n'));
  } catch (err) {
    console.error('Attendance report error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAttendanceReportPreview(req, res) {
  const { year, month, department_id } = req.query;
  try {
    let dateWhere = 'WHERE 1=1';
    const params = [];
    if (year)  { dateWhere += ' AND YEAR(ce.event_timestamp) = ?';  params.push(year); }
    if (month) { dateWhere += ' AND MONTH(ce.event_timestamp) = ?'; params.push(month); }

    let userWhere = "WHERE u.is_active = 1 AND u.role != 'hr'";
    const userParams = [];
    if (department_id) { userWhere += ' AND u.department_id = ?'; userParams.push(department_id); }

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.gender, d.name as department
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       ${userWhere} ORDER BY u.name ASC`,
      userParams
    );

    if (users.length === 0) return res.json([]);

    const userIds = users.map(u => u.id);
    const [clockRows] = await pool.query(
      `SELECT ce.user_id,
              COUNT(DISTINCT CASE WHEN ce.event_type = 'clock_in' THEN DATE(ce.event_timestamp) END) as days_present,
              SUM(CASE WHEN ce.event_type = 'clock_in' AND ce.is_flagged = 1 AND ce.flag_reason LIKE '%LATE_ARRIVAL%' THEN 1 ELSE 0 END) as late_arrivals
       FROM clock_events ce
       ${dateWhere} AND ce.user_id IN (${userIds.map(() => '?').join(',')})
       GROUP BY ce.user_id`,
      [...params, ...userIds]
    );

    const startDate = year && month
      ? new Date(parseInt(year), parseInt(month) - 1, 1)
      : year ? new Date(parseInt(year), 0, 1) : new Date(new Date().getFullYear(), 0, 1);
    let endDate = year && month
      ? new Date(parseInt(year), parseInt(month), 0)
      : year ? new Date(parseInt(year), 11, 31) : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (endDate > today) endDate = today;

    const reportYear = startDate.getFullYear();
    const holidaySet = await getHolidayDatesForYear(reportYear);
    const totalWorkingDays = countWorkingDays(startDate, endDate, holidaySet);

    const clockMap = {};
    for (const r of clockRows) clockMap[r.user_id] = r;

    const result = users.map(u => {
      const row = clockMap[u.id] || {};
      const present = parseInt(row.days_present) || 0;
      return {
        name:         u.name,
        department:   u.department || '—',
        gender:       u.gender,
        days_present:        present,
        days_absent:         Math.max(0, totalWorkingDays - present),
        late_arrivals:       parseInt(row.late_arrivals) || 0,
        attendance_rate:     totalWorkingDays > 0 ? ((present / totalWorkingDays) * 100).toFixed(1) : '0.0',
        total_working_days:  totalWorkingDays,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Attendance preview error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== OVERTIME REPORT =====================

async function exportOvertimeReport(req, res) {
  const { year, department_id } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (year)          { where += ' AND YEAR(ot.created_at) = ?';  params.push(year); }
    if (department_id) { where += ' AND u.department_id = ?';       params.push(department_id); }

    const [rows] = await pool.query(
      `SELECT u.name as employee_name, d.name as department,
              COUNT(*) as total_requests,
              SUM(CASE WHEN ot.overtime_type = 'regular'       THEN 1 ELSE 0 END) as regular_requests,
              SUM(CASE WHEN ot.overtime_type = 'double'        THEN 1 ELSE 0 END) as double_requests,
              SUM(CASE WHEN ot.status = 'pending'              THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN ot.status = 'supervisor_approved'  THEN 1 ELSE 0 END) as supervisor_approved,
              SUM(CASE WHEN ot.status = 'hr_approved'          THEN 1 ELSE 0 END) as hr_approved,
              SUM(CASE WHEN ot.status = 'rejected'             THEN 1 ELSE 0 END) as rejected
       FROM overtime_requests ot
       JOIN users u ON ot.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${where}
       GROUP BY u.id, u.name, d.name
       ORDER BY u.name ASC`,
      params
    );

    function csvCell(val) { const s = val == null ? '' : String(val); return `"${s.replace(/"/g, '""')}"`; }
    const cols = ['Employee', 'Department', 'Total Requests', 'Regular OT', 'Double OT', 'Pending', 'Supervisor Approved', 'HR Approved', 'Rejected'];
    const csvLines = [
      cols.map(csvCell).join(','),
      ...rows.map(r => [r.employee_name, r.department || '', r.total_requests, r.regular_requests, r.double_requests, r.pending, r.supervisor_approved, r.hr_approved, r.rejected].map(csvCell).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="overtime_report_${Date.now()}.csv"`);
    return res.send(csvLines.join('\r\n'));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getOvertimeReportPreview(req, res) {
  const { year, department_id } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (year)          { where += ' AND YEAR(ot.created_at) = ?';  params.push(year); }
    if (department_id) { where += ' AND u.department_id = ?';       params.push(department_id); }

    const [rows] = await pool.query(
      `SELECT u.name as employee_name, d.name as department,
              COUNT(*) as total_requests,
              SUM(CASE WHEN ot.overtime_type = 'regular'       THEN 1 ELSE 0 END) as regular_requests,
              SUM(CASE WHEN ot.overtime_type = 'double'        THEN 1 ELSE 0 END) as double_requests,
              SUM(CASE WHEN ot.status = 'pending'              THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN ot.status = 'supervisor_approved'  THEN 1 ELSE 0 END) as supervisor_approved,
              SUM(CASE WHEN ot.status = 'hr_approved'          THEN 1 ELSE 0 END) as hr_approved,
              SUM(CASE WHEN ot.status = 'rejected'             THEN 1 ELSE 0 END) as rejected
       FROM overtime_requests ot
       JOIN users u ON ot.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${where}
       GROUP BY u.id, u.name, d.name
       ORDER BY u.name ASC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== LEAVE REPORT =====================

async function exportLeaveReport(req, res) {
  const { year, department_id, user_id, leave_type, status } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (year)          { where += ' AND YEAR(lr.start_date) = ?'; params.push(year); }
    if (department_id) { where += ' AND u.department_id = ?';     params.push(department_id); }
    if (user_id)       { where += ' AND lr.user_id = ?';          params.push(user_id); }
    if (leave_type)    { where += ' AND lr.leave_type = ?';       params.push(leave_type); }
    if (status)        { where += ' AND lr.status = ?';           params.push(status); }

    const [rows] = await pool.query(
      `SELECT
         u.name         AS employee_name,
         d.name         AS department,
         u.gender,
         lr.leave_type,
         lr.start_date,
         lr.end_date,
         lr.days_requested,
         CASE
           WHEN lr.actual_return_date IS NOT NULL
             THEN (SELECT COUNT(*) FROM (
               SELECT ADDDATE(lr.start_date, t3.t*100 + t2.t*10 + t1.t)
               FROM (SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t1,
                    (SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t2,
                    (SELECT 0 t UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t3
               HAVING ADDDATE(lr.start_date, t3.t*100 + t2.t*10 + t1.t) BETWEEN lr.start_date AND lr.actual_return_date
                  AND DAYOFWEEK(ADDDATE(lr.start_date, t3.t*100 + t2.t*10 + t1.t)) NOT IN (1,7)
             ) days_calc)
           ELSE lr.days_requested
         END            AS days_actually_taken,
         lr.status,
         CASE
           WHEN lr.actual_return_date IS NULL THEN ''
           WHEN lr.actual_return_date < lr.end_date
             THEN CONCAT('Early (', DATE_FORMAT(lr.actual_return_date, '%e %b %Y'), ')')
           WHEN lr.actual_return_date > lr.end_date
             THEN CONCAT('Late (', DATE_FORMAT(lr.actual_return_date, '%e %b %Y'), ')')
           ELSE CONCAT('On time (', DATE_FORMAT(lr.actual_return_date, '%e %b %Y'), ')')
         END AS return_type_display,
         COALESCE(lr.early_return_reason, '')                                  AS return_reason,
         lr.hr_note,
         lr.created_at
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${where}
       ORDER BY lr.created_at DESC`,
      params
    );

    // Build CSV
    const cols = [
      'Employee Name', 'Department', 'Gender', 'Leave Type',
      'Start Date', 'End Date', 'Days Requested', 'Days Actually Taken',
      'Status', 'Return type', 'Return reason', 'HR Note', 'Submitted At',
    ];

    function csvCell(val) {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    }

    const statusLabel = (s) => {
      if (s === 'early_return') return 'Return logged';
      return String(s || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const csvLines = [
      cols.map(csvCell).join(','),
      ...rows.map(r => [
        r.employee_name, r.department || '', r.gender, r.leave_type,
        r.start_date, r.end_date, r.days_requested, r.days_actually_taken,
        statusLabel(r.status), r.return_type_display, r.return_reason, r.hr_note || '',
        r.created_at,
      ].map(csvCell).join(',')),
    ];

    const csv = csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leave_report_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('Export leave report error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== TOKEN REQUESTS =====================

async function getTokenRequests(req, res) {
  const { status } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND tr.status = ?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT tr.*, u.name as employee_name, u.email as employee_email,
              al.name as location_name
       FROM token_requests tr
       JOIN users u ON tr.user_id = u.id
       LEFT JOIN acceptable_locations al ON tr.location_id = al.id
       ${where}
       ORDER BY tr.created_at DESC LIMIT 100`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get token requests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function actionTokenRequest(req, res) {
  const { id } = req.params;
  const { action, hr_note } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT tr.*, al.latitude, al.longitude, al.name as location_name
       FROM token_requests tr
       LEFT JOIN acceptable_locations al ON tr.location_id = al.id
       WHERE tr.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Token request not found' });
    const tr = rows[0];
    if (tr.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been actioned' });
    }

    if (action === 'reject') {
      await pool.query(
        `UPDATE token_requests SET status = 'rejected', hr_id = ?, hr_note = ?, actioned_at = NOW() WHERE id = ?`,
        [req.user.id, hr_note || null, id]
      );
      return res.json({ message: 'Token request rejected' });
    }

    // Approve: generate token, auto-clock the employee in
    const { id: tokenId } = await generateOneTimeToken(
      req.user.id, tr.user_id, 'regular', null
    );

    const now = new Date();
    await pool.query(
      `INSERT INTO clock_events
        (user_id, event_type, event_timestamp, latitude, longitude, method, is_overtime, is_flagged, flag_reason, token_id)
       VALUES (?, 'clock_in', ?, ?, ?, 'token', 0, 0, NULL, ?)`,
      [tr.user_id, now, tr.latitude || null, tr.longitude || null, tokenId]
    );

    // Mark the generated token as used
    await pool.query('UPDATE one_time_tokens SET used_at = NOW() WHERE id = ?', [tokenId]);

    await pool.query(
      `UPDATE token_requests SET status = 'approved', hr_id = ?, hr_note = ?, token_id = ?, actioned_at = NOW() WHERE id = ?`,
      [req.user.id, hr_note || null, tokenId, id]
    );

    return res.json({ message: 'Token request approved — employee has been clocked in' });
  } catch (err) {
    console.error('Action token request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===================== HOLIDAYS =====================

async function getHolidays(req, res) {
  const { year } = req.query;
  try {
    let query = 'SELECT * FROM holidays';
    const params = [];
    if (year) {
      query += ' WHERE YEAR(date) = ?';
      params.push(year);
    }
    query += ' ORDER BY date ASC';
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error('Get holidays error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createHoliday(req, res) {
  const { date, name, description } = req.body;
  if (!date || !name?.trim()) {
    return res.status(400).json({ error: 'date and name are required' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM holidays WHERE date = ?', [date]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A holiday already exists on that date' });
    }
    const [result] = await pool.query(
      'INSERT INTO holidays (date, name, description, created_by) VALUES (?, ?, ?, ?)',
      [date, name.trim(), description?.trim() || null, req.user.id]
    );
    return res.status(201).json({ message: 'Holiday created', id: result.insertId });
  } catch (err) {
    console.error('Create holiday error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateHoliday(req, res) {
  const { id } = req.params;
  const { date, name, description } = req.body;
  try {
    const [rows] = await pool.query('SELECT id FROM holidays WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Holiday not found' });
    if (date) {
      const [dup] = await pool.query('SELECT id FROM holidays WHERE date = ? AND id != ?', [date, id]);
      if (dup.length > 0) return res.status(409).json({ error: 'Another holiday already exists on that date' });
    }
    const fields = [];
    const params = [];
    if (date)  { fields.push('date = ?'); params.push(date); }
    if (name)  { fields.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description?.trim() || null); }
    if (fields.length === 0) return res.json({ message: 'Nothing to update' });
    params.push(id);
    await pool.query(`UPDATE holidays SET ${fields.join(', ')} WHERE id = ?`, params);
    return res.json({ message: 'Holiday updated' });
  } catch (err) {
    console.error('Update holiday error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteHoliday(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM holidays WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Holiday not found' });
    await pool.query('DELETE FROM holidays WHERE id = ?', [id]);
    return res.json({ message: 'Holiday deleted' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Shared helper to get holiday date strings for a year (used by other modules)
async function getHolidayDatesForYear(year) {
  const [rows] = await pool.query('SELECT date FROM holidays WHERE YEAR(date) = ?', [year]);
  return new Set(rows.map(r => {
    const d = r.date instanceof Date ? r.date : new Date(r.date);
    return d.toISOString().slice(0, 10);
  }));
}

module.exports = {
  getDashboard,
  getUsers, createUser, updateUser, deleteUser, resetUserPassword, updateLeaveBalance,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  generateToken, getTokens,
  getFlaggedEvents, unflagEvent,
  getAcceptableLocations, addAcceptableLocation, updateAcceptableLocation, deleteAcceptableLocation,
  getWorkSchedule, updateWorkSchedule,
  getOvertimeRequests, rejectOvertimeRequest,
  getEmployeeClockHistory,
  getLeaveRequests, reviewLeaveRequest, hrLogEarlyReturn,
  getExtensionRequests, reviewExtensionRequest,
  exportLeaveReport,
  getLeavePolicy, createLeavePolicy, updateLeavePolicy, deleteLeavePolicy,
  getAttendanceReportPreview, exportAttendanceReport,
  getOvertimeReportPreview, exportOvertimeReport,
  getTokenRequests, actionTokenRequest,
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getHolidayDatesForYear,
};
