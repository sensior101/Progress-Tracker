CREATE TABLE sticker_packs (
  id TEXT PRIMARY KEY,
  price INTEGER NOT NULL CHECK(price>0)
);
INSERT INTO sticker_packs(id,price) VALUES ('basic',30),('weather',30),('dog',100),('cat',100);

CREATE TABLE sticker_pack_purchases (
  user_id TEXT NOT NULL REFERENCES wallets(user_id),
  pack_id TEXT NOT NULL REFERENCES sticker_packs(id),
  PRIMARY KEY(user_id,pack_id)
);

CREATE TRIGGER sticker_purchase_funds BEFORE INSERT ON sticker_pack_purchases
WHEN NOT EXISTS(SELECT 1 FROM sticker_pack_purchases WHERE user_id=NEW.user_id AND pack_id=NEW.pack_id)
BEGIN
  SELECT CASE WHEN (SELECT balance FROM wallets WHERE user_id=NEW.user_id)
    < (SELECT price FROM sticker_packs WHERE id=NEW.pack_id)
    THEN RAISE(ABORT,'insufficient_points') END;
END;

CREATE TRIGGER sticker_purchase_commit AFTER INSERT ON sticker_pack_purchases
BEGIN
  UPDATE wallets SET balance=balance-(SELECT price FROM sticker_packs WHERE id=NEW.pack_id)
  WHERE user_id=NEW.user_id;
  INSERT INTO point_ledger(user_id,event_key,delta)
  SELECT NEW.user_id,'sticker-pack:'||NEW.pack_id,-price FROM sticker_packs WHERE id=NEW.pack_id;
END;
