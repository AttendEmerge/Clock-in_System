const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1h';
const REMEMBER_DAYS  = 30;
const SESSION_DAYS   = 1;  // non-remember session lasts 1 day (browser-close fallback)

function buildPayload(user) {
  return {
    id:            user.id,
    name:          user.name,
    email:         user.email,
    role:          user.role,
    department_id: user.department_id,
  };
}

async function login(req, res) {
  const { email, password, remember_me } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = buildPayload(user);

    // Short-lived access token
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

    // Refresh token (UUID stored in DB)
    const refreshId = crypto.randomUUID();
    const days      = remember_me ? REMEMBER_DAYS : SESSION_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, expires_at) VALUES (?, ?, ?)',
      [refreshId, user.id, expiresAt]
    );

    res.cookie('refresh_token', refreshId, {
      httpOnly: true,
      sameSite: 'lax',
      secure:   false,   // set to true behind HTTPS in production
      maxAge:   remember_me ? days * 24 * 60 * 60 * 1000 : undefined,
      path:     '/',
    });

    return res.json({ token: accessToken, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function refresh(req, res) {
  const refreshId = req.cookies?.refresh_token;
  if (!refreshId) return res.status(401).json({ error: 'No refresh token' });

  try {
    const [rows] = await pool.query(
      `SELECT rt.*, u.id as uid, u.name, u.email, u.role, u.department_id, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.id = ? AND rt.expires_at > NOW()`,
      [refreshId]
    );
    if (rows.length === 0) {
      res.clearCookie('refresh_token', { path: '/' });
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }

    const row = rows[0];
    if (!row.is_active) {
      res.clearCookie('refresh_token', { path: '/' });
      return res.status(401).json({ error: 'Account deactivated' });
    }

    const payload = {
      id:            row.uid,
      name:          row.name,
      email:         row.email,
      role:          row.role,
      department_id: row.department_id,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

    return res.json({ token: accessToken, user: payload });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function logout(req, res) {
  const refreshId = req.cookies?.refresh_token;
  if (refreshId) {
    try {
      await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [refreshId]);
    } catch {}
  }
  res.clearCookie('refresh_token', { path: '/' });
  return res.json({ message: 'Logged out' });
}

async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ? AND u.is_active = 1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { login, refresh, logout, getMe, changePassword };
