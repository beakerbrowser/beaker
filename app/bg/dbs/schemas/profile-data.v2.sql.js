export default `

-- add variable to track the staging size less ignored files
-- deprecated
ALTER TABLE archives_meta ADD COLUMN stagingSizeLessIgnored INTEGER;

PRAGMA user_version = 2;
`
