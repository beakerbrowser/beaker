export default `

ALTER TABLE setup_state ADD COLUMN hasVisitedProfile INTEGER DEFAULT 0;

PRAGMA user_version = 49;
`
