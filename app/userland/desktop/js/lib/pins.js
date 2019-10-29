
export async function load () {
  try {
    var str = await navigator.filesystem.readFile('/.settings/desktop.json')
    var obj = JSON.parse(str)
    return obj.pins
  } catch (e) {
    console.log('Failed to load pins, falling back to defaults', e)
    return defaults()
  }
}

export async function save (pins) {
  await navigator.filesystem.writeFile('/.settings/desktop.json', JSON.stringify({
    type: 'desktop',
    pins
  }, null, 2))
}

// internal methods
// =

function defaults () {
  return [
    {title: 'Filesystem', href: 'beaker://explorer/'},
    {title: 'Library', href: 'beaker://library/'},
    {title: 'Beaker Social', href: 'beaker://social/'}
  ]
}