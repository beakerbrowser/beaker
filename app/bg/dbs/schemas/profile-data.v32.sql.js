export default `

CREATE VIRTUAL TABLE crawl_discussions_fts_index USING fts5(title, body, content='crawl_discussions');

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

PRAGMA user_version = 32;

`