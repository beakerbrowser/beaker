export default `

-- add a field to track the folder where an archive is being synced
ALTER TABLE archives ADD COLUMN localSyncPath TEXT;

PRAGMA user_version = 17;
`
