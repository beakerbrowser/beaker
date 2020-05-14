export default `

-- add a database for watchlist feature
CREATE TABLE watchlist (
  profileId INTEGER NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  seedWhenResolved BOOLEAN NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT (0),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
 
  PRIMARY KEY (profileId, url),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

PRAGMA user_version = 23;
`