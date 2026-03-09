-- ============================================================
-- Seed Data — Creates a default HR admin user and sample data
-- Password for all seed users: Admin@1234
-- bcrypt hash of "Admin@1234" with 10 rounds
-- ============================================================
USE clockin_system;

-- Default HR user (password: Admin@1234)
INSERT INTO users (name, email, password_hash, role) VALUES
('HR Admin', 'hr@company.com', '$2b$10$WobwRQ1IgFoC/Ewye4AjmeVMwjXGPC0tKLyH7nsYj.n2ym8cgbmba', 'hr')
ON DUPLICATE KEY UPDATE id=id;

-- Default leave balances will be created when HR adds employees
-- This seed just ensures the system can start

-- Sample department
INSERT INTO departments (name, description) VALUES
('General', 'Default department for all employees')
ON DUPLICATE KEY UPDATE id=id;
