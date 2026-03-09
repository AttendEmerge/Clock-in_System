USE clockin_system;

CREATE TABLE IF NOT EXISTS token_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  hr_id INT,
  hr_note TEXT,
  token_id INT,
  actioned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES acceptable_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (token_id) REFERENCES one_time_tokens(id) ON DELETE SET NULL
);

CREATE INDEX idx_token_requests_status ON token_requests(status, user_id);
