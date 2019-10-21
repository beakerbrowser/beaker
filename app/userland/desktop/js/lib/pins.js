
export async function load () {
  var fs = await navigator.filesystem.get()
  try {
    var str = await fs.readFile('/.settings/launcher-pins.json')
    var obj = JSON.parse(str)
    return obj.pins
  } catch (e) {
    console.log('Failed to load pins, falling back to defaults', e)
    return defaults()
  }
}

export async function save (pins) {
  var fs = await navigator.filesystem.get()
  await fs.mkdir('/.data').catch(err => null)
  await fs.mkdir('/.data/beakerbrowser.com').catch(err => null)
  await fs.writeFile('/.settings/launcher-pins.json', JSON.stringify({
    type: 'launcher-pins',
    pins
  }, null, 2))
}

// internal methods
// =

function defaults () {
  return [
    {title: 'My Hyperdrive', href: 'beaker://explorer'},
    {title: 'Bookmarks', href: 'beaker://bookmarks'},
    {title: 'Library', href: 'beaker://library'},
    {title: 'Beaker Social', href: 'beaker://social'},
    {title: 'BeakerBrowser.com', href: 'https://beakerbrowser.com'},
  ]
}