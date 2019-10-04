export default `

ALTER TABLE archives_meta ADD COLUMN author TEXT;

PRAGMA user_version = 38;
`