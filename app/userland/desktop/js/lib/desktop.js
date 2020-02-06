import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'

// exported
// =

const EXPLORER_APP = 'https://hyperdrive.network/'
export const FIXED_FILES = [
  makeFixedLink('.home-drive.goto', `${EXPLORER_APP}${navigator.filesystem.url.slice('hyper://'.length)}`, 'Home Drive'),
  makeFixedLink('.drives.goto', 'beaker://drives/', 'My Drives'),
]

export async function load () {
  var userFiles = []
  try {
    userFiles = await navigator.filesystem.readdir('/desktop', {includeStats: true})
    userFiles.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    console.log('Failed to load desktop files', e)
  }
  return [
    FIXED_FILES[0],
    FIXED_FILES[1]
  ].concat(userFiles)
}

export async function createLink ({href, title}) {
  var name = await getAvailableName('/desktop', title, navigator.filesystem, 'goto')
  await navigator.filesystem.writeFile(`/desktop/${name}`, '', {metadata: {href, title}})
}

export async function remove (file) {
  await navigator.filesystem.unlink(`/desktop/${file.name}`)
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