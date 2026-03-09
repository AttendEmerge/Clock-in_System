-- ============================================================
-- Migration 008: Dynamic leave types + holidays table
-- Run ONCE after migration 007
-- ============================================================
USE clockin_system;

-- 1. Change leave_type ENUM to VARCHAR so HR can add custom types
ALTER TABLE leave_policies MODIFY COLUMN leave_type VARCHAR(50) NOT NULL;

-- 2. Add gender_applicable column to leave_policies
ALTER TABLE leave_policies ADD COLUMN gender_applicable ENUM('all','male','female') NOT NULL DEFAULT 'all';

-- Set existing gender rules
UPDATE leave_policies SET gender_applicable = 'female' WHERE leave_type = 'maternity';
UPDATE leave_policies SET gender_applicable = 'male'   WHERE leave_type = 'paternity';

-- 3. Drop the ENUM constraint on leave_balances and leave_requests
ALTER TABLE leave_balances MODIFY COLUMN leave_type VARCHAR(50) NOT NULL;
ALTER TABLE leave_requests MODIFY COLUMN leave_type VARCHAR(50) NOT NULL;

-- 4. Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
