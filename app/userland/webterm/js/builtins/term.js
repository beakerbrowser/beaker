import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

export async function ls () {
  var apps = await readInstalled()
  apps.toHTML = () => {
    return apps.map(app => html`
      <p>
        <a href=${app.url}><strong>${app.name}</strong></a>
        ${app.description || ''}
        <br><small><a href=${app.url}>${app.url}</a></small>
      </p>
    `)
  }
  return apps
}

export async function install (opts = {}, name, url) {
  url = toUrl(url)
  var apps = await readInstalled()
  if (apps.find(app => app.name === name)) {
    throw new Error(`An application is already installed under the name "${name}"`)
  }
  if (apps.find(app => app.url === url)) {
    throw new Error(`This application is already installed`)
  }
  let description = undefined
  if (url.startsWith('hyper://')) {
    let info = await beaker.hyperdrive.getInfo(url)
    description = info.description
  }
  apps.push({url, name, description})
  await saveInstalled(apps)
  await this.env.reload()
  return {url, toHTML: () => html`Installed "${name}"`}
}

export async function uninstall (opts = {}, name) {
  var apps = await readInstalled()
  var index = apps.findIndex(app => app.name === name)
  if (index === -1) throw new Error(`No app named "${name}" is installed`)
  apps.splice(index, 1)
  await saveInstalled(apps)
  await this.env.reload()
  return `Uninstalled "${name}"`
}

async function readInstalled () {
  return beaker.hyperdrive.drive('hyper://private/').readFile('/webterm/installed.json').then(JSON.parse).catch(e => ([]))
}

async function saveInstalled (urls) {
  await beaker.hyperdrive.drive('hyper://private/').mkdir('/webterm').catch(e => undefined)
  await beaker.hyperdrive.drive('hyper://private/').writeFile('/webterm/installed.json', JSON.stringify(urls, null, 2))
}

function toUrl (str = '') {
  var urlp
  try {
    urlp = new URL(str)
  } catch (e) {
    throw new Error(`"${str}" is not a valid URL`)
  }
  return `${urlp.protocol}//${urlp.hostname}`
}