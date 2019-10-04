export default `

ALTER TABLE crawl_sources ADD COLUMN isPrivate INTEGER;

PRAGMA user_version = 37;
`