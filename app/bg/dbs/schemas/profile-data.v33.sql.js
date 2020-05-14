export default `

-- add label
ALTER TABLE users ADD COLUMN label TEXT;
-- add isTemporary
ALTER TABLE users ADD COLUMN isTemporary INTEGER DEFAULT 0;

PRAGMA user_version = 33;
`