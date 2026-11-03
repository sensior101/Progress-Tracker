CREATE TABLE trophy_purchases (
  user_id TEXT NOT NULL REFERENCES wallets(user_id),
  style_id INTEGER NOT NULL CHECK(style_id BETWEEN 2 AND 20),
  PRIMARY KEY(user_id,style_id)
);

CREATE TABLE trophy_preferences (
  user_id TEXT PRIMARY KEY REFERENCES wallets(user_id),
  style_id INTEGER NOT NULL,
  FOREIGN KEY(user_id,style_id) REFERENCES trophy_purchases(user_id,style_id)
);

CREATE TRIGGER trophy_purchase_funds BEFORE INSERT ON trophy_purchases
WHEN NOT EXISTS(SELECT 1 FROM trophy_purchases WHERE user_id=NEW.user_id AND style_id=NEW.style_id)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)<200
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER trophy_purchase_commit AFTER INSERT ON trophy_purchases
BEGIN
  UPDATE wallets SET balance=balance-200 WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) VALUES(NEW.user_id,'trophy:'||NEW.style_id,-200);
END;
