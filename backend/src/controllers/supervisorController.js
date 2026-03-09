const pool = require('../db/pool');

/**
 * GET /supervisor/dashboard
 */
async function getDashboard(req, res) {
  try {
    const [deptRow] = await pool.query('SELECT department_id FROM users WHERE id = ?', [req.user.id]);
    const deptId = deptRow[0]?.department_id;

    // Team members
    const [team] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, d.name as department_name
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.department_id = ? AND u.is_active = 1`,
      [deptId]
    );

    // Pending overtime requests for this supervisor
    const [pendingOT] = await pool.query(
      `SELECT ot.*, u.name as employee_name, u.email as employee_email
       FROM overtime_requests ot
       JOIN users u ON ot.employee_id = u.id
       WHERE ot.supervisor_id = ? AND ot.status = 'pending'
       ORDER BY ot.created_at DESC`,
      [req.user.id]
    );

    // Today's attendance for team
    const [todayAttendance] = await pool.query(
      `SELECT ce.user_id, u.name, 
              MAX(CASE WHEN ce.event_type = 'clock_in' THEN ce.event_timestamp END) as clock_in,
              MAX(CASE WHEN ce.event_type = 'clock_out' THEN ce.event_timestamp END) as clock_out
       FROM clock_events ce
       JOIN users u ON ce.user_id = u.id
       WHERE u.department_id = ? AND DATE(ce.event_timestamp) = CURDATE()
       GROUP BY ce.user_id, u.name`,
      [deptId]
    );

    return res.json({ team, pending_overtime_requests: pendingOT, today_attendance: todayAttendance });
  } catch (err) {
    console.error('Supervisor dashboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /supervisor/overtime-requests  — all requests assigned to this supervisor
 */
async function getOvertimeRequests(req, res) {
  const { status } = req.query;
  try {
    let where = 'WHERE ot.supervisor_id = ?';
    const params = [req.user.id];
    if (status) { where += ' AND ot.status = ?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT ot.*, u.name as employee_name, u.email as employee_email
       FROM overtime_requests ot
       JOIN users u ON ot.employee_id = u.id
       ${where}
       ORDER BY ot.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * PATCH /supervisor/overtime-requests/:id  — approve or reject
 */
async function actionOvertimeRequest(req, res) {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM overtime_requests WHERE id = ? AND supervisor_id = ?`,
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Overtime request not found' });
    }
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been actioned' });
    }
    const newStatus = action === 'approve' ? 'supervisor_approved' : 'rejected';
    await pool.query(
      `UPDATE overtime_requests SET status = ?, supervisor_action_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [newStatus, rejection_reason || null, id]
    );
    return res.json({ message: `Request ${newStatus.replace('_', ' ')}` });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /supervisor/team  — list team members with today's status
 */
async function getTeam(req, res) {
  try {
    const [deptRow] = await pool.query('SELECT department_id FROM users WHERE id = ?', [req.user.id]);
    const deptId = deptRow[0]?.department_id;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              (SELECT event_type FROM clock_events ce 
               WHERE ce.user_id = u.id AND DATE(ce.event_timestamp) = CURDATE()
               ORDER BY ce.event_timestamp DESC LIMIT 1) as current_status
       FROM users u
       WHERE u.department_id = ? AND u.is_active = 1`,
      [deptId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getDashboard, getOvertimeRequests, actionOvertimeRequest, getTeam };
