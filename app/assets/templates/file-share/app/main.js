var site = new DatArchive(window.location)
var siteInfo = {}
var isOwner = false
const $ = (sel, el=document.body) => el.querySelector(sel)
const on = (el, evt, fn) => el.addEventListener(evt, fn)
const emit = (evt) => document.body.dispatchEvent(new Event(evt))

class BaseAppElement extends HTMLElement {
  $ (sel) {
    return this.shadowRoot.querySelector(sel)
  }

  emit (evt) {
    this.shadowRoot.dispatchEvent(new Event(evt))
  }

  on (sel, evt, fn) {
    try {
      this.$(sel).addEventListener(evt, fn.bind(this))
    } catch (e) {
      // ignore, el probably doesnt exist
    }
  }
}

class AppSiteInfo extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.isEditing = {
      title: false,
      description: false
    }
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: sans-serif;
        }
        h1:hover,
        p:hover {
          text-decoration: underline;
        }
        input, textarea {
          display: block;
          width: 100%;
          margin-bottom: 5px;
          padding: 10px;
        }
        input.title {
          font-size: 27px;
          font-weight: bold;
        }
        input.description {
          font-size: 14px;
          margin-top: -10px;
        }
      </style>
      ${this.titleCtrl}
      ${this.descriptionCtrl}
    `
    this.on('h1', 'click', e => {
      this.isEditing.title = true
      this.render()
      this.$('input.title').focus()
    })
    this.on('p', 'click', e => {
      this.isEditing.description = true
      this.render()
      this.$('input.description').focus()
    })
    this.on('input', 'blur', e => {
      var key = e.currentTarget.dataset.key
      this.isEditing[key] = false
      this.render()
    })
    this.on('input', 'keydown', async (e) => {
      var key = e.currentTarget.dataset.key
      if (e.key === 'Enter') {
        var value = e.currentTarget.value
        await site.configure({[key]: value})
        window.location.reload()
      }
      if (e.key === 'Escape') {
        this.isEditing[key] = false
        this.render()
      }
    })
  }

  get titleCtrl () {
    if (this.isEditing.title) {
      return `
        <input data-key="title" class="title" type="text" placeholder="Title (required)" value="${escapeQuotes(siteInfo.title)}">
      `
    }
    return `<h1>${siteInfo.title || 'Untitled'}</h1>`
  }

  get descriptionCtrl () {
    if (this.isEditing.description) {
      return `
        <input data-key="description" class="description" type="text" placeholder="Description (optional)" value="${escapeQuotes(siteInfo.description)}">
      `
    }
    return `<p>${siteInfo.description || `<em>No description</em>`}</p>`
  }

  renderForm () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: sans-serif;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
          margin-bottom: 10px;
        }
        input, textarea {
          display: block;
          width: 100%;
          margin-bottom: 5px;
          padding: 10px;
        }
        input {
          font-size: 18px;
        }
        textarea {
          font-size: 14px;
        }
      </style>
      
      <textarea placeholder="Description (optional)">${siteInfo.description}</textarea>
      <div>
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn">Save</button>
      </div>
    `
  }
}
customElements.define('app-site-info', AppSiteInfo)

