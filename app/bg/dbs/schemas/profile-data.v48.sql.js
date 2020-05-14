export default `

ALTER TABLE setup_state ADD COLUMN profileSetup INTEGER DEFAULT 0;

PRAGMA user_version = 48;
`
