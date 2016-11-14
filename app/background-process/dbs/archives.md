# archives dbs

These dbs are leveldbs.


## archive-meta schema

Computed information about archives

```
{
  key: String, archive key
  value: {
    title: String,
    description: String,
    author: String,
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

## archive-user-settings schema

Extra user settings 

A `Claims` is an array of strings, containing the origins of sites that have requested a specific behavior 

```
{
  key: String, archive key
  value: {
    saveClaims: Claims, don't delete the archive
    uploadClaims: Claims, upload the archive
    downloadClaims: Claims, download the archive
  }
}
```

## global-settings schema

Free form K/V for storing info about dat operation