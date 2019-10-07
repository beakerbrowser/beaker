/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { ucfirst } from '../../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

// TODO
// read types from the fs registry
const TYPES = [
  {
    title: 'System',
    types: [
      {
        id: undefined,
        title: 'Shared Files',
      },
      {
        id: 'website',
        title: 'Website',
      },
      {
        id: 'application',
        title: 'Application'
      }
    ]
  },
  {
    title: 'Unwalled Garden',
    types: [
      {
        id: 'unwalled.garden/photo-album',
        title: 'Photo Album'
      },
      {
        id: 'unwalled.garden/music-album',
        title: 'Music Album'
      },
      {
        id: 'unwalled.garden/video-album',
        title: 'Video Album'
      },
      {
        id: 'unwalled.garden/podcast',
        title: 'Podcast'
      },
      {
        id: 'unwalled.garden/ebook',
        title: 'E-Book'
      }
    ]
  },
  {
    title: 'Web Term',
    types: [
      {
        id: "webterm.sh/cmd-pkg",
        title: "Command Package"
      }
    ]
  }
]

const VISIBILITY_OPTIONS = [
  {icon: html`<span class="fa-fw fas fa-bullhorn"></span>`, label: 'Public', value: 'public', desc: 'Anybody can access the drive'},
  {icon: html`<span class="fa-fw fas fa-eye"></span>`, label: 'Unlisted', value: 'unlisted', desc: 'Only people who know the URL can access the drive'},
  {icon: html`<span class="fa-fw fas fa-lock"></span>`, label: 'Private', value: 'private', desc: 'Only you can access the drive'}
]

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      type: {type: String},
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
        
    .layout .inputs {
      min-width: 200px;
      flex: 1;
      padding: 16px 14px 12px;
    }

    input[type="radio"] {
      display: inline;
      width: auto;
      margin: 0 4px;
      height: auto;
    }
    
    .types {
      width: 160px;
      height: 442px;
      overflow-y: auto;
      background: #f5f5fa;
    }
    
    .type-group-title {
      padding: 8px;
      color: #889;
      font-size: 11px;
      font-weight: 500;
    }
    
    .type {
      padding: 6px 20px;
    }
    
    .type .type-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .type:hover {
      background: #e5e5f3;
    }
    
    .type.selected {
      background: rgb(63, 119, 232);
    }
    
    .type.selected .type-title {
      color: #fff;
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
    this.users = []
    this.errors = {}

    // export interface
    window.createArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type || undefined
    this.links = params.links
    this.author = this.author || (await bg.users.getCurrent()).url
    this.visibility = params.visibility || 'public'
    this.typeOptions = TYPES/* TODO 
      await bg.archives.list({type: 'unwalled.garden/template', isSaved: true})
    )*/
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    const renderType = type => {
      const cls = classMap({type: true, selected: this.type === type.id})
      return html`
        <div class="${cls}" @click=${e => this.onClickType(e, type.id)}>
          <div class="type-title">${type.title}</div>
        </div>
      `
    }

    const renderTypeGroup = group => {
      return html`
        <div class="type-group">
          <div class="type-group-title">${group.title}</div>
          <div class="types-selector">
            ${group.types.map(t => renderType(t))}
          </div>
        </div>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Create New Drive</h1>

        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="types">
              ${(this.typeOptions || []).map(g => renderTypeGroup(g))}
            </div>

            <div class="inputs">
              <label for="title">Title</label>
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

  async onClickType (e, typeId) {
    this.type = typeId
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
      var url = await bg.datArchive.createArchive({
        title: this.title,
        description: this.description,
        type: this.type,
        author: this.author,
        visibility: this.visibility,
        links: this.links,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-archive-modal', CreateArchiveModal)