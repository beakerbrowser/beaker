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
    return `<h1>${siteInfo.title || 'Untitled images collection'}</h1>`
  }

  get descriptionCtrl () {
    if (this.isEditing.description) {
      return `
        <input data-key="description" class="description" type="text" placeholder="Description (optional)" value="${escapeQuotes(siteInfo.description)}">
      `
    }
    return `<p>${siteInfo.description || `<em>No description</em>`}</p>`
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
      ${isOwner ? `<button class="add-btn">Add images</button>` : ''}
      <a href="/images?download_as=zip">Download as .zip</a>
      <input class="file-input" type="file" multiple accept="image/*">
    `

    // attach events
    this.on('.add-btn', 'click', this.onClickAddImage)
    this.on('.file-input', 'change', this.onFileChange)
  }

  onClickAddImage (e) {
    e.preventDefault()
    this.$('.file-input').click()
  }

  onFileChange (e) {
    for (let f of e.target.files) {
      var r = new FileReader()
      r.onload = async (e) => {
        await site.writeFile(`/images/${f.name}`, e.target.result)
        emit('images-changed')
      }
      r.readAsArrayBuffer(f)
    }
  }
}
customElements.define('app-controls', AppControls)

class AppImgGridItem extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})
    this.render()
  }

  render () {
    var path = this.getAttribute('path')
    var filename = path.split('/').pop()
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: sans-serif;
          text-align: center;
        }
        .container:hover {
          background: #eee;
        }
        a {
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .main-link {
          display: flex;
          min-height: 275px;
          justify-content: space-between;
          flex-direction: column;
        }
        img {
          display: block;
          margin: 0 auto 10px;
          max-width: 100%;
          max-height: 250px;
        }
        .controls {
          font-size: 13px;
          padding: 0 10px;
        }
        .controls a {
          margin-left: 5px;
          color: #444;
        }
        .controls a:first-child {
          margin-left: 0;
        }
      </style>
      <div class="container">
        <a class="main-link" href="${path}" target="_blank">
          <span><!-- this empty span causes the img to vertically center thanks to the space-between justify --></span>
          <img src="${path}">
          <span class="title">${filename}</span>
        </a>
        <span class="controls">
          <a href="${path}" download="${filename}">download</a>
          ${isOwner ? `<a href="#" class="remove-btn">delete</a>` : ''}
        </span>
      </div>
    `
    this.on('.remove-btn', 'click', async (e) => {
      e.preventDefault()
      if (!confirm('Delete this image?')) return
      await site.unlink(path)
      emit('images-changed')
    })
  }
}
customElements.define('img-grid-item', AppImgGridItem)

class AppImgGrid extends BaseAppElement {
  constructor () {
    super()
    this.attachShadow({mode: 'open'})

    this.files = []
    this.readFiles()
    document.body.addEventListener('images-changed', () => this.readFiles())
  }

  async readFiles () {
    this.files = await site.readdir('/images', {stat: true})
    this.files = this.files.filter(f => /(png|jpe?g|gif|svg)$/i.test(f.name)) // images only
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-gap: 40px;
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
      
      ${this.files.map(f => `<img-grid-item path="/images/${f.name}"></img-grid-item>`).join('')}
      ${this.files.length === 0
        ? `<div class="empty">${isOwner ? 'Add an image' : 'No images'}</div>`
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
customElements.define('img-grid', AppImgGrid)

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
          max-width: 100%;
        }
      </style>
      <app-site-info></app-site-info>
      <app-controls></app-controls>
      <img-grid></img-grid>
    `
  }
}
customElements.define('app-main', AppMain)

function escapeQuotes (str) {
  return (str || '').replace(/"/g, '&quot;')
}