-- Run once in MySQL Workbench after backing up your database.
USE kku_campus_voice;
-- If you have already run KKU_Campus_Voice_migration.sql, skip the following ALTER TABLE issues.
ALTER TABLE issues
  ADD COLUMN accepted_at DATETIME NULL,
  ADD COLUMN forwarded_at DATETIME NULL,
  ADD COLUMN started_at DATETIME NULL,
  ADD COLUMN resolved_at DATETIME NULL,
  ADD COLUMN assigned_to VARCHAR(160) NULL,
  ADD COLUMN forwarded_to VARCHAR(160) NULL;
CREATE TABLE IF NOT EXISTS staff_users (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 department VARCHAR(160) NULL,
 role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE issue_history
 ADD COLUMN actor_staff_id BIGINT UNSIGNED NULL,
 ADD COLUMN image_path VARCHAR(255) NULL;
CREATE INDEX idx_issue_history_actor ON issue_history(actor_staff_id);
-- Keep existing issue_history rows; old entries will have no actor_staff_id.
