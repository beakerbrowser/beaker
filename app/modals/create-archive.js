/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { ucfirst } from '../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      currentTemplateUrl: {type: String},
      errors: {type: Object}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.title = ''
    this.description = ''
    this.type = null
    this.links = null
    this.networked = true
    this.templates = []
    this.currentTemplateUrl = 'blank'
    this.errors = {}

    // export interface
    window.createArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type || []
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    this.templates = [{url: 'blank', title: `Empty ${ucfirst(this.simpleType)}`}]
    if (this.simpleType === 'website') {
      // TODO templates for non-websites
      this.templates = this.templates.concat(await bg.archives.list({type: 'unwalled.garden/template'}))
    }
    await this.requestUpdate()
  }

  get simpleType () {
    if (this.type) {
      if (this.type.includes('unwalled.garden/person')) return 'person'
      if (this.type.includes('unwalled.garden/application')) return 'application'
      if (this.type.includes('unwalled.garden/module')) return 'module'
      if (this.type.includes('unwalled.garden/template')) return 'template'
      if (this.type.includes('unwalled.garden/theme')) return 'theme'
    }
    return 'website'
  }
  // rendering
  // =

  render () {
    const template = (url, title) => {
      const cls = classMap({template: true, selected: url === this.currentTemplateUrl})
      return html`
        <div class="${cls}" @click=${e => this.onClickTemplate(e, url)}>
          <img src="asset:thumb:${url}">
          <div class="title">${title}</div>
        </div>
      `
    }

    return html`
      <div class="wrapper">
        <h1 class="title">New ${this.simpleType}</h1>

        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="templates">
              <div class="templates-selector">
                ${this.templates.map(t => template(t.url, t.title))}
              </div>
            </div>

            <div class="inputs">
              <label for="title">${ucfirst(this.simpleType)} Title</label>
              <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
              ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

              <label for="desc">Description</label>
              <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>

              <div class="form-actions">
                <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
                <button type="submit" class="btn primary" tabindex="5">Create ${this.simpleType}</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  async onClickTemplate (e, url) {
    this.currentTemplateUrl = url
    await this.updateComplete
    this.shadowRoot.querySelector('input').focus() // focus the title input
  }

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    if (!this.title) {
      this.errors = {title: 'Required'}
      return
    }

    try {
      var url
      if (this.currentTemplateUrl === 'blank') {
        url = await bg.datArchive.createArchive({
          title: this.title,
          description: this.description,
          type: this.type,
          networked: this.networked,
          links: this.links,
          prompt: false
        })
      } else {
        await bg.datArchive.download(this.currentTemplateUrl)
        url = await bg.datArchive.forkArchive(this.currentTemplateUrl, {
          title: this.title,
          description: this.description,
          type: this.type,
          networked: this.networked,
          links: this.links,
          prompt: false
        })
      }
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
CreateArchiveModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.layout {
  display: flex;
  margin-bottom: 10px;
  user-select: none;
}

.layout .templates {
  width: 624px;
  margin-right: 20px;
}

.layout .inputs {
  min-width: 200px;
  flex: 1;
}

.templates-selector {
  display: grid;
  grid-gap: 20px;
  padding: 20px;
  grid-template-columns: repeat(4, 1fr);
  align-items: baseline;
  border: 1px solid #ccc;
  border-radius: 4px;
  height: 478px;
  overflow-y: auto;
  background: #fafafa;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.1);
}

.template {
  width: 110px;
  padding: 10px;
  border-radius: 4px;
}

.template img {
  display: block;
  margin: 0 auto;
  width: 100px;
  height: 80px;
  margin-bottom: 10px;
  object-fit: cover;
  background: #fff;
  border: 1px solid #bbb;
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
}

.template .title {
  text-align: center;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template.selected {
  background: #2864dc;
  color: #fff;
}

.template.selected .title {
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
}
`]

customElements.define('create-archive-modal', CreateArchiveModal)