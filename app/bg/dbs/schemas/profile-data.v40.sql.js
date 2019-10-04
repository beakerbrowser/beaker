export default `

DROP INDEX IF EXISTS crawl_reactions_topic;
DROP TABLE IF EXISTS crawl_reactions;

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

PRAGMA user_version = 40;
`