import { ensureDir, ensureMount, ensureUnmount, ensureUnmountByUrl, getAvailableName } from 'beaker://app-stdlib/js/fs.js'

export async function ls () {
  let drives = await beaker.drives.list()
  let driveInfos = drives.map(drive => drive.info).filter(info => info.type === 'webterm.sh/cmd-pkg')
  driveInfos.toHTML = () => {
  return driveInfos.map(info => html`<p><a href=${info.url}><strong>${info.title}</strong></a> ${info.description}</p>`)
  }
  return driveInfos
}

export async function create () {
  var title
  var description
  while (!title) title = await this.prompt('Package title')
  description = await this.prompt('Package description')

  var drive = await Hyperdrive.create({
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
  await beaker.drives.configure(url)
  return {url, toHTML: () => html`Installed <a href=${url}>${url}</a>`}
}

export async function uninstall (opts = {}, url) {
  await beaker.drives.remove(url)
  return {url, toHTML: () => html`Uninstalled <a href=${url}>${url}</a>`}
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