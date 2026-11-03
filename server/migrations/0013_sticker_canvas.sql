ALTER TABLE project_stickers ADD COLUMN canvas TEXT NOT NULL DEFAULT 'content'
  CHECK(canvas IN ('content','page'));
