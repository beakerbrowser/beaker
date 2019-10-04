export default `

-- crawled reactions
CREATE TABLE crawl_reactions (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  topic TEXT NOT NULL,
  emojis TEXT NOT NULL,

  PRIMARY KEY (crawlSourceId, pathname),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_reactions_topic ON crawl_reactions (topic);

PRAGMA user_version = 25;
`
