ALTER TABLE project_stickers ADD COLUMN anchor TEXT CHECK(anchor IS NULL OR json_valid(anchor));
