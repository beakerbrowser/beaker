# archives dbs

## archive-meta schema

LevelDB computed information about archives

```
{
  key: String, archive key
  value: {
    title: String,
    description: String,
    author: String,
    forkOf: Array of Strings,
    createdBy: {
      url: String,
      title: String
    },
    mtime: Number,
    size: Number,
    isOwner: Boolean
  }
}
```