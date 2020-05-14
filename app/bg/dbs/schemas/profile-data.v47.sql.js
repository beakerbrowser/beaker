export default `

DROP TABLE IF EXISTS setup_state;
CREATE TABLE setup_state (
  migrated08to09 INTEGER DEFAULT 0
);

PRAGMA user_version = 47;
`
