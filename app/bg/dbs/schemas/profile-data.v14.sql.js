export default `

-- add a non-unique index to the visits table to speed up joins
CREATE INDEX visits_url ON visits (url);

PRAGMA user_version = 14;
`
