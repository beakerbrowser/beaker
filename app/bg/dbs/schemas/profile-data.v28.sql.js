export default `

-- we're replacing the bookmark 'tags' field with a new normalized tags table
-- this requires replacing the entire bookmarks table because we need to add an id pkey


-- remove the old bookmarks tabes
DROP TRIGGER IF EXISTS crawl_bookmarks_ai;
DROP TRIGGER IF EXISTS crawl_bookmarks_ad;
DROP TRIGGER IF EXISTS crawl_bookmarks_au;
DROP TABLE IF EXISTS crawl_bookmarks_fts_index;
DROP TABLE IF EXISTS crawl_bookmarks;


-- add crawled tags
CREATE TABLE crawl_tags (
  id INTEGER PRIMARY KEY,
  tag TEXT UNIQUE
);

-- add crawled bookmarks
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

-- add bookmark <-> tag join table
CREATE TABLE crawl_bookmarks_tags (
  crawlBookmarkId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlBookmarkId) REFERENCES crawl_bookmarks (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

PRAGMA user_version = 28;
`
