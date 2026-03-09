-- ============================================================
-- Clock-in System Database Migration
-- Run this file against your MySQL database to set up schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS clockin_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clockin_system;

-- -------------------------
-- Departments
-- -------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------
-- Users
-- -------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('employee', 'supervisor', 'hr') NOT NULL DEFAULT 'employee',
  department_id INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- -------------------------
-- Leave Balances
-- -------------------------
CREATE TABLE IF NOT EXISTS leave_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  leave_type ENUM('paid', 'sick', 'maternity', 'paternity') NOT NULL,
  days_remaining DECIMAL(5,1) NOT NULL DEFAULT 0,
  year YEAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_type_year (user_id, leave_type, year),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------
-- Acceptable Locations
-- -------------------------
CREATE TABLE IF NOT EXISTS acceptable_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 200,
  added_by INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------
-- Work Schedule (company-wide)
-- -------------------------
CREATE TABLE IF NOT EXISTS work_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expected_start TIME NOT NULL DEFAULT '08:00:00',
  expected_end TIME NOT NULL DEFAULT '17:00:00',
  late_grace_minutes INT NOT NULL DEFAULT 15,
  overtime_buffer_minutes INT NOT NULL DEFAULT 5,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default schedule
INSERT INTO work_schedule (expected_start, expected_end, late_grace_minutes, overtime_buffer_minutes)
VALUES ('08:00:00', '17:00:00', 15, 5)
ON DUPLICATE KEY UPDATE id=id;

-- -------------------------
-- QR Sessions (rotating tokens)
-- -------------------------
CREATE TABLE IF NOT EXISTS qr_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_valid TINYINT(1) NOT NULL DEFAULT 1
);

-- -------------------------
-- Overtime Requests
-- -------------------------
CREATE TABLE IF NOT EXISTS overtime_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  supervisor_id INT,
  reason TEXT NOT NULL,
  requested_date DATE NOT NULL,
  status ENUM('pending', 'supervisor_approved', 'hr_approved', 'rejected') NOT NULL DEFAULT 'pending',
  supervisor_action_at TIMESTAMP NULL,
  hr_action_at TIMESTAMP NULL,
  hr_id INT,
  rejection_reason TEXT,
  token_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -------------------------
-- One-Time Tokens
-- -------------------------
CREATE TABLE IF NOT EXISTS one_time_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  generated_by INT NOT NULL,
  for_user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  plain_token VARCHAR(20) NOT NULL,
  token_type ENUM('regular', 'overtime') NOT NULL DEFAULT 'regular',
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  supervisor_approved_by INT,
  overtime_request_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (for_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (overtime_request_id) REFERENCES overtime_requests(id) ON DELETE SET NULL
);

-- Add foreign key for token_id in overtime_requests after tokens table is created
ALTER TABLE overtime_requests
  ADD CONSTRAINT fk_ot_token FOREIGN KEY (token_id) REFERENCES one_time_tokens(id) ON DELETE SET NULL;

-- -------------------------
-- Clock Events
-- -------------------------
CREATE TABLE IF NOT EXISTS clock_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type ENUM('clock_in', 'clock_out') NOT NULL,
  event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  method ENUM('qr', 'token', 'auto_checkout') NOT NULL,
  is_overtime TINYINT(1) NOT NULL DEFAULT 0,
  is_flagged TINYINT(1) NOT NULL DEFAULT 0,
  flag_reason VARCHAR(255),
  is_unflagged TINYINT(1) NOT NULL DEFAULT 0,
  unflagged_by INT,
  unflagged_at TIMESTAMP NULL,
  token_id INT,
  qr_session_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unflagged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (token_id) REFERENCES one_time_tokens(id) ON DELETE SET NULL,
  FOREIGN KEY (qr_session_id) REFERENCES qr_sessions(id) ON DELETE SET NULL
);

-- -------------------------
-- Indexes for performance
-- -------------------------
CREATE INDEX idx_clock_events_user_ts ON clock_events(user_id, event_timestamp);
CREATE INDEX idx_clock_events_flagged ON clock_events(is_flagged, is_unflagged);
CREATE INDEX idx_one_time_tokens_user ON one_time_tokens(for_user_id, used_at);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(status, employee_id);
