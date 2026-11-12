-- KKU Campus Voice / MySQL 8.0+ (utf8mb4)
CREATE DATABASE IF NOT EXISTS kku_campus_voice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kku_campus_voice;

CREATE TABLE IF NOT EXISTS categories (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(180) NOT NULL UNIQUE,
 icon VARCHAR(16) NOT NULL DEFAULT '📍'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(220) NOT NULL,
 kind ENUM('faculty','building','road','dorm','common','other') NOT NULL,
 parent_id INT NULL,
 latitude DOUBLE NULL, longitude DOUBLE NULL,
 CONSTRAINT fk_location_parent FOREIGN KEY(parent_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issues (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 tracking_code VARCHAR(90) NOT NULL UNIQUE,
 category_id INT NOT NULL, location_id INT NULL,
 title VARCHAR(160) NOT NULL, description TEXT NOT NULL,
 latitude DOUBLE NULL, longitude DOUBLE NULL,
 status ENUM('pending','in_progress','forwarded','resolved','rejected') NOT NULL DEFAULT 'pending',
 visibility ENUM('public','private') NOT NULL DEFAULT 'public',
 contact_email VARCHAR(200) NULL, contact_phone VARCHAR(30) NULL,
 private_token_hash CHAR(64) NOT NULL,
 image_path VARCHAR(255) NULL,
 assigned_department VARCHAR(160) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_status(status), INDEX idx_visibility(visibility), INDEX idx_created(created_at),
 CONSTRAINT fk_issue_category FOREIGN KEY(category_id) REFERENCES categories(id),
 CONSTRAINT fk_issue_location FOREIGN KEY(location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issue_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 issue_id BIGINT NOT NULL,
 status ENUM('pending','in_progress','forwarded','resolved','rejected') NOT NULL,
 note TEXT NULL,
 changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_history_issue(issue_id),
 CONSTRAINT fk_history_issue FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issue_confirmations (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 issue_id BIGINT NOT NULL,
 voter_hash CHAR(64) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_issue_voter (issue_id,voter_hash),
 CONSTRAINT fk_confirm_issue FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE=InnoDB;
