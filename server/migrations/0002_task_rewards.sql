-- Purchased themes and historical point payments are retained.
UPDATE themes SET price=1000;
DROP TRIGGER reward_commit;
DROP TRIGGER reward_eligible;

CREATE TABLE task_reward_claims (
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES wallets(user_id),
  awarded_points INTEGER NOT NULL DEFAULT 10 CHECK(awarded_points IN (0,10)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(project_id,task_id),
  FOREIGN KEY(project_id,user_id) REFERENCES projects(id,user_id)
);
-- Old project rewards already covered their tasks. Do not award them twice,
-- including tasks that were unchecked after the old reward was received.
INSERT INTO task_reward_claims(project_id,task_id,user_id,awarded_points)
  SELECT t.project_id,t.id,r.user_id,0 FROM tasks t JOIN reward_claims r ON r.project_id=t.project_id;

CREATE TRIGGER task_reward_eligible BEFORE INSERT ON task_reward_claims
BEGIN
  SELECT CASE WHEN NOT EXISTS(
    SELECT 1 FROM tasks t JOIN projects p ON p.id=t.project_id
    WHERE t.project_id=NEW.project_id AND t.id=NEW.task_id AND t.done=1 AND p.user_id=NEW.user_id
  ) THEN RAISE(ABORT,'task_incomplete') END;
END;
CREATE TRIGGER task_reward_commit AFTER INSERT ON task_reward_claims
WHEN NEW.awarded_points>0
BEGIN
  UPDATE wallets SET balance=balance+NEW.awarded_points WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta)
    VALUES(NEW.user_id,'task:'||NEW.project_id||':'||NEW.task_id,NEW.awarded_points);
END;
-- Previously completed tasks without a legacy project reward receive their 10P.
INSERT INTO task_reward_claims(project_id,task_id,user_id)
  SELECT t.project_id,t.id,p.user_id FROM tasks t JOIN projects p ON p.id=t.project_id
  WHERE t.done=1 AND NOT EXISTS(SELECT 1 FROM task_reward_claims c WHERE c.project_id=t.project_id AND c.task_id=t.id);
