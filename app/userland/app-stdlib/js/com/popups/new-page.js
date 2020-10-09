/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import { getAvailableName } from '../../fs.js'
import { joinPath } from '../../strings.js'
import * as contextMenu from '../../com/context-menu.js'
import popupsCSS from '../../../css/com/popups.css.js'

// exported api
// =

export class NewPagePopup extends BasePopup {
  static get properties () {
    return {
      type: {type: String},
      title: {type: String},
      visibility: {type: String}
    }
  }

  constructor (opts) {
    super()
    this.driveUrl = opts.driveUrl
    this.profile = undefined

    this.type = opts?.type || 'page'
    this.title = ''
    this.visibility = 'private'
  }

  async connectedCallback () {
    super.connectedCallback()
    if (this.driveUrl) {
      this.profile = await beaker.hyperdrive.getInfo(this.driveUrl)
    } else {
      this.profile = (await beaker.session.get())?.user
    }
    this.requestUpdate()
  }

  get shouldShowHead () {
    return false
  }

  get drive () {
    if (this.driveUrl) {
      return beaker.hyperdrive.drive(this.driveUrl)
    }
    if (this.visibility === 'public') {
      return beaker.hyperdrive.drive(this.profile.url)
    }
    return beaker.hyperdrive.drive('hyper://private')
  }

  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 520px;
      border-radius: 8px;
    }

    .popup-inner .body {
      padding: 0;
    }

    nav {
      display: flex;
      background: var(--bg-color--semi-light);
      padding: 12px 14px 0;
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
      border-bottom: 1px solid var(--border-color--light);
    }
    
    nav a {
      border: 1px solid transparent;
      padding: 5px 14px;
    }
    
    nav a.current {
      position: relative;
      background: var(--bg-color--default);
      border: 1px solid var(--border-color--light);
      border-bottom: 1px solid transparent;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    nav a.current:after {
      content: '';
      background: var(--bg-color--default);
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 2px;
    }
    
    nav a:hover:not(.current) {
      text-decoration: none;
      cursor: pointer;
      background: var(--bg-color--light);
    }

    nav a :-webkit-any(.far, .fas) {
      font-size: 12px;
    }

    form {
      padding: 16px 18px 14px 16px;
    }

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
      cursor: pointer;
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

    .popup-inner select {
      border: 1px solid var(--border-color--light);
      border-radius: 4px;
      padding: 6px 10px;
      height: auto;
      width: 100px;
      -webkit-appearance: unset;
    }

    .tip {
      font-size: 12px;
      margin-top: 12px;
      color: var(--text-color--light);
    }
    `]
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(NewPagePopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('new-page-popup')
  }

  // rendering
  // =

  renderBody () {
    const navItem = (id, label) => html`
      <a
        class=${this.type === id ? 'current' : ''}
        @click=${e => { this.type = id }}
      >${label}</a>
    `

    return html`
      <link rel="stylesheet" href=${(new URL('../../../css/fontawesome.css', import.meta.url)).toString()}>
      <nav>
        ${navItem('page', html`<span class="far fa-fw fa-file"></span> Page`)}
        ${navItem('blogpost', html`<span class="fas fa-fw fa-blog"></span> Blogpost`)}
      </nav>
      <form @submit=${this.onSubmit}>
        <div class="where">
          <img src="${this.profile?.url}/thumb">
          <div>
            <div class="title">${this.profile?.title}</div>
            <div>
              ${this.driveUrl ? html`
                <a class="visibility">
                  <span class="fas fa-fw fa-globe-africa"></span> Posting to ${this.profile?.title}
                </a>
              ` : html`
                <a class="visibility" @click=${this.onClickVisibility}>
                  ${this.visibility === 'private' ? html`
                    <span class="fas fa-fw fa-lock"></span> Private
                  ` : html`
                    <span class="fas fa-fw fa-globe-africa"></span> Public
                  `}
                  <span class="fas fa-fw fa-caret-down"></span>
                </a>
              `}
            </div>
          </div>
        </div>

        <section>
          <label for="title-input">Title</label>
          <input
            required
            type="text"
            id="title-input"
            name="title"
            placeholder="Title"
            value=${this.title}
            @keyup=${this.onKeyupTitle}
          />
        </section>

        <section>
          <label for="format-input">Format</label>
          <select id="format-input" name="format">
            <option value="markdown">Markdown</option>
          </select>
        </section>

        <section class="tip">
          <span class="fas fa-fw fa-info"></span>
          You can make a ${this.type} "public" after working on it privately first.
        </section>

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1" ?disabled=${!this.title}>
            ${!this.driveUrl && this.visibility === 'private' ? html`
              <span class="fas fa-fw fa-lock"></span>
            ` : html`
              <span class="fas fa-fw fa-globe-africa"></span>
            `}
            Create ${this.driveUrl ? '' : this.visibility} ${this.type}
          </button>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  async onKeyupTitle (e) {
    this.title = e.currentTarget.value.trim()
    this.requestUpdate()
  }

  onClickVisibility (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fas fa-lock', label: 'Private (Only Me)', click: () => { this.visibility = 'private' } },
      {icon: 'fas fa-globe-africa', label: 'Public (Everybody)', click: () => { this.visibility = 'public' } }
    ]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      noBorders: true,
      roomy: true,
      rounded: true,
      style: `padding: 6px 0`,
      items,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'
    })
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var path = (this.type === 'blogpost') ? '/blog/' : '/pages/'
    var name = await getAvailableName(path, this.title.toLowerCase(), this.drive, 'md')
    var metadata = {
      title: this.title
    }
    await this.drive.writeFile(joinPath(path, name), `# ${this.title}`, {metadata})
    var url = joinPath(this.drive.url, path, name)
    this.dispatchEvent(new CustomEvent('resolve', {detail: {url}}))
  }
}

customElements.define('new-page-popup', NewPagePopup)