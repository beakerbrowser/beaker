// current working directory methods
// =

export async function ls (opts = {}, location = '') {
  // pick target location
  location = this.resolve(location)
  var {archive, protocol, pathname} = parseLocation(location)

  // read
  var listing
  var st = await archive.stat(pathname)
  if (st.isUnsupportedProtocol) {
    throw new Error(`ls() is not supported on ${protocol} addresses`)
  } else if (st.isFile()) {
    return {
      listing: [{name: pathname.split('/').pop(), stat: st}],
      toHTML: () => html`Is a file.\nSize: ${st.size}`
    }
  } else {
    listing = await archive.readdir(pathname, {stat: true})
    return {
      listing,
      toHTML () {
        return listing
          .sort((a, b) => {
            // dirs on top
            if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
            if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
            return a.name.localeCompare(b.name)
          })
          .map(entry => {
            // coloring
            var color = 'default'
            if (entry.name.startsWith('.')) {
              color = 'gray'
            }

            // render
            const weight = entry.stat.isDirectory() ? 'bold' : 'normal'
            const icon = entry.stat.isDirectory() ? 'folder' : 'file'
            const mountInfo = entry.stat.mount
              ? html` <span class="color-lightgray" style="font-weight: lighter">(<term-icon solid fw icon="external-link-square-alt"></term-icon>${entry.stat.mount.key.slice(0, 4)}..${entry.stat.mount.key.slice(-2)})</span>`
              : ''
            return html`<div><a
              href="${joinPath(joinPath(archive.url, pathname), entry.name)}"
              class="color-${color}"
              style="font-weight: ${weight}"
            ><term-icon icon="${icon}"></term-icon> ${entry.name}${mountInfo}</a></div>`
          })
      }
    }
  }
}

export async function cd (opts = {}, location = '') {
  var cwd = this.resolve(location)
  if (cwd.startsWith('dat://')) {
    // make sure the target location can be visited
    let urlp = new URL(cwd)
    let archive = new DatArchive(urlp.origin)
    let st
    try { st = await archive.stat(urlp.pathname) }
    catch (e) {
      throw new Error(`${location}: No such file or directory`)
    }
    if (!st.isDirectory()) {
      throw new Error(`${location}: Not a directory`)
    }
  }
  this.cwd = cwd
}

export function pwd (opts = {}) {
  let cwd = this.cwd.toString()
  return {
    cwd,
    toHTML: () => html`<a href="${cwd}">${cwd}</div>`
  }
}

// folder manipulation
// =

export async function mkdir (opts, dst) {
  if (!dst) throw new Error('dst is required')
  var {archive, pathname} = resolveParse(this, dst)
  await archive.mkdir(pathname)
}

// file & folder manipulation
// =

export async function mv (opts, src, dst) {
  if (!src) throw new Error('src is required')
  if (!dst) throw new Error('dst is required')
  var srcp = resolveParse(this, src)
  var dstp = resolveParse(this, dst)
  
  let st = await dstp.archive.stat(dstp.pathname).catch(e => undefined)
  if (st && st.isDirectory()) {
    dstp.pathname = joinPath(dstp.pathname, src.split('/').pop())
  }

  await srcp.archive.rename(srcp.pathname, dstp.toString())
}

export async function cp (opts, src, dst) {
  if (!src) throw new Error('src is required')
  if (!dst) throw new Error('dst is required')
  var srcp = resolveParse(this, src)
  var dstp = resolveParse(this, dst)
  
  let st = await dstp.archive.stat(dstp.pathname).catch(e => undefined)
  if (st && st.isDirectory()) {
    dstp.pathname = joinPath(dstp.pathname, src.split('/').pop())
  }

  await srcp.archive.copy(srcp.pathname, dstp.toString())
}

export async function rm (opts, dst) {
  if (!dst) throw new Error('dst is required')
  var {archive, pathname} = resolveParse(this, dst)
  var st = await archive.stat(pathname)
  if (st.isDirectory()) {
    await archive.rmdir(pathname, {recursive: true})
  } else {
    await archive.unlink(pathname)
  }
}

