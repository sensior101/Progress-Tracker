ALTER TABLE users ADD COLUMN shelf_theme TEXT NOT NULL DEFAULT 'classic'
  CHECK(shelf_theme IN ('classic','steel','arcade','museum','walnut','observatory'));

UPDATE users SET shelf_theme=trophy_shelf_theme;
