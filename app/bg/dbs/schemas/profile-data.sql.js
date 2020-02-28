export default `
CREATE TABLE setup_state (
  profileCreated INTEGER DEFAULT 0
);

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT,
  createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE user_site_sessions (
  id INTEGER PRIMARY KEY NOT NULL,
  siteOrigin TEXT,
  userUrl TEXT,
  permissionsJson TEXT,
  createdAt INTEGER
);

CREATE TABLE archives_meta (
  key TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  type TEXT,
  memberOf TEXT,
  mtime INTEGER,
  size INTEGER,
  author TEXT,
  forkOf TEXT,
  isOwner INTEGER,
  lastAccessTime INTEGER DEFAULT 0,
  lastLibraryAccessTime INTEGER DEFAULT 0,

  createdByUrl TEXT, -- deprecated
  createdByTitle TEXT, -- deprecated
  metaSize INTEGER, -- deprecated
  stagingSize INTEGER -- deprecated
);
CREATE VIRTUAL TABLE archives_meta_fts_index USING fts5(title, description, content='archives_meta');

-- triggers to keep archives_meta_fts_index updated
CREATE TRIGGER archives_meta_ai AFTER INSERT ON archives_meta BEGIN
  INSERT INTO archives_meta_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER archives_meta_ad AFTER DELETE ON archives_meta BEGIN
  INSERT INTO archives_meta_fts_index(archives_meta_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER archives_meta_au AFTER UPDATE ON archives_meta BEGIN
  INSERT INTO archives_meta_fts_index(archives_meta_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO archives_meta_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

CREATE TABLE dat_dns (
  id INTEGER PRIMARY KEY,
  name TEXT,
  key TEXT,
  isCurrent INTEGER,
  lastConfirmedAt INTEGER,
  firstConfirmedAt INTEGER
);
CREATE INDEX dat_dns_name ON dat_dns (name);
CREATE INDEX dat_dns_key ON dat_dns (key);

CREATE TABLE visits (
  profileId INTEGER,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  ts INTEGER NOT NULL,

  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);
CREATE INDEX visits_url ON visits (url);

CREATE TABLE visit_stats (
  url TEXT NOT NULL,
  num_visits INTEGER,
  last_visit_ts INTEGER
);

CREATE VIRTUAL TABLE visit_fts USING fts4 (url, title);
CREATE UNIQUE INDEX visits_stats_url ON visit_stats (url);

-- list of the users installed apps
CREATE TABLE installed_applications (
  id INTEGER PRIMARY KEY NOT NULL,
  userId INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  url TEXT,
  createdAt INTEGER,
 
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

-- list of dats being looked for
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

-- deprecated
CREATE TABLE bookmarks (
  profileId INTEGER,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  isPublic INTEGER,
  pinned INTEGER,
  pinOrder INTEGER DEFAULT 0,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  tags TEXT,
  notes TEXT,

  PRIMARY KEY (profileId, url),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

-- a list of saved archives
-- deprecated
CREATE TABLE archives (
  profileId INTEGER NOT NULL,
  key TEXT NOT NULL, -- dat key
  
  previewMode INTEGER, -- automatically publish changes (0) or write to local folder (1)
  localSyncPath TEXT, -- custom local folder that the data is synced to

  isSaved INTEGER, -- is this archive saved to our library?
  hidden INTEGER DEFAULT 0, -- should this archive be hidden in the library or select-archive modals? (this is useful for internal dats, such as drafts)
  networked INTEGER DEFAULT 1, -- join the swarm (1) or do not swarm (0)
  autoDownload INTEGER DEFAULT 1, -- watch and download all available data (1) or sparsely download on demand (0)
  autoUpload INTEGER DEFAULT 1, -- join the swarm at startup (1) or only swarm when visiting (0)
  expiresAt INTEGER, -- change autoUpload to 0 at this time (used for temporary seeding)
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),

  localPath TEXT, -- deprecated
  autoPublishLocal INTEGER DEFAULT 0 -- deprecated -- watch localSyncPath and automatically publish changes (1) or not (0)
);

-- default profile
INSERT INTO profiles (id) VALUES (0);

PRAGMA user_version = 46;
`
