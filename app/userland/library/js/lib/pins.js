
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
    {title: 'Beaker Social', href: 'beaker://social'},
    {title: 'Bookmarks', href: 'beaker://library?view=bookmarks'},
    {title: 'Drives', href: 'beaker://library?view=drives'},
    {title: 'Following', href: 'beaker://library?view=people'},
    {title: 'Documentation', href: 'https://beakerbrowser.com/docs'},
    {title: 'Report an issue', href: 'https://github.com/beakerbrowser/beaker/issues'}
  ]
}