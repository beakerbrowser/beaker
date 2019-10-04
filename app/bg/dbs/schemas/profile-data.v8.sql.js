export default `

-- add tags and notes to bookmarks
ALTER TABLE bookmarks ADD COLUMN tags TEXT;
ALTER TABLE bookmarks ADD COLUMN notes TEXT;

PRAGMA user_version = 8;
`
