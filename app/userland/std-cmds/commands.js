import { ensureDir, ensureMount, ensureUnmount, ensureUnmountByUrl, getAvailableName } from 'beaker://app-stdlib/js/fs.js'

export async function ls () {
  let res = await navigator.filesystem.query({path: '/system/webterm/cmds/*'})
  res = res.filter(r => r.stat.isDirectory())
  res = res.map(r => ({name: r.path.split('/').pop(), path: r.path, url: r.mount}))
  res.toHTML = () => {
    return res.map(r => html`<p><a href=${navigator.filesystem.url + r.path}>${r.name}</a></p>`)
  }
  return res
}

export async function create () {
  var title
  var description
  while (!title) title = await this.prompt('Package title')
  description = await this.prompt('Package description')

  var drive = await DatArchive.create({
    type: 'webterm.sh/cmd-pkg',
    title,
    description,
    prompt: false
  })
  await drive.writeFile('/index.json', JSON.stringify({
    type: 'webterm.sh/cmd-pkg',
    title,
    description,
    commands: STARTER_MANIFEST_CMDS
  }, null, 2))
  await drive.writeFile('/index.js', STARTER_INDEX_JS)

  return install(undefined, drive.url)
}

export async function install (opts = {}, url) {
  await ensureDir('/system')
  await ensureDir('/system/webterm')
  await ensureDir('/system/webterm/cmds')

  var driveInfo = await (new DatArchive(url)).getInfo()
  var name = await getAvailableName('/system/webterm/cmds', driveInfo.title || 'untitled')
  let path = `/system/webterm/cmds/${name}`
  await ensureMount(path, driveInfo.url)

  return {name, path, url, toHTML: () => html`Installed <a href=${navigator.filesystem.url + path}>${name}</a>`}
}

export async function uninstall (opts = {}, urlOrName) {
  await ensureDir('/system')
  await ensureDir('/system/webterm')
  await ensureDir('/system/webterm/cmds')
  
  await ensureUnmount(`/system/webterm/cmds/${urlOrName}`)
  await ensureUnmountByUrl(`/system/webterm/cmds/*`, urlOrName)
}

// internal
// =

const STARTER_MANIFEST_CMDS = [
  {
    "name": "example",
    "help": "An example command",
    "usage": "example [-m] {arg1} {arg2}",
    "options": [
      {
        "name": "myswitch",
        "abbr": "m",
        "help": "An example switch",
        "boolean": true,
        "default": false
      }
    ]
  }
]

const STARTER_INDEX_JS = `
export async function example (opts = {}, arg1, arg2) {
  if (opts.myswitch) {
    this.out('My switch was included')
  }
  return arg1 + ' ' + arg2
}
`