export default `

-- add a field to track when last accessed in the library
ALTER TABLE archives_meta ADD COLUMN lastLibraryAccessTime INTEGER DEFAULT 0;

PRAGMA user_version = 13;
`
