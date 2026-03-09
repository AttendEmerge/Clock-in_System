-- ============================================================
-- Migration 003: Leave Management Overhaul
-- Run ONCE against clockin_system after migration 001 & 002
-- ============================================================
USE clockin_system;

-- -------------------------------------------------------
-- 1. Add gender column to users
-- -------------------------------------------------------
ALTER TABLE users
  ADD COLUMN gender ENUM('male','female','other') NOT NULL DEFAULT 'other';

-- -------------------------------------------------------
-- 2. Add allocation tracking to leave_balances
-- -------------------------------------------------------
ALTER TABLE leave_balances
  ADD COLUMN days_allocated DECIMAL(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN days_used      DECIMAL(5,1) NOT NULL DEFAULT 0;

-- Seed existing rows: treat current days_remaining as the full allocation (nothing used yet)
UPDATE leave_balances SET days_allocated = days_remaining, days_used = 0;

-- -------------------------------------------------------
-- 3. leave_requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT NOT NULL,
  leave_type             ENUM('paid','sick','maternity','paternity') NOT NULL,
  description            TEXT NOT NULL,
  start_date             DATE NOT NULL,
  end_date               DATE NOT NULL,
  days_requested         DECIMAL(5,1) NOT NULL,
  status                 ENUM('pending','approved','denied','active','completed','early_return')
                         NOT NULL DEFAULT 'pending',
  hr_id                  INT NULL,
  hr_note                TEXT NULL,
  actual_return_date     DATE NULL,
  early_return_reason    TEXT NULL,
  early_return_logged_by INT NULL,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)                REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id)                  REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (early_return_logged_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- 4. leave_extension_requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_extension_requests (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  leave_request_id INT NOT NULL,
  user_id          INT NOT NULL,
  extra_days       DECIMAL(5,1) NOT NULL,
  reason           TEXT NOT NULL,
  status           ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  hr_id            INT NULL,
  hr_note          TEXT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)          REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id)            REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------
CREATE INDEX idx_leave_requests_user   ON leave_requests(user_id, status);
CREATE INDEX idx_leave_requests_status ON leave_requests(status, start_date);
CREATE INDEX idx_leave_ext_request     ON leave_extension_requests(leave_request_id);
