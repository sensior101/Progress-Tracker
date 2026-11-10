-- Expand the existing theme constraint without changing wallet ownership or balances.
-- D1 migrations run in a transaction; defer dependent foreign keys until wallets is restored.
PRAGMA defer_foreign_keys = ON;
DROP TRIGGER purchase_commit;
DROP TRIGGER purchase_funds;
DROP TRIGGER shelf_theme_purchase_commit;
DROP TRIGGER shelf_theme_purchase_funds;
DROP TRIGGER sticker_purchase_commit;
DROP TRIGGER sticker_purchase_funds;
DROP TRIGGER task_reward_commit;
DROP TRIGGER trophy_purchase_commit;
DROP TRIGGER trophy_purchase_funds;
CREATE TABLE wallets_retro (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  active_theme TEXT NOT NULL DEFAULT 'lime' CHECK(active_theme IN ('lime','pink','red','orange','blue','retro'))
);
INSERT INTO wallets_retro(user_id,balance,active_theme) SELECT user_id,balance,active_theme FROM wallets;
DROP TABLE wallets;
ALTER TABLE wallets_retro RENAME TO wallets;
CREATE TRIGGER purchase_commit AFTER INSERT ON purchases
BEGIN
  UPDATE wallets SET balance=balance-(SELECT price FROM themes WHERE id=NEW.theme_id) WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) SELECT NEW.user_id,'theme:'||NEW.theme_id,-price FROM themes WHERE id=NEW.theme_id;
END;

CREATE TRIGGER purchase_funds BEFORE INSERT ON purchases
WHEN NOT EXISTS(SELECT 1 FROM purchases WHERE user_id=NEW.user_id AND theme_id=NEW.theme_id)
BEGIN
  SELECT CASE WHEN COALESCE((SELECT balance FROM wallets WHERE user_id=NEW.user_id),-1)
    < (SELECT price FROM themes WHERE id=NEW.theme_id) THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER shelf_theme_purchase_commit AFTER INSERT ON shelf_theme_purchases
BEGIN
  INSERT INTO point_ledger(user_id,event_key,delta)
  VALUES(NEW.user_id,'shelf-theme:'||NEW.theme,CASE NEW.theme WHEN 'observatory' THEN -500 ELSE -100 END);
  UPDATE wallets SET balance=balance+(
    SELECT delta FROM point_ledger WHERE user_id=NEW.user_id AND event_key='shelf-theme:'||NEW.theme
  ) WHERE user_id=NEW.user_id;
END;

CREATE TRIGGER shelf_theme_purchase_funds BEFORE INSERT ON shelf_theme_purchases
WHEN NOT EXISTS(SELECT 1 FROM shelf_theme_purchases WHERE user_id=NEW.user_id AND theme=NEW.theme)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)
    < CASE NEW.theme WHEN 'observatory' THEN 500 ELSE 100 END
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER sticker_purchase_commit AFTER INSERT ON sticker_pack_purchases
BEGIN
  UPDATE wallets SET balance=balance-(SELECT price FROM sticker_packs WHERE id=NEW.pack_id)
  WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta)
  SELECT NEW.user_id,'sticker-pack:'||NEW.pack_id,-price FROM sticker_packs WHERE id=NEW.pack_id;
END;

CREATE TRIGGER sticker_purchase_funds BEFORE INSERT ON sticker_pack_purchases
WHEN NOT EXISTS(SELECT 1 FROM sticker_pack_purchases WHERE user_id=NEW.user_id AND pack_id=NEW.pack_id)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)
    < (SELECT price FROM sticker_packs WHERE id=NEW.pack_id)
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER task_reward_commit AFTER INSERT ON task_reward_claims
WHEN NEW.awarded_points>0
BEGIN
  UPDATE wallets SET balance=balance+NEW.awarded_points WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta)
    VALUES(NEW.user_id,'task:'||NEW.project_id||':'||NEW.task_id,NEW.awarded_points);
END;

CREATE TRIGGER trophy_purchase_commit AFTER INSERT ON trophy_purchases
BEGIN
  UPDATE wallets SET balance=balance-200 WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) VALUES(NEW.user_id,'trophy:'||NEW.style_id,-200);
END;

CREATE TRIGGER trophy_purchase_funds BEFORE INSERT ON trophy_purchases
WHEN NOT EXISTS(SELECT 1 FROM trophy_purchases WHERE user_id=NEW.user_id AND style_id=NEW.style_id)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)<200
    THEN RAISE(ABORT,'insufficient_points') END;
END;
INSERT INTO themes(id,price) VALUES('retro',100);
-- The replacement has restored the same primary keys; resume immediate checks.
PRAGMA defer_foreign_keys = OFF;
