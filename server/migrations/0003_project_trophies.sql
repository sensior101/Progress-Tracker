CREATE TABLE project_trophies (
  project_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  title TEXT NOT NULL, completed_date TEXT,
  FOREIGN KEY(project_id,user_id) REFERENCES projects(id,user_id) ON DELETE CASCADE
);
CREATE INDEX project_trophies_account ON project_trophies(user_id,completed_date DESC,project_id);

-- Legacy project rewards were recorded only when all tasks were complete.
INSERT INTO project_trophies(project_id,user_id,title,completed_date)
SELECT p.id,p.user_id,p.title,date(r.created_at,'unixepoch','+9 hours')
FROM reward_claims r JOIN projects p ON p.id=r.project_id AND p.user_id=r.user_id;

-- Existing completed projects may have no reliable historical completion date.
INSERT INTO project_trophies(project_id,user_id,title)
SELECT p.id,p.user_id,p.title FROM projects p
WHERE EXISTS(SELECT 1 FROM tasks t WHERE t.project_id=p.id)
AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.project_id=p.id AND t.done=0)
ON CONFLICT(project_id) DO NOTHING;
