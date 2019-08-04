/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { ucfirst } from '../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

const BASIC_TEMPLATES = [
  {url: 'blank', title: 'Empty Website', thumb: html`<img src="beaker://assets/img/templates/website.png">`}
]

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      currentTemplate: {type: String},
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
    this.currentTemplate = 'blank'
    this.errors = {}

    // export interface
    window.createArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type ? Array.isArray(params.type) ? params.type[0] : params.type : ''
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    this.templates = BASIC_TEMPLATES.concat(
      await bg.archives.list({type: 'unwalled.garden/template', isSaved: true})
    )
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    const template = (url, title, thumb) => {
      const cls = classMap({template: true, selected: url === this.currentTemplate})
      return html`
        <div class="${cls}" @click=${e => this.onClickTemplate(e, url)}>
          ${thumb ? thumb : html`<img src="asset:thumb:${url}">`}
          <div class="title">${title}</div>
        </div>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">New Website</h1>

        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="templates">
              <div class="templates-selector">
                ${this.templates.map(t => template(t.url, t.title, t.thumb))}
              </div>
            </div>

            <div class="inputs">
              <label for="title">${ucfirst(this.simpleType)} Title</label>
              <input autofocus name="title" tabindex="1" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
              ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

              <label for="desc">Description</label>
              <textarea name="desc" tabindex="2" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>
              
              <div class="form-actions">
                <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="4">Cancel</button>
                <button type="submit" class="primary" tabindex="3">Create Website</button>
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
    this.currentTemplate = url
    await this.updateComplete
    this.shadowRoot.querySelector('input').focus() // focus the title input
  }

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onChangeType (e) {
    this.type = e.target.value.trim()
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
      if (!this.currentTemplate.startsWith('dat:')) {
        // using builtin template
        url = await bg.datArchive.createArchive({
          template: this.currentTemplate,
          title: this.title,
          description: this.description,
          type: '',
          networked: this.networked,
          links: this.links,
          prompt: false
        })
      } else {
        // template forking from saved dat
        await bg.datArchive.download(this.currentTemplate)
        url = await bg.datArchive.forkArchive(this.currentTemplate, {
          title: this.title,
          description: this.description,
          type: '',
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
.wrapper {
  padding: 0;
}

h1.title {
  padding: 14px 20px;
  margin: 0;
  border-color: #ddd;
}

form {
  padding: 0;
  margin: 0;
}

hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 20px 0;
}

.layout {
  display: flex;
  user-select: none;
}

.layout .templates {
  width: 624px;
}

.layout .inputs {
  min-width: 200px;
  flex: 1;
  padding: 20px;
}

.templates {
  height: 468px;
  overflow-y: auto;
  background: #fafafa;
  border-right: 1px solid #ddd;
}

.templates-heading {
  margin: 20px 20px 0px;
  padding-bottom: 5px;
  border-bottom: 1px solid #ddd;
  color: gray;
  font-size: 11px;
}

.templates-selector {
  display: grid;
  grid-gap: 20px;
  padding: 10px 20px;
  grid-template-columns: repeat(3, 1fr);
  align-items: baseline;
}

.template {
  width: 160px;
  padding: 10px;
  border-radius: 4px;
}

.template img,
.template .icon {
  display: block;
  margin: 0 auto;
  width: 150px;
  height: 120px;
  margin-bottom: 10px;
  object-fit: scale-down;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.template .icon {
  text-align: center;
  font-size: 24px;
}

.template .icon .fa-fw {
  line-height: 80px;
}

.template .title {
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template:hover {
  background: #eee;
}

.template.selected {
  background: rgb(63, 119, 232);
}

.template.selected .title {
  color: #fff;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,.35);
}

.template.selected img {
  border: 1px solid #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.15);
}

`]

customElements.define('create-archive-modal', CreateArchiveModal)