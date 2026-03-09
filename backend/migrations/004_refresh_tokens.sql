-- ============================================================
-- Migration 004: Refresh Tokens (persistent sessions)
-- Run ONCE against clockin_system after migration 003
-- ============================================================
USE clockin_system;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         CHAR(36)  PRIMARY KEY,           -- crypto.randomUUID()
  user_id    INT       NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
