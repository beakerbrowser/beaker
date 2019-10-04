export default `

-- add more flags to control swarming behaviors of archives
ALTER TABLE archives ADD COLUMN networked INTEGER DEFAULT 1;

PRAGMA user_version = 6;
`
