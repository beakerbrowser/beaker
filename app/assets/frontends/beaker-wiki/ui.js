import MarkdownIt from './markdown-it.js'

var self = hyperdrive.self
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

customElements.define('wiki-nav', class extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    this.innerHTML = ''
    this.info = await self.getInfo()
    this.files = await self.readdir('/', {recursive: true})
    this.files = this.files.filter(file => file.endsWith('.md'))
    this.files.sort()
    this.render()
  }

  render () {
    for (let file of this.files) {
      let href = `/${file}`
      let cls = pathname === href ? 'active' : ''
      let buttons = []

      if (this.info.writable) {
        if (/\.(png|jpe?g|gif|mp4|mp3|ogg|webm|mov)$/.test(file) === false) {
          let editPage = h('img', {src: '/.ui/pencil.svg', alt: 'Edit', title: 'Edit'})
          editPage.addEventListener('click', async (e) => {
            e.preventDefault()
            location = `${href}?edit`
          })
          buttons.push(editPage)
        }
        let deletePage = h('img', {src: '/.ui/trash.svg', alt: 'Delete', title: 'Delete'})
        deletePage.addEventListener('click', async (e) => {
          e.preventDefault()
          if (!confirm('Delete this page?')) return
          await self.unlink(href)
          if (href === pathname) location.reload()
          else this.load()
        })
        buttons.push(deletePage)
      }

      this.append(h('a', {href, class: cls}, h('span', {}, file.slice(0, -3)), h('span', {class: 'buttons'}, ...buttons)))
    }
    if (this.files.length === 0) {
      this.append(h('div', {class: 'empty'}, 'This Wiki has no pages'))
    }

    if (this.info.writable) {
      let newPage = h('a', {href: '#'}, '+ New Page')
      newPage.addEventListener('click', async (e) => {
        e.preventDefault()
        var newPathname = prompt('Enter the path of the new page')
        if (!newPathname) return
        if (!newPathname.endsWith('.md')) newPathname += '.md'
        await ensureParentDir(newPathname)
        if ((await self.stat(newPathname).catch(e => undefined)) === undefined) {
          await self.writeFile(newPathname, `# ${newPathname}`)
        }
        this.load()
      })
      this.append(newPage)
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
        let btn = h('button', {class: 'primary'}, 'Create Page')
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
        let savePage = h('button', {}, 'Save Changes')
        savePage.addEventListener('click', async (e) => {
          let value = document.body.querySelector('textarea.editor').value
          await self.writeFile(pathname, value)
          location.search = ''
        })
        let discardChanges = h('button', {}, 'Discard Changes')
        discardChanges.addEventListener('click', async (e) => {
          if (!confirm('Discard changes?')) return
          location.search = ''
        })
        this.append(h('div', {class: 'buttons'}, savePage, discardChanges))

        let textarea = h('textarea', {class: 'editor', autofocus: true}, content)
        this.append(textarea)
      } else {
        // render content
        if (/\.(md|html)$/i.test(pathname)) {
          if (pathname.endsWith('.md')) {
            let md = new MarkdownIt({html: true})
            content = md.render(content)
          }
          let contentEl = h('div', {class: 'content'})
          contentEl.innerHTML = content
          this.append(contentEl)
          executeJs(this)
        } else {
          this.append(h('pre', {class: 'content'}, content))
        }
      }
    }
  }
})


function executeJs (container) {
  const scripts = container.getElementsByTagName('script')
  const scriptsInitialLength = scripts.length
  for (let i = 0; i < scriptsInitialLength; i++) {
    const script = scripts[i]
    const scriptCopy = document.createElement('script')
    scriptCopy.type = script.type ? script.type : 'text/javascript'
    if (script.innerHTML) {
      scriptCopy.innerHTML = script.innerHTML
    } else if (script.src) {
      scriptCopy.src = script.src
    }
    scriptCopy.async = false
    script.parentNode.replaceChild(scriptCopy, script)
  }
}