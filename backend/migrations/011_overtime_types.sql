-- Migration 011: Overtime types (regular vs double)
-- Run ONCE after migration 010
-- ============================================================
-- Regular: workdays (Mon-Fri, excluding holidays) - working past clock-out
-- Double: off days (weekends and holidays)

USE clockin_system;

ALTER TABLE overtime_requests
  ADD COLUMN overtime_type ENUM('regular', 'double') NOT NULL DEFAULT 'regular'
  AFTER requested_date;
