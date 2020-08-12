import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'

// exported
// =

// const EXPLORER_APP = 'https://hyperdrive.network/'
// export const FIXED_FILES = [
//   makeFixedLink('.home-drive.goto', `${EXPLORER_APP}system`, 'Home Drive'),
//   makeFixedLink('.library.goto', 'beaker://library/', 'My Library'),
// ]

export async function load () {
  var bookmarks = []
  try {
    bookmarks = await beaker.bookmarks.list()
    bookmarks = bookmarks.filter(b => b.pinned)
  } catch (e) {
    console.log('Failed to load bookmarks files', e)
  }
  return bookmarks
}

export async function createLink ({href, title}, pinned) {
  await beaker.bookmarks.add({href, title, pinned})
}

export async function remove (bookmark) {
  await beaker.bookmarks.remove(bookmark.href)
}

// internal
// =

function makeFixedLink (name, href, title) {
  return {
    name,
    stat: {
      isDirectory: () => false,
      isFile: () => true,
      mount: undefined,
      metadata: {href, title}
    },
    isFixed: true
  }
}