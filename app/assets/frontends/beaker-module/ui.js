import MarkdownIt from './vendor/markdown-it.js'

var self = hyperdrive.self
var infoPromise = self.getInfo()

function h (tag, attrs, ...children) {
  var el = document.createElement(tag)
  for (let k in attrs) el.setAttribute(k, attrs[k])
  for (let child of children) el.append(child)
  return el
}

function formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return ''
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

customElements.define('module-header', class extends HTMLElement {
  constructor () {
    super()
    this.render()
  }
  async render () {
    var [info, hasTests, hasDemo] = await Promise.all([
       infoPromise,
       self.stat('/tests/index.html').catch(e => false),
       self.stat('/demo/index.html').catch(e => false)
     ])

    this.append(h('h1', {}, h('a', {href: '/'}, info.title)))
    if (info.writable) {
      let editProps = h('a', {title: 'Edit Properties', href: '#'}, 'Edit')
      editProps.addEventListener('click', async (e) => {
        e.preventDefault()
        await navigator.drivePropertiesDialog(self.url)
        location.reload()
      })
      this.append(h('p', {}, `${info.description} [ `, editProps, ` ]`))
    } else {
      this.append(h('p', {}, info.description))
    }

    var buttons = []
    if (hasDemo) {
      buttons.push(h('a', {class: 'button', href: '/demo/', title: 'View Demo'}, 'View Demo'))
    }
    if (hasTests) {
      buttons.push(h('a', {class: 'button', href: '/tests/', title: 'Run Tests'}, 'Run Tests'))
    }
    this.append(h('div', {class: 'admin'}, ...buttons))
  }
})

class ModuleBreadcrumbs extends HTMLElement {
  constructor () {
    super()
    this.render()
  }
  async render () {
    var info = await infoPromise
    var parts = location.pathname.split('/').filter(Boolean)
    var acc = []
    this.append(h('a', {href: '/'}, info.title))
    this.append(h('span', {}, '/'))
    for (let part of parts) {
      acc.push(part)
      let href = '/' + acc.join('/')
      this.append(h('a', {href}, part))
      this.append(h('span', {}, '/'))
    }
  }
}
customElements.define('module-breadcrumbs', ModuleBreadcrumbs)

class ModuleDirectoryView extends HTMLElement {
  constructor () {
    super()
    this.render()
  }

  async render () {
    var entries = await self.readdir(location.pathname, {includeStats: true})
    entries.sort((a, b) => {
      if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
      if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })
    
    var listing = h('div', {class: 'listing'})
    for (let entry of entries) {
      let isDir = entry.stat.isDirectory()
      let isMount = !!entry.stat.mount
      let href = isMount ? `hyper://${entry.stat.mount.key}` : `./${entry.name}${isDir ? '/' : ''}`
      listing.append(h('div', {class: 'entry'},
        h('img', {class: 'icon', src: `/.ui/img/${isMount ? 'mount' : isDir ? 'folder' : 'file'}.svg`}),
        h('a', {href}, entry.name),
        h('small', {}, formatBytes(entry.stat.size))
      ))
    }
    if (entries.length === 0) {
      listing.append(h('div', {class: 'entry'}, 'This folder is empty'))
    }
    this.append(listing)
  }
}
customElements.define('module-directory-view', ModuleDirectoryView)

class ModuleFileView extends HTMLElement {
  constructor (pathname, renderHTML = false) {
    super()
    this.render(pathname, renderHTML)
  }
  async render (pathname, renderHTML = false) {
    // check existence
    let stat = await self.stat(pathname).catch(e => undefined)
    if (!stat) {
      // 404
      this.append(h('div', {class: 'empty'}, h('h2', {}, '404 File Not Found')))
      return
    }

    // embed content
    if (/\.(png|jpe?g|gif)$/i.test(pathname)) {
      this.append(h('img', {src: pathname}))
    } else if (/\.(mp4|webm|mov)/i.test(pathname)) {
      this.append(h('video', {controls: true}, h('source', {src: pathname})))
    } else if (/\.(mp3|ogg)/i.test(pathname)) {
      this.append(h('audio', {controls: true}, h('source', {src: pathname})))
    } else {
      // render content
      let content = await self.readFile(pathname)
      if (renderHTML && /\.(md|html)$/i.test(pathname)) {
        if (pathname.endsWith('.md')) {
          let md = new MarkdownIt()
          content = md.render(content)
        }
        let contentEl = h('div', {class: 'content'})
        contentEl.innerHTML = content
        this.append(contentEl)
        executeScripts(contentEl)
      } else {
        let codeBlock = h('pre', {class: 'content'}, content)
        hljs.highlightBlock(codeBlock)
        this.append(codeBlock)
      }
    }
  }
}
customElements.define('module-file-view', ModuleFileView)

class ModuleReadmeView extends HTMLElement {
  constructor () {
    super()
    this.render()
  }
  async render () {
    let files = await self.readdir(location.pathname).catch(e => ([]))
    files = files.filter(f => ['index.html', 'index.md'].includes(f.toLowerCase()))
    if (files[0]) {
      this.append(new ModuleFileView(location.pathname + files[0], true))
    }
  }
}
customElements.define('module-readme-view', ModuleReadmeView)

customElements.define('module-page', class extends HTMLElement {
  constructor () {
    super()
    if (location.pathname !== '/') {
      this.append(new ModuleBreadcrumbs())
    }
    if (location.pathname.endsWith('/')) {
      this.append(new ModuleDirectoryView())
      this.append(new ModuleReadmeView())
    } else {
      this.append(new ModuleFileView(location.pathname))
    }
  }
})

async function executeScripts (el) {
  for (let scriptEl of Array.from(el.querySelectorAll('script'))) {
    let promise
    let newScriptEl = document.createElement('script')
    newScriptEl.setAttribute('type', scriptEl.getAttribute('type') || 'module')
    newScriptEl.textContent = scriptEl.textContent
    if (scriptEl.getAttribute('src')) {
      newScriptEl.setAttribute('src', scriptEl.getAttribute('src'))
      promise = new Promise((resolve, reject) => {
        newScriptEl.onload = resolve
        newScriptEl.onerror = resolve
      })
    }
    document.head.append(newScriptEl)
    await promise
  }
}

navigator.terminal.registerCommand({
  name: 'test',
  help: 'Run the module tests',
  handle () {
    if (location.pathname !== '/tests/') {
      location.pathname = '/tests/'
    } else {
      location.reload()
    }
  }
})
navigator.terminal.registerCommand({
  name: 'demo',
  help: 'View the module demo',
  handle () {
    if (location.pathname !== '/demo/') {
      location.pathname = '/demo/'
    } else {
      location.reload()
    }
  }
})
navigator.terminal.registerCommand({
  name: 'run',
  help: 'Run a script in the /scripts directory',
  usage: '@run {script} {...args}',
  async handle (opts = {}, ...args) {
    var scriptName = args[0]
    if (!scriptName) throw new Error('Must specify a script to run')
    if (!scriptName.endsWith('.js')) {
      scriptName += '.js'
    }
    var scriptPath = `/scripts/${scriptName}`
    try {
      var script = await import(scriptPath)
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        throw new Error(`No script found in /scripts named ${scriptName}`)
      } else {
        throw e
      }
    }
    if (typeof script.default !== 'function') {
      throw new Error('The script must export a default function')
    }
    return script.default(opts, args.slice(1))
  }
})