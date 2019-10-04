export default `

-- add variable to track the access times of archives
ALTER TABLE archives_meta ADD COLUMN lastAccessTime INTEGER DEFAULT 0;

PRAGMA user_version = 3;
`
