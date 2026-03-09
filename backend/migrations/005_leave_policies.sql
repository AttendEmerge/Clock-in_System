-- ============================================================
-- Migration 005: Company-wide leave policy defaults
-- Run ONCE after migration 004
-- ============================================================
USE clockin_system;

CREATE TABLE IF NOT EXISTS leave_policies (
  leave_type   ENUM('paid','sick','maternity','paternity') NOT NULL PRIMARY KEY,
  default_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  updated_by   INT NULL,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed with the current hardcoded defaults
INSERT INTO leave_policies (leave_type, default_days) VALUES
  ('paid',      15),
  ('sick',      10),
  ('maternity', 90),
  ('paternity',  5)
ON DUPLICATE KEY UPDATE leave_type = leave_type;
