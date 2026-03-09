-- Add GPS accuracy column to clock_events
ALTER TABLE clock_events ADD COLUMN gps_accuracy DECIMAL(8,2) NULL AFTER longitude;
