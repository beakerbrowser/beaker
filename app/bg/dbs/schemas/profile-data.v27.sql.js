export default `

-- add crawled comments
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

PRAGMA user_version = 27;
`
