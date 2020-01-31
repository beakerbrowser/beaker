import MarkdownIt from './markdown-it.js'

var self = new Hyperdrive(location)
var pathname = location.pathname.endsWith('/') ? location.pathname + 'index.md' : location.pathname
var isEditing = location.search === '?edit'

function h (tag, attrs, ...children) {
  var el = document.createElement(tag)
  for (let k in attrs) el.setAttribute(k, attrs[k])
  for (let child of children) el.append(child)
  return el
}

async function ensureParentDir (p) {
  let parts = p.split('/').slice(0, -1)
  let acc = []
  for (let part of parts) {
    acc.push(part)
    await self.mkdir(acc.join('/')).catch(e => undefined)
  }
}

customElements.define('wiki-header', class extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    this.info = await self.getInfo()
    this.render()
  }

  render () {
    this.append(h('h1', {}, h('a', {href: '/'}, this.info.title)))
    if (this.info.description) {
      this.append(h('p', {}, this.info.description))
    }

    if (this.info.writable) {
      let buttons = []

      if (!isEditing) {
        let newPage = h('button', {}, 'New Page')
        newPage.addEventListener('click', async (e) => {
          var newPathname = prompt('Enter the path of the new page')
          if (!newPathname) return
          if (!newPathname.endsWith('.md')) newPathname += '.md'
          await ensureParentDir(newPathname)
          if ((await self.stat(newPathname).catch(e => undefined)) === undefined) {
            await self.writeFile(newPathname, `# ${newPathname}`)
          }
          location = newPathname + '?edit'
        })
        buttons.push(newPage)

        if (/\.(png|jpe?g|gif|mp4|mp3|ogg|webm|mov)$/.test(pathname) === false) {
          let editPage = h('button', {}, 'Edit Page')
          editPage.addEventListener('click', async (e) => {
            location.search = '?edit'
          })
          buttons.push(editPage)
        }
      } else {
        let savePage = h('button', {class: 'primary'}, 'Save Page')
        savePage.addEventListener('click', async (e) => {
          let value = document.body.querySelector('textarea.editor').value
          await self.writeFile(pathname, value)
          location.search = ''
        })
        buttons.push(savePage)
      }

      let deletePage = h('button', {}, 'Delete Page')
      deletePage.addEventListener('click', async (e) => {
        if (!confirm('Delete this page?')) return
        await self.unlink(pathname)
        if (isEditing) location.search = ''
        else location.reload()
      })
      buttons.push(deletePage)

      let editProps = h('button', {}, 'Edit Drive Properties')
      editProps.addEventListener('click', async (e) => {
        await navigator.drivePropertiesDialog(self.url)
        if (!isEditing) location.reload()
      })
      buttons.push(editProps)

      this.append(h('div', {class: 'admin'}, ...buttons))
    }
  }
})

customElements.define('wiki-nav', class extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    this.files = await self.readdir('/', {recursive: true})
    this.files = this.files.filter(file => file.endsWith('.md'))
    this.files.sort()
    this.render()
  }

  render () {
    for (let file of this.files) {
      let href = `/${file}`
      let cls = pathname === href ? 'active' : ''
      this.append(h('a', {href, class: cls}, file.slice(0, -3)))
    }
    if (this.files.length === 0) {
      this.append(h('div', {class: 'empty'}, 'This Wiki has no pages'))
    }
  }
})

customElements.define('wiki-page', class extends HTMLElement {
  constructor () {
    super()
    this.render()
  }

  async render () {
    // check existence
    let stat = await self.stat(pathname).catch(e => undefined)
    if (!stat) {
      // 404
      let canEdit = (await self.getInfo()).writable
      if (canEdit) {
        let btn = h('button', {}, 'Create Page')
        btn.addEventListener('click', async (e) => {
          await ensureParentDir(pathname)
          await self.writeFile(pathname, `# ${pathname}`)
          location.search = '?edit'
        })
        this.append(h('div', {class: 'empty'}, h('h2', {}, 'This Page Does Not Exist'), btn))
      } else {
        this.append(h('div', {class: 'empty'}, h('h2', {}, 'This Page Does Not Exist')))
      }
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
      let content = await self.readFile(pathname)
      if (isEditing) {
        // render editor
        let textarea = h('textarea', {class: 'editor'}, content)
        this.append(textarea)
      } else {
        // render content
        if (/\.(md|html)$/i.test(pathname)) {
          if (pathname.endsWith('.md')) {
            let md = new MarkdownIt()
            content = md.render(content)
          }
          let contentEl = h('div', {class: 'content'})
          contentEl.innerHTML = content
          this.append(contentEl)
        } else {
          this.append(h('pre', {class: 'content'}, content))
        }
      }
    }
  }
})