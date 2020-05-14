export default `

-- automatically publish changes (0) or write to local folder (1)
ALTER TABLE archives ADD COLUMN previewMode INTEGER;

PRAGMA user_version = 22;
`
