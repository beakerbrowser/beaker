
-- add label to profile to make it easier to identify
ALTER TABLE profiles ADD COLUMN label TEXT;

PRAGMA user_version = 5;