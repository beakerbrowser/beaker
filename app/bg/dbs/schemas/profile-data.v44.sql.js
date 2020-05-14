export default `

CREATE TABLE setup_state (
  profileCreated INTEGER DEFAULT 0
);

PRAGMA user_version = 44;
`