export default `

-- add variable to user memberOf metadata
ALTER TABLE archives_meta ADD COLUMN memberOf TEXT;

PRAGMA user_version = 46;
`
