-- Delete all templates from the database
-- WARNING: This will permanently delete all templates and related data

-- First, delete related records that reference templates
DELETE FROM downloads;
DELETE FROM reviews;

-- Then delete all templates
DELETE FROM templates;

-- Verify deletion
SELECT COUNT(*) as remaining_templates FROM templates;

