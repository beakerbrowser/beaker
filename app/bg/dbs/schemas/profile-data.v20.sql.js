export default `

-- watch localSyncPath and automatically publish changes (1) or not (0)
ALTER TABLE archives ADD COLUMN autoPublishLocal INTEGER DEFAULT 0;

PRAGMA user_version = 20;
`
