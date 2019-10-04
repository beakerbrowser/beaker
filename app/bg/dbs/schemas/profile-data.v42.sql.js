export default `

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

PRAGMA user_version = 42;
`