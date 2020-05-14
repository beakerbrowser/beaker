export default `

-- add crawled discussions
CREATE TABLE crawl_discussions (
  id INTEGER PRIMARY KEY,
  crawlSourceId INTEGER NOT NULL,
  pathname TEXT NOT NULL,
  crawledAt INTEGER,
  
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,

  FOREIGN KEY (crawlSourceId) REFERENCES crawl_sources (id) ON DELETE CASCADE
);
CREATE INDEX crawl_discussions_url ON crawl_discussions (crawlSourceId, pathname);

-- add discussion <-> tag join table
CREATE TABLE crawl_discussions_tags (
  crawlDiscussionId INTEGER,
  crawlTagId INTEGER,

  FOREIGN KEY (crawlDiscussionId) REFERENCES crawl_discussions (id) ON DELETE CASCADE,
  FOREIGN KEY (crawlTagId) REFERENCES crawl_tags (id) ON DELETE CASCADE
);

PRAGMA user_version = 30;
`