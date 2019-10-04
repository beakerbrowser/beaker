export default `
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT,
  createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY NOT NULL,
  label TEXT,
  url TEXT,
  isDefault INTEGER DEFAULT 0,
  isTemporary INTEGER DEFAULT 0,
  createdAt INTEGER
);

CREATE TABLE user_site_sessions (
  id INTEGER PRIMARY KEY NOT NULL,
  userId INTEGER NOT NULL,
  url TEXT,
  permissionsJson TEXT,
  createdAt INTEGER,
 
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE archives_meta (
  key TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  type TEXT,
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

-- list of sites being crawled
CREATE TABLE crawl_sources (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  datDnsId INTEGER,
  isPrivate INTEGER
);

-- tracking information on the crawl-state of the sources
CREATE TABLE crawl_sources_meta (
  crawlSourceId INTEGER NOT NULL,
  crawlSourceVersion INTEGER NOT NULL,
  crawlDataset TEXT NOT NULL,
  crawlDatasetVersion INTEGER NOT NULL,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);

-- crawled tags
CREATE TABLE crawl_tags (
  id INTEGER PRIMARY KEY,
  tag TEXT UNIQUE
);

-- crawled statuses
CREATE TABLE crawl_statuses (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,

  body TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_statuses_fts_index USING fts5(body, content='crawl_statuses');

-- triggers to keep crawl_statuses_fts_index updated
CREATE TRIGGER crawl_statuses_ai AFTER INSERT ON crawl_statuses BEGIN
  INSERT INTO crawl_statuses_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;
CREATE TRIGGER crawl_statuses_ad AFTER DELETE ON crawl_statuses BEGIN
  INSERT INTO crawl_statuses_fts_index(crawl_statuses_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
END;
CREATE TRIGGER crawl_statuses_au AFTER UPDATE ON crawl_statuses BEGIN
  INSERT INTO crawl_statuses_fts_index(crawl_statuses_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
  INSERT INTO crawl_statuses_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;

-- crawled comments
CREATE TABLE crawl_comments (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,

  topic TEXT,
  replyTo TEXT,
  body TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_comments_topic ON crawl_comments (topic);
CREATE VIRTUAL TABLE crawl_comments_fts_index USING fts5(body, content='crawl_comments');

-- triggers to keep crawl_comments_fts_index updated
CREATE TRIGGER crawl_comments_ai AFTER INSERT ON crawl_comments BEGIN
  INSERT INTO crawl_comments_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;
CREATE TRIGGER crawl_comments_ad AFTER DELETE ON crawl_comments BEGIN
  INSERT INTO crawl_comments_fts_index(crawl_comments_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
END;
CREATE TRIGGER crawl_comments_au AFTER UPDATE ON crawl_comments BEGIN
  INSERT INTO crawl_comments_fts_index(crawl_comments_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
  INSERT INTO crawl_comments_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;

-- crawled reactions
CREATE TABLE crawl_reactions (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  topic TEXT NOT NULL,
  phrases TEXT NOT NULL,

  PRIMARY KEY (crawlSourceId, pathname),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_reactions_topic ON crawl_reactions (topic);

-- crawled votes
CREATE TABLE crawl_votes (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  topic TEXT NOT NULL,
  vote INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER,

  PRIMARY KEY (crawlSourceId, pathname),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_votes_topic ON crawl_votes (topic);

-- crawled bookmarks
CREATE TABLE crawl_bookmarks (
  id INTEGER PRIMARY KEY,
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,

  href TEXT,
  title TEXT,
  description TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_bookmarks_fts_index USING fts5(title, description, content='crawl_bookmarks');

-- triggers to keep crawl_bookmarks_fts_index updated
CREATE TRIGGER crawl_bookmarks_ai AFTER INSERT ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER crawl_bookmarks_ad AFTER DELETE ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(crawl_bookmarks_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER crawl_bookmarks_au AFTER UPDATE ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(crawl_bookmarks_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO crawl_bookmarks_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- crawled bookmark tags
CREATE TABLE crawl_bookmarks_tags (
  crawlBookmarkId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlBookmarkId) REFERENCES crawl_bookmarks (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

-- crawled follows
CREATE TABLE crawl_follows (
  crawlSourceId INTEGER NOT NULL,
  crawledAt INTEGER,
  
  destUrl TEXT NOT NULL,

  PRIMARY KEY (crawlSourceId, destUrl),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);

-- crawled dats
CREATE TABLE crawl_dats (
  crawlSourceId INTEGER NOT NULL,
  crawledAt INTEGER,
  
  key TEXT NOT NULL,
  title TEXT,
  description TEXT,
  type TEXT,

  PRIMARY KEY (crawlSourceId, key),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_dats_fts_index USING fts5(title, description, content='crawl_dats');

-- triggers to keep crawl_dats_fts_index updated
CREATE TRIGGER crawl_dats_ai AFTER INSERT ON crawl_dats BEGIN
  INSERT INTO crawl_dats_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER crawl_dats_ad AFTER DELETE ON crawl_dats BEGIN
  INSERT INTO crawl_dats_fts_index(crawl_dats_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER crawl_dats_au AFTER UPDATE ON crawl_dats BEGIN
  INSERT INTO crawl_dats_fts_index(crawl_dats_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO crawl_dats_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

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

-- a list of the draft-dats for a master-dat
-- deprecated
CREATE TABLE archive_drafts (
  profileId INTEGER,
  masterKey TEXT, -- key of the master dat
  draftKey TEXT, -- key of the draft dat
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),

  isActive INTEGER, -- is this the active draft? (deprecated)

  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

-- list of the users current templates
-- deprecated
CREATE TABLE templates (
  profileId INTEGER,
  url TEXT NOT NULL,
  title TEXT,
  screenshot,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),

  PRIMARY KEY (profileId, url),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

-- list of the users installed apps
-- deprecated
CREATE TABLE apps (
  profileId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
 
  PRIMARY KEY (profileId, name),
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

-- log of the users app installations
-- deprecated
CREATE TABLE apps_log (
  profileId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  ts INTEGER DEFAULT (strftime('%s', 'now')),
 
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);

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

-- deprecated
-- crawled descriptions of other sites
CREATE TABLE crawl_site_descriptions (
  crawlSourceId INTEGER NOT NULL,
  crawledAt INTEGER,

  url TEXT,
  title TEXT,
  description TEXT,
  type TEXT, -- comma separated strings

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_site_descriptions_fts_index USING fts5(title, description, content='crawl_site_descriptions');

-- deprecated
-- triggers to keep crawl_site_descriptions_fts_index updated
CREATE TRIGGER crawl_site_descriptions_ai AFTER INSERT ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER crawl_site_descriptions_ad AFTER DELETE ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(crawl_site_descriptions_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER crawl_site_descriptions_au AFTER UPDATE ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(crawl_site_descriptions_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO crawl_site_descriptions_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- deprecated
-- crawled media
CREATE TABLE crawl_media (
  id INTEGER PRIMARY KEY,
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  subtype TEXT NOT NULL,
  href TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_media_url ON crawl_media (crawlSourceId, pathname);
CREATE INDEX crawl_media_subtype ON crawl_media (subtype);
CREATE INDEX crawl_media_href ON crawl_media (href);
CREATE VIRTUAL TABLE crawl_media_fts_index USING fts5(title, description, content='crawl_media');

-- deprecated
-- triggers to keep crawl_media_fts_index updated
CREATE TRIGGER crawl_media_ai AFTER INSERT ON crawl_media BEGIN
  INSERT INTO crawl_media_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER crawl_media_ad AFTER DELETE ON crawl_media BEGIN
  INSERT INTO crawl_media_fts_index(crawl_media_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER crawl_media_au AFTER UPDATE ON crawl_media BEGIN
  INSERT INTO crawl_media_fts_index(crawl_media_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO crawl_media_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- deprecated
-- crawled media tags
CREATE TABLE crawl_media_tags (
  crawlMediaId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlMediaId) REFERENCES crawl_media (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

-- deprecated
-- crawled discussions
CREATE TABLE crawl_discussions (
  id INTEGER PRIMARY KEY,
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_discussions_url ON crawl_discussions (crawlSourceId, pathname);
CREATE VIRTUAL TABLE crawl_discussions_fts_index USING fts5(title, body, content='crawl_discussions');

-- deprecated
-- triggers to keep crawl_discussions_fts_index updated
CREATE TRIGGER crawl_discussions_ai AFTER INSERT ON crawl_discussions BEGIN
  INSERT INTO crawl_discussions_fts_index(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER crawl_discussions_ad AFTER DELETE ON crawl_discussions BEGIN
  INSERT INTO crawl_discussions_fts_index(crawl_discussions_fts_index, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER crawl_discussions_au AFTER UPDATE ON crawl_discussions BEGIN
  INSERT INTO crawl_discussions_fts_index(crawl_discussions_fts_index, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
  INSERT INTO crawl_discussions_fts_index(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;

-- deprecated
-- crawled discussion tags
CREATE TABLE crawl_discussions_tags (
  crawlDiscussionId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlDiscussionId) REFERENCES crawl_discussions (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

-- default profile
INSERT INTO profiles (id) VALUES (0);

PRAGMA user_version = 42;
`
