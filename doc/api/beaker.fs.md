# beaker.fs

> Only available to dat: or ipfs: apps.

The `beaker.fs` API is a safe way to access the filesystem.

Beaker applications that are loaded via dat: or ipfs: have a sandboxed folder available to them.
But, they also need a way to get outside the sandbox, eg to work on a spreadsheet in ~/Documents

This is an API for both use-cases.
The application explicitly requests access outside of the sandbox.
Those requests create file-explorer dialogs, to pick the folder or file.
The selection then stays in the app's perms until explicitly released, by the app or user.

**App Folder**

Each application has a sandboxed folder, which they can use without asking permission.
This is the 'App' folder.

**User Files and Folders**

Applications can ask for files and folders outside of their sandbox.
These are 'User' files and folders.
The permission to use these objects will persist until released by the application.

## API

Overview:

```js
// Get the app's sandbox folder
// no user-prompt required
var folder = beaker.fs.getAppFolder()

// To get a folder outside of the sandbox, you use this method
// it will prompt the user to choose the directory:
beaker.fs.requestFolder({ title: 'Documents directory' }, (err, folder) => {...})

// To get a file within one of your folders, use folder.open()
var file = folder.openSync('myfile.txt', 'r+')

// To get a single file outside of the sandbox, you use this method:
beaker.fs.requestFile('r+', {
  title: 'Your profile picture',
  filters: [{name: 'Images', extensions: ['jpg', 'png', 'gif']}]
}, (err, file) => {...})

// To see which files and folders are currently available to the app:
beaker.fs.getUserFolders((err, folders) => {...})
beaker.fs.getUserFiles((err, files) => {...})

// All folders and files have an internal id, stored at `folder.id` and `file.id`
// you can fetch by id directly, in the request* methods
// if the id isnt found, it'll fallback to the request prompt:
beaker.fs.requestFile(localStorage.profilePicId, 'r+', {...}, (err, profilePic) => {
  if (profilePic)
    localStorage.profilePicId = profilePic.id
})
```

#### beaker.fs.getAppFolder()

Get the application's sandboxed folder.
Returns a `folder` object.

#### beaker.fs.getUserFolders(cb)

Get all folders the user has given to the application.
Calls `cb` with `(err, folders)`.

#### beaker.fs.getUserFiles(cb)

Get all files the user has given to the application.
Calls `cb` with `(err, files)`.

#### beaker.fs.requestFolder([id,] promptOptions, cb)

Open a prompt asking the user for a folder.

 - `id` (optional string/number) ID of a previously-opened folder. If the ID is present in the app's granted folders, this method will skip the user-prompt and give that folder object.
 - `promptOptions.title` (string) The title of the prompt.
 - `promptOptions.multi` (bool) Allow multiple selections?
 - `cb` (function) Called with `(err, folder)`

#### beaker.fs.requestFile([id,] flags, promptOptions, cb)

Open a prompt asking the user for a file.

 - `id` (optional string/number) ID of a previously-opened file. If the ID is present in the app's granted files, this method will skip the user-prompt and give that file object.
 - `flags` (string) What mode should the file be opened in. See [nodejs open() docs](https://nodejs.org/api/fs.html#fs_fs_open_path_flags_mode_callback).
 - `promptOptions.type` (string) Either `'open'` (default) or `'save'`.
 - `promptOptions.title` (string) The title of the prompt.
 - `promptOptions.multi` (bool) Allow multiple selections?
 - `promptOptions.filters` (array) Filter on the possible files selected
 - `cb` (function) Called with `(err, file)`

The `filters` specifies an array of file types that can be displayed or selected when you want to limit the user to a specific type. For example:

```js
{
  filters: [
    {name: 'Images', extensions: ['jpg', 'png', 'gif']},
    {name: 'Movies', extensions: ['mkv', 'avi', 'mp4']},
    {name: 'Custom File Type', extensions: ['as']},
    {name: 'All Files', extensions: ['*']}
  ]
}
```

The extensions array should contain extensions without wildcards or dots (e.g. `'png'` is good but `'.png'` and `'*.png'` are bad). To show all files, use the `'*'` wildcard (no other wildcard is supported).

#### beaker.fs.releaseFolder(folder[, cb])

Give up access to the folder.

#### beaker.fs.releaseFolder(file[, cb])

Give up access to the file.

#### folder API

The `folder` API comes from the [node fs](https://nodejs.org/api/fs.htm) library, and includes *Sync variants.
Paths are relative (and scoped to) to the folder.

Note, any `mode` parameter is excluded.

```js
folder.appendFile(path, data[, options], callback)
folder.exists(path, callback)
folder.mkdir(path, callback) // differs from node api (mode not included)
folder.open(path[, flags], callback) // differs from node api, see below
folder.readdir(path[, options], callback)
folder.readFile(path[, options], callback)
folder.rename(oldPath, newPath, callback)
folder.rmdir(path, callback)
folder.stat(path, callback)
folder.unlink(path, callback)
folder.writeFile(file, data[, options], callback)
```

The `folder.open()` API differs from node's `fs.open()` by returning a `file` object instead of an `fd`.

#### file API

The file API uses [node fs](https://nodejs.org/api/fs.htm) methods, scoped to the file, and includes *Sync variants.
Internally, a FD is held until close() is called.

```js
file.appendFile(data[, options], callback)
file.close(cb)
file.exists(cb)
file.read(buffer, offset, length, position, callback)
file.readFile([options,] callback)
file.stat(cb)
file.sync(cb)
file.truncate(len, cb)
file.unlink(cb)
file.write(buffer, offset, length[, position], callback)
file.write(data[, position[, encoding]], callback)
file.writeFile(data[, options], callback)
```