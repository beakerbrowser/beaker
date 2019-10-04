export default `

-- add crawled votes
CREATE TABLE crawl_votes (
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  topic TEXT NOT NULL,
  vote INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER,

  PRIMARY KEY (crawlSourceId, pathname),
  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_votes_topic ON crawl_votes (topic);

PRAGMA user_version = 29;
`