class AppControls extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: sans-serif;
          display: block;
          font-size: 12px;
          margin-bottom: 10px;
        }
        input[type="file"] {
          visibility: hidden;
        }
      </style>
      ${isOwner ? `<button class="add-btn">Add files</button>` : ''}
      <a href="/files?download_as=zip">Download as .zip</a>
      <input class="file-input" type="file" multiple>
    `

    // attach events
    this.on('.add-btn', 'click', this.onClickAddFile)
    this.on('.file-input', 'change', this.onFileChange)
  }

  onClickAddFile (e) {
    e.preventDefault()
    this.$('.file-input').click()
  }

  onFileChange (e) {
    for (let f of e.target.files) {
      var r = new FileReader()
      r.onload = async (e) => {
        await site.writeFile(`/files/${f.name}`, e.target.result)
        emit('files-changed')
      }
      r.readAsArrayBuffer(f)
    }
  }
}
customElements.define('app-controls', AppControls)

class AppFilesGridItem extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.render()
  }

  get fileType () {
    var path = this.getAttribute('path')
    if (/(zip|tar|tar.gz|rar)$/.test(path)) {
      return 'archive'
    }
    if (/(jpe?g|bmp|gif|png|tiff)$/.test(path)) {
      return 'image'
    }
    if (/(mp4|avi|mpeg)$/.test(path)) {
      return 'media'
    }
    if (/(mpa|mp3|ogg|wav)$/.test(path)) {
      return 'media'
    }
    if (/(txt|doc|docx|ppt|xls|md)$/.test(path)) {
      return 'document'
    }
    if (/(pdf)$/.test(path)) {
      return 'pdf'
    }
    if (/(html?|css|less|sass|js|jsx|wasm|mjs)$/.test(path)) {
      return 'code'
    }
  }

  get imgName () {
    if (this.hasAttribute('folder')) {
      return 'folder'
    }
    var type = this.fileType
    return type ? `file-${type}` : 'file'
  }

  render () {
    var path = this.getAttribute('path')
    var filename = path.split('/').pop()
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          font-family: sans-serif;    
          border: 1px solid #ddd;
          margin-bottom: 10px;
        }
        a {
          text-decoration: none;          
        }
        .a:hover {
          text-decoration: underline;
        }
        :host > a {
          flex: 1;
          display: flex;
          align-items: center;
          color: #333;
          padding: 5px;
        }
        :host > a:hover {
          background: #eee;
        }
        img {
          margin-right: 10px;
        }
        .title {
          flex: 1;
        }
        .controls {
          font-size: 13px;
          padding: 0 10px;
          border-left: 1px solid #eee;
        }
        .controls a {
          margin-left: 5px;
        }
      </style>
      <a href="${path}" target="_blank">
        <img src="/app/img/${this.imgName}-40.png">
        <span class="title">${filename}</span>
      </a>
      <span class="controls">
        <a href="${path}" download="${filename}">download</a>
        ${isOwner ? `<a href="#" class="remove-btn">delete</a>` : ''}
      </span>
    `
    this.on('.remove-btn', 'click', async (e) => {
      e.preventDefault()
      if (!confirm('Delete this file?')) return
      await site.unlink(path)
      emit('files-changed')
    })
  }
}
customElements.define('files-grid-item', AppFilesGridItem)

class AppFilesGrid extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})

    this.files = []
    this.readFiles()
    document.body.addEventListener('files-changed', () => this.readFiles())
  }

  async readFiles () {
    this.files = await site.readdir('/files', {stat: true})
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: sans-serif;
        }
        .empty {
          text-align: center;
          padding: 40px;
          background: #eee;
          color: rgba(0,0,0,.5);
          font-size: 12px;
        }
        .clickable {
          cursor: pointer;
        }
        .clickable:hover {
          text-decoration: underline;
        }
      </style>
      
      ${this.files.map(f => `<files-grid-item path="/files/${f.name}"></files-grid-item>`).join('')}
      ${this.files.length === 0
        ? `<div class="empty">${isOwner ? 'Add a file' : 'No files'}</div>`
        : ''}
    `
    if (isOwner && this.files.length === 0) {
      this.$('.empty').classList.add('clickable')
      this.on('.empty', 'click', () => {
        $('app-main').shadowRoot.querySelector('app-controls').shadowRoot.querySelector('.file-input').click()
      })
    }
  }
}
customElements.define('files-grid', AppFilesGrid)

class AppMain extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.setup()
  }

  async setup () {
    siteInfo = await site.getInfo()
    isOwner = siteInfo.isOwner
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 800px;
        }
      </style>
      <app-site-info></app-site-info>
      <app-controls></app-controls>
      <files-grid></files-grid>
    `
  }
}
customElements.define('app-main', AppMain)

function escapeQuotes (str) {
  return (str || '').replace(/"/g, '&quot;')
}