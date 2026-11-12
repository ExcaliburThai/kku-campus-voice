-- Run once in MySQL Workbench, database kku_campus_voice.
USE kku_campus_voice;
ALTER TABLE issues
  ADD COLUMN accepted_at DATETIME NULL,
  ADD COLUMN forwarded_at DATETIME NULL,
  ADD COLUMN started_at DATETIME NULL,
  ADD COLUMN resolved_at DATETIME NULL,
  ADD COLUMN assigned_to VARCHAR(160) NULL,
  ADD COLUMN forwarded_to VARCHAR(160) NULL;
-- Keep the existing assigned_department column and all existing issue records.
