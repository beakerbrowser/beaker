export default `

-- add a database to track user-defined templates for new dat sites
CREATE TABLE templates (
  profileId INTEGER,
  url TEXT NOT NULL,
  title TEXT,
  screenshot,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),

  PRIMARY KEY (profileId, url),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

PRAGMA user_version = 18;
`
