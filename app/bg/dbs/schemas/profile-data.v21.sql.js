export default `

-- add size data to archives_meta
ALTER TABLE archives_meta ADD COLUMN size INTEGER DEFAULT 0;

PRAGMA user_version = 21;
`
