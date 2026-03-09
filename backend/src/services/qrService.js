const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const QR_ROTATION_MS = (parseInt(process.env.QR_ROTATION_MINUTES) || 5) * 60 * 1000;

/**
 * Get the current valid QR session, creating a new one if needed.
 */
async function getCurrentQRSession() {
  const now = new Date();
  const [rows] = await pool.query(
    'SELECT * FROM qr_sessions WHERE is_valid = 1 AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
    [now]
  );
  if (rows.length > 0) {
    return rows[0];
  }
  return await createNewQRSession();
}

/**
 * Invalidate all old sessions and create a fresh one.
 */
async function createNewQRSession() {
  await pool.query('UPDATE qr_sessions SET is_valid = 0 WHERE is_valid = 1');
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + QR_ROTATION_MS);
  const [result] = await pool.query(
    'INSERT INTO qr_sessions (token, expires_at, is_valid) VALUES (?, ?, 1)',
    [token, expiresAt]
  );
  return { id: result.insertId, token, expires_at: expiresAt };
}

/**
 * Validate a QR token from a scan — returns the session row or null.
 */
async function validateQRToken(token) {
  const now = new Date();
  const [rows] = await pool.query(
    'SELECT * FROM qr_sessions WHERE token = ? AND is_valid = 1 AND expires_at > ?',
    [token, now]
  );
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { getCurrentQRSession, createNewQRSession, validateQRToken };
