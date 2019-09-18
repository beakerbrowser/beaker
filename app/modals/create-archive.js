/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { ucfirst } from '../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

const BASIC_TEMPLATES = [
  {url: 'blank', title: 'Website', thumb: html`<img src="beaker://assets/img/templates/website.png">`}
]

const VISIBILITY_OPTIONS = [
  {icon: html`<span class="fa-fw fas fa-bullhorn"></span>`, label: 'Public', value: 'public', desc: 'Anybody can access it'},
  {icon: html`<span class="fa-fw fas fa-eye"></span>`, label: 'Unlisted', value: 'unlisted', desc: 'Only people who know the URL can access it'},
  {icon: html`<span class="fa-fw fas fa-lock"></span>`, label: 'Private', value: 'private', desc: 'Only you can access it'},
]

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      currentTemplate: {type: String},
      visibility: {type: String},
      errors: {type: Object}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }
    
    form {
      padding: 0;
      margin: 0;
    }

    input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
    }

    textarea {
      font-size: 14px;
      padding: 7px 10px;
      border-color: #bbb;
    }
    
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    label.fixed-width {
      display: inline-block;
      width: 60px;
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

    input[type="radio"] {
      display: inline;
      width: auto;
      margin: 0 4px;
      height: auto;
    }
    
    .templates {
      height: 468px;
      overflow-y: auto;
      background: #fafafa;
      border-right: 1px solid #bbb;
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

    .visibility {
      border: 1px solid #ddd;
      margin-bottom: 45px;
      margin-top: 5px;
    }

    .visibility .option {
      display: flex;
      padding: 10px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      color: rgba(0,0,0,.5);
    }

    .visibility .option:last-child {
      border: 0;
    }

    .visibility .option:hover {
      color: rgba(0,0,0,.65);
      background: #fafafa;
    }

    .visibility .option.selected {
      color: rgba(0,0,0,.75);
      outline: 1px solid gray;
    }

    .visibility .option > span {
      margin: 2px 10px 0 4px;
    }

    .visibility .option-label {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .visibility .option-desc {
      font-weight: 400;
    }

    .visibility .option .fa-check-circle {
      visibility: hidden;
      margin: 2px 2px 0 auto;
      color: #333;
      font-size: 14px;
      align-self: center;
    }

    .visibility .option.selected .fa-check-circle {
      visibility: visible;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.title = ''
    this.description = ''
    this.type = undefined
    this.links = undefined
    this.author = undefined
    this.visibility = 'public'
    this.templates = []
    this.users = []
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
    this.type = params.type || ''
    this.links = params.links
    this.author = this.author || (await bg.users.getCurrent()).url
    this.visibility = params.visibility || 'public'
    this.templates = BASIC_TEMPLATES/* TODO .concat(
      await bg.archives.list({type: 'unwalled.garden/template', isSaved: true})
    )*/
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
        <h1 class="title">Create New...</h1>

        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="templates">
              <div class="templates-selector">
                ${this.templates.map(t => template(t.url, t.title, t.thumb))}
              </div>
            </div>

            <div class="inputs">
              <label for="title">${ucfirst(this.simpleType)} Title</label>
              <input autofocus name="title" tabindex="1" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
              ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

              <label for="desc">Description</label>
              <textarea name="desc" tabindex="2" @change=${this.onChangeDescription}>${this.description || ''}</textarea>

              <label>Visibility</label>
              <div class="visibility">
                ${VISIBILITY_OPTIONS.map(opt => html`
                  <div
                    class=${classMap({option: true, selected: opt.value === this.visibility})}
                    @click=${e => this.onChangeVisibility(e, opt.value)}
                  >
                    <span>${opt.icon}</span>
                    <div>
                      <div class="option-label">${opt.label}</div>
                      <div class="option-desc">${opt.desc}</div>
                    </div>
                    <span class="fas fa-fw fa-check-circle"></span>
                  </div>
                `)}
              </div>
              
              <div class="form-actions">
                <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="4">Cancel</button>
                <button type="submit" class="primary" tabindex="3">Create</button>
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

  onChangeVisibility (e, value) {
    this.visibility = value
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
          title: this.title,
          description: this.description,
          type: 'unwalled.garden/website',
          author: this.author,
          visibility: this.visibility,
          links: this.links,
          prompt: false
        })
      } else {
        // using a template
        await bg.datArchive.download(this.currentTemplate)
        url = await bg.datArchive.forkArchive(this.currentTemplate, {
          title: this.title,
          description: this.description,
          type: 'unwalled.garden/website',
          author: this.author,
          visibility: this.visibility,
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

customElements.define('create-archive-modal', CreateArchiveModal)