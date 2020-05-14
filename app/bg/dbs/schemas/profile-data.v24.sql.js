export default `
-- description of the bookmark's content, often pulled from the bookmarked page
ALTER TABLE bookmarks ADD COLUMN description TEXT;

-- sync the bookmark to the user's public profile
ALTER TABLE bookmarks ADD COLUMN isPublic INTEGER;

CREATE TABLE users (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT,
  isDefault INTEGER DEFAULT 0,
  createdAt INTEGER
);

-- list of sites being crawled
CREATE TABLE crawl_sources (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT NOT NULL
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

-- triggers to keep crawl_site_descriptions_fts_index updated
CREATE TRIGGER crawl_site_descriptions_ai AFTER INSERT ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER crawl_site_descriptions_ad AFTER DELETE ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(crawl_site_descriptions_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER crawl_site_descriptions_au AFTER UPDATE ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(crawl_site_descriptions_fts_index, rowid, title, description) VALUES('delete', old.a, old.title, old.description);
  INSERT INTO crawl_site_descriptions_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- crawled posts
CREATE TABLE crawl_posts (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,

  body TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_posts_fts_index USING fts5(body, content='crawl_posts');

-- triggers to keep crawl_posts_fts_index updated
CREATE TRIGGER crawl_posts_ai AFTER INSERT ON crawl_posts BEGIN
  INSERT INTO crawl_posts_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;
CREATE TRIGGER crawl_posts_ad AFTER DELETE ON crawl_posts BEGIN
  INSERT INTO crawl_posts_fts_index(crawl_posts_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
END;
CREATE TRIGGER crawl_posts_au AFTER UPDATE ON crawl_posts BEGIN
  INSERT INTO crawl_posts_fts_index(crawl_posts_fts_index, rowid, body) VALUES('delete', old.rowid, old.body);
  INSERT INTO crawl_posts_fts_index(rowid, body) VALUES (new.rowid, new.body);
END;

-- crawled bookmarks
CREATE TABLE crawl_bookmarks (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,

  href TEXT,
  title TEXT,
  description TEXT,
  tags TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE VIRTUAL TABLE crawl_bookmarks_fts_index USING fts5(title, description, tags, content='crawl_bookmarks');

-- triggers to keep crawl_bookmarks_fts_index updated
CREATE TRIGGER crawl_bookmarks_ai AFTER INSERT ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(rowid, title, description, tags) VALUES (new.rowid, new.title, new.description, new.tags);
END;
CREATE TRIGGER crawl_bookmarks_ad AFTER DELETE ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(crawl_bookmarks_fts_index, rowid, title, description, tags) VALUES('delete', old.rowid, old.title, old.description, old.tags);
END;
CREATE TRIGGER crawl_bookmarks_au AFTER UPDATE ON crawl_bookmarks BEGIN
  INSERT INTO crawl_bookmarks_fts_index(crawl_bookmarks_fts_index, rowid, title, description, tags) VALUES('delete', old.rowid, old.title, old.description, old.tags);
  INSERT INTO crawl_bookmarks_fts_index(rowid, title, description, tags) VALUES (new.rowid, new.title, new.description, new.tags);
END;

-- crawled follows
CREATE TABLE crawl_graph (
  crawlSourceId INTEGER NOT NULL,
  crawledAt INTEGER,
  
  destUrl TEXT NOT NULL,

  PRIMARY KEY (crawlSourceId, destUrl),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);

PRAGMA user_version = 24;
`