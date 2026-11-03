CREATE TABLE shelf_theme_purchases (
  user_id TEXT NOT NULL REFERENCES wallets(user_id),
  theme TEXT NOT NULL CHECK(theme IN ('steel','arcade','museum','walnut','observatory')),
  PRIMARY KEY(user_id,theme)
);

CREATE TRIGGER shelf_theme_purchase_funds BEFORE INSERT ON shelf_theme_purchases
WHEN NOT EXISTS(SELECT 1 FROM shelf_theme_purchases WHERE user_id=NEW.user_id AND theme=NEW.theme)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)<100
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER shelf_theme_purchase_commit AFTER INSERT ON shelf_theme_purchases
BEGIN
  UPDATE wallets SET balance=balance-100 WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta) VALUES(NEW.user_id,'shelf-theme:'||NEW.theme,-100);
END;
