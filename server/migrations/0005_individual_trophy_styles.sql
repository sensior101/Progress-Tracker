ALTER TABLE project_trophies ADD COLUMN style_id INTEGER NOT NULL DEFAULT 1
  CHECK(style_id BETWEEN 1 AND 20);

-- Preserve the appearance of trophies already displayed before this change.
UPDATE project_trophies
SET style_id=COALESCE(
  (SELECT style_id FROM trophy_preferences WHERE user_id=project_trophies.user_id),
  1
);
