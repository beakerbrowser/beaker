import { resolveParse, parseLocation, joinPath } from './util.js'
import * as commandsModule from './commands.js'

export const commands = commandsModule

// current working directory methods
// =

export async function ls (opts = {}, location = '') {
  // pick target location
  location = this.env.resolve(location)
  var {drive, protocol, pathname} = parseLocation(location)

  // read
  var listing
  var st = await drive.stat(pathname)
  if (st.isUnsupportedProtocol) {
    throw new Error(`ls() is not supported on ${protocol} addresses`)
  } else {
    listing = await drive.readdir(pathname, {includeStats: true})
    return {
      listing,
      toHTML: () => {
        return html`
          ${st.isFile() ? html`Is a file. Size: ${st.size}<br><br>` : ''}
          ${listing
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
              const icon = entry.stat.isDirectory() ? 'folder' : 'file'
              const mountInfo = entry.stat.mount
                ? html` <a href="hyper://${entry.stat.mount.key}/" class="color-lightgray" style="font-weight: lighter">(<term-icon solid fw icon="external-link-square-alt"></term-icon>${entry.stat.mount.key.slice(0, 4)}..${entry.stat.mount.key.slice(-2)})</a>`
                : ''
              const symlinkInfo = entry.stat.linkname
                ? html` <a href=${this.env.resolve(entry.stat.linkname)} class="color-lightgray" style="font-weight: lighter"><term-icon solid fw icon="long-arrow-alt-right"></term-icon> ${entry.stat.linkname}</a>`
                : ''
              return html`<div><a
                href="${joinPath(joinPath(drive.url, pathname), entry.name)}"
                class="color-${color}"
              ><term-icon icon="${icon}"></term-icon> ${entry.name}</a>${mountInfo}${symlinkInfo}</div>`
            })
          }
        `
      }
    }
  }
}

export async function cd (opts = {}, location = '') {
  var cwd = this.env.resolve(location)
  if (cwd.startsWith('hyper://')) {
    // make sure the target location can be visited
    let urlp = new URL(cwd)
    let drive = beaker.hyperdrive.drive(urlp.origin)
    let st
    try { st = await drive.stat(urlp.pathname) }
    catch (e) {
      throw new Error(`${location}: No such file or directory`)
    }
    if (!st.isDirectory()) {
      throw new Error(`${location}: Not a directory`)
    }
  }
  this.env.goto(cwd)
}

export function pwd (opts = {}) {
  let cwd = this.env.get('cwd')
  return {
    cwd,
    toHTML: () => html`<a href="${cwd}">${cwd}</div>`
  }
}

// folder manipulation
// =

export async function mkdir (opts, dst) {
  if (!dst) throw new Error('dst is required')
  var {drive, pathname} = resolveParse(this.env, dst)
  await drive.mkdir(pathname)
}

// file & folder manipulation
// =

export async function mv (opts, src, dst) {
  if (!src) throw new Error('src is required')
  if (!dst) throw new Error('dst is required')
  var srcp = resolveParse(this.env, src)
  var dstp = resolveParse(this.env, dst)
  
  let st = await dstp.drive.stat(dstp.pathname).catch(e => undefined)
  if (st && st.isDirectory()) {
    dstp.pathname = joinPath(dstp.pathname, src.split('/').pop())
  }

  await srcp.drive.rename(srcp.pathname, dstp.toString())
}

export async function cp (opts, src, dst) {
  if (!src) throw new Error('src is required')
  if (!dst) throw new Error('dst is required')
  var srcp = resolveParse(this.env, src)
  var dstp = resolveParse(this.env, dst)
  
  let st = await dstp.drive.stat(dstp.pathname).catch(e => undefined)
  if (st && st.isDirectory()) {
    dstp.pathname = joinPath(dstp.pathname, src.split('/').pop())
  }

  await srcp.drive.copy(srcp.pathname, dstp.toString())
}

export async function rm (opts, dst) {
  if (!dst) throw new Error('dst is required')
  var {drive, pathname} = resolveParse(this.env, dst)
  var st = await drive.stat(pathname)
  if (st.mount && st.mount.key) {
    await drive.unmount(pathname)
  } else if (st.isDirectory()) {
    await drive.rmdir(pathname, {recursive: true})
  } else {
    await drive.unlink(pathname)
  }
}

