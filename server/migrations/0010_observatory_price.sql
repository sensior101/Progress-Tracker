DROP TRIGGER shelf_theme_purchase_funds;
DROP TRIGGER shelf_theme_purchase_commit;

CREATE TRIGGER shelf_theme_purchase_funds BEFORE INSERT ON shelf_theme_purchases
WHEN NOT EXISTS(SELECT 1 FROM shelf_theme_purchases WHERE user_id=NEW.user_id AND theme=NEW.theme)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)
    < CASE NEW.theme WHEN 'observatory' THEN 500 ELSE 100 END
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER shelf_theme_purchase_commit AFTER INSERT ON shelf_theme_purchases
BEGIN
  INSERT INTO point_ledger(user_id,event_key,delta)
  VALUES(NEW.user_id,'shelf-theme:'||NEW.theme,CASE NEW.theme WHEN 'observatory' THEN -500 ELSE -100 END);
  UPDATE wallets SET balance=balance+(
    SELECT delta FROM point_ledger WHERE user_id=NEW.user_id AND event_key='shelf-theme:'||NEW.theme
  ) WHERE user_id=NEW.user_id;
END;
