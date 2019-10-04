export default `
CREATE TABLE user_site_sessions (
  id INTEGER PRIMARY KEY NOT NULL,
  userId INTEGER NOT NULL,
  url TEXT,
  permissionsJson TEXT,
  createdAt INTEGER,
 
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
PRAGMA user_version = 36;
`