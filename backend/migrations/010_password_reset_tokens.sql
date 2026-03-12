-- Extend one_time_tokens.token_type to support password reset tokens

USE clockin_system;

ALTER TABLE one_time_tokens
  MODIFY COLUMN token_type ENUM('regular', 'overtime', 'password_reset') NOT NULL DEFAULT 'regular';

