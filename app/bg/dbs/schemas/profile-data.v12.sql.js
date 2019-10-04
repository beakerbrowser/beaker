export default `

-- list of the active workspaces
-- deprecated
CREATE TABLE workspaces (
  profileId INTEGER NOT NULL,
  name TEXT NOT NULL,
  localFilesPath TEXT,
  publishTargetUrl TEXT,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),

  PRIMARY KEY (profileId, name),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

PRAGMA user_version = 12;
`
