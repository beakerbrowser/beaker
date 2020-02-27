import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'

// exported
// =

// const EXPLORER_APP = 'https://hyperdrive.network/'
// export const FIXED_FILES = [
//   makeFixedLink('.home-drive.goto', `${EXPLORER_APP}${beaker.filesystem.url.slice('hyper://'.length)}`, 'Home Drive'),
//   makeFixedLink('.library.goto', 'beaker://library/', 'My Library'),
// ]

export async function load () {
  var userFiles = []
  try {
    userFiles = await beaker.filesystem.readdir('/bookmarks', {includeStats: true})
    userFiles = userFiles.filter(file => file.stat.metadata.pinned)
    userFiles.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    console.log('Failed to load bookmarks files', e)
  }
  return userFiles
}

export async function createLink ({href, title}) {
  var name = await getAvailableName('/bookmarks', title, beaker.filesystem, 'goto')
  await beaker.filesystem.writeFile(`/bookmarks/${name}`, '', {metadata: {href, title}})
}

export async function remove (file) {
  await beaker.filesystem.unlink(`/bookmarks/${file.name}`)
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