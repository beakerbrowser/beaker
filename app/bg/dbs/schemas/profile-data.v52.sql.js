export default `

ALTER TABLE visits ADD COLUMN tabClose INTEGER DEFAULT 0;

PRAGMA user_version = 52;
`
