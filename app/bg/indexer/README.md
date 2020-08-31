# Indexer

Beaker's secondary indexer. Listens to the user's private and profile sites, plus any subscribed sites, and indexes their data into a local SQLite for fast querying.

## Notes

### URLs vs Origins

Origins never have a path, search, or hash segment. This means they never include a trailing slash. URLs always have a path segment. Therefore we can always tell what is or isn't an origin or URL:

|Value|Is A...|
|-|-|
|https://example.com|Origin|
|https://example.com/|URL|
|https://example.com/foo|URL|

This has ramifications for the way queries are constructed. Origins should only ever be used when tracking the source of data, while URLs should only ever be used for record values.

In short, when querying or storing records about a site, pass a URL and not an origin. (This is an internal consideration -- the Web APIs should do that automatically.)

### URL normalization

The indexer does not strip the `?k=v` search or `#foo` hash segments. This means it's incumbent on userland applications to correctly normalize their URLs to ensure correct behavior.