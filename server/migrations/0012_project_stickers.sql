CREATE TABLE project_stickers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL REFERENCES sticker_packs(id),
  sticker INTEGER NOT NULL CHECK(sticker BETWEEN 0 AND 19),
  x REAL NOT NULL CHECK(x BETWEEN 0 AND 1),
  y REAL NOT NULL CHECK(y BETWEEN 0 AND 1)
);
CREATE INDEX project_stickers_project ON project_stickers(project_id);
