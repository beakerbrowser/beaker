export default `

-- add a field to track when last accessed in the library
ALTER TABLE bookmarks ADD COLUMN pinOrder INTEGER DEFAULT 0;

PRAGMA user_version = 16;
`
