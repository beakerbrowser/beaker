import { html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from '../../../app-stdlib/js/com/popups/base.js'
import { getAvailableName } from '../../../app-stdlib/js/fs.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import popupsCSS from '../../../app-stdlib/css/com/popups.css.js'

// exported api
// =

export class PublishPopup extends BasePopup {
  constructor ({type, title, content, path, siteOptions}) {
    super()
    this.siteOptions = siteOptions
    this.site = siteOptions[0]
    this.type = type || 'beaker/page'
    this.title = title
    this.content = content
    this.path = path
    this.error = undefined
  }

  get typeLabel () {
    return ({
      'beaker/blogpost': 'Blog post',
      'beaker/microblogpost': 'Microblog post',
      'beaker/page': 'Page'
    })[this.type]
  }

  static get styles () {
    return [popupsCSS, css`
    .inline {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    .inline label {
      flex: 0 0 40px;
      margin: 0;
    }
    .inline input,
    .inline button {
      margin: 0;
      letter-spacing: 0.5px;
    }
    button.small {
      font-size: 11px;
    }
    input.small {
      height: 25px;
      font-size: 12px;
    }
    `]
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  // management
  //

  static async create ({type, title, content}) {
    var addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
    var siteOptions = await Promise.all(addressBook.profiles.map(({key}) => beaker.hyperdrive.getInfo(key)))
    var path = getDefaultPath(type)
    var name = await getAvailableName(path, title.toLowerCase(), beaker.hyperdrive.drive(siteOptions[0].url), 'md')
    return BasePopup.create(PublishPopup, {type, title, content, siteOptions, path: path + name})
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-thumb')
  }

  // rendering
  // =

  renderTitle () {
    return `Publish draft`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div class="inline">
          <label>Site</label>
          <button class="btn small" @click=${this.onClickSite}>${this.site.title} <span class="fas fa-angle-down"></span>
        </div>
        <div class="inline">
          <label>Title</label> <input value=${this.title}>
        </div>
        <div class="inline">
          <label>Type</label>
          <button class="btn small" @click=${this.onClickType}>${this.typeLabel} <span class="fas fa-angle-down"></span>
        </div>
        <div class="inline">
          <label>Path</label>
          <input name="path" class="small" value=${this.path} @keyup=${this.onKeyupPath}>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="3">Cancel</button>
          <button type="submit" class="btn primary" tabindex="2">Save</button>
        </div>
      </form>
    `
  }

  // events
  // =

  onKeyupPath (e) {
    this.path = e.currentTarget.value.trim()
  }

  onClickSite (e) {
    e.preventDefault()
    e.stopPropagation()
    const opt = (site) => ({
      label: site.title,
      click: () => {
        this.site = site
        this.requestUpdate()
      }
    })
    let rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      noBorders: true,
      style: 'padding: 4px 0',
      items: this.siteOptions.map(opt)
    })
  }

  onClickType (e) {
    e.preventDefault()
    e.stopPropagation()
    const opt = (icon, type, label) => ({
      icon,
      label,
      click: () => this.onSetType(type)
    })
    let rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      noBorders: true,
      style: 'padding: 4px 0',
      items: [
        opt('far fa-fw fa-file-alt', 'beaker/page', 'Page'),
        opt('fas fa-fw fa-blog', 'beaker/blogpost', 'Blog post'),
        opt('fas fa-fw fa-stream', 'beaker/microblogpost', 'Microblog Post')
      ]
    })
  }

  onSetType (type) {
    this.type = type
    this.path = getDefaultPath(type) + this.path.split('/').pop()
    this.shadowRoot.querySelector('[name="path"]').value = this.path
    this.requestUpdate()
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    this.error = undefined
    try {
      var drive = beaker.hyperdrive.drive(this.site.url)
      await drive.writeFile(this.path, this.content, {metadata: {title: this.title, type: this.type}})
    } catch (e) {
      this.error = e.toString()
      this.requestUpdate()
      return
    }

    this.dispatchEvent(new CustomEvent('resolve', {detail: {url: drive.url + this.path}}))
  }
}

customElements.define('publish-popup', PublishPopup)

function getDefaultPath (type) {
  return ({
    'beaker/blogpost': '/blog/',
    'beaker/microblogpost': '/microblog/',
    'beaker/page': '/pages/'
  })[type] || '/'
}