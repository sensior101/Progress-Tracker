PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id TEXT PRIMARY KEY, login TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  active_theme TEXT NOT NULL DEFAULT 'lime' CHECK(active_theme IN ('lime','pink','red','orange','blue'))
);
CREATE TABLE themes (id TEXT PRIMARY KEY, price INTEGER NOT NULL CHECK(price > 0));
INSERT INTO themes(id,price) VALUES ('pink',100),('red',100),('orange',100),('blue',100);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE oauth_states (state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE projects (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL, title TEXT NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(user_id,project_key), UNIQUE(id,user_id)
);
CREATE TABLE tasks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, id TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)), date TEXT NOT NULL DEFAULT '', PRIMARY KEY(project_id,id)
);
CREATE TABLE purchases (
  user_id TEXT NOT NULL REFERENCES wallets(user_id), theme_id TEXT NOT NULL REFERENCES themes(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY(user_id,theme_id)
);
CREATE TABLE reward_claims (
  project_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES wallets(user_id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), FOREIGN KEY(project_id,user_id) REFERENCES projects(id,user_id)
);
CREATE TABLE point_ledger (
  id INTEGER PRIMARY KEY, user_id TEXT NOT NULL REFERENCES wallets(user_id), event_key TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK(delta != 0), created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(user_id,event_key)
);
CREATE INDEX point_ledger_owner ON point_ledger(user_id,id);
CREATE TRIGGER purchase_funds BEFORE INSERT ON purchases
WHEN NOT EXISTS(SELECT 1 FROM purchases WHERE user_id=NEW.user_id AND theme_id=NEW.theme_id)
BEGIN
  SELECT CASE WHEN COALESCE((SELECT balance FROM wallets WHERE user_id=NEW.user_id),-1)
    < (SELECT price FROM themes WHERE id=NEW.theme_id) THEN RAISE(ABORT,'insufficient_points') END;
END;
CREATE TRIGGER purchase_commit AFTER INSERT ON purchases
BEGIN
  UPDATE wallets SET balance=balance-(SELECT price FROM themes WHERE id=NEW.theme_id) WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) SELECT NEW.user_id,'theme:'||NEW.theme_id,-price FROM themes WHERE id=NEW.theme_id;
END;
CREATE TRIGGER reward_eligible BEFORE INSERT ON reward_claims
BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND user_id=NEW.user_id)
    OR NOT EXISTS(SELECT 1 FROM tasks WHERE project_id=NEW.project_id)
    OR EXISTS(SELECT 1 FROM tasks WHERE project_id=NEW.project_id AND done=0) THEN RAISE(ABORT,'project_incomplete') END;
END;
CREATE TRIGGER reward_commit AFTER INSERT ON reward_claims
BEGIN
  UPDATE wallets SET balance=balance+100 WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) VALUES(NEW.user_id,'project:'||NEW.project_id,100);
END;
