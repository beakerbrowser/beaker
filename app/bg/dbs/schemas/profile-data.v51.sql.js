export default `

ALTER TABLE setup_state ADD COLUMN migratedContactsToFollows INTEGER DEFAULT 0;

PRAGMA user_version = 51;
`
