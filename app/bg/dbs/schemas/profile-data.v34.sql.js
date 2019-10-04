export default `

-- list of the users installed apps
CREATE TABLE installed_applications (
  id INTEGER PRIMARY KEY NOT NULL,
  userId INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  url TEXT,
  createdAt INTEGER,
 
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

PRAGMA user_version = 34;
`