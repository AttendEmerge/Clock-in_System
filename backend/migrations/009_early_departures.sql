-- ============================================================
-- 009_early_departures.sql
-- Add early_departure_reason column to clock_events
-- ============================================================

USE clockin_system;

ALTER TABLE clock_events
  ADD COLUMN early_departure_reason TEXT NULL AFTER flag_reason;

