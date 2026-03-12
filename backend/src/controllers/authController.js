const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const { generateOneTimeToken, validateAndConsumeToken } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailService');

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1h';
const REMEMBER_DAYS  = 30;
const SESSION_DAYS   = 1;  // non-remember session lasts 1 day (browser-close fallback)
const IS_PROD        = process.env.NODE_ENV === 'production';
const PASSWORD_MIN_LENGTH = 8;

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
      secure:   IS_PROD,
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
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${PASSWORD_MIN_LENGTH} characters` });
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

async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, is_active FROM users WHERE email = ?',
      [normalizedEmail]
    );

    // Always respond with a generic message to avoid leaking which emails exist.
    const genericMessage =
      'If an account with that email exists, we have sent password reset instructions.';

    if (rows.length === 0 || !rows[0].is_active) {
      return res.json({ message: genericMessage });
    }

    const user = rows[0];

    // Generate a password reset token using the shared one_time_tokens table.
    const tokenRecord = await generateOneTimeToken(
      user.id,           // generated_by: treat as self-generated
      user.id,           // for_user_id
      'password_reset',
      null
    );

    // Derive frontend origin for the reset link.
    let origin = process.env.FRONTEND_URL;
    if (!origin && req.headers.origin) {
      origin = req.headers.origin.replace(/\/$/, '');
    }
    if (!origin && req.headers.referer) {
      try {
        const u = new URL(req.headers.referer);
        origin = u.origin;
      } catch {
        // ignore
      }
    }
    if (!origin) {
      origin = `${req.protocol}://${req.hostname}:5173`;
    }

    const encodedEmail = encodeURIComponent(user.email);
    const encodedToken = encodeURIComponent(tokenRecord.token);
    const resetLink = `${origin}/reset-password?email=${encodedEmail}&token=${encodedToken}`;

    try {
      await sendPasswordResetEmail(user, resetLink);
    } catch (emailErr) {
      // Log but do not reveal transport errors to the client.
      console.error('Password reset email error:', emailErr.message || emailErr);
      if (emailErr.response) console.error('SMTP response:', emailErr.response);
    }

    return res.json({ message: genericMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function resetPassword(req, res) {
  const { email, token, newPassword } = req.body || {};

  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ error: 'Email, token, and new password are required' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      error: `New password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      'SELECT id, password_hash, is_active FROM users WHERE email = ?',
      [normalizedEmail]
    );

    // Provide the same generic response wording for both success and failure cases
    // where appropriate, to avoid leaking whether the email or token is valid.
    const failureMessage = 'The reset link is invalid or has expired.';

    if (rows.length === 0 || !rows[0].is_active) {
      // Run a fake token validation path to keep timing similar.
      await validateAndConsumeToken(token, -1, 'password_reset').catch(() => {});
      return res.status(400).json({ error: failureMessage });
    }

    const user = rows[0];

    const { valid, error } = await validateAndConsumeToken(
      token,
      user.id,
      'password_reset'
    );

    if (!valid) {
      return res.status(400).json({ error: failureMessage });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
      hash,
      user.id,
    ]);

    // Optionally invalidate existing refresh tokens so all sessions must re-login.
    try {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
    } catch (cleanupErr) {
      console.error('Refresh token cleanup error after password reset:', cleanupErr);
    }

    return res.json({
      message: 'Your password has been reset. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
