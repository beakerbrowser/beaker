import MarkdownIt from './markdown-it.js'

var self = new Hyperdrive(location)

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
    this.info = await self.getInfo()

    this.append(h('h1', {}, h('a', {href: '/'}, this.info.title)))
    if (this.info.description) {
      this.append(h('p', {}, this.info.description))
    }

    if (this.info.writable) {
      let buttons = []

      let editProps = h('button', {}, 'Edit Drive Properties')
      editProps.addEventListener('click', async (e) => {
        await navigator.drivePropertiesDialog(self.url)
        location.reload()
      })
      buttons.push(editProps)

      this.append(h('div', {class: 'admin'}, ...buttons))
    }
  }
})

class ModuleBreadcrumbs extends HTMLElement {
  constructor () {
    super()
    let parts = location.pathname.split('/').filter(Boolean)
    let acc = []
    this.append(h('a', {href: '/'}, 'Home'))
    for (let part of parts) {
      acc.push(part)
      let href = '/' + acc.join('/')
      this.append(h('span', {}, '/'))
      this.append(h('a', {href}, part))
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
        h('img', {class: 'icon', src: `/theme/${isMount ? 'mount' : isDir ? 'folder' : 'file'}.svg`}),
        h('a', {href}, `${entry.name}${isDir ? '/' : ''}`),
        h('small', {}, formatBytes(entry.stat.size))
      ))
    }
    this.append(listing)
  }
}
customElements.define('module-directory-view', ModuleDirectoryView)

class ModuleFileView extends HTMLElement {
  constructor (pathname) {
    super()
    this.render(pathname)
  }
  async render (pathname) {
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
      if (/\.(md|html)$/i.test(pathname)) {
        if (pathname.endsWith('.md')) {
          let md = new MarkdownIt()
          content = md.render(content)
        }
        let contentEl = h('div', {class: 'content'})
        contentEl.innerHTML = content
        this.append(contentEl)
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
    files = files.filter(f => ['readme', 'readme.md', 'readme.txt'].includes(f.toLowerCase()))
    if (files[0]) {
      this.append(new ModuleFileView(location.pathname + files[0]))
    } else {
      let info = await self.getInfo()
      if (info.writable) {
        let a = h('a', {href: '#'}, 'Add a readme')
        a.addEventListener('click', async (e) => {
          e.preventDefault()
          await self.writeFile(location.pathname + 'README.md', '# README')
          location.reload()
        })
        this.append(h('div', {class: 'empty'}, a))
      }
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