export default `
DROP TRIGGER IF EXISTS crawl_posts_ai;
DROP TRIGGER IF EXISTS crawl_posts_ad;
DROP TRIGGER IF EXISTS crawl_posts_au;
DROP TABLE IF EXISTS crawl_posts;

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

PRAGMA user_version = 39;
`