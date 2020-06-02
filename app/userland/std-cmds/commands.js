import { ensureDir, ensureMount, ensureUnmount, ensureUnmountByUrl, getAvailableName } from 'beaker://app-stdlib/js/fs.js'

export async function ls () {
  var drives = await readInstalled()
  var driveInfos = []
  for (let drive of drives) {
    driveInfos.push(await beaker.hyperdrive.drive(drive).getInfo())
  }
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

  var drive = await beaker.hyperdrive.createDrive({
    title,
    description,
    prompt: false
  })
  await drive.writeFile('/index.json', JSON.stringify({
    title,
    description,
    commands: STARTER_MANIFEST_CMDS
  }, null, 2))
  await drive.writeFile('/index.js', STARTER_INDEX_JS)

  return install.call(this, undefined, drive.url)
}

export async function install (opts = {}, url) {
  url = toUrl(url)
  var urls = await readInstalled()
  if (urls.indexOf(url) !== -1) throw new Error('This command-package is already installed')
  urls.push(url)
  await saveInstalled(urls)
  await this.env.reload()
  return {url, toHTML: () => html`Installed <a href=${url}>${url}</a>`}
}

export async function uninstall (opts = {}, url) {
  url = toUrl(url)
  var urls = await readInstalled()
  var index = urls.indexOf(url)
  if (index === -1) throw new Error('This command-package was not installed')
  urls.splice(index, 1)
  await saveInstalled(urls)
  await this.env.reload()
  return {url, toHTML: () => html`Uninstalled <a href=${url}>${url}</a>`}
}

export async function reload () {
  await this.env.reload()
  this.out('Commands reloaded')
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

async function readInstalled () {
  return beaker.hyperdrive.drive('hyper://system/').readFile('/webterm/command-packages.json').then(JSON.parse).catch(e => ([]))
}

async function saveInstalled (urls) {
  await beaker.hyperdrive.drive('hyper://system/').mkdir('/webterm').catch(e => undefined)
  await beaker.hyperdrive.drive('hyper://system/').writeFile('/webterm/command-packages.json', JSON.stringify(urls, null, 2))
}

function toUrl (str = '') {
  if (!str.startsWith('hyper://')) {
    str = `hyper://${str}`
  }
  var urlp
  try {
    urlp = new URL(str)
  } catch (e) {
    throw new Error(`${str} is not a valid URL`)
  }
  if (!/^[0-9a-f]{64}/i.test(urlp.hostname)) {
    throw new Error(`${str} is not a valid hyper:// URL`)
  }
  return `${urlp.protocol}//${urlp.hostname}`
}