export async function ln (opts, target, linkname) {
  if (!target) throw new Error('target is required')
  if (!linkname) throw new Error('linkname is required')
  var targetp = resolveParse(this.env, target)
  var linknamep = resolveParse(this.env, linkname)
  if (targetp.hostname !== linknamep.hostname) throw new Error('target and link must be on the same drive')
  
  let st = await targetp.drive.stat(targetp.pathname).catch(e => undefined)
  if (!st) throw new Error('target does not exist')

  await targetp.drive.symlink(targetp.pathname, linknamep.pathname)
}

export async function readlink (opts, target) {
  if (!target) throw new Error('target is required')
  var targetp = resolveParse(this.env, target)
  
  let st = await targetp.drive.stat(targetp.pathname, {lstat: true}).catch(e => undefined)
  if (!st) throw new Error('target does not exist')
  if (!st.linkname) throw new Error('not a symlink')
  return st.linkname
}

export async function mount (opts, mountUrl, dst) {
  if (!mountUrl) throw new Error('mount-url is required')
  if (!dst) throw new Error('dst is required')
  var {drive, pathname} = resolveParse(this.env, dst)
  await drive.mount(pathname, mountUrl)
}

export async function unmount (opts, dst) {
  if (!dst) throw new Error('dst is required')
  var {drive, pathname} = resolveParse(this.env, dst)
  await drive.unmount(pathname)
}

export async function query (opts = {}, ...paths) {
  var queriesMap = {}
  for (let path of paths) {
    let p = resolveParse(this.env, path)
    if (p.origin in queriesMap) {
      queriesMap[p.origin].opts.path.push(p.pathname)
    } else {
      queriesMap[p.origin] = {
        drive: p.drive,
        opts: Object.assign({}, opts, {path: [p.pathname]})
      }
    }
  }
  
  var allResults = []
  for (let query of Object.values(queriesMap)) {
    let res = await query.drive.query(query.opts)
    allResults = allResults.concat(res)
  }
  allResults.toHTML = () => html`${allResults.map(r => html`<a href=${r.url}>${r.path}</a><br>`)}`
  return allResults
}

