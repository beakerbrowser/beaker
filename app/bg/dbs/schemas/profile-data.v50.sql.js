export default `

CREATE TABLE folder_syncs (
  key TEXT NOT NULL,
  localPath TEXT,
  ignoredFiles TEXT
);

PRAGMA user_version = 50;
`