export async function meta (opts, location, key = undefined, ...value) {
  if (!location) throw new Error('path is required')
  var {archive, pathname} = resolveParse(this, location)
  if (value.length) {
    await archive.updateMetadata(pathname, {[key]: value.join(' ')})
  } else if (opts.delete) {
    await archive.deleteMetadata(pathname, key)
  } else {
    var st = await archive.stat(pathname)
    if (key) {
      return st.metadata[key]
    } else {
      var meta = st.metadata
      Object.defineProperty(meta, 'toHTML', {
        enumerable: false,
        value: () => {
          return html`<table>${Object.entries(meta).map(([k, v]) => html`<tr><td><strong>${k || ''}&ensp;</strong></td><td>&quot;${v || ''}&quot;</td></tr>`)}</table>`
        }
      })
      return meta
    }
  }
}

export async function mkgoto (opts, location, href) {
  if (!location) throw new Error('path is required')
  if (!href) throw new Error('href is required')
  var {archive, pathname} = resolveParse(this, location)

  if (!pathname.endsWith('.goto')) {
    pathname += '.goto'
  }

  await archive.writeFile(pathname, '', {
    metadata: {
      href,
      title: opts.title
    }
  })
}

// utilities
// =

export async function peek (opts = {}, location = '') {
  var {archive, origin, pathname} = resolveParse(this, location)
  if (/\.(png|jpe?g|gif)$/.test(pathname)) {
    return {toHTML: () => html`<img src=${(origin + pathname)}>`}
  }
  if (/\.(mp4|webm|mov)$/.test(pathname)) {
    return {toHTML: () => html`<video controls><source src=${(origin + pathname)}></video>`}
  }
  if (/\.(mp3|ogg)$/.test(pathname)) {
    return {toHTML: () => html`<audio controls><source src=${(origin + pathname)}></audio>`}
  }
  var content = await archive.readFile(pathname, 'utf8')
  return {toHTML: () => html`<pre>${content}</pre>`}
}

export async function go (opts = {}, location = '') {
  location = this.resolve(location)
  if (location.endsWith('.goto')) {
    let urlp = parseLocation(location)
    let st = await urlp.archive.stat(urlp.pathname).catch(e => undefined)
    if (st && st.metadata.href) {
      location = st.metadata.href
    }
  }
  try {
    this.cwd = location.toString()
  } catch (e) {
    // will fail if not a directory, don't worry about it
    if (!e.notADirectory) throw e
  }
  if (opts.n) {
    await beaker.browser.openUrl(location, {setActive: true})
  } else {
    await beaker.browser.gotoUrl(location)
  }
}

export async function edit (opts = {}, location = '') {
  location = this.resolve(location)

  // create if dne
  var urlp = parseLocation(location)
  let st = await urlp.archive.stat(urlp.pathname).catch(e => undefined)
  if (!st) await urlp.archive.writeFile(urlp.pathname, '')

  if (opts.n) {
    await beaker.browser.openUrl(location, {
      setActive: true,
      sidebarPanels: ['editor-app']
    })
  } else {
    await beaker.browser.executeSidebarCommand('show-panel', 'editor-app', location)
    await beaker.browser.executeSidebarCommand('set-context', 'editor-app', location)
  }
}

// internal methods
// =

function resolveParse (env, location) {
  return parseLocation(env.resolve(location))
}

function parseLocation (location) {
  var urlp = new URL(location)
  urlp.archive = createArchive(urlp.toString())
  return urlp
}

function joinPath (left, right) {
  left = (left || '').toString()
  right = (right || '').toString()
  if (left.endsWith('/') && right.startsWith('/')) {
    return left + right.slice(1)
  }
  if (!left.endsWith('/') && !right.startsWith('/')) {
    return left + '/' + right
  }
  return left + right
}

/*
This wrapper provides a DatArchive interface for non-dat sites
so that errors can be smoothly generated
*/

function createArchive (url) {
  if (url.startsWith('dat:')) {
    return new DatArchive(url)
  }
  return new OtherOrigin(url)
}

class OtherOrigin {
  constructor (url) {
    this.url = url
    for (let k of Object.getOwnPropertyNames(DatArchive.prototype)) {
      console.log(k)
      if (!this[k] && typeof DatArchive.prototype[k] === 'function') {
        this[k] = this.doThrow.bind(this)
      }
    }
  }

  stat () {
    // fake response to just let stat() callers pass through
    return {
      isUnsupportedProtocol: true,
      isDirectory: () => true,
      isFile: () => true
    }
  }

  doThrow () {
    let urlp = new URL(this.url)
    throw new Error(`${urlp.protocol} does not support this command`)
  }
}