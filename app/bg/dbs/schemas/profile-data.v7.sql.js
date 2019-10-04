export default `

-- add a field to track rehost expiration (for timed rehosting)
ALTER TABLE archives ADD COLUMN expiresAt INTEGER;

PRAGMA user_version = 7;
`
