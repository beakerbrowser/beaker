export default `

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_site_sessions;
CREATE TABLE user_site_sessions (
  id INTEGER PRIMARY KEY NOT NULL,
  siteOrigin TEXT,
  userUrl TEXT,
  permissionsJson TEXT,
  createdAt INTEGER
);

PRAGMA user_version = 45;
`

