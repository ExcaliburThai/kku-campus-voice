USE kku_campus_voice;
-- Run once. Existing reports remain unchanged.
ALTER TABLE issues ADD COLUMN image_path VARCHAR(255) NULL;
CREATE TABLE IF NOT EXISTS issue_confirmations (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 issue_id BIGINT NOT NULL,
 voter_hash CHAR(64) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_issue_voter (issue_id,voter_hash),
 CONSTRAINT fk_confirm_issue FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE=InnoDB;
