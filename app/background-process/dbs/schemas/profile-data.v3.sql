
-- add variable to track the access times of archives
ALTER TABLE archives_meta ADD COLUMN lastAccessTime INTEGER DEFAULT (strftime('%s', 'now'));

PRAGMA user_version = 3;