export default `

-- add crawled media
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

-- add crawled media tags
CREATE TABLE crawl_media_tags (
  crawlMediaId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlMediaId) REFERENCES crawl_media (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

PRAGMA user_version = 31;
`