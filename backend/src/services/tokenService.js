const crypto = require('crypto');
const pool = require('../db/pool');

const TOKEN_EXPIRY_MS = (parseInt(process.env.TOKEN_EXPIRY_MINUTES) || 60) * 60 * 1000;

/**
 * Generate a human-readable 8-char uppercase token and store it.
 */
async function generateOneTimeToken(generatedBy, forUserId, tokenType, overtimeRequestId = null) {
  // Create a readable token like: A3K7-PX2Q
  const plain = Array.from({ length: 8 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('');
  const formatted = plain.slice(0, 4) + '-' + plain.slice(4);
  const hash = crypto.createHash('sha256').update(formatted).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  const [result] = await pool.query(
    `INSERT INTO one_time_tokens 
      (generated_by, for_user_id, token_hash, plain_token, token_type, expires_at, overtime_request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [generatedBy, forUserId, hash, formatted, tokenType, expiresAt, overtimeRequestId]
  );
  return { id: result.insertId, token: formatted, expires_at: expiresAt };
}

/**
 * Validate and consume a one-time token.
 * Optionally restricts by token_type when provided.
 * Returns { valid: bool, tokenRow: row|null, error: string|null }
 */
async function validateAndConsumeToken(plainToken, userId, tokenType) {
  const hash = crypto.createHash('sha256').update(plainToken.toUpperCase()).digest('hex');
  const now = new Date();

  let where = `token_hash = ? AND for_user_id = ? AND used_at IS NULL AND expires_at > ?`;
  const params = [hash, userId, now];

  if (tokenType) {
    where += ' AND token_type = ?';
    params.push(tokenType);
  }

  const [rows] = await pool.query(
    `SELECT * FROM one_time_tokens 
     WHERE ${where}`,
    params
  );
  if (rows.length === 0) {
    return { valid: false, tokenRow: null, error: 'Token is invalid, expired, or already used' };
  }
  const tokenRow = rows[0];
  await pool.query('UPDATE one_time_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id]);
  return { valid: true, tokenRow, error: null };
}

module.exports = { generateOneTimeToken, validateAndConsumeToken };
