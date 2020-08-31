import { html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from '../../../app-stdlib/js/com/popups/base.js'
import { getAvailableName } from '../../../app-stdlib/js/fs.js'
import { joinPath } from '../../../app-stdlib/js/strings.js'
import popupsCSS from '../../../app-stdlib/css/com/popups.css.js'

// exported api
// =

export class PublishPopup extends BasePopup {
  constructor ({url, type, title, content, profile}) {
    super()
    this.url = url
    this.type = type || 'page'
    this.title = title
    this.content = content
    this.profile = profile
    this.error = undefined
  }

  get typeLabel () {
    return ({
      'blogpost': 'blog post'
    })[this.type] || 'page'
  }

  static get styles () {
    return [popupsCSS, css`

    .where {
      display: grid;
      grid-template-columns: 50px 1fr;
      grid-gap: 10px;
      align-items: center;
      margin-bottom: 10px;
    }

    .where img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }

    .where .title {
      font-size: 15px;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .where .visibility {
      display: inline-block;
      background: var(--bg-color--semi-light);
      border-radius: 4px;
      padding: 5px;
      font-size: 11px;
      font-weight: 500;
    }

    section {
      margin-left: 60px;
    }

    label {
      font-size: 11px;
      color: var(--text-color--light);
    }

    .popup-inner input[name="title"] {
      font-size: 17px;
      height: auto;
      padding: 8px 10px 6px;
      letter-spacing: 0.7px;
    }

    input[name="title"]::placeholder {
      font-size: 17px;
    }
    `]
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  // management
  //

  static async create ({url, type, title, content}) {
    var profile = await beaker.browser.getProfile()
    profile.url = `hyper://${profile.key}`
    return BasePopup.create(PublishPopup, {url, type, title, content, profile})
  }

  static destroy () {
    return BasePopup.destroy('beaker-publish-popup')
  }

  // rendering
  // =

  renderTitle () {
    return 'Publish'
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div class="where">
          <img src="asset:thumb:${this.profile.url}">
          <div>
            <div class="title">${this.profile.title}</div>
            <div>
              <span class="visibility">
                <span class="fas fa-fw fa-globe-africa"></span> Everybody
              </span>
            </div>
          </div>
        </div>

        <section>
          <label>Title</label>
          <input name="title" value=${this.title}>
        </section>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="3">Cancel</button>
          <button type="submit" class="btn primary" tabindex="2">
            <span class="fas fa-fw fa-globe-africa"></span> Publish ${this.typeLabel}
          </button>
        </div>
      </form>
    `
  }

  // events
  // =

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var title = this.shadowRoot.querySelector('input[name="title"]').value
    var path = getDefaultPath(this.type)
    var name = await getAvailableName(path, title.toLowerCase(), beaker.hyperdrive.drive(this.profile.url), 'md')
    var newUrl = joinPath(this.profile.url, path, name)
    var oldUrl = this.url

    this.error = undefined
    try {
      await beaker.hyperdrive.writeFile(newUrl, this.content, {metadata: {title}})
      await beaker.hyperdrive.unlink(oldUrl)
    } catch (e) {
      this.error = e.toString()
      this.requestUpdate()
      return
    }

    this.dispatchEvent(new CustomEvent('resolve', {detail: {url: newUrl}}))
  }
}

customElements.define('beaker-publish-popup', PublishPopup)

function getDefaultPath (type) {
  return ({
    'blogpost': '/blog/',
    'page': '/pages/'
  })[type] || '/pages/'
}