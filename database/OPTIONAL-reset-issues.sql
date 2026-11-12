-- OPTIONAL: Deletes ALL existing complaints and their history, permanently.
-- Run ONLY after backing up and confirming you want to erase complaints.
-- Keeps categories, locations, schema and admin .env credentials.
USE kku_campus_voice;
START TRANSACTION;
DELETE FROM issue_history;
DELETE FROM issues;
COMMIT;
-- No DROP TABLE / no database reset.
