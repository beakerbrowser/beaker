export default `

-- fix an incorrect trigger definition
DROP TRIGGER IF EXISTS crawl_site_descriptions_au;
CREATE TRIGGER crawl_site_descriptions_au AFTER UPDATE ON crawl_site_descriptions BEGIN
  INSERT INTO crawl_site_descriptions_fts_index(crawl_site_descriptions_fts_index, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO crawl_site_descriptions_fts_index(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- rename 'graph' to 'follows'
ALTER TABLE crawl_graph RENAME TO crawl_follows;

PRAGMA user_version = 26;
`
