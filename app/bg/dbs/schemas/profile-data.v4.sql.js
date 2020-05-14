export default `

-- add flags to control swarming behaviors of archives
ALTER TABLE archives ADD COLUMN autoDownload INTEGER DEFAULT 1;
ALTER TABLE archives ADD COLUMN autoUpload INTEGER DEFAULT 1;

PRAGMA user_version = 4;
`
