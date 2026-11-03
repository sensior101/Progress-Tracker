ALTER TABLE users ADD COLUMN trophy_shelf_theme TEXT NOT NULL DEFAULT 'classic'
  CHECK(trophy_shelf_theme IN ('classic','steel','arcade','museum'));
