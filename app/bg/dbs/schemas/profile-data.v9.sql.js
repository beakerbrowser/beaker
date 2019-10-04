export default `

-- join table to list the archive's type fields
CREATE TABLE archives_meta_type (
  key TEXT,
  type TEXT
);

PRAGMA user_version = 9;
`
