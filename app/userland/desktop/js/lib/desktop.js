import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'

// exported
// =

export const FIXED_FILES = [
  makeFixedLink('.home-drive.goto', navigator.filesystem.url, 'Home Drive')
]

export async function load () {
  var userFiles = []
  try {
    userFiles = await navigator.filesystem.readdir('/desktop', {stat: true})
    userFiles.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    console.log('Failed to load desktop files', e)
  }
  return FIXED_FILES.concat(userFiles)
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