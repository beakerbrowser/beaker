export default `

CREATE TABLE dat_dns (
  id INTEGER PRIMARY KEY,
  name TEXT,
  key TEXT,
  isCurrent INTEGER,
  lastConfirmedAt INTEGER,
  firstConfirmedAt INTEGER
);
CREATE INDEX dat_dns_name ON dat_dns (name);
CREATE INDEX dat_dns_key ON dat_dns (key);

ALTER TABLE crawl_sources ADD COLUMN datDnsId INTEGER;

PRAGMA user_version = 35;
`