export async function meta (opts, location, key = undefined, ...value) {
  if (!location) throw new Error('path is required')
  var {drive, pathname} = resolveParse(this.env, location)
  if (value.length) {
    await drive.updateMetadata(pathname, {[key]: value.join(' ')})
  } else if (opts.delete) {
    await drive.deleteMetadata(pathname, key)
  } else {
    var st = await drive.stat(pathname)
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
  var {drive, pathname} = resolveParse(this.env, location)

  if (!pathname.endsWith('.goto')) {
    pathname += '.goto'
  }

  await drive.writeFile(pathname, '', {
    metadata: {
      href,
      title: opts.title
    }
  })
}

export async function bookmark (opts = {}, href = '.') {
  href = this.env.resolve(href || '.')
  var name = opts.filename || href.split('/').filter(Boolean).pop()
  if (!name.endsWith('.goto')) name += '.goto'
  await beaker.hyperdrive.drive('hyper://system/').writeFile(`/bookmarks/${name}`, '', {metadata: {href}})
}

// utilities
// =

export async function cat (opts = {}, location = '') {
  var {drive, origin, pathname} = resolveParse(this.env, location)
  if (/\.(png|jpe?g|gif)$/.test(pathname)) {
    return {toHTML: () => html`<img src=${(origin + pathname)}>`}
  }
  if (/\.(mp4|webm|mov)$/.test(pathname)) {
    return {toHTML: () => html`<video controls><source src=${(origin + pathname)}></video>`}
  }
  if (/\.(mp3|ogg)$/.test(pathname)) {
    return {toHTML: () => html`<audio controls><source src=${(origin + pathname)}></audio>`}
  }
  var content = await drive.readFile(pathname, 'utf8')
  return {toHTML: () => html`<pre>${content}</pre>`}
}

export async function echo (opts, ...args) {
  return args.join(' ')
}

export async function open (opts = {}, location = '') {
  if (opts.bookmark) {
    location = `${beaker.hyperdrive.getSystemDrive().url}/bookmarks/${location}`
    if (!location.endsWith('.goto')) location += '.goto'
  }
  location = this.env.resolve(location)
  if (location.endsWith('.goto')) {
    let urlp = parseLocation(location)
    let st = await urlp.drive.stat(urlp.pathname).catch(e => undefined)
    if (st && st.metadata.href) {
      location = st.metadata.href
    }
  }
  try {
    this.env.goto(location.toString())
  } catch (e) {
    // will fail if not a directory, don't worry about it
    if (!e.notADirectory) throw e
  }
  await this.page.goto(location, {newTab: opts['new-tab']})
}

export async function edit (opts = {}, location = '') {
  location = this.env.resolve(location)

  // create if dne
  var urlp = parseLocation(location)
  let st = await urlp.drive.stat(urlp.pathname).catch(e => undefined)
  if (!st) await urlp.drive.writeFile(urlp.pathname, '')

  await this.panel.open('editor-app', location)
  await this.panel.goto('editor-app', location)
  await this.panel.focus('editor-app')
}

export function clear () {
  this.env.clearHistory()
}

// env vars
// =

export const env = {
  ls (opts) {
    var vars = this.env.getAll()
    Object.defineProperty(vars, 'toHTML', {
      enumerable: false,
      value: () => {
        return Object.entries(vars).map(([k, v]) => html`<strong>${k}</strong>: ${v}<br>`)
      }
    })
    return vars
  },
  get (opts, name) {
    if (name.startsWith('$')) name = name.slice(1)
    return this.env.get(name)
  },
  set (opts, name, value) {
    if (name.startsWith('$')) name = name.slice(1)
    return this.env.set(name, value)
  }
}

// page interactions
// =

export const page = {
  async exec (opts, ...jsArgs) {
    var js = jsArgs.join(' ')
    if (!js) throw new Error('Please specify the JS you want to execute')
    var result = await this.page.exec(js)
    return {
      result,
      toHTML: () => html`<pre>${result}</pre>`
    }
  },
  async inject (opts, ...cssArgs) {
    var css = cssArgs.join(' ')
    if (!css) throw new Error('Please specify the CSS you want to inject')
    var id = await this.page.inject(css)
    const uninject = e => {
      e.preventDefault()
      e.currentTarget.insertAdjacentText('beforeBegin', 'Uninjected')
      e.currentTarget.remove()
      this.page.uninject(id)
    } 
    this.out(html`<button @click=${uninject}>Uninject</button>`)
    return id
  },
  async uninject (opts, id) {
    return this.page.uninject(''+id)
  }
}

// system
// =

export const system = {
  async fs_audit_stream (opts = {}) {
    var containerEl = document.createElement('div')
    containerEl.classList.add('border-default')
    containerEl.style.height = '50vh'
    containerEl.style.minHeight = '150px'
    containerEl.style.overflow = 'auto'
    containerEl.style.padding = '5px 0'

    function isOriginEq (a, b) {
      try {
        return (new URL(a)).origin === (new URL(b)).origin
      } catch (e) {
        return false
      }
    }

    var stream = await beaker.logger.streamAuditLog()
    stream.addEventListener('data', e => {
      if (opts.caller && !isOriginEq(opts.caller, e.detail.caller)) return
      if (opts.target && !isOriginEq(opts.target, e.detail.target)) return
      if (opts.method && e.detail.method !== opts.method) return
      if (opts.longerthan && e.detail.runtime < +opts.longerthan) return

      var entry = document.createElement('div')
      var ts = (new Date(e.detail.ts)).toLocaleTimeString()
      html.render(html`
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">caller</small> <a href="${e.detail.caller}">${e.detail.caller}</a></div>
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">target</small> <a href="hyper://${e.detail.target}/">hyper://${e.detail.target}</a></div>
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">ts</small> ${ts}</div>
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">runtime</small> ${e.detail.runtime}ms</div>
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">method</small> ${e.detail.method}</div>
        <div><small style="padding: 0 5px; width: 50px; display: inline-block">args</small> ${e.detail.args}</div>
        <hr style="border: 0; border-top: 1px solid var(--lightgray)">
      `, entry)
      containerEl.prepend(entry)
    })
    function onStopStream (e) {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.parentNode.textContent = 'Stream stopped'
      stream.close()
    }

    this.out(
      html`<p>Streaming <button @click=${onStopStream}>&times;</button></p>`,
      containerEl
    )
  }
}

// etc
// =

export function exit () {
  this.env.